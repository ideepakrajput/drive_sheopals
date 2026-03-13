import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { getDescendantFolderIds, getFolderAccess, removeResourceShares } from "@/lib/sharing";
import { ensureFolderExists, getFolderPhysicalPath, getUserDrivePath, pathExists } from "@/lib/server-utils";
import { adjustStorageUsage } from "@/lib/storage";

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

        const access = await getFolderAccess(id, userId);
        if (!access.allowed || (!access.isOwner && access.permission !== "edit")) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const [folders]: any = await pool.query(
            "SELECT id, name, parent_folder_id FROM folders WHERE id = ? AND owner_id = ? LIMIT 1",
            [id, userId]
        );

        if (folders.length === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const folder = folders[0];
        const oldPath = await getFolderPhysicalPath(userId, id);
        const parentPath = folder.parent_folder_id
            ? await getFolderPhysicalPath(userId, folder.parent_folder_id)
            : getUserDrivePath(userId);
        await ensureFolderExists(parentPath);
        const newPath = path.join(parentPath, name);

        if (oldPath !== newPath && await pathExists(newPath)) {
            return NextResponse.json({ error: "A folder with that name already exists here" }, { status: 409 });
        }

        if (oldPath !== newPath && await pathExists(oldPath)) {
            await fs.rename(oldPath, newPath);
        }

        const [result]: any = await pool.query(
            "UPDATE folders SET name = ? WHERE id = ?",
            [name, id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Rename folder error:", error);
        return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
    }
}

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
        const access = await getFolderAccess(id, userId);

        if (!access.allowed || !access.isOwner) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const descendantFolderIds = await getDescendantFolderIds(id);
        const allFolderIds = [id, ...descendantFolderIds];
        const placeholders = allFolderIds.map(() => "?").join(", ");
        const [sizeRows]: any = await pool.query(
            `SELECT COALESCE(SUM(size), 0) AS totalSize
             FROM files
             WHERE folder_id IN (${placeholders})`,
            allFolderIds
        );
        const totalSize = Number(sizeRows[0]?.totalSize || 0);
        const physicalPath = await getFolderPhysicalPath(userId, id);

        const [result]: any = await pool.query(
            "DELETE FROM folders WHERE id = ? AND owner_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        await removeResourceShares("folder", allFolderIds);
        await adjustStorageUsage(userId, -totalSize);
        await fs.rm(physicalPath, { recursive: true, force: true }).catch(() => undefined);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete folder error:", error);
        return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }
}
