import { Star } from "lucide-react";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { redirect } from "next/navigation";
import { getResourceShareMetadata } from "@/lib/sharing";
import StarredPageClient from "./StarredPageClient";

export default async function StarredPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [files]: any = await pool.query(
    "SELECT * FROM files WHERE owner_id = ? AND is_starred = TRUE AND is_trashed = FALSE ORDER BY created_at DESC",
    [userId],
  );
  const fileShares = await getResourceShareMetadata(
    "file",
    files.map((file: any) => file.id),
  );
  const visibleFiles = files.map((file: any) => ({
    ...file,
    is_shared: fileShares.has(file.id),
    shared_tooltip: fileShares.get(file.id)?.tooltip,
  }));

  return <StarredPageClient files={visibleFiles} />;
}
