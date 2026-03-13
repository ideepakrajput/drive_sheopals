import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getFileAccess } from "@/lib/sharing";
import { ensureFolderExists, getFilePhysicalPath, getFolderPhysicalPath } from "@/lib/server-utils";
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

        const access = await getFileAccess(id, userId);
        if (!access.allowed || !access.isOwner) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        const [files]: any = await pool.query(
            `SELECT *
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
        await ensureStorageAvailable(userId, Number(file.size || 0));
        const newFileId = crypto.randomUUID();
        const newStoredName = crypto.randomUUID();
        const sourcePath = await getFilePhysicalPath(userId, file.folder_id, file.stored_name);
        const destinationFolderPath = await getFolderPhysicalPath(userId, destinationFolderId || null);
        await ensureFolderExists(destinationFolderPath);
        const destinationPath = path.join(destinationFolderPath, newStoredName);

        await fs.copyFile(sourcePath, destinationPath);

        try {
            await pool.query(
                `INSERT INTO files (id, original_name, stored_name, folder_id, owner_id, size, mime_type, is_starred, is_trashed)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
                [newFileId, file.original_name, newStoredName, destinationFolderId || null, userId, file.size, file.mime_type, file.is_starred ? 1 : 0]
            );
            await adjustStorageUsage(userId, Number(file.size || 0));
        } catch (error) {
            await fs.unlink(destinationPath).catch(() => undefined);
            throw error;
        }

        return NextResponse.json({ success: true, fileId: newFileId });
    } catch (error) {
        console.error("Copy file error:", error);
        return NextResponse.json({ error: "Failed to copy file" }, { status: 500 });
    }
}
