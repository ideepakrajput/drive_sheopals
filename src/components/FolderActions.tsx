"use client";

import { MoreVertical, Edit2, Trash2, Info, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteFolder, useListFolderShares, useRenameFolder, useRestoreFolder, useShareFolder, useTrashFolder, useUnshareFolder } from "@/hooks/use-files";
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

export default function FolderActions({ folder }: { folder: any }) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isSharingOpen, setIsSharingOpen] = useState(false);
    const [newName, setNewName] = useState(folder.name);
    const router = useRouter();
    const isOwner = folder.is_owner !== false;
    const canEdit = isOwner || folder.access_level === "edit";
    const canManageShares = isOwner;

    const { mutateAsync: renameFolder, isPending: isRenamingLoading } = useRenameFolder();
    const { mutateAsync: trashFolder } = useTrashFolder();
    const { mutateAsync: restoreFolder } = useRestoreFolder();
    const { mutateAsync: deleteFolder } = useDeleteFolder();
    const { mutateAsync: listShares } = useListFolderShares();
    const { mutateAsync: shareFolder } = useShareFolder();
    const { mutateAsync: unshareFolder } = useUnshareFolder();

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === folder.name) {
            setIsRenaming(false);
            return;
        }

        const toastId = toast.loading("Renaming folder...");

        try {
            await renameFolder({ id: folder.id, name: newName });
            toast.success("Folder renamed", { id: toastId });
            setIsRenaming(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to rename folder", { id: toastId });
        }
    };

    const handleTrash = async () => {
        const toastId = toast.loading("Moving folder to trash...");
        try {
            await trashFolder(folder.id);
            toast.success("Folder moved to trash", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to move folder to trash", { id: toastId });
        }
    };

    const handleRestore = async () => {
        const toastId = toast.loading("Restoring folder...");
        try {
            await restoreFolder(folder.id);
            toast.success("Folder restored", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to restore folder", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this folder permanently? All contents will be lost and this action cannot be undone.")) return;

        const toastId = toast.loading("Deleting folder permanently...");
        try {
            await deleteFolder(folder.id);
            toast.success("Folder deleted permanently", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to delete folder", { id: toastId });
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                        title="Options"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-48 bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[130] shadow-2xl">
                    {folder.is_trashed ? (
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
                            {canEdit && (
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsRenaming(true)}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    <span>Rename</span>
                                </DropdownMenuItem>
                            )}
                            {canManageShares && (
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsSharingOpen(true)}>
                                    <Share2 className="mr-2 h-4 w-4" />
                                    <span>Share</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer" onSelect={() => setIsDetailsOpen(true)}>
                                <Info className="mr-2 h-4 w-4" />
                                <span>Details</span>
                            </DropdownMenuItem>
                            {canEdit && (
                                <>
                                    <DropdownMenuSeparator className="opacity-20" />
                                    <DropdownMenuItem className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer" onSelect={handleTrash}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Move to trash</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Rename Dialog */}
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[140] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={handleRename}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Rename Folder</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Enter a new name for the folder.
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
                <DialogContent className="bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[140] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Folder Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-6">
                        {[
                            { label: "Name", value: folder.name },
                            { label: "Type", value: "Folder" },
                            { label: "Owner", value: folder.owner_name || folder.owner_email || "You" },
                            { label: "Access", value: isOwner ? "Owner" : (folder.access_level || "view") },
                            { label: "Created", value: new Date(folder.created_at).toLocaleString() },
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
                    title={`Share "${folder.name}"`}
                    description="Sharing a folder grants access to all nested folders and files."
                    loadShares={async () => await listShares(folder.id) as { shares?: any[] }}
                    createShare={async (payload) => await shareFolder({ id: folder.id, ...payload }) as { shares?: any[] }}
                    removeShare={async ({ sharedWithUserId }) => await unshareFolder({ id: folder.id, sharedWithUserId }) as { shares?: any[] }}
                />
            )}
        </>
    );
}
