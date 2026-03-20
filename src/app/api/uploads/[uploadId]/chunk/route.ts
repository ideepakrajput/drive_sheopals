import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { appendUploadChunk, UploadSessionError } from "@/lib/server-upload";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ uploadId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { uploadId } = await params;
        const offsetHeader = request.headers.get("x-upload-offset");
        const offset = Number(offsetHeader ?? "0");

        if (!Number.isFinite(offset) || offset < 0) {
            return NextResponse.json({ error: "Invalid upload offset" }, { status: 400 });
        }

        const chunk = Buffer.from(await request.arrayBuffer());
        const result = await appendUploadChunk({
            uploadId,
            userId: session.user.id,
            offset,
            chunk,
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        if (error instanceof UploadSessionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json({ error: "Upload canceled" }, { status: 499 });
        }

        return NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 });
    }
}
