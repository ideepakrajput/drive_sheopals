import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserStorage } from "@/lib/storage";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const storage = await getUserStorage(session.user.id);

        return NextResponse.json({
            storageUsed: storage.storageUsed,
            storageLimit: storage.storageLimit,
        });
    } catch (error) {
        console.error("Get my storage error:", error);
        return NextResponse.json({ error: "Failed to load storage usage" }, { status: 500 });
    }
}
