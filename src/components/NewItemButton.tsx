"use client";

import { startTransition, useRef, useState } from "react";
import type { AxiosProgressEvent } from "axios";
import { Plus, FolderPlus, FileUp, FolderUp, Loader2 } from "lucide-react";
import { useUploadFile } from "@/hooks/use-files";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    estimateFinalizeDurationMs,
    FINALIZE_PROGRESS_TICK_MS,
    formatUploadTimeRemaining,
    getTransferProgress,
    getTransferTimeRemaining,
    MAX_IN_PROGRESS_PERCENT,
    PROGRESS_UI_UPDATE_INTERVAL_MS,
    TRANSFER_PROGRESS_MAX_PERCENT,
} from "@/lib/upload-progress";

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

type UploadQueueStatus = {
    fileName: string;
    progress: number;
    timeRemaining: string;
    currentIndex: number;
    totalFiles: number;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

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
    const uploadStartedAtRef = useRef<number | null>(null);
    const finalizeStartedAtRef = useRef<number | null>(null);
    const finalizeDurationMsRef = useRef<number | null>(null);
    const finalizeIntervalRef = useRef<number | null>(null);
    const lastProgressUiUpdateAtRef = useRef(0);
    const lastProgressStatusKeyRef = useRef<string | null>(null);
    const cancelRequestedRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { mutateAsync: uploadFileAsync } = useUploadFile();
    const [uploadStatus, setUploadStatus] = useState<UploadQueueStatus | null>(null);

    const clearFinalizeAnimation = () => {
        if (finalizeIntervalRef.current !== null) {
            window.clearInterval(finalizeIntervalRef.current);
            finalizeIntervalRef.current = null;
        }

        finalizeStartedAtRef.current = null;
        finalizeDurationMsRef.current = null;
    };

    const resetUploadState = () => {
        uploadStartedAtRef.current = null;
        clearFinalizeAnimation();
        lastProgressUiUpdateAtRef.current = 0;
        lastProgressStatusKeyRef.current = null;
        cancelRequestedRef.current = false;
        abortControllerRef.current = null;
        setUploadStatus(null);
    };

    const startFinalizeAnimation = (fileName: string, currentIndex: number, totalFiles: number, fileSize: number) => {
        if (finalizeStartedAtRef.current) {
            return;
        }

        clearFinalizeAnimation();
        const durationMs = estimateFinalizeDurationMs(fileSize);
        finalizeStartedAtRef.current = Date.now();
        finalizeDurationMsRef.current = durationMs;

        const updateFinalizeStatus = () => {
            if (!finalizeStartedAtRef.current || !finalizeDurationMsRef.current) {
                return;
            }

            const elapsedMs = Date.now() - finalizeStartedAtRef.current;
            const remainingMs = Math.max(finalizeDurationMsRef.current - elapsedMs, 0);
            const finalizeRange = MAX_IN_PROGRESS_PERCENT - TRANSFER_PROGRESS_MAX_PERCENT;
            const progress = Math.min(
                MAX_IN_PROGRESS_PERCENT,
                TRANSFER_PROGRESS_MAX_PERCENT + Math.round((elapsedMs / finalizeDurationMsRef.current) * finalizeRange)
            );
            const timeRemaining = remainingMs > 0 ? formatUploadTimeRemaining(remainingMs) : "Almost done...";
            const statusKey = `${progress}-${timeRemaining}-${currentIndex}-${totalFiles}`;

            lastProgressUiUpdateAtRef.current = Date.now();
            lastProgressStatusKeyRef.current = statusKey;

            setUploadStatus({
                fileName,
                progress,
                timeRemaining,
                currentIndex,
                totalFiles,
            });
        };

        updateFinalizeStatus();
        finalizeIntervalRef.current = window.setInterval(updateFinalizeStatus, FINALIZE_PROGRESS_TICK_MS);
    };

    const createProgressHandler = (fileName: string, currentIndex: number, totalFiles: number, fileSize: number) =>
        (progressEvent: AxiosProgressEvent) => {
            if (!progressEvent.total || progressEvent.total <= 0) {
                return;
            }

            if (!uploadStartedAtRef.current) {
                uploadStartedAtRef.current = Date.now();
            }

            const elapsedMs = Date.now() - uploadStartedAtRef.current;
            const hasTransferredAllBytes = progressEvent.loaded >= progressEvent.total;
            const progress = getTransferProgress(progressEvent.loaded, progressEvent.total);
            const timeRemaining = formatUploadTimeRemaining(
                getTransferTimeRemaining({
                    elapsedMs,
                    fileSize,
                    loaded: progressEvent.loaded,
                    total: progressEvent.total,
                })
            );

            if (hasTransferredAllBytes) {
                startFinalizeAnimation(fileName, currentIndex, totalFiles, fileSize);
                return;
            }

            const statusKey = `${progress}-${timeRemaining}-${currentIndex}-${totalFiles}`;
            const now = Date.now();
            const shouldUpdateUi =
                statusKey !== lastProgressStatusKeyRef.current ||
                now - lastProgressUiUpdateAtRef.current >= PROGRESS_UI_UPDATE_INTERVAL_MS;

            if (!shouldUpdateUi) {
                return;
            }

            lastProgressUiUpdateAtRef.current = now;
            lastProgressStatusKeyRef.current = statusKey;

            setUploadStatus({
                fileName,
                progress,
                timeRemaining,
                currentIndex,
                totalFiles,
            });
        };

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
            startTransition(() => {
                router.refresh();
            });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to create folder"), { id: toastId });
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        let uploadedCount = 0;
        cancelRequestedRef.current = false;

        for(let i = 0; i < files.length; i++) {
           if (cancelRequestedRef.current) {
               break;
           }

           const file = files[i];
           const relativePath = file.webkitRelativePath || "";

           const displayName = file.name.includes('/') ? file.name.split('/').pop() || file.name : file.name;
           const abortController = new AbortController();
           abortControllerRef.current = abortController;
           uploadStartedAtRef.current = Date.now();
           clearFinalizeAnimation();
           setUploadStatus({
               fileName: displayName,
               progress: 0,
               timeRemaining: "Estimating time...",
               currentIndex: i + 1,
               totalFiles: files.length,
           });
           lastProgressUiUpdateAtRef.current = Date.now();
           lastProgressStatusKeyRef.current = `0-Estimating time...-${i + 1}-${files.length}`;
           
           const toastId = toast.loading(`Uploading ${displayName}...`);
           
           try {
               await uploadFileAsync({
                   file,
                   folderId,
                   relativePath,
                   signal: abortController.signal,
                   onUploadProgress: createProgressHandler(displayName, i + 1, files.length, file.size),
               });
               uploadedCount += 1;
               toast.success(`${displayName} uploaded`, { id: toastId });
           } catch(error: unknown) {
               if (abortController.signal.aborted) {
                   toast.error(`Canceled ${displayName}`, { id: toastId });
                   break;
               }

               toast.error(getErrorMessage(error, `Failed to upload ${displayName}`), { id: toastId });
           }
        }
        
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (folderInputRef.current) folderInputRef.current.value = "";
        const wasCanceled = cancelRequestedRef.current;
        resetUploadState();

        if (uploadedCount > 0) {
            startTransition(() => {
                router.refresh();
            });
        }

        if (wasCanceled) {
            toast.message("Upload canceled");
        }
    };

    const handleCancelUpload = () => {
        cancelRequestedRef.current = true;
        abortControllerRef.current?.abort();
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        disabled={!!uploadStatus}
                        className="w-full flex items-center justify-center space-x-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black p-3 rounded-xl transition-colors shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white dark:focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
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
                // @ts-expect-error webkitdirectory is supported by browsers but not included in React's typings.
                webkitdirectory=""
                multiple
                className="hidden"
                ref={folderInputRef}
                onChange={handleFileUpload}
            />

            {uploadStatus ? (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {uploadStatus.fileName}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Uploading {uploadStatus.currentIndex} of {uploadStatus.totalFiles}
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleCancelUpload}>
                            Cancel
                        </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{uploadStatus.progress}% uploaded</span>
                        <span>{uploadStatus.timeRemaining}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                            className="h-full rounded-full bg-black transition-[width] dark:bg-white"
                            style={{ width: `${uploadStatus.progress}%` }}
                        />
                    </div>
                </div>
            ) : null}

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
