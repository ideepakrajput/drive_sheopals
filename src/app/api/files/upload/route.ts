import Busboy from "busboy";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import type { RowDataPacket } from "mysql2/promise";
import os from "os";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { getFolderPath } from "@/lib/server-utils";
import { adjustStorageUsage, ensureStorageAvailable, STORAGE_LIMIT_EXCEEDED_MESSAGE } from "@/lib/storage";

type FolderRow = RowDataPacket & {
    id: string;
};

type ParsedUpload = {
    tempFilePath: string;
    originalName: string;
    mimeType: string;
    size: number;
    folderId: string | null;
    relativePath: string | null;
};

const createAbortError = () => {
    return new Error("Upload canceled");
};

const throwIfAborted = (signal: AbortSignal) => {
    if (signal.aborted) {
        throw createAbortError();
    }
};

const normalizeFolderId = (folderId: string | null) => {
    if (folderId === "null" || folderId === "") {
        return null;
    }

    return folderId;
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
            throw new Error("Target folder not found or unauthorized");
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

const parseUploadRequest = async (request: NextRequest): Promise<ParsedUpload> => {
    const contentType = request.headers.get("content-type");
    const requestBody = request.body;

    if (!contentType?.includes("multipart/form-data") || !requestBody) {
        throw new Error("Invalid upload request");
    }

    const tempFilePath = path.join(os.tmpdir(), `drive-upload-${crypto.randomUUID()}`);
    let folderId: string | null = null;
    let relativePath: string | null = null;
    let originalName: string | null = null;
    let mimeType = "";
    let size = 0;
    let fileWritePromise: Promise<void> | null = null;
    let tempWriteStream: ReturnType<typeof createWriteStream> | null = null;

    const busboy = Busboy({
        headers: Object.fromEntries(request.headers.entries()),
        limits: {
            files: 1,
        },
    });

    const requestStream = Readable.fromWeb(requestBody as unknown as NodeReadableStream<Uint8Array>);
    const abortError = createAbortError();
    const handleAbort = () => {
        requestStream.destroy(abortError);
        busboy.destroy(abortError);
        tempWriteStream?.destroy(abortError);
    };

    request.signal.addEventListener("abort", handleAbort, { once: true });

    const parsingPromise = new Promise<void>((resolve, reject) => {
        busboy.on("field", (fieldName, value) => {
            if (fieldName === "folderId") {
                folderId = value;
                return;
            }

            if (fieldName === "relativePath") {
                relativePath = value;
            }
        });

        busboy.on("file", (fieldName, fileStream, info) => {
            if (fieldName !== "file") {
                fileStream.resume();
                return;
            }

            originalName = info.filename.includes("/")
                ? info.filename.split("/").pop() || info.filename
                : info.filename;
            mimeType = info.mimeType;

            fileStream.on("data", (chunk: Buffer) => {
                size += chunk.length;
            });

            tempWriteStream = createWriteStream(tempFilePath);
            fileWritePromise = pipeline(fileStream, tempWriteStream);
            fileWritePromise.catch(reject);
        });

        busboy.once("finish", resolve);
        busboy.once("error", reject);
    });

    try {
        await pipeline(requestStream, busboy);
        await parsingPromise;
        await fileWritePromise;
    } finally {
        request.signal.removeEventListener("abort", handleAbort);
    }

    if (!originalName) {
        await fs.unlink(tempFilePath).catch(() => undefined);
        throw new Error("No file provided");
    }

    return {
        tempFilePath,
        originalName,
        mimeType,
        size,
        folderId: normalizeFolderId(folderId),
        relativePath,
    };
};

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null;
    let finalFilePath: string | null = null;

    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsedUpload = await parseUploadRequest(request);
        tempFilePath = parsedUpload.tempFilePath;
        throwIfAborted(request.signal);

        if (parsedUpload.size <= 0) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const userId = session.user.id;
        await ensureStorageAvailable(userId, parsedUpload.size);
        throwIfAborted(request.signal);

        const targetFolderId = await resolveTargetFolderId({
            folderId: parsedUpload.folderId,
            relativePath: parsedUpload.relativePath,
            userId,
        });
        throwIfAborted(request.signal);

        const storedName = crypto.randomUUID();
        const fileId = crypto.randomUUID();
        const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
        const userDrivePath = path.join(baseDrivePath, userId);
        const subFolderPath = await getFolderPath(targetFolderId);
        const fullPhysicalFolderPath = path.join(userDrivePath, subFolderPath);

        await fs.mkdir(fullPhysicalFolderPath, { recursive: true });

        const filePath = path.join(fullPhysicalFolderPath, storedName);
        throwIfAborted(request.signal);
        await fs.rename(parsedUpload.tempFilePath, filePath);
        tempFilePath = null;
        finalFilePath = filePath;

        try {
            throwIfAborted(request.signal);
            await pool.query(
                `INSERT INTO files (id, original_name, stored_name, folder_id, owner_id, size, mime_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    fileId,
                    parsedUpload.originalName,
                    storedName,
                    targetFolderId,
                    userId,
                    parsedUpload.size,
                    parsedUpload.mimeType,
                ]
            );
            throwIfAborted(request.signal);
            await adjustStorageUsage(userId, parsedUpload.size);
        } catch (error) {
            await fs.unlink(filePath).catch(() => undefined);
            throw error;
        }

        return NextResponse.json({ success: true, fileId });
    } catch (error: unknown) {
        console.error("Upload error:", error);
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => undefined);
        }
        if (finalFilePath) {
            await fs.unlink(finalFilePath).catch(() => undefined);
        }

        if (error instanceof Error) {
            if (error.message === STORAGE_LIMIT_EXCEEDED_MESSAGE) {
                return NextResponse.json({ error: STORAGE_LIMIT_EXCEEDED_MESSAGE }, { status: 400 });
            }

            if (error.message === "Target folder not found or unauthorized") {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }

            if (error.message === "No file provided" || error.message === "Invalid upload request") {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }

            if (error.message === "Upload canceled") {
                return NextResponse.json({ error: error.message }, { status: 499 });
            }
        }

        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
