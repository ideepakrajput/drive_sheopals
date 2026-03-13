"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

        const fetchFolders = async () => {
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

        fetchFolders();
    }, [open, currentFolderId]);

    const filteredFolders = folders.filter((folder) => !excludeFolderIds.includes(folder.id));

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

                    <div className="space-y-2 py-6">
                        <Label htmlFor="destination-folder" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Destination
                        </Label>
                        <select
                            id="destination-folder"
                            value={destinationFolderId}
                            onChange={(e) => setDestinationFolderId(e.target.value)}
                            disabled={isLoading || isSubmitting}
                            className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground outline-none"
                        >
                            <option value="__root__">Root</option>
                            {filteredFolders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                    {folder.path}
                                </option>
                            ))}
                        </select>
                        {isLoading && (
                            <p className="text-sm text-muted-foreground">Loading folders...</p>
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
