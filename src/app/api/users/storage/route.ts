import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listUsersWithStorage, updateUserStorageLimit } from "@/lib/storage";

export async function GET() {
    try {
        const session = await requireAdminSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const users = await listUsersWithStorage();
        return NextResponse.json({ users });
    } catch (error) {
        console.error("List storage users error:", error);
        return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, storageLimitGb, storageLimitBytes } = await request.json();

        if (!userId || typeof userId !== "string") {
            return NextResponse.json({ error: "User is required" }, { status: 400 });
        }

        const parsedLimitGb = storageLimitGb === undefined ? NaN : Number(storageLimitGb);
        const parsedLimitBytes = storageLimitBytes === undefined
            ? Math.round(parsedLimitGb * 1024 * 1024 * 1024)
            : Number(storageLimitBytes);

        if (!Number.isFinite(parsedLimitBytes) || parsedLimitBytes <= 0) {
            return NextResponse.json({ error: "Storage limit must be greater than 0" }, { status: 400 });
        }

        const users = await listUsersWithStorage();
        const targetUser = users.find((user: { id: string; storageUsed: number }) => user.id === userId);

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (parsedLimitBytes < targetUser.storageUsed) {
            return NextResponse.json(
                { error: "Storage limit cannot be smaller than current usage" },
                { status: 400 }
            );
        }

        await updateUserStorageLimit(userId, parsedLimitBytes);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update storage limit error:", error);
        return NextResponse.json({ error: "Failed to update storage limit" }, { status: 500 });
    }
}
