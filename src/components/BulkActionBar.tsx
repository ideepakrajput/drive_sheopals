"use client";

import { useState } from "react";
import { Copy, ExternalLink, MoveRight, Share2, Star, StarOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSelection } from "@/hooks/use-selection";
import {
    useListFolderOptions,
    useMoveFile,
    useCopyFile,
    useMoveFolder,
    useCopyFolder,
    useStarFile,
    useTrashFile,
    useTrashFolder,
    useRestoreFile,
    useRestoreFolder,
    useDeleteFile,
    useDeleteFolder,
    useShareFile,
    useShareFolder,
} from "@/hooks/use-files";
import { apiClient } from "@/lib/api-client";
import MoveCopyDialog from "./MoveCopyDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Page context determines which bulk actions to show
export type BulkPageContext = "default" | "starred" | "shared" | "trash" | "recent";

type BulkActionBarProps = {
    currentFolderId?: string | null;
    pageContext?: BulkPageContext;
    files?: any[]; // pass files to read is_starred state for toggling
};

type UserOption = {
    id: string;
    email: string;
    name: string | null;
};

export default function BulkActionBar({ currentFolderId = null, pageContext = "default", files = [] }: BulkActionBarProps) {
    const { selectedFiles, selectedFolders, selectionCount, clearSelection } = useSelection();
    const [bulkMode, setBulkMode] = useState<"move" | "copy" | null>(null);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const router = useRouter();

    const { mutateAsync: listFolderOptions } = useListFolderOptions();
    const { mutateAsync: moveFile } = useMoveFile();
    const { mutateAsync: copyFile } = useCopyFile();
    const { mutateAsync: moveFolder } = useMoveFolder();
    const { mutateAsync: copyFolder } = useCopyFolder();
    const { mutateAsync: starFile } = useStarFile();
    const { mutateAsync: trashFile } = useTrashFile();
    const { mutateAsync: trashFolder } = useTrashFolder();
    const { mutateAsync: restoreFile } = useRestoreFile();
    const { mutateAsync: restoreFolder } = useRestoreFolder();
    const { mutateAsync: deleteFile } = useDeleteFile();
    const { mutateAsync: deleteFolder } = useDeleteFolder();
    const { mutateAsync: shareFile } = useShareFile();
    const { mutateAsync: shareFolder } = useShareFolder();

    if (selectionCount === 0) return null;

    const isTrash = pageContext === "trash";
    const isShared = pageContext === "shared";

    const label = (() => {
        const fileCount = selectedFiles.size;
        const folderCount = selectedFolders.size;
        const parts: string[] = [];
        if (folderCount > 0) parts.push(`${folderCount} folder${folderCount > 1 ? "s" : ""}`);
        if (fileCount > 0) parts.push(`${fileCount} file${fileCount > 1 ? "s" : ""}`);
        return parts.join(", ") + " selected";
    })();

    // Check if all selected files are starred (for toggle label)
    const allSelectedFilesStarred = (() => {
        if (selectedFiles.size === 0) return false;
        const fileMap = new Map(files.map((f) => [f.id, f]));
        for (const id of selectedFiles) {
            const file = fileMap.get(id);
            if (!file || !file.is_starred) return false;
        }
        return true;
    })();

    // --- Bulk Move/Copy ---
    const handleBulkSubmit = async ({ destinationFolderId }: { destinationFolderId: string | null }) => {
        const action = bulkMode === "move" ? "Moving" : "Copying";
        const toastId = toast.loading(`${action} ${selectionCount} item${selectionCount > 1 ? "s" : ""}...`);
        let successCount = 0;
        let failCount = 0;

        for (const folderId of selectedFolders) {
            try {
                if (bulkMode === "move") await moveFolder({ id: folderId, destinationFolderId });
                else await copyFolder({ id: folderId, destinationFolderId });
                successCount++;
            } catch { failCount++; }
        }
        for (const fileId of selectedFiles) {
            try {
                if (bulkMode === "move") await moveFile({ id: fileId, destinationFolderId });
                else await copyFile({ id: fileId, destinationFolderId });
                successCount++;
            } catch { failCount++; }
        }

        if (failCount === 0) toast.success(`${bulkMode === "move" ? "Moved" : "Copied"} ${successCount} item${successCount > 1 ? "s" : ""} successfully`, { id: toastId });
        else toast.warning(`${successCount} succeeded, ${failCount} failed`, { id: toastId });

        clearSelection();
        setBulkMode(null);
        router.refresh();
    };

    // --- Bulk Star (toggle) ---
    const handleBulkStar = async () => {
        if (selectedFiles.size === 0) {
            toast.info("Star is only available for files");
            return;
        }
        const newStarred = !allSelectedFilesStarred;
        const actionLabel = newStarred ? "Starring" : "Unstarring";
        const toastId = toast.loading(`${actionLabel} ${selectedFiles.size} file${selectedFiles.size > 1 ? "s" : ""}...`);
        let successCount = 0;
        let failCount = 0;

        for (const fileId of selectedFiles) {
            try {
                await starFile({ id: fileId, starred: newStarred });
                successCount++;
            } catch { failCount++; }
        }

        const doneLabel = newStarred ? "Starred" : "Unstarred";
        if (failCount === 0) toast.success(`${doneLabel} ${successCount} file${successCount > 1 ? "s" : ""}`, { id: toastId });
        else toast.warning(`${successCount} ${doneLabel.toLowerCase()}, ${failCount} failed`, { id: toastId });

        clearSelection();
        router.refresh();
    };

    // --- Bulk Trash ---
    const handleBulkTrash = async () => {
        const toastId = toast.loading(`Moving ${selectionCount} item${selectionCount > 1 ? "s" : ""} to trash...`);
        let successCount = 0;
        let failCount = 0;

        for (const folderId of selectedFolders) {
            try { await trashFolder(folderId); successCount++; } catch { failCount++; }
        }
        for (const fileId of selectedFiles) {
            try { await trashFile(fileId); successCount++; } catch { failCount++; }
        }

        if (failCount === 0) toast.success(`Moved ${successCount} item${successCount > 1 ? "s" : ""} to trash`, { id: toastId });
        else toast.warning(`${successCount} trashed, ${failCount} failed`, { id: toastId });

        clearSelection();
        router.refresh();
    };

    // --- Bulk Restore ---
    const handleBulkRestore = async () => {
        const toastId = toast.loading(`Restoring ${selectionCount} item${selectionCount > 1 ? "s" : ""}...`);
        let successCount = 0;
        let failCount = 0;

        for (const folderId of selectedFolders) {
            try { await restoreFolder(folderId); successCount++; } catch { failCount++; }
        }
        for (const fileId of selectedFiles) {
            try { await restoreFile(fileId); successCount++; } catch { failCount++; }
        }

        if (failCount === 0) toast.success(`Restored ${successCount} item${successCount > 1 ? "s" : ""}`, { id: toastId });
        else toast.warning(`${successCount} restored, ${failCount} failed`, { id: toastId });

        clearSelection();
        router.refresh();
    };

    // --- Bulk Delete Permanently ---
    const handleBulkDeletePermanently = async () => {
        if (!confirm(`Are you sure you want to permanently delete ${selectionCount} item${selectionCount > 1 ? "s" : ""}? This cannot be undone.`)) return;

        const toastId = toast.loading(`Deleting ${selectionCount} item${selectionCount > 1 ? "s" : ""} permanently...`);
        let successCount = 0;
        let failCount = 0;

        for (const folderId of selectedFolders) {
            try { await deleteFolder(folderId); successCount++; } catch { failCount++; }
        }
        for (const fileId of selectedFiles) {
            try { await deleteFile(fileId); successCount++; } catch { failCount++; }
        }

        if (failCount === 0) toast.success(`Permanently deleted ${successCount} item${successCount > 1 ? "s" : ""}`, { id: toastId });
        else toast.warning(`${successCount} deleted, ${failCount} failed`, { id: toastId });

        clearSelection();
        router.refresh();
    };

    // --- Bulk Share ---
    const openShareDialog = async () => {
        setIsShareOpen(true);
        setShareEmail("");
        setSharePermission("view");
        setIsLoadingUsers(true);
        try {
            const response = await apiClient.get("/users") as { users?: UserOption[] };
            setUsers(response.users || []);
        } catch { toast.error("Failed to load users"); }
        finally { setIsLoadingUsers(false); }
    };

    const handleBulkShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shareEmail) return;

        setIsSharing(true);
        const toastId = toast.loading(`Sharing ${selectionCount} item${selectionCount > 1 ? "s" : ""}...`);
        let successCount = 0;
        let failCount = 0;

        for (const folderId of selectedFolders) {
            try { await shareFolder({ id: folderId, email: shareEmail, permission: sharePermission }); successCount++; } catch { failCount++; }
        }
        for (const fileId of selectedFiles) {
            try { await shareFile({ id: fileId, email: shareEmail, permission: sharePermission }); successCount++; } catch { failCount++; }
        }

        if (failCount === 0) toast.success(`Shared ${successCount} item${successCount > 1 ? "s" : ""} successfully`, { id: toastId });
        else toast.warning(`${successCount} shared, ${failCount} failed`, { id: toastId });

        setIsSharing(false);
        setIsShareOpen(false);
        clearSelection();
        router.refresh();
    };

    const excludeFolderIds = bulkMode === "move" ? Array.from(selectedFolders) : [];
    const btnClass = "inline-flex items-center gap-2 rounded-xl bg-foreground/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/20";
    const dangerBtnClass = "inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400";

    return (
        <>
            <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/80 px-5 py-3 shadow-2xl backdrop-blur-xl">
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        {label}
                    </span>

                    <div className="h-5 w-px bg-border/50" />

                    {isTrash ? (
                        /* ---- Trash page actions: Restore & Delete Permanently ---- */
                        <>
                            <button onClick={handleBulkRestore} className={btnClass}>
                                <ExternalLink className="h-4 w-4" />
                                Restore
                            </button>
                            <button onClick={handleBulkDeletePermanently} className={dangerBtnClass}>
                                <Trash2 className="h-4 w-4" />
                                Delete permanently
                            </button>
                        </>
                    ) : (
                        /* ---- Normal page actions ---- */
                        <>
                            {/* Move & Copy — not on shared page (user doesn't own items) */}
                            {!isShared && (
                                <>
                                    <button onClick={() => setBulkMode("move")} className={btnClass}>
                                        <MoveRight className="h-4 w-4" />
                                        Move
                                    </button>
                                    <button onClick={() => setBulkMode("copy")} className={btnClass}>
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </button>
                                </>
                            )}

                            {/* Star toggle — files only, not on shared page */}
                            {!isShared && (
                                <button onClick={handleBulkStar} className={btnClass}>
                                    {allSelectedFilesStarred ? (
                                        <><StarOff className="h-4 w-4" /> Unstar</>
                                    ) : (
                                        <><Star className="h-4 w-4" /> Star</>
                                    )}
                                </button>
                            )}

                            {/* Share — not on shared page */}
                            {!isShared && (
                                <button onClick={openShareDialog} className={btnClass}>
                                    <Share2 className="h-4 w-4" />
                                    Share
                                </button>
                            )}

                            {/* Trash — not on shared page */}
                            {!isShared && (
                                <button onClick={handleBulkTrash} className={dangerBtnClass}>
                                    <Trash2 className="h-4 w-4" />
                                    Trash
                                </button>
                            )}
                        </>
                    )}

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

            {/* Move / Copy Dialog */}
            {bulkMode && (
                <MoveCopyDialog
                    open={true}
                    onOpenChange={(open) => { if (!open) setBulkMode(null); }}
                    mode={bulkMode}
                    resourceType="file"
                    itemName={`${selectionCount} item${selectionCount > 1 ? "s" : ""}`}
                    currentFolderId={currentFolderId}
                    excludeFolderIds={excludeFolderIds}
                    loadFolders={async () => await listFolderOptions() as { folders?: any[] }}
                    submitAction={handleBulkSubmit}
                />
            )}

            {/* Bulk Share Dialog */}
            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogContent className="bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[120] shadow-2xl">
                    <form onSubmit={handleBulkShare}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">
                                Share {selectionCount} item{selectionCount > 1 ? "s" : ""}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Share all selected files and folders with a user.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-share-user" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</Label>
                                {isLoadingUsers ? (
                                    <p className="text-sm text-muted-foreground">Loading users...</p>
                                ) : (
                                    <select id="bulk-share-user" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground outline-none">
                                        <option value="">Select a user</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.email}>
                                                {user.name ? `${user.name} (${user.email})` : user.email}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bulk-share-permission" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permission</Label>
                                <select id="bulk-share-permission" value={sharePermission} onChange={(e) => setSharePermission(e.target.value as "view" | "edit")}
                                    className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground outline-none">
                                    <option value="view">View</option>
                                    <option value="edit">Edit</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/10 pt-4 bg-transparent">
                            <Button type="button" variant="ghost" onClick={() => setIsShareOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted/50">Cancel</Button>
                            <Button type="submit" disabled={isSharing || !shareEmail} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-medium">
                                {isSharing ? "Sharing..." : "Share All"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
