import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getFolderAccess } from "@/lib/sharing";
import { duplicateFolderTree, ensureFolderExists, getFolderPhysicalPath, getFolderTreeFileSize, pathExists } from "@/lib/server-utils";
import { adjustStorageUsage, ensureStorageAvailable } from "@/lib/storage";

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

        const [folders]: any = await pool.query(
            `SELECT id, name
             FROM folders
             WHERE id = ? AND owner_id = ?
             LIMIT 1`,
            [id, userId]
        );

        if (folders.length === 0) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        const totalSize = await getFolderTreeFileSize(id);
        await ensureStorageAvailable(userId, totalSize);

        if (destinationFolderId) {
            const [destinationFolders]: any = await pool.query(
                "SELECT id FROM folders WHERE id = ? AND owner_id = ? AND is_trashed = FALSE LIMIT 1",
                [destinationFolderId, userId]
            );

            if (destinationFolders.length === 0) {
                return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
            }
        }

        const sourcePath = await getFolderPhysicalPath(userId, id);
        const destinationParentPath = await getFolderPhysicalPath(userId, destinationFolderId || null);
        await ensureFolderExists(destinationParentPath);
        const destinationPath = path.join(destinationParentPath, folders[0].name);

        if (await pathExists(destinationPath)) {
            return NextResponse.json({ error: "A folder with that name already exists in the destination" }, { status: 409 });
        }

        await fs.cp(sourcePath, destinationPath, { recursive: true });

        try {
            const { rootCopyId } = await duplicateFolderTree(id, destinationFolderId || null, userId);
            await adjustStorageUsage(userId, totalSize);

            return NextResponse.json({ success: true, folderId: rootCopyId });
        } catch (error) {
            await fs.rm(destinationPath, { recursive: true, force: true }).catch(() => undefined);
            throw error;
        }
    } catch (error) {
        console.error("Copy folder error:", error);
        return NextResponse.json({ error: "Failed to copy folder" }, { status: 500 });
    }
}
