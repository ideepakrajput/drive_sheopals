import { pool } from "@/lib/db";

type ResourceType = "file" | "folder";
type SharePermission = "view" | "edit";

export type ResourceAccess = {
    allowed: boolean;
    isOwner: boolean;
    permission: SharePermission | null;
    ownerId: string | null;
    viaFolderId: string | null;
};

async function getDirectShare(
    resourceType: ResourceType,
    resourceId: string,
    userId: string
): Promise<{ permission: SharePermission } | null> {
    const [rows]: any = await pool.query(
        `SELECT permission
         FROM shares
         WHERE resource_type = ? AND resource_id = ? AND shared_with_user_id = ?
         LIMIT 1`,
        [resourceType, resourceId, userId]
    );

    return rows[0] ?? null;
}

export async function getFolderAncestry(folderId: string | null): Promise<string[]> {
    const ancestry: string[] = [];
    let currentId = folderId;

    while (currentId) {
        ancestry.unshift(currentId);
        const [rows]: any = await pool.query(
            "SELECT parent_folder_id FROM folders WHERE id = ? LIMIT 1",
            [currentId]
        );

        if (rows.length === 0) {
            break;
        }

        currentId = rows[0].parent_folder_id;
    }

    return ancestry;
}

export async function getDescendantFolderIds(folderId: string): Promise<string[]> {
    const result: string[] = [];
    const queue = [folderId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        result.push(currentId);

        const [rows]: any = await pool.query(
            "SELECT id FROM folders WHERE parent_folder_id = ?",
            [currentId]
        );

        for (const row of rows) {
            queue.push(row.id);
        }
    }

    return result;
}

export async function getFolderAccess(folderId: string, userId: string): Promise<ResourceAccess> {
    const [folders]: any = await pool.query(
        "SELECT owner_id FROM folders WHERE id = ? LIMIT 1",
        [folderId]
    );

    if (folders.length === 0) {
        return { allowed: false, isOwner: false, permission: null, ownerId: null, viaFolderId: null };
    }

    const folder = folders[0];
    if (folder.owner_id === userId) {
        return { allowed: true, isOwner: true, permission: "edit", ownerId: folder.owner_id, viaFolderId: folderId };
    }

    const ancestry = await getFolderAncestry(folderId);
    for (let i = ancestry.length - 1; i >= 0; i -= 1) {
        const ancestorId = ancestry[i];
        const share = await getDirectShare("folder", ancestorId, userId);
        if (share) {
            return {
                allowed: true,
                isOwner: false,
                permission: share.permission,
                ownerId: folder.owner_id,
                viaFolderId: ancestorId,
            };
        }
    }

    return { allowed: false, isOwner: false, permission: null, ownerId: folder.owner_id, viaFolderId: null };
}

export async function getFileAccess(fileId: string, userId: string): Promise<ResourceAccess> {
    const [files]: any = await pool.query(
        "SELECT owner_id, folder_id FROM files WHERE id = ? LIMIT 1",
        [fileId]
    );

    if (files.length === 0) {
        return { allowed: false, isOwner: false, permission: null, ownerId: null, viaFolderId: null };
    }

    const file = files[0];
    if (file.owner_id === userId) {
        return { allowed: true, isOwner: true, permission: "edit", ownerId: file.owner_id, viaFolderId: file.folder_id };
    }

    const directShare = await getDirectShare("file", fileId, userId);
    if (directShare) {
        return {
            allowed: true,
            isOwner: false,
            permission: directShare.permission,
            ownerId: file.owner_id,
            viaFolderId: null,
        };
    }

    if (file.folder_id) {
        const folderAccess = await getFolderAccess(file.folder_id, userId);
        if (folderAccess.allowed) {
            return {
                allowed: true,
                isOwner: false,
                permission: folderAccess.permission,
                ownerId: file.owner_id,
                viaFolderId: folderAccess.viaFolderId,
            };
        }
    }

    return { allowed: false, isOwner: false, permission: null, ownerId: file.owner_id, viaFolderId: null };
}

export async function listResourceShares(resourceType: ResourceType, resourceId: string) {
    const [rows]: any = await pool.query(
        `SELECT s.shared_with_user_id, s.permission, u.email, u.name
         FROM shares s
         INNER JOIN users u ON u.id = s.shared_with_user_id
         WHERE s.resource_type = ? AND s.resource_id = ?
         ORDER BY u.email ASC`,
        [resourceType, resourceId]
    );

    return rows;
}

export async function removeResourceShares(resourceType: ResourceType, resourceIds: string[]) {
    if (resourceIds.length === 0) {
        return;
    }

    const placeholders = resourceIds.map(() => "?").join(", ");
    await pool.query(
        `DELETE FROM shares WHERE resource_type = ? AND resource_id IN (${placeholders})`,
        [resourceType, ...resourceIds]
    );
}

export async function getResourceShareMetadata(resourceType: ResourceType, resourceIds: string[]) {
    if (resourceIds.length === 0) {
        return new Map<string, { count: number; tooltip: string }>();
    }

    const placeholders = resourceIds.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
        `SELECT s.resource_id, s.permission, u.email, u.name
         FROM shares s
         INNER JOIN users u ON u.id = s.shared_with_user_id
         WHERE s.resource_type = ? AND s.resource_id IN (${placeholders})
         ORDER BY COALESCE(u.name, u.email) ASC`,
        [resourceType, ...resourceIds]
    );

    const grouped = new Map<string, { count: number; tooltip: string }>();

    for (const row of rows) {
        const label = row.name ? `${row.name} (${row.email})` : row.email;
        const entry = grouped.get(row.resource_id);

        if (entry) {
            entry.count += 1;
            entry.tooltip = `${entry.tooltip}\n${label} - ${row.permission}`;
        } else {
            grouped.set(row.resource_id, {
                count: 1,
                tooltip: `${label} - ${row.permission}`,
            });
        }
    }

    return grouped;
}
