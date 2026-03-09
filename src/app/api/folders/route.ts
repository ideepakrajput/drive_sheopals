import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import crypto from "crypto";

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

        await pool.query(
            `INSERT INTO folders (id, name, parent_folder_id, owner_id) VALUES (?, ?, ?, ?)`,
            [folderId, name, finalParentId, userId]
        );

        return NextResponse.json({ success: true, folderId });
    } catch (error: any) {
        console.error("Create folder error:", error);
        return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }
}
