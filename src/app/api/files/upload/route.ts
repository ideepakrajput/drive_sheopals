import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const originalName = file.name;
        const mimeType = file.type;
        const size = file.size;
        const storedName = crypto.randomUUID();
        const fileId = crypto.randomUUID();
        const userId = session.user.id;

        const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
        
        // Ensure directory exists
        await fs.mkdir(baseDrivePath, { recursive: true });

        const filePath = path.join(baseDrivePath, storedName);
        
        await fs.writeFile(filePath, buffer);

        // Insert into database
        await pool.query(
            `INSERT INTO files (id, original_name, stored_name, folder_id, owner_id, size, mime_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [fileId, originalName, storedName, folderId, userId, size, mimeType]
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
