import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const [users]: any = await pool.query(
            `SELECT id, email, name
             FROM users
             WHERE id <> ?
             ORDER BY COALESCE(name, email) ASC`,
            [userId]
        );

        return NextResponse.json({ users });
    } catch (error) {
        console.error("List users error:", error);
        return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
    }
}
