"use client";

import { X, Download, MoreVertical, Star, Edit2, Info, ChevronLeft, ChevronRight, Maximize2, Trash2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRenameFile, useStarFile, useTrashFile, useRestoreFile, useDeleteFile } from "@/hooks/use-files";
import { apiClient } from "@/lib/api-client";

interface FilePreviewProps {
    file: any;
    allFiles: any[];
    onClose: () => void;
}

export default function FilePreview({ file: initialFile, allFiles, onClose }: FilePreviewProps) {
    const [currentIndex, setCurrentIndex] = useState(allFiles.findIndex(f => f.id === initialFile.id));
    const file = allFiles[currentIndex];

    const [starred, setStarred] = useState(!!file.is_starred);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [newName, setNewName] = useState(file.original_name);
    const router = useRouter();

    // Sync state when file changes (important for navigation)
    useEffect(() => {
        setStarred(!!file.is_starred);
        setNewName(file.original_name);
    }, [file]);

    const handleNext = () => {
        if (currentIndex < allFiles.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setCurrentIndex(0); // Loop back
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            setCurrentIndex(allFiles.length - 1); // Loop back
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const { mutateAsync: renameFile, isPending: isRenamingLoading } = useRenameFile();
    const { mutateAsync: starFile } = useStarFile();
    const { mutateAsync: trashFile } = useTrashFile();
    const { mutateAsync: restoreFile } = useRestoreFile();
    const { mutateAsync: deleteFile } = useDeleteFile();

    // Disable scrolling when preview is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleStar = async () => {
        const toggle = !starred;
        setStarred(toggle);

        try {
            await starFile({ id: file.id, starred: toggle });
            router.refresh();
        } catch (error) {
            setStarred(!toggle);
        }
    };

    const handleDownload = async () => {
        const toastId = toast.loading(`Downloading ${file.original_name}...`);
        try {
            const response = await fetch(`/api/files/${file.id}/download`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.original_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Download started", { id: toastId });
        } catch (error) {
            toast.error("Download failed", { id: toastId });
            console.error("Download failed", error);
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

    const handleTrash = async () => {
        const toastId = toast.loading("Moving to trash...");
        try {
            await trashFile(file.id);
            toast.success("Moved to trash", { id: toastId });
            onClose(); // Close preview since file is gone from current folder
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
            onClose();
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
            toast.success("File deleted永久", { id: toastId });
            onClose();
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to delete", { id: toastId });
        }
    };

    const isImage = file.mime_type?.includes('image/');
    const isPDF = file.mime_type?.includes('pdf');

    return (
        <div className="fixed inset-0 z-[100] bg-background/95 dark:bg-neutral-950/95 flex flex-col items-center justify-center text-foreground animate-in fade-in duration-200">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-background/50 dark:bg-neutral-900/50 backdrop-blur-md border-b border-border/10">
                <div className="flex items-center space-x-4 max-w-[60%]">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-foreground/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="truncate">
                        <h2 className="text-sm font-medium truncate">{file.original_name}</h2>
                        <p className="text-xs text-muted-foreground">Modified {new Date(file.updated_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-foreground/10"
                        onClick={handleDownload}
                    >
                        <Download className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-foreground/10 transition-all duration-200"
                        onClick={handleStar}
                        title={starred ? "Remove from starred" : "Add to starred"}
                    >
                        <Star 
                            className={`w-5 h-5 transition-all duration-200 ${
                                starred 
                                    ? "text-yellow-500 fill-yellow-500" 
                                    : "text-muted-foreground hover:text-yellow-500 hover:fill-yellow-500/30"
                            }`} 
                        />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-foreground/10">
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-48 bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[130] shadow-2xl"
                        >
                            {file.is_trashed ? (
                                <>
                                    <DropdownMenuItem className="cursor-pointer" onClick={handleRestore}>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        <span>Restore</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="opacity-20" />
                                    <DropdownMenuItem className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer" onClick={handleDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete permanently</span>
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={() => setIsRenaming(true)}>
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        <span>Rename</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={() => setIsDetailsOpen(true)}>
                                        <Info className="mr-2 h-4 w-4" />
                                        <span>Details</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="opacity-20" />
                                    <DropdownMenuItem className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer" onClick={handleTrash}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Move to trash</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        <Maximize2 className="mr-2 h-4 w-4" />
                                        <span>Open in new window</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full flex items-center justify-center p-8 mt-16 pb-20 overflow-auto">
                {isImage ? (
                    <img
                        src={`/api/files/${file.id}/download?preview=1`}
                        alt={file.original_name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform"
                    />
                ) : isPDF ? (
                    <iframe
                        src={`/api/files/${file.id}/download?preview=1#toolbar=0`}
                        className="w-full h-full max-w-4xl bg-white rounded-lg shadow-2xl"
                        title={file.original_name}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center bg-neutral-900 p-12 rounded-2xl border border-neutral-800 text-center">
                        <div className="w-20 h-20 bg-neutral-800 rounded-2xl flex items-center justify-center mb-6">
                            <Info className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No preview available</h3>
                        <p className="text-neutral-400 mb-6">This file type cannot be previewed. Download it to view.</p>
                        <Button onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4" />
                            Download File
                        </Button>
                    </div>
                )}
            </div>

            {/* Navigation Arrows (Placeholder for multiple files) */}
            {/* Navigation Arrows */}
            <button
                onClick={handlePrev}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-foreground/5 hover:bg-foreground/10 rounded-full transition-all text-foreground/50 hover:text-foreground hidden lg:block group"
            >
                <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-foreground/5 hover:bg-foreground/10 rounded-full transition-all text-foreground/50 hover:text-foreground hidden lg:block group"
            >
                <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Rename Dialog */}
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-xl border-border/50 text-foreground z-[140] shadow-2xl">
                    <form onSubmit={handleRename}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Rename File</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Give your file a new name.
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
        </div>
    );
}

