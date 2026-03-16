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
            `INSERT INTO users (id, email, name, is_admin, is_active, storage_limit)
             VALUES (?, ?, ?, FALSE, TRUE, ?)`,
            [userId, email, name?.trim() || email.split("@")[0], storageLimitBytes]
        );

        return NextResponse.json({ success: true, userId });
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, name, email, storageLimitGb, isActive } = await request.json();

        if (!userId || typeof userId !== "string") {
            return NextResponse.json({ error: "User is required" }, { status: 400 });
        }

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const storageLimitBytes = Math.round(Number(storageLimitGb) * 1024 * 1024 * 1024);
        if (!Number.isFinite(storageLimitBytes) || storageLimitBytes <= 0) {
            return NextResponse.json({ error: "Storage limit must be greater than 0" }, { status: 400 });
        }

        const [rows]: any = await pool.query(
            `SELECT id, storage_used, is_admin
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (rows[0].is_admin) {
            return NextResponse.json({ error: "Admin user cannot be edited here" }, { status: 400 });
        }

        if (storageLimitBytes < Number(rows[0].storage_used || 0)) {
            return NextResponse.json({ error: "Storage limit cannot be smaller than current usage" }, { status: 400 });
        }

        const [emailRows]: any = await pool.query(
            `SELECT id
             FROM users
             WHERE email = ? AND id <> ?
             LIMIT 1`,
            [email, userId]
        );

        if (emailRows.length > 0) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }

        await pool.query(
            `UPDATE users
             SET name = ?, email = ?, is_active = ?, storage_limit = ?
             WHERE id = ?`,
            [name?.trim() || email.split("@")[0], email.trim(), Boolean(isActive), storageLimitBytes, userId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
