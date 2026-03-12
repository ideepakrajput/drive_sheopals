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
        const userId = session.user.id;

        // Trash the folder
        const [result]: any = await pool.query(
            "UPDATE folders SET is_trashed = 1 WHERE id = ? AND owner_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Folder not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Trash folder error:", error);
        return NextResponse.json({ error: "Failed to move folder to trash" }, { status: 500 });
    }
}
