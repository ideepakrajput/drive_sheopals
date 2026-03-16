import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getFolderPath } from "@/lib/server-utils";
import { adjustStorageUsage, ensureStorageAvailable, STORAGE_LIMIT_EXCEEDED_MESSAGE } from "@/lib/storage";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        let folderId = formData.get("folderId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (folderId === "null" || folderId === "") {
             folderId = null;
        }

        const relativePath = formData.get("relativePath") as string | null;
        const userId = session.user.id;
        let targetFolderId = folderId;

        if (targetFolderId) {
            const [parentFolders]: any = await pool.query(
                "SELECT id FROM folders WHERE id = ? AND owner_id = ? LIMIT 1",
                [targetFolderId, userId]
            );

            if (parentFolders.length === 0) {
                return NextResponse.json({ error: "Target folder not found or unauthorized" }, { status: 403 });
            }
        }

        if (relativePath && relativePath.includes("/")) {
            const parts = relativePath.split("/");
            const folderNames = parts.slice(0, -1);

            for (const fName of folderNames) {
                let query = `SELECT id FROM folders WHERE name = ? AND owner_id = ? AND parent_folder_id `;
                const params: any[] = [fName, userId];
                if (targetFolderId) {
                    query += `= ?`;
                    params.push(targetFolderId);
                } else {
                    query += `IS NULL`;
                }

                const [existing] = await pool.query(query, params) as any[];

                if (existing && existing.length > 0) {
                    targetFolderId = existing[0].id;
                } else {
                    const newFolderId = crypto.randomUUID();
                    await pool.query(
                        `INSERT INTO folders (id, name, parent_folder_id, owner_id) VALUES (?, ?, ?, ?)`,
                        [newFolderId, fName, targetFolderId, userId]
                    );
                    targetFolderId = newFolderId;
                }
            }
        }

        let originalName = file.name;
        if (originalName.includes("/")) {
            originalName = originalName.split("/").pop() || originalName;
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const mimeType = file.type;
        const size = file.size;
        await ensureStorageAvailable(userId, size);
        const storedName = crypto.randomUUID();
        const fileId = crypto.randomUUID();

        const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
        const userDrivePath = path.join(baseDrivePath, userId);
        
        // Resolve nested internal folder structure
        const subFolderPath = await getFolderPath(targetFolderId);
        const fullPhysicalFolderPath = path.join(userDrivePath, subFolderPath);
        
        // Ensure the full deep directory exists on disk
        await fs.mkdir(fullPhysicalFolderPath, { recursive: true });

        const filePath = path.join(fullPhysicalFolderPath, storedName);
        
        await fs.writeFile(filePath, buffer);

        try {
            await pool.query(
                `INSERT INTO files (id, original_name, stored_name, folder_id, owner_id, size, mime_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [fileId, originalName, storedName, targetFolderId, userId, size, mimeType]
            );
            await adjustStorageUsage(userId, size);
        } catch (error) {
            await fs.unlink(filePath).catch(() => undefined);
            throw error;
        }

        return NextResponse.json({ success: true, fileId });
    } catch (error: any) {
        console.error("Upload error:", error);
        if (error?.message === STORAGE_LIMIT_EXCEEDED_MESSAGE) {
            return NextResponse.json({ error: STORAGE_LIMIT_EXCEEDED_MESSAGE }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
