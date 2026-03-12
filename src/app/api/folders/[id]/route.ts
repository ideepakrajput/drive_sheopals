import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getDescendantFolderIds, getFolderAccess, removeResourceShares } from "@/lib/sharing";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { name } = await request.json();
        const userId = session.user.id;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const access = await getFolderAccess(id, userId);
        if (!access.allowed || (!access.isOwner && access.permission !== "edit")) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const [result]: any = await pool.query(
            "UPDATE folders SET name = ? WHERE id = ?",
            [name, id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Rename folder error:", error);
        return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
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
        const userId = session.user.id;
        const access = await getFolderAccess(id, userId);

        if (!access.allowed || !access.isOwner) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        const descendantFolderIds = await getDescendantFolderIds(id);

        const [result]: any = await pool.query(
            "DELETE FROM folders WHERE id = ? AND owner_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        await removeResourceShares("folder", descendantFolderIds);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete folder error:", error);
        return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }
}
