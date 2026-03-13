import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { getFolderPath } from "@/lib/server-utils";
import { getFileAccess, removeResourceShares } from "@/lib/sharing";
import { adjustStorageUsage } from "@/lib/storage";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = session.user.id;
        const access = await getFileAccess(id, userId);

        if (!access.allowed || !access.isOwner) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        // 1. Fetch file details for physical deletion
        const [files]: any = await pool.query(
            "SELECT stored_name, folder_id, size FROM files WHERE id = ? AND owner_id = ?",
            [id, userId]
        );

        if (files.length === 0) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        const file = files[0];

        // 2. Resolve physical path
        const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
        const userDrivePath = path.join(baseDrivePath, userId);
        const subFolderPath = await getFolderPath(file.folder_id);
        const physicalPath = path.join(userDrivePath, subFolderPath, file.stored_name);

        // 3. Delete from disk (ignore if not exists)
        try {
            await fs.unlink(physicalPath);
        } catch (err) {
            console.warn("Could not delete file from disk:", physicalPath, err);
        }

        // 4. Delete from database
        await pool.query(
            "DELETE FROM files WHERE id = ? AND owner_id = ?",
            [id, userId]
        );
        await removeResourceShares("file", [id]);
        await adjustStorageUsage(userId, -Number(file.size || 0));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete file error:", error);
        return NextResponse.json({ error: "Failed to delete file permanently" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { name } = await request.json();
        const userId = session.user.id;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const access = await getFileAccess(id, userId);
        if (!access.allowed || (!access.isOwner && access.permission !== "edit")) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        const [result]: any = await pool.query(
            "UPDATE files SET original_name = ? WHERE id = ?",
            [name, id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Rename error:", error);
        return NextResponse.json({ error: "Failed to rename file" }, { status: 500 });
    }
}
