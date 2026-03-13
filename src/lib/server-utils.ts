import { pool } from "./db";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export async function getFolderPath(folderId: string | null): Promise<string> {
    if (!folderId) return "";

    let currentId: string | null = folderId;
    const pathParts: string[] = [];

    while (currentId) {
        const [rows]: any = await pool.query(
            "SELECT id, name, parent_folder_id FROM folders WHERE id = ?",
            [currentId]
        );

        if (rows.length === 0) break;

        const folder = rows[0];
        pathParts.unshift(folder.name); // prepend
        currentId = folder.parent_folder_id;
    }

    return path.join(...pathParts);
}

export function getBaseDrivePath() {
    return process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
}

export function getUserDrivePath(userId: string) {
    return path.join(getBaseDrivePath(), userId);
}

export async function getFolderPhysicalPath(userId: string, folderId: string | null) {
    const subFolderPath = await getFolderPath(folderId);
    return path.join(getUserDrivePath(userId), subFolderPath);
}

export async function getFilePhysicalPath(userId: string, folderId: string | null, storedName: string) {
    const folderPath = await getFolderPhysicalPath(userId, folderId);
    return path.join(folderPath, storedName);
}

export async function listOwnerFolders(userId: string) {
    const [rows]: any = await pool.query(
        `SELECT id, name, parent_folder_id
         FROM folders
         WHERE owner_id = ? AND is_trashed = FALSE
         ORDER BY name ASC`,
        [userId]
    );

    const foldersWithPath = await Promise.all(
        rows.map(async (folder: { id: string; name: string; parent_folder_id: string | null }) => ({
            ...folder,
            path: await getFolderPath(folder.id),
        }))
    );

    return foldersWithPath;
}

export async function getFolderDescendants(folderId: string) {
    const descendants: Array<{ id: string; parent_folder_id: string | null; name: string }> = [];
    const queue = [folderId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const [rows]: any = await pool.query(
            `SELECT id, parent_folder_id, name
             FROM folders
             WHERE parent_folder_id = ?
             ORDER BY name ASC`,
            [currentId]
        );

        for (const row of rows) {
            descendants.push(row);
            queue.push(row.id);
        }
    }

    return descendants;
}

export async function duplicateFolderTree(sourceFolderId: string, destinationParentId: string | null, ownerId: string) {
    const folderIdMap = new Map<string, string>();

    const [sourceFolders]: any = await pool.query(
        `SELECT id, name, parent_folder_id, owner_id, is_starred, is_trashed
         FROM folders
         WHERE id = ? LIMIT 1`,
        [sourceFolderId]
    );

    if (sourceFolders.length === 0) {
        throw new Error("Source folder not found");
    }

    const rootFolder = sourceFolders[0];
    const rootCopyId = crypto.randomUUID();
    folderIdMap.set(rootFolder.id, rootCopyId);

    await pool.query(
        `INSERT INTO folders (id, name, parent_folder_id, owner_id, is_starred, is_trashed)
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [rootCopyId, rootFolder.name, destinationParentId, ownerId, rootFolder.is_starred ? 1 : 0]
    );

    const descendants = await getFolderDescendants(sourceFolderId);
    for (const folder of descendants) {
        const newFolderId = crypto.randomUUID();
        folderIdMap.set(folder.id, newFolderId);
        await pool.query(
            `INSERT INTO folders (id, name, parent_folder_id, owner_id, is_starred, is_trashed)
             SELECT ?, name, ?, owner_id, is_starred, FALSE
             FROM folders
             WHERE id = ?`,
            [newFolderId, folderIdMap.get(folder.parent_folder_id!) ?? destinationParentId, folder.id]
        );
    }

    const sourceFolderIds = [sourceFolderId, ...descendants.map((folder) => folder.id)];
    const placeholders = sourceFolderIds.map(() => "?").join(", ");
    const [sourceFiles]: any = await pool.query(
        `SELECT id, original_name, stored_name, folder_id, owner_id, size, mime_type, is_starred
         FROM files
         WHERE folder_id IN (${placeholders})`,
        sourceFolderIds
    );

    for (const file of sourceFiles) {
        await pool.query(
            `INSERT INTO files (id, original_name, stored_name, folder_id, owner_id, size, mime_type, is_starred, is_trashed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
            [
                crypto.randomUUID(),
                file.original_name,
                file.stored_name,
                file.folder_id ? folderIdMap.get(file.folder_id) : null,
                file.owner_id,
                file.size,
                file.mime_type,
                file.is_starred ? 1 : 0,
            ]
        );
    }

    return {
        folderIdMap,
        rootCopyId,
    };
}

export async function ensureFolderExists(folderPath: string) {
    await fs.mkdir(folderPath, { recursive: true });
}

export async function pathExists(targetPath: string) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}
