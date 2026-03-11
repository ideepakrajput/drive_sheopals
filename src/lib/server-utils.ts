import { pool } from "./db";
import path from "path";

export async function getFolderPath(folderId: string | null): Promise<string> {
    if (!folderId) return "";

    let currentId: string | null = folderId;
    const pathParts: string[] = [];

    while (currentId) {
        const [rows]: any = await pool.query(
            "SELECT id, name, parent_folder_id FROM folders WHERE id = ?",
            [currentId]
        );

        if (rows.length === 0) break;

        const folder = rows[0];
        pathParts.unshift(folder.name); // prepend
        currentId = folder.parent_folder_id;
    }

    return path.join(...pathParts);
}
