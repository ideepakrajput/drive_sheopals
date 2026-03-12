import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { listResourceShares } from "@/lib/sharing";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = session.user.id;

        const [folders]: any = await pool.query(
            "SELECT id FROM folders WHERE id = ? AND owner_id = ? LIMIT 1",
            [id, userId]
        );

        if (folders.length === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const shares = await listResourceShares("folder", id);
        return NextResponse.json({ shares });
    } catch (error) {
        console.error("List folder shares error:", error);
        return NextResponse.json({ error: "Failed to load shares" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const ownerId = session.user.id;
        const { email, permission } = await request.json();

        if (!email || !["view", "edit"].includes(permission)) {
            return NextResponse.json({ error: "Email and valid permission are required" }, { status: 400 });
        }

        const [folders]: any = await pool.query(
            "SELECT id FROM folders WHERE id = ? AND owner_id = ? LIMIT 1",
            [id, ownerId]
        );

        if (folders.length === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const [users]: any = await pool.query(
            "SELECT id, email FROM users WHERE email = ? LIMIT 1",
            [String(email).trim().toLowerCase()]
        );

        if (users.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const recipient = users[0];
        if (recipient.id === ownerId) {
            return NextResponse.json({ error: "You already own this folder" }, { status: 400 });
        }

        const [existing]: any = await pool.query(
            `SELECT id
             FROM shares
             WHERE resource_type = 'folder' AND resource_id = ? AND shared_with_user_id = ?
             LIMIT 1`,
            [id, recipient.id]
        );

        if (existing.length > 0) {
            await pool.query(
                "UPDATE shares SET permission = ? WHERE id = ?",
                [permission, existing[0].id]
            );
        } else {
            await pool.query(
                `INSERT INTO shares (id, resource_type, resource_id, owner_id, shared_with_user_id, permission)
                 VALUES (?, 'folder', ?, ?, ?, ?)`,
                [crypto.randomUUID(), id, ownerId, recipient.id, permission]
            );
        }

        const shares = await listResourceShares("folder", id);
        return NextResponse.json({ success: true, shares });
    } catch (error) {
        console.error("Share folder error:", error);
        return NextResponse.json({ error: "Failed to share folder" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const ownerId = session.user.id;
        const { sharedWithUserId } = await request.json();

        if (!sharedWithUserId) {
            return NextResponse.json({ error: "sharedWithUserId is required" }, { status: 400 });
        }

        await pool.query(
            `DELETE FROM shares
             WHERE resource_type = 'folder' AND resource_id = ? AND owner_id = ? AND shared_with_user_id = ?`,
            [id, ownerId, sharedWithUserId]
        );

        const shares = await listResourceShares("folder", id);
        return NextResponse.json({ success: true, shares });
    } catch (error) {
        console.error("Unshare folder error:", error);
        return NextResponse.json({ error: "Failed to remove share" }, { status: 500 });
    }
}
