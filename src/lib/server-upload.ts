import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";
import { getFolderPath } from "@/lib/server-utils";
import { adjustStorageUsage, ensureStorageAvailable } from "@/lib/storage";

type FolderRow = RowDataPacket & {
    id: string;
};

export class UploadSessionError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "UploadSessionError";
        this.status = status;
    }
}

export type UploadSessionMeta = {
    uploadId: string;
    userId: string;
    originalName: string;
    mimeType: string;
    size: number;
    folderId: string | null;
    relativePath: string | null;
    uploadedBytes: number;
    tempFilePath: string;
    createdAt: string;
};

const UPLOAD_ROOT_DIR = path.join(os.tmpdir(), "drive-chunked-uploads");

const normalizeFolderId = (folderId: string | null) => {
    if (folderId === "null" || folderId === "") {
        return null;
    }

    return folderId;
};

const getUploadDir = (uploadId: string) => {
    return path.join(UPLOAD_ROOT_DIR, uploadId);
};

const getMetaPath = (uploadId: string) => {
    return path.join(getUploadDir(uploadId), "meta.json");
};

const writeMeta = async (meta: UploadSessionMeta) => {
    await fs.writeFile(getMetaPath(meta.uploadId), JSON.stringify(meta), "utf8");
};

export const readUploadSession = async (uploadId: string) => {
    try {
        const raw = await fs.readFile(getMetaPath(uploadId), "utf8");
        return JSON.parse(raw) as UploadSessionMeta;
    } catch {
        throw new UploadSessionError("Upload session not found", 404);
    }
};

const assertSessionOwner = (meta: UploadSessionMeta, userId: string) => {
    if (meta.userId !== userId) {
        throw new UploadSessionError("Unauthorized upload session", 403);
    }
};

export const cleanupUploadSession = async (uploadId: string) => {
    await fs.rm(getUploadDir(uploadId), { recursive: true, force: true });
};

export const createUploadSession = async ({
    userId,
    originalName,
    mimeType,
    size,
    folderId,
    relativePath,
}: {
    userId: string;
    originalName: string;
    mimeType: string;
    size: number;
    folderId: string | null;
    relativePath: string | null;
}) => {
    if (!originalName.trim()) {
        throw new UploadSessionError("No file provided", 400);
    }

    if (size <= 0) {
        throw new UploadSessionError("No file provided", 400);
    }

    await ensureStorageAvailable(userId, size);

    const uploadId = crypto.randomUUID();
    const uploadDir = getUploadDir(uploadId);
    const tempFilePath = path.join(uploadDir, "payload.bin");

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(tempFilePath, "");

    const meta: UploadSessionMeta = {
        uploadId,
        userId,
        originalName: originalName.includes("/") ? originalName.split("/").pop() || originalName : originalName,
        mimeType,
        size,
        folderId: normalizeFolderId(folderId),
        relativePath,
        uploadedBytes: 0,
        tempFilePath,
        createdAt: new Date().toISOString(),
    };

    await writeMeta(meta);

    return { uploadId };
};

export const appendUploadChunk = async ({
    uploadId,
    userId,
    offset,
    chunk,
}: {
    uploadId: string;
    userId: string;
    offset: number;
    chunk: Buffer;
}) => {
    const meta = await readUploadSession(uploadId);
    assertSessionOwner(meta, userId);

    if (offset !== meta.uploadedBytes) {
        throw new UploadSessionError("Invalid upload offset", 409);
    }

    if (meta.uploadedBytes + chunk.length > meta.size) {
        throw new UploadSessionError("Chunk exceeds declared file size", 400);
    }

    await fs.appendFile(meta.tempFilePath, chunk);
    meta.uploadedBytes += chunk.length;
    await writeMeta(meta);

    return {
        uploadedBytes: meta.uploadedBytes,
        totalBytes: meta.size,
        isComplete: meta.uploadedBytes === meta.size,
    };
};

const resolveTargetFolderId = async ({
    folderId,
    relativePath,
    userId,
}: {
    folderId: string | null;
    relativePath: string | null;
    userId: string;
}) => {
    let targetFolderId = normalizeFolderId(folderId);

    if (targetFolderId) {
        const [parentFolders] = await pool.query<FolderRow[]>(
            "SELECT id FROM folders WHERE id = ? AND owner_id = ? LIMIT 1",
            [targetFolderId, userId]
        );

        if (parentFolders.length === 0) {
            throw new UploadSessionError("Target folder not found or unauthorized", 403);
        }
    }

    if (relativePath && relativePath.includes("/")) {
        const parts = relativePath.split("/");
        const folderNames = parts.slice(0, -1);

        for (const folderName of folderNames) {
            let query = "SELECT id FROM folders WHERE name = ? AND owner_id = ? AND parent_folder_id ";
            const params: Array<string | null> = [folderName, userId];

            if (targetFolderId) {
                query += "= ?";
                params.push(targetFolderId);
            } else {
                query += "IS NULL";
            }

            const [existingFolders] = await pool.query<FolderRow[]>(query, params);

            if (existingFolders.length > 0) {
                targetFolderId = existingFolders[0].id;
                continue;
            }

            const newFolderId = crypto.randomUUID();
            await pool.query(
                "INSERT INTO folders (id, name, parent_folder_id, owner_id) VALUES (?, ?, ?, ?)",
                [newFolderId, folderName, targetFolderId, userId]
            );
            targetFolderId = newFolderId;
        }
    }

    return targetFolderId;
};

export const completeUploadSession = async ({
    uploadId,
    userId,
}: {
    uploadId: string;
    userId: string;
}) => {
    const meta = await readUploadSession(uploadId);
    assertSessionOwner(meta, userId);

    if (meta.uploadedBytes !== meta.size) {
        throw new UploadSessionError("Upload is incomplete", 409);
    }

    const targetFolderId = await resolveTargetFolderId({
        folderId: meta.folderId,
        relativePath: meta.relativePath,
        userId,
    });

    const storedName = crypto.randomUUID();
    const fileId = crypto.randomUUID();
    const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
    const userDrivePath = path.join(baseDrivePath, userId);
    const subFolderPath = await getFolderPath(targetFolderId);
    const fullPhysicalFolderPath = path.join(userDrivePath, subFolderPath);

    await fs.mkdir(fullPhysicalFolderPath, { recursive: true });

    const finalFilePath = path.join(fullPhysicalFolderPath, storedName);
    await fs.rename(meta.tempFilePath, finalFilePath);

    try {
        await pool.query(
            `INSERT INTO files (id, original_name, stored_name, folder_id, owner_id, size, mime_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                fileId,
                meta.originalName,
                storedName,
                targetFolderId,
                userId,
                meta.size,
                meta.mimeType,
            ]
        );
        await adjustStorageUsage(userId, meta.size);
    } catch (error) {
        await fs.unlink(finalFilePath).catch(() => undefined);
        throw error;
    } finally {
        await cleanupUploadSession(uploadId);
    }

    return { fileId };
};

export const cancelUploadSession = async ({
    uploadId,
    userId,
}: {
    uploadId: string;
    userId: string;
}) => {
    const meta = await readUploadSession(uploadId);
    assertSessionOwner(meta, userId);
    await cleanupUploadSession(uploadId);
};
