import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cancelUploadSession, UploadSessionError } from "@/lib/server-upload";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ uploadId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { uploadId } = await params;
        await cancelUploadSession({
            uploadId,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof UploadSessionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json({ error: "Failed to cancel upload" }, { status: 500 });
    }
}
