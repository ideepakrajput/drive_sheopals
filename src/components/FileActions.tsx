"use client";

import { Download, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function FileActions({ file }: { file: any }) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        const toastId = toast.loading(`Downloading ${file.original_name}...`);

        try {
            const response = await fetch(`/api/files/${file.id}/download`);
            if (!response.ok) {
                // Try to parse JSON error message if possible
                let errorMessage = "Failed to download file";
                try {
                  const errorData = await response.json();
                  if (errorData.error) errorMessage = errorData.error;
                } catch {
                  // Fallback to default
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = file.original_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast.success("File downloaded successfully", { id: toastId });
        } catch (error: any) {
            console.error("Download error:", error);
            toast.error(error.message || "Failed to download file", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                title="Download"
            >
                <Download className="w-5 h-5" />
            </button>
            <button
                className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                title="Options"
            >
                <MoreVertical className="w-5 h-5" />
            </button>
        </div>
    );
}
