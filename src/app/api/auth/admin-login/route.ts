import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encrypt } from "@/lib/auth";
import { pool } from "@/lib/db";
import { ensureUserAuthSchema, verifyPassword } from "@/lib/admin-auth";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        await ensureUserAuthSchema();

        const [rows]: any = await pool.query(
            `SELECT id, email, name, password_hash, is_admin
             FROM users
             WHERE email = ? AND is_admin = TRUE
             LIMIT 1`,
            [email]
        );

        if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
            return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
        }

        const user = rows[0];
        const sessionCookieValue = await encrypt({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isAdmin: true,
            },
        });

        const cookieStore = await cookies();
        cookieStore.set("session", sessionCookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 24 * 60 * 60,
        });

        return NextResponse.json({ message: "Admin login successful" });
    } catch (error) {
        console.error("Admin login error:", error);
        return NextResponse.json({ error: "Failed to log in" }, { status: 500 });
    }
}
