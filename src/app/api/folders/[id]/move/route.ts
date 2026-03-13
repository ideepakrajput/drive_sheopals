import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getFolderAccess } from "@/lib/sharing";
import { ensureFolderExists, getFolderDescendants, getFolderPhysicalPath, pathExists } from "@/lib/server-utils";

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

        const access = await getFolderAccess(id, userId);
        if (!access.allowed || !access.isOwner) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        if (destinationFolderId === id) {
            return NextResponse.json({ error: "Folder cannot be moved into itself" }, { status: 400 });
        }

        const descendants = await getFolderDescendants(id);
        if (destinationFolderId && descendants.some((folder) => folder.id === destinationFolderId)) {
            return NextResponse.json({ error: "Folder cannot be moved into a child folder" }, { status: 400 });
        }

        const [folders]: any = await pool.query(
            `SELECT id, name, parent_folder_id, owner_id
             FROM folders
             WHERE id = ? AND owner_id = ?
             LIMIT 1`,
            [id, userId]
        );

        if (folders.length === 0) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
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

        const folder = folders[0];
        const sourcePath = await getFolderPhysicalPath(userId, id);
        const destinationParentPath = await getFolderPhysicalPath(userId, destinationFolderId || null);
        await ensureFolderExists(destinationParentPath);
        const destinationPath = path.join(destinationParentPath, folder.name);

        if (sourcePath !== destinationPath && await pathExists(destinationPath)) {
            return NextResponse.json({ error: "A folder with that name already exists in the destination" }, { status: 409 });
        }

        if (sourcePath !== destinationPath) {
            await fs.rename(sourcePath, destinationPath);
        }

        await pool.query(
            "UPDATE folders SET parent_folder_id = ? WHERE id = ? AND owner_id = ?",
            [destinationFolderId || null, id, userId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Move folder error:", error);
        return NextResponse.json({ error: "Failed to move folder" }, { status: 500 });
    }
}
