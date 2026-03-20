import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { completeUploadSession, UploadSessionError } from "@/lib/server-upload";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ uploadId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { uploadId } = await params;
        const result = await completeUploadSession({
            uploadId,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        if (error instanceof UploadSessionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 });
    }
}
