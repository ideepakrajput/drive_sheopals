import crypto from "crypto";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ADMIN_EMAIL = "admin@sheopals.in";
const ADMIN_PASSWORD = "ADMINSheopalsDrive@#$6272";
const ADMIN_NAME = "Sheopal's Admin";
let userSchemaReady: Promise<void> | null = null;

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
    if (!storedHash || !storedHash.includes(":")) {
        return false;
    }

    const [salt, expectedHash] = storedHash.split(":");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

export async function ensureUserAuthSchema() {
    if (userSchemaReady) {
        return userSchemaReady;
    }

    userSchemaReady = (async () => {
        const [passwordColumns]: any = await pool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'password_hash'
             LIMIT 1`
        );

        if (passwordColumns.length === 0) {
            await pool.query(
                `ALTER TABLE users
                 ADD COLUMN password_hash VARCHAR(255) NULL AFTER name`
            );
        }

        const [adminColumns]: any = await pool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'is_admin'
             LIMIT 1`
        );

        if (adminColumns.length === 0) {
            await pool.query(
                `ALTER TABLE users
                 ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER password_hash`
            );
        }

        const [activeColumns]: any = await pool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'is_active'
             LIMIT 1`
        );

        if (activeColumns.length === 0) {
            await pool.query(
                `ALTER TABLE users
                 ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER is_admin`
            );
        }

        await ensureAdminUser();
    })().catch((error) => {
        userSchemaReady = null;
        throw error;
    });

    return userSchemaReady;
}

export async function ensureAdminUser() {
    const adminPasswordHash = hashPassword(ADMIN_PASSWORD);
    const [rows]: any = await pool.query(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [ADMIN_EMAIL]
    );

    if (rows.length === 0) {
        await pool.query(
            `INSERT INTO users (id, email, name, password_hash, is_admin, is_active)
             VALUES (?, ?, ?, ?, TRUE, TRUE)`,
            [crypto.randomUUID(), ADMIN_EMAIL, ADMIN_NAME, adminPasswordHash]
        );
        return;
    }

    await pool.query(
        `UPDATE users
         SET name = ?, password_hash = ?, is_admin = TRUE, is_active = TRUE
         WHERE email = ?`,
        [ADMIN_NAME, adminPasswordHash, ADMIN_EMAIL]
    );
}

export async function requireAdminSession() {
    await ensureUserAuthSchema();
    const session = await getSession();

    if (!session?.user?.isAdmin) {
        return null;
    }

    return session;
}
