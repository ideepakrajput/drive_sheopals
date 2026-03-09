"use client";

import { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@/hooks/use-files";
import { toast } from "sonner";

export default function FileUploadButton({ folderId = null }: { folderId?: string | null }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { mutate: uploadFile, isPending: isUploading } = useUploadFile();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading file...");

        uploadFile(
            { file, folderId },
            {
                onSuccess: () => {
                    toast.success("File uploaded successfully", { id: toastId });
                    router.refresh();
                },
                onError: (error: any) => {
                    toast.error(error.message || "Failed to upload file", { id: toastId });
                },
                onSettled: () => {
                   if (fileInputRef.current) {
                        fileInputRef.current.value = ""; // Reset input
                    }
                }
            }
        );
    };

    return (
        <div>
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload File"}
            </button>
        </div>
    );
}
