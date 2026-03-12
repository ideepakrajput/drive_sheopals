"use client";

import { useState, useRef } from "react";
import { Plus, FolderPlus, FileUp, FolderUp, Loader2 } from "lucide-react";
import { useUploadFile } from "@/hooks/use-files";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewItemButton({ folderId = null }: { folderId?: string | null }) {
    const router = useRouter();
    
    // Dialog States
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    
    // New Folder State
    const [folderName, setFolderName] = useState("");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // File/Folder Upload Ref & Hook
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const { mutateAsync: uploadFileAsync } = useUploadFile();

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!folderName.trim()) return;

        setIsCreatingFolder(true);
        const toastId = toast.loading("Creating folder...");

        try {
            const res = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: folderName, parentFolderId: folderId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create folder");
            }

            toast.success("Folder created successfully", { id: toastId });
            setIsNewFolderOpen(false);
            setFolderName("");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        let uploadedCount = 0;

        for(let i = 0; i < files.length; i++) {
           const file = files[i];
           const relativePath = file.webkitRelativePath || "";

           const displayName = file.name.includes('/') ? file.name.split('/').pop() || file.name : file.name;
           
           const toastId = toast.loading(`Uploading ${displayName}...`);
           
           try {
               await uploadFileAsync({ file, folderId, relativePath });
               uploadedCount += 1;
               toast.success(`${displayName} uploaded`, { id: toastId });
           } catch(error: any) {
               toast.error(error.message || `Failed to upload ${displayName}`, { id: toastId });
           }
        }
        
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (folderInputRef.current) folderInputRef.current.value = "";
        if (uploadedCount === 0) {
            toast.error("No files were uploaded from the selected folder");
        }
        router.refresh();
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center justify-center space-x-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black p-3 rounded-xl transition-colors shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white dark:focus:ring-offset-neutral-950">
                        <Plus className="w-5 h-5" />
                        <span>New</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 font-medium">
                    <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => setIsNewFolderOpen(true)}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        <span>New folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => fileInputRef.current?.click()}>
                        <FileUp className="mr-2 h-4 w-4" />
                        <span>File upload</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => folderInputRef.current?.click()}>
                        <FolderUp className="mr-2 h-4 w-4" />
                        <span>Folder upload</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden Inputs */}
            <input
                type="file"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />
            {/* The webkitdirectory attribute allows folder selection */}
            <input
                type="file"
                // @ts-ignore
                webkitdirectory=""
                className="hidden"
                ref={folderInputRef}
                onChange={handleFileUpload}
            />

            {/* New Folder Dialog */}
            <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleCreateFolder}>
                        <DialogHeader>
                            <DialogTitle>New folder</DialogTitle>
                            <DialogDescription>
                                Enter a name for your new folder.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={folderName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFolderName(e.target.value)}
                                    placeholder="Untitled folder"
                                    className="col-span-3"
                                    autoFocus
                                    disabled={isCreatingFolder}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsNewFolderOpen(false)} disabled={isCreatingFolder}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreatingFolder || !folderName.trim()}>
                                {isCreatingFolder ? (
                                     <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                ) : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
