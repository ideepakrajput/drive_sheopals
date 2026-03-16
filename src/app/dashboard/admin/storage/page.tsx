import { redirect } from "next/navigation";

export default function LegacyStorageAdminRedirect() {
    redirect("/admin/users");
}
