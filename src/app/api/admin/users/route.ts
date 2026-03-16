import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, email, storageLimitGb } = await request.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const storageLimitBytes = storageLimitGb === undefined || storageLimitGb === null
            ? 5 * 1024 * 1024 * 1024
            : Math.round(Number(storageLimitGb) * 1024 * 1024 * 1024);

        if (!Number.isFinite(storageLimitBytes) || storageLimitBytes <= 0) {
            return NextResponse.json({ error: "Storage limit must be greater than 0" }, { status: 400 });
        }

        const [existingUsers]: any = await pool.query(
            `SELECT id
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (existingUsers.length > 0) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const userId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO users (id, email, name, is_admin, storage_limit)
             VALUES (?, ?, ?, FALSE, ?)`,
            [userId, email, name?.trim() || email.split("@")[0], storageLimitBytes]
        );

        return NextResponse.json({ success: true, userId });
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
