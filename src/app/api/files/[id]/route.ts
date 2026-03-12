import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

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

        const [result]: any = await pool.query(
            "UPDATE files SET original_name = ? WHERE id = ? AND owner_id = ?",
            [name, id, userId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Rename error:", error);
        return NextResponse.json({ error: "Failed to rename file" }, { status: 500 });
    }
}
