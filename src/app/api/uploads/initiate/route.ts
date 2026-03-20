import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { STORAGE_LIMIT_EXCEEDED_MESSAGE } from "@/lib/storage";
import { createUploadSession, UploadSessionError } from "@/lib/server-upload";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const result = await createUploadSession({
            userId: session.user.id,
            originalName: String(body.fileName ?? ""),
            mimeType: String(body.mimeType ?? ""),
            size: Number(body.size ?? 0),
            folderId: typeof body.folderId === "string" || body.folderId === null ? body.folderId : null,
            relativePath: typeof body.relativePath === "string" ? body.relativePath : null,
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        if (error instanceof UploadSessionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        if (error instanceof Error && error.message === STORAGE_LIMIT_EXCEEDED_MESSAGE) {
            return NextResponse.json({ error: STORAGE_LIMIT_EXCEEDED_MESSAGE }, { status: 400 });
        }

        return NextResponse.json({ error: "Failed to initiate upload" }, { status: 500 });
    }
}
