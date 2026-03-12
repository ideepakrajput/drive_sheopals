"use client";

import { Download, MoreVertical, Star, Edit2, Info, Trash2, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteFile, useListFileShares, useRenameFile, useRestoreFile, useShareFile, useStarFile, useTrashFile, useUnshareFile } from "@/hooks/use-files";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ShareDialog from "./ShareDialog";

export default function FileActions({ file }: { file: any }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isSharingOpen, setIsSharingOpen] = useState(false);
    const [newName, setNewName] = useState(file.original_name);
    const [starred, setStarred] = useState(!!file.is_starred);
    const router = useRouter();
    const isOwner = file.is_owner !== false;
    const canEdit = isOwner || file.access_level === "edit";
    const canManageShares = isOwner;

    const { mutateAsync: renameFile, isPending: isRenamingLoading } = useRenameFile();
    const { mutateAsync: starFile } = useStarFile();
    const { mutateAsync: trashFile } = useTrashFile();
    const { mutateAsync: restoreFile } = useRestoreFile();
    const { mutateAsync: deleteFile } = useDeleteFile();
    const { mutateAsync: listShares } = useListFileShares();
    const { mutateAsync: shareFile } = useShareFile();
    const { mutateAsync: unshareFile } = useUnshareFile();

    const handleDownload = async () => {
        setIsDownloading(true);
        const toastId = toast.loading(`Downloading ${file.original_name}...`);

        try {
            const response = await fetch(`/api/files/${file.id}/download`);
            if (!response.ok) throw new Error("Failed to download file");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = file.original_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success("Download started", { id: toastId });
        } catch (error: any) {
            console.error("Download error:", error);
            toast.error(error.message || "Failed to download file", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === file.original_name) {
            setIsRenaming(false);
            return;
        }

        const toastId = toast.loading("Renaming file...");

        try {
            await renameFile({ id: file.id, name: newName });
            toast.success("File renamed", { id: toastId });
            setIsRenaming(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        }
    };

    const handleStar = async () => {
        if (!isOwner) return;

        const toggle = !starred;
        setStarred(toggle); // Optimistic UI

        try {
            await starFile({ id: file.id, starred: toggle });
            toast.success(toggle ? "Added to starred" : "Removed from starred");
            router.refresh();
        } catch (error) {
            setStarred(!toggle); // Rollback
            toast.error("Failed to update star status");
        }
    };

    const handleTrash = async () => {
        const toastId = toast.loading("Moving to trash...");
        try {
            await trashFile(file.id);
            toast.success("Moved to trash", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to move to trash", { id: toastId });
        }
    };

    const handleRestore = async () => {
        const toastId = toast.loading("Restoring file...");
        try {
            await restoreFile(file.id);
            toast.success("File restored", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to restore", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this file permanently? This action cannot be undone.")) return;
        
        const toastId = toast.loading("Deleting permanently...");
        try {
            await deleteFile(file.id);
            toast.success("File deleted permanent", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to delete", { id: toastId });
        }
    };

    return (
        <>
            <div className="flex items-center justify-end space-x-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                    }}
                    disabled={isDownloading}
                    className="p-1 opacity-0 group-hover:opacity-100 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-all disabled:opacity-50"
                    title="Download"
                >
                    <Download className="w-5 h-5" />
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                            title="Options"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        className="w-48 bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[130] shadow-2xl"
                    >
                        {file.is_trashed ? (
                            <>
                                <DropdownMenuItem className="cursor-pointer" onSelect={handleRestore}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    <span>Restore</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="opacity-20" />
                                <DropdownMenuItem className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer" onSelect={handleDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete permanently</span>
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <>
                                <DropdownMenuItem onSelect={handleDownload}>
                                    <Download className="mr-2 h-4 w-4" />
                                    <span>Download</span>
                                </DropdownMenuItem>
                                {isOwner && (
                                    <DropdownMenuItem onSelect={handleStar}>
                                        <Star className={`mr-2 h-4 w-4 ${starred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                                        <span>{starred ? "Unstar" : "Star"}</span>
                                    </DropdownMenuItem>
                                )}
                                {canEdit && (
                                    <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        <span>Rename</span>
                                    </DropdownMenuItem>
                                )}
                                {canManageShares && (
                                    <DropdownMenuItem onSelect={() => setIsSharingOpen(true)}>
                                        <Share2 className="mr-2 h-4 w-4" />
                                        <span>Share</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => setIsDetailsOpen(true)}>
                                    <Info className="mr-2 h-4 w-4" />
                                    <span>Details</span>
                                </DropdownMenuItem>
                                {canEdit && (
                                    <>
                                        <DropdownMenuSeparator className="opacity-20" />
                                        <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer" onSelect={handleTrash}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Move to trash</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Rename Dialog */}
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[140] shadow-2xl">
                    <form onSubmit={handleRename}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Rename File</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Enter a new name for the file.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-background/50 border-border/50 text-foreground focus:ring-primary/50 h-11"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border/10 pt-4 bg-transparent">
                            <Button type="button" variant="ghost" onClick={() => setIsRenaming(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted/50">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isRenamingLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-medium">
                                {isRenamingLoading ? "Renaming..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[140] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">File Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-6">
                        {[
                            { label: "Name", value: file.original_name },
                            { label: "Type", value: file.mime_type },
                            { label: "Size", value: `${(file.size / 1024 / 1024).toFixed(2)} MB` },
                            { label: "Owner", value: file.owner_name || file.owner_email || "You" },
                            { label: "Access", value: isOwner ? "Owner" : (file.access_level || "view") },
                            { label: "Created", value: new Date(file.created_at).toLocaleString() },
                            { label: "Modified", value: new Date(file.updated_at).toLocaleString() },
                        ].map((item) => (
                            <div key={item.label} className="grid grid-cols-3 text-sm items-center">
                                <span className="text-muted-foreground font-medium">{item.label}</span>
                                <span className="col-span-2 text-foreground truncate bg-muted/30 px-2 py-1 rounded border border-border/20">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter className="border-t border-border/10 pt-4 bg-transparent">
                        <Button onClick={() => setIsDetailsOpen(false)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-medium">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {canManageShares && (
                <ShareDialog
                    open={isSharingOpen}
                    onOpenChange={setIsSharingOpen}
                    title={`Share "${file.original_name}"`}
                    description="Invite another registered user by email."
                    loadShares={async () => await listShares(file.id) as { shares?: any[] }}
                    createShare={async (payload) => await shareFile({ id: file.id, ...payload }) as { shares?: any[] }}
                    removeShare={async ({ sharedWithUserId }) => await unshareFile({ id: file.id, sharedWithUserId }) as { shares?: any[] }}
                />
            )}
        </>
    );
}
