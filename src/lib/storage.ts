import { pool } from "@/lib/db";

const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;
export const STORAGE_LIMIT_EXCEEDED_MESSAGE = "Storage limit exceeded. Contact your administrator.";
let storageSchemaReady: Promise<void> | null = null;

async function ensureStorageSchema() {
    if (storageSchemaReady) {
        return storageSchemaReady;
    }

    storageSchemaReady = (async () => {
        const [columns]: any = await pool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'storage_limit'
             LIMIT 1`
        );

        if (columns.length === 0) {
            await pool.query(
                `ALTER TABLE users
                 ADD COLUMN storage_limit BIGINT DEFAULT ${DEFAULT_STORAGE_LIMIT} AFTER storage_used`
            );
        }
    })().catch((error) => {
        storageSchemaReady = null;
        throw error;
    });

    return storageSchemaReady;
}

export async function getUserStorage(userId: string) {
    await ensureStorageSchema();

    const [rows]: any = await pool.query(
        `SELECT storage_used, storage_limit
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [userId]
    );

    if (rows.length === 0) {
        throw new Error("User not found");
    }

    return {
        storageUsed: Number(rows[0].storage_used || 0),
        storageLimit: Number(rows[0].storage_limit || DEFAULT_STORAGE_LIMIT),
    };
}

export async function ensureStorageAvailable(userId: string, additionalBytes: number) {
    await ensureStorageSchema();

    const { storageUsed, storageLimit } = await getUserStorage(userId);

    if (storageUsed + additionalBytes > storageLimit) {
        throw new Error(STORAGE_LIMIT_EXCEEDED_MESSAGE);
    }
}

export async function adjustStorageUsage(userId: string, deltaBytes: number) {
    await ensureStorageSchema();

    await pool.query(
        `UPDATE users
         SET storage_used = GREATEST(storage_used + ?, 0)
         WHERE id = ?`,
        [deltaBytes, userId]
    );
}

export function bytesToGigabytes(bytes: number) {
    return bytes / 1024 / 1024 / 1024;
}

export async function listUsersWithStorage() {
    await ensureStorageSchema();

    const [rows]: any = await pool.query(
        `SELECT id, email, name, storage_used, storage_limit, is_admin, is_active
         FROM users
         ORDER BY COALESCE(name, email) ASC`
    );

    return rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        storageUsed: Number(row.storage_used || 0),
        storageLimit: Number(row.storage_limit || DEFAULT_STORAGE_LIMIT),
        isAdmin: Boolean(row.is_admin),
        isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    }));
}

export async function updateUserStorageLimit(userId: string, storageLimit: number) {
    await ensureStorageSchema();

    await pool.query(
        `UPDATE users
         SET storage_limit = ?
         WHERE id = ?`,
        [storageLimit, userId]
    );
}
