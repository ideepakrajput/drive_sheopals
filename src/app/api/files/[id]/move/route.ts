import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getFileAccess } from "@/lib/sharing";
import { ensureFolderExists, getFilePhysicalPath, getFolderPhysicalPath } from "@/lib/server-utils";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { id } = await params;
        const { destinationFolderId } = await request.json();

        const access = await getFileAccess(id, userId);
        if (!access.allowed || !access.isOwner) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        const [files]: any = await pool.query(
            `SELECT id, stored_name, folder_id, owner_id
             FROM files
             WHERE id = ? AND owner_id = ?
             LIMIT 1`,
            [id, userId]
        );

        if (files.length === 0) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        if (destinationFolderId) {
            const [destinationFolders]: any = await pool.query(
                "SELECT id FROM folders WHERE id = ? AND owner_id = ? AND is_trashed = FALSE LIMIT 1",
                [destinationFolderId, userId]
            );

            if (destinationFolders.length === 0) {
                return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
            }
        }

        const file = files[0];
        const sourcePath = await getFilePhysicalPath(userId, file.folder_id, file.stored_name);
        const destinationFolderPath = await getFolderPhysicalPath(userId, destinationFolderId || null);
        await ensureFolderExists(destinationFolderPath);
        const destinationPath = path.join(destinationFolderPath, file.stored_name);

        if (sourcePath !== destinationPath) {
            await fs.rename(sourcePath, destinationPath);
        }

        await pool.query(
            "UPDATE files SET folder_id = ? WHERE id = ? AND owner_id = ?",
            [destinationFolderId || null, id, userId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Move file error:", error);
        return NextResponse.json({ error: "Failed to move file" }, { status: 500 });
    }
}
