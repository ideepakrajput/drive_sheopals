import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getFolderPath } from "@/lib/server-utils";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, parentFolderId } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        const folderId = crypto.randomUUID();
        const userId = session.user.id;
        
        const finalParentId = parentFolderId === "null" || parentFolderId === "" ? null : parentFolderId;

        if (finalParentId) {
            const [parentFolders]: any = await pool.query(
                "SELECT id FROM folders WHERE id = ? AND owner_id = ? LIMIT 1",
                [finalParentId, userId]
            );

            if (parentFolders.length === 0) {
                return NextResponse.json({ error: "Parent folder not found or unauthorized" }, { status: 403 });
            }
        }

        await pool.query(
            `INSERT INTO folders (id, name, parent_folder_id, owner_id) VALUES (?, ?, ?, ?)`,
            [folderId, name, finalParentId, userId]
        );

        // Also create the physical folder on disk
        const baseDrivePath = process.env.SERVER_BASE_DRIVE_PATH || "D:\\sheopals_drive";
        const userDrivePath = path.join(baseDrivePath, userId);
        const subFolderPath = await getFolderPath(folderId); // Use the newly created folder id to get the full path
        const fullPhysicalFolderPath = path.join(userDrivePath, subFolderPath);
        
        await fs.mkdir(fullPhysicalFolderPath, { recursive: true });

        return NextResponse.json({ success: true, folderId });
    } catch (error: any) {
        console.error("Create folder error:", error);
        return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }
}
