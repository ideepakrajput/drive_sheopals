import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import fs from "fs";
import path from "path";
import { getFolderPath } from "@/lib/server-utils";
import { getFileAccess } from "@/lib/sharing";

// Helper to wrap Node.js stream into Web ReadableStream
function streamFile(filepath: string): ReadableStream<Uint8Array> {
    const downloadStream = fs.createReadStream(filepath);
    return new ReadableStream({
        start(controller) {
            downloadStream.on("data", (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
            downloadStream.on("end", () => controller.close());
            downloadStream.on("error", (error: NodeJS.ErrnoException) => controller.error(error));
        },
        cancel() {
            downloadStream.destroy();
        },
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // In Next 15, params is a Promise
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const fileId = resolvedParams.id;
        const userId = session.user.id;

        // Query file metadata
        const [files]: any = await pool.query(
            "SELECT * FROM files WHERE id = ?",
            [fileId]
        );

        if (files.length === 0) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const file = files[0];

        const access = await getFileAccess(fileId, userId);
        if (!access.allowed) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
        const userDrivePath = path.join(baseDrivePath, file.owner_id);
        
        // Resolve exactly where this file is physically hidden in the deep file tree
        const subFolderPath = await getFolderPath(file.folder_id);
        const fullPhysicalFolderPath = path.join(userDrivePath, subFolderPath);
        
        const filePath = path.join(fullPhysicalFolderPath, file.stored_name);

        if (!fs.existsSync(filePath)) {
            console.error("File is missing from disk:", filePath);
            return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
        }

        const dataStream = streamFile(filePath);
        const isPreview = request.nextUrl.searchParams.get("preview") === "1";

        const responseHeaders = new Headers();
        if (isPreview) {
            responseHeaders.set("Content-Disposition", `inline; filename="${file.original_name}"`);
        } else {
            responseHeaders.set("Content-Disposition", `attachment; filename="${file.original_name}"`);
        }
        
        responseHeaders.set("Content-Type", file.mime_type || "application/octet-stream");
        responseHeaders.set("Content-Length", file.size.toString());

        return new NextResponse(dataStream, {
            status: 200,
            headers: responseHeaders,
        });

    } catch (error: any) {
        console.error("Download error:", error);
        return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }
}
