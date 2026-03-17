import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { redirect } from "next/navigation";
import { getResourceShareMetadata } from "@/lib/sharing";
import TrashPageClient from "./TrashPageClient";

export default async function TrashPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch Trashed Folders
  const [folders]: any = await pool.query(
    "SELECT * FROM folders WHERE owner_id = ? AND is_trashed = TRUE ORDER BY updated_at DESC",
    [userId],
  );

  // Fetch Trashed Files
  const [files]: any = await pool.query(
    "SELECT * FROM files WHERE owner_id = ? AND is_trashed = TRUE ORDER BY updated_at DESC",
    [userId],
  );
  const folderShares = await getResourceShareMetadata(
    "folder",
    folders.map((folder: any) => folder.id),
  );
  const fileShares = await getResourceShareMetadata(
    "file",
    files.map((file: any) => file.id),
  );
  const visibleFolders = folders.map((folder: any) => ({
    ...folder,
    is_trashed: true,
    is_shared: folderShares.has(folder.id),
    shared_tooltip: folderShares.get(folder.id)?.tooltip,
  }));
  const visibleFiles = files.map((file: any) => ({
    ...file,
    is_trashed: true,
    is_shared: fileShares.has(file.id),
    shared_tooltip: fileShares.get(file.id)?.tooltip,
  }));

  return <TrashPageClient folders={visibleFolders} files={visibleFiles} />;
}
