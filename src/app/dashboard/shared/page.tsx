import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import SharedPageClient from "./SharedPageClient";

export default async function SharedPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [folders]: any = await pool.query(
    `SELECT f.*, u.email AS owner_email, u.name AS owner_name, s.permission AS access_level
         FROM shares s
         INNER JOIN folders f ON f.id = s.resource_id
         INNER JOIN users u ON u.id = f.owner_id
         WHERE s.resource_type = 'folder'
           AND s.shared_with_user_id = ?
           AND f.is_trashed = FALSE
         ORDER BY f.updated_at DESC`,
    [userId],
  );

  const [files]: any = await pool.query(
    `SELECT f.*, u.email AS owner_email, u.name AS owner_name, s.permission AS access_level
         FROM shares s
         INNER JOIN files f ON f.id = s.resource_id
         INNER JOIN users u ON u.id = f.owner_id
         WHERE s.resource_type = 'file'
           AND s.shared_with_user_id = ?
           AND f.is_trashed = FALSE
         ORDER BY f.updated_at DESC`,
    [userId],
  );

  const sharedFolders = folders.map((folder: any) => ({
    ...folder,
    is_owner: false,
    is_shared: true,
    shared_tooltip: `Shared by ${folder.owner_name || folder.owner_email} - ${folder.access_level} access`,
  }));
  const sharedFiles = files.map((file: any) => ({
    ...file,
    is_owner: false,
    is_shared: true,
    shared_tooltip: `Shared by ${file.owner_name || file.owner_email} - ${file.access_level} access`,
  }));

  return <SharedPageClient folders={sharedFolders} files={sharedFiles} />;
}
