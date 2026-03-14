"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Folder, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type FolderOption = {
    id: string;
    name: string;
    path: string;
    parent_folder_id: string | null;
};

type MoveCopyDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "move" | "copy";
    resourceType: "file" | "folder";
    itemName: string;
    currentFolderId?: string | null;
    excludeFolderIds?: string[];
    loadFolders: () => Promise<{ folders?: FolderOption[] }>;
    submitAction: (payload: { destinationFolderId: string | null }) => Promise<unknown>;
};

export default function MoveCopyDialog({
    open,
    onOpenChange,
    mode,
    resourceType,
    itemName,
    currentFolderId = null,
    excludeFolderIds = [],
    loadFolders,
    submitAction,
}: MoveCopyDialogProps) {
    const [folders, setFolders] = useState<FolderOption[]>([]);
    const [destinationFolderId, setDestinationFolderId] = useState<string>(currentFolderId || "__root__");
    const [browseFolderId, setBrowseFolderId] = useState<string | null>(currentFolderId || null);
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const loadFoldersRef = useRef(loadFolders);
    const submitActionRef = useRef(submitAction);

    useEffect(() => {
        loadFoldersRef.current = loadFolders;
        submitActionRef.current = submitAction;
    }, [loadFolders, submitAction]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setDestinationFolderId(currentFolderId || "__root__");
        setBrowseFolderId(currentFolderId || null);
        setIsCreateMode(false);
        setNewFolderName("");

        void refreshFolders();
    }, [open, currentFolderId]);

    const refreshFolders = async () => {
        setIsLoading(true);
        try {
            const response = await loadFoldersRef.current();
            setFolders(response.folders || []);
        } catch (error: any) {
            toast.error(error.message || "Failed to load destination folders");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredFolders = folders.filter((folder) => !excludeFolderIds.includes(folder.id));
    const folderMap = new Map<string, FolderOption>();
    const childrenByParent = new Map<string | null, FolderOption[]>();

    for (const folder of filteredFolders) {
        folderMap.set(folder.id, folder);
        const siblings = childrenByParent.get(folder.parent_folder_id) || [];
        siblings.push(folder);
        childrenByParent.set(folder.parent_folder_id, siblings);
    }

    const visibleFolders = (childrenByParent.get(browseFolderId) || []).sort((left, right) =>
        left.name.localeCompare(right.name)
    );

    const breadcrumbFolders: FolderOption[] = [];
    let currentBreadcrumbId = browseFolderId;
    while (currentBreadcrumbId) {
        const folder = folderMap.get(currentBreadcrumbId);
        if (!folder) {
            break;
        }
        breadcrumbFolders.unshift(folder);
        currentBreadcrumbId = folder.parent_folder_id;
    }

    const selectedFolder =
        destinationFolderId === "__root__" ? null : folderMap.get(destinationFolderId) || null;
    const sourceFolder =
        currentFolderId ? folderMap.get(currentFolderId) || null : null;
    const currentBrowseFolder =
        browseFolderId ? folderMap.get(browseFolderId) || null : null;

    const goToPrevious = () => {
        if (!currentBrowseFolder) {
            return;
        }
        setBrowseFolderId(currentBrowseFolder.parent_folder_id);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            toast.error("Folder name is required");
            return;
        }

        const parentFolderId =
            destinationFolderId === "__root__" ? null : destinationFolderId;
        const toastId = toast.loading("Creating folder...");
        setIsCreatingFolder(true);

        try {
            const response = await apiClient.post("/folders", {
                name: newFolderName.trim(),
                parentFolderId,
            }) as { folderId?: string };

            await refreshFolders();
            setBrowseFolderId(parentFolderId);
            if (response.folderId) {
                setDestinationFolderId(response.folderId);
            }
            setNewFolderName("");
            setIsCreateMode(false);
            toast.success("Folder created", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to create folder", { id: toastId });
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const toastId = toast.loading(`${mode === "move" ? "Moving" : "Copying"} ${resourceType}...`);

        try {
            await submitActionRef.current({
                destinationFolderId: destinationFolderId === "__root__" ? null : destinationFolderId,
            });
            toast.success(`${resourceType === "file" ? "File" : "Folder"} ${mode === "move" ? "moved" : "copied"}`, { id: toastId });
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || `Failed to ${mode} ${resourceType}`, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[120] shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            {mode === "move" ? "Move" : "Copy"} {resourceType}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Choose where to {mode} "{itemName}".
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Current location
                            </Label>
                            <div className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-4 py-2 text-sm font-medium">
                                <Folder className="h-4 w-4 text-muted-foreground" />
                                <span>{sourceFolder?.name || "Root"}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={goToPrevious}
                            disabled={!currentBrowseFolder || isLoading || isSubmitting}
                            className="inline-flex items-center gap-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-2 overflow-x-auto text-sm text-muted-foreground">
                            <button
                                type="button"
                                onClick={() => setBrowseFolderId(null)}
                                className="whitespace-nowrap hover:text-foreground transition-colors"
                            >
                                Root
                            </button>
                            {breadcrumbFolders.map((folder, index) => (
                                <div key={folder.id} className="flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4" />
                                    <button
                                        type="button"
                                        onClick={() => setBrowseFolderId(folder.id)}
                                        className={`whitespace-nowrap transition-colors ${index === breadcrumbFolders.length - 1
                                            ? "text-foreground"
                                            : "hover:text-foreground"
                                            }`}
                                    >
                                        {folder.name}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/40">
                            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border/50 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <span>Name</span>
                                <span>Action</span>
                            </div>

                            <div className="max-h-72 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => setDestinationFolderId("__root__")}
                                    disabled={isLoading || isSubmitting}
                                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-border/30 px-5 py-3 text-left transition-colors hover:bg-muted/40 ${destinationFolderId === "__root__" ? "bg-primary/10 ring-1 ring-primary/30" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Folder className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Root</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Select</span>
                                </button>

                                {visibleFolders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        className={`grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border/30 px-5 py-3 transition-colors ${destinationFolderId === folder.id ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-muted/30"
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setDestinationFolderId(folder.id)}
                                            disabled={isSubmitting}
                                            className="flex items-center gap-3 text-left"
                                        >
                                            <Folder className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{folder.name}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBrowseFolderId(folder.id)}
                                            disabled={isSubmitting}
                                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            aria-label={`Open ${folder.name}`}
                                            title={`Open ${folder.name}`}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}

                                {!isLoading && visibleFolders.length === 0 && (
                                    <div className="px-5 py-8 text-sm text-muted-foreground">
                                        No folders inside this location.
                                    </div>
                                )}
                            </div>
                        </div>

                        {isLoading && (
                            <p className="text-sm text-muted-foreground">Loading folders...</p>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Selected destination
                            </Label>
                            <div className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-4 py-2 text-sm font-medium">
                                <Folder className="h-4 w-4 text-muted-foreground" />
                                <span>{selectedFolder?.name || "Root"}</span>
                            </div>
                        </div>

                        {isCreateMode ? (
                            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                                <div className="space-y-3">
                                    <Label htmlFor="new-folder-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        New folder in {selectedFolder?.name || "Root"}
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="new-folder-name"
                                            value={newFolderName}
                                            onChange={(event) => setNewFolderName(event.target.value)}
                                            placeholder="Enter folder name"
                                            disabled={isCreatingFolder}
                                            autoFocus
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleCreateFolder}
                                            disabled={isCreatingFolder || !newFolderName.trim()}
                                        >
                                            {isCreatingFolder ? "Creating..." : "Create"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setIsCreateMode(false);
                                                setNewFolderName("");
                                            }}
                                            disabled={isCreatingFolder}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsCreateMode(true)}
                                disabled={isLoading || isSubmitting}
                                className="inline-flex w-fit items-center gap-2 rounded-full border border-border/50 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:text-muted-foreground"
                            >
                                <FolderPlus className="h-4 w-4" />
                                <span>New folder</span>
                            </button>
                        )}

                    </div>

                    <DialogFooter className="border-t border-border/10 pt-4 bg-transparent">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted/50">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-medium">
                            {isSubmitting ? (mode === "move" ? "Moving..." : "Copying...") : (mode === "move" ? "Move" : "Copy")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
