import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listOwnerFolders } from "@/lib/server-utils";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const folders = await listOwnerFolders(session.user.id);
        return NextResponse.json({ folders });
    } catch (error) {
        console.error("List folder options error:", error);
        return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
    }
}
