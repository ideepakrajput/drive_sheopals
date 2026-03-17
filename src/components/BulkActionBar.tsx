"use client";

import { useState } from "react";
import { Copy, MoveRight, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSelection } from "@/hooks/use-selection";
import { useListFolderOptions, useMoveFile, useCopyFile, useMoveFolder, useCopyFolder } from "@/hooks/use-files";
import MoveCopyDialog from "./MoveCopyDialog";

type BulkActionBarProps = {
    currentFolderId?: string | null;
};

export default function BulkActionBar({ currentFolderId = null }: BulkActionBarProps) {
    const { selectedFiles, selectedFolders, selectionCount, clearSelection } = useSelection();
    const [bulkMode, setBulkMode] = useState<"move" | "copy" | null>(null);
    const router = useRouter();

    const { mutateAsync: listFolderOptions } = useListFolderOptions();
    const { mutateAsync: moveFile } = useMoveFile();
    const { mutateAsync: copyFile } = useCopyFile();
    const { mutateAsync: moveFolder } = useMoveFolder();
    const { mutateAsync: copyFolder } = useCopyFolder();

    if (selectionCount === 0) return null;

    const label = (() => {
        const fileCount = selectedFiles.size;
        const folderCount = selectedFolders.size;
        const parts: string[] = [];
        if (folderCount > 0) parts.push(`${folderCount} folder${folderCount > 1 ? "s" : ""}`);
        if (fileCount > 0) parts.push(`${fileCount} file${fileCount > 1 ? "s" : ""}`);
        return parts.join(", ") + " selected";
    })();

    const handleBulkSubmit = async ({ destinationFolderId }: { destinationFolderId: string | null }) => {
        const action = bulkMode === "move" ? "Moving" : "Copying";
        const toastId = toast.loading(`${action} ${selectionCount} item${selectionCount > 1 ? "s" : ""}...`);

        let successCount = 0;
        let failCount = 0;

        // Process folders first
        for (const folderId of selectedFolders) {
            try {
                if (bulkMode === "move") {
                    await moveFolder({ id: folderId, destinationFolderId });
                } else {
                    await copyFolder({ id: folderId, destinationFolderId });
                }
                successCount++;
            } catch {
                failCount++;
            }
        }

        // Process files
        for (const fileId of selectedFiles) {
            try {
                if (bulkMode === "move") {
                    await moveFile({ id: fileId, destinationFolderId });
                } else {
                    await copyFile({ id: fileId, destinationFolderId });
                }
                successCount++;
            } catch {
                failCount++;
            }
        }

        if (failCount === 0) {
            toast.success(`${bulkMode === "move" ? "Moved" : "Copied"} ${successCount} item${successCount > 1 ? "s" : ""} successfully`, { id: toastId });
        } else {
            toast.warning(`${successCount} succeeded, ${failCount} failed`, { id: toastId });
        }

        clearSelection();
        setBulkMode(null);
        router.refresh();
    };

    const excludeFolderIds = bulkMode === "move" ? Array.from(selectedFolders) : [];

    return (
        <>
            <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/80 px-5 py-3 shadow-2xl backdrop-blur-xl">
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        {label}
                    </span>

                    <div className="h-5 w-px bg-border/50" />

                    <button
                        onClick={() => setBulkMode("move")}
                        className="inline-flex items-center gap-2 rounded-xl bg-foreground/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/20"
                    >
                        <MoveRight className="h-4 w-4" />
                        Move
                    </button>

                    <button
                        onClick={() => setBulkMode("copy")}
                        className="inline-flex items-center gap-2 rounded-xl bg-foreground/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/20"
                    >
                        <Copy className="h-4 w-4" />
                        Copy
                    </button>

                    <div className="h-5 w-px bg-border/50" />

                    <button
                        onClick={clearSelection}
                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Clear selection"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {bulkMode && (
                <MoveCopyDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) setBulkMode(null);
                    }}
                    mode={bulkMode}
                    resourceType="file"
                    itemName={`${selectionCount} item${selectionCount > 1 ? "s" : ""}`}
                    currentFolderId={currentFolderId}
                    excludeFolderIds={excludeFolderIds}
                    loadFolders={async () => await listFolderOptions() as { folders?: any[] }}
                    submitAction={handleBulkSubmit}
                />
            )}
        </>
    );
}
