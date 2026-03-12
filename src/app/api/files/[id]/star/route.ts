import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

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
        const { starred } = await request.json();
        const userId = session.user.id;

        const [result]: any = await pool.query(
            "UPDATE files SET is_starred = ? WHERE id = ? AND owner_id = ?",
            [starred ? 1 : 0, id, userId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Star error:", error);
        return NextResponse.json({ error: "Failed to update star status" }, { status: 500 });
    }
}
