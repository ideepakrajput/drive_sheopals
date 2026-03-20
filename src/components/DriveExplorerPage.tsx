"use client";

import Link from "next/link";
import { startTransition, useMemo, useRef, useState } from "react";
import { ChevronRight, FileUp, Folder, Home, Search, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import FileTable from "@/components/FileTable";
import FolderActions from "@/components/FolderActions";
import FileUploadButton from "@/components/FileUploadButton";
import BulkActionBar from "@/components/BulkActionBar";
import { useSelection } from "@/hooks/use-selection";
import { useUploadFile } from "@/hooks/use-files";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AxiosProgressEvent } from "axios";
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

type Breadcrumb = {
    id: string;
    name: string;
};

type DriveFolder = {
    id: string;
    name?: string | null;
    is_shared?: boolean;
    shared_tooltip?: string | null;
    is_owner?: boolean;
    access_level?: string | null;
};

type DriveFile = {
    id: string;
    original_name?: string | null;
    webkitRelativePath?: string;
};

type DriveExplorerPageProps = {
    title?: string;
    breadcrumbs?: Breadcrumb[];
    currentFolderName?: string;
    folders: DriveFolder[];
    files: DriveFile[];
    allowUpload?: boolean;
    uploadFolderId?: string | null;
    sharedBanner?: string | null;
    emptyTitle?: string;
    emptyDescription?: string;
};

type DropUploadStatus = {
    fileName: string;
    progress: number;
    timeRemaining: string;
    currentIndex: number;
    totalFiles: number;
};

export default function DriveExplorerPage({
    title,
    breadcrumbs = [],
    currentFolderName,
    folders,
    files,
    allowUpload = false,
    uploadFolderId = null,
    sharedBanner = null,
    emptyTitle = "This folder is empty",
    emptyDescription = "Drag and drop files here to upload",
}: DriveExplorerPageProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [isDragActive, setIsDragActive] = useState(false);
    const [isDropUploading, setIsDropUploading] = useState(false);
    const [dropUploadStatus, setDropUploadStatus] = useState<DropUploadStatus | null>(null);
    const dragDepthRef = useRef(0);
    const uploadStartedAtRef = useRef<number | null>(null);
    const finalizeStartedAtRef = useRef<number | null>(null);
    const finalizeDurationMsRef = useRef<number | null>(null);
    const finalizeIntervalRef = useRef<number | null>(null);
    const lastProgressUiUpdateAtRef = useRef(0);
    const lastProgressStatusKeyRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { isFolderSelected, toggleFolder, selectionCount } = useSelection();
    const { mutateAsync: uploadFileAsync } = useUploadFile();

    const normalizedSearch = search.trim().toLowerCase();

    const filteredFolders = useMemo(() => {
        if (!normalizedSearch) return folders;
        return folders.filter((folder) =>
            String(folder.name || "").toLowerCase().includes(normalizedSearch)
        );
    }, [folders, normalizedSearch]);

    const filteredFiles = useMemo(() => {
        if (!normalizedSearch) return files;
        return files.filter((file) =>
            String(file.original_name || "").toLowerCase().includes(normalizedSearch)
        );
    }, [files, normalizedSearch]);

    const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

    const clearFinalizeAnimation = () => {
        if (finalizeIntervalRef.current !== null) {
            window.clearInterval(finalizeIntervalRef.current);
            finalizeIntervalRef.current = null;
        }

        finalizeStartedAtRef.current = null;
        finalizeDurationMsRef.current = null;
    };

    const resetDropUploadState = () => {
        uploadStartedAtRef.current = null;
        clearFinalizeAnimation();
        lastProgressUiUpdateAtRef.current = 0;
        lastProgressStatusKeyRef.current = null;
        abortControllerRef.current = null;
        setDropUploadStatus(null);
        setIsDropUploading(false);
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

            setDropUploadStatus({
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

            setDropUploadStatus({
                fileName,
                progress,
                timeRemaining,
                currentIndex,
                totalFiles,
            });
        };

    const uploadDroppedFiles = async (droppedFiles: File[]) => {
        if (!allowUpload || droppedFiles.length === 0) {
            return;
        }

        let uploadedCount = 0;
        const toastId = toast.loading(
            droppedFiles.length === 1 ? `Uploading ${droppedFiles[0].name}...` : `Uploading ${droppedFiles.length} files...`
        );

        setIsDropUploading(true);

        try {
            for (const [index, file] of droppedFiles.entries()) {
                const abortController = new AbortController();
                abortControllerRef.current = abortController;
                uploadStartedAtRef.current = Date.now();
                clearFinalizeAnimation();
                setDropUploadStatus({
                    fileName: file.name,
                    progress: 0,
                    timeRemaining: "Estimating time...",
                    currentIndex: index + 1,
                    totalFiles: droppedFiles.length,
                });
                lastProgressUiUpdateAtRef.current = Date.now();
                lastProgressStatusKeyRef.current = `0-Estimating time...-${index + 1}-${droppedFiles.length}`;

                await uploadFileAsync({
                    file,
                    folderId: uploadFolderId,
                    relativePath: file.webkitRelativePath || "",
                    signal: abortController.signal,
                    onUploadProgress: createProgressHandler(file.name, index + 1, droppedFiles.length, file.size),
                });
                uploadedCount += 1;
            }

            toast.success(
                uploadedCount === 1 ? "File uploaded successfully" : `${uploadedCount} files uploaded successfully`,
                { id: toastId }
            );

            startTransition(() => {
                router.refresh();
            });
        } catch (error: unknown) {
            const message = error instanceof Error && error.message
                ? error.message
                : "Failed to upload dropped files";

            toast.error(message, { id: toastId });
        } finally {
            resetDropUploadState();
        }
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        if (!allowUpload || isDropUploading || !event.dataTransfer.types.includes("Files")) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current += 1;
        setIsDragActive(true);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (!allowUpload || isDropUploading || !event.dataTransfer.types.includes("Files")) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        setIsDragActive(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        if (!allowUpload || isDropUploading || !event.dataTransfer.types.includes("Files")) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

        if (dragDepthRef.current === 0) {
            setIsDragActive(false);
        }
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        if (!allowUpload || isDropUploading) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current = 0;
        setIsDragActive(false);

        const droppedFiles = Array.from(event.dataTransfer.files ?? []);
        if (droppedFiles.length === 0) {
            return;
        }

        await uploadDroppedFiles(droppedFiles);
    };

    return (
        <div
            className="relative p-8"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {allowUpload && isDragActive ? (
                <div className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-blue-500/70 bg-blue-500/10 backdrop-blur-[1px]">
                    <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-300">
                            <FileUp className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                Drop files to upload
                            </p>
                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                {uploadFolderId ? "Files will be uploaded into this folder." : "Files will be uploaded to your root drive."}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    {title ? (
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
                    ) : (
                        <div className="flex min-w-0 items-center space-x-2 text-xl font-medium text-neutral-600 dark:text-neutral-400">
                            <Link href="/dashboard" className="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <Home className="h-5 w-5" />
                            </Link>
                            <ChevronRight className="h-5 w-5 flex-shrink-0" />
                            {breadcrumbs.map((breadcrumb) => (
                                <div key={breadcrumb.id} className="flex min-w-0 items-center space-x-2">
                                    <Link href={`/dashboard/folders/${breadcrumb.id}`} className="max-w-[150px] truncate transition-colors hover:text-black dark:hover:text-white">
                                        {breadcrumb.name}
                                    </Link>
                                    <ChevronRight className="h-5 w-5 flex-shrink-0" />
                                </div>
                            ))}
                            <span className="max-w-[200px] truncate font-semibold text-black dark:text-white">
                                {currentFolderName}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-[320px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search files and folders..."
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 shadow-sm outline-none transition-colors focus:border-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-white"
                        />
                    </div>
                    {allowUpload ? <FileUploadButton folderId={uploadFolderId} /> : null}
                </div>
            </div>

            {sharedBanner && (
                <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                    {sharedBanner}
                </div>
            )}

            {dropUploadStatus ? (
                <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {dropUploadStatus.fileName}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Uploading {dropUploadStatus.currentIndex} of {dropUploadStatus.totalFiles}
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => abortControllerRef.current?.abort()}>
                            Cancel
                        </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{dropUploadStatus.progress}% uploaded</span>
                        <span>{dropUploadStatus.timeRemaining}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-[width]"
                            style={{ width: `${dropUploadStatus.progress}%` }}
                        />
                    </div>
                </div>
            ) : null}

            {isEmpty ? (
                <div className="flex h-64 flex-col items-center justify-center text-neutral-500">
                    <Folder className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-700" />
                    <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-400">{emptyTitle}</h2>
                    <p className="mt-1 text-sm text-neutral-500">{emptyDescription}</p>
                </div>
            ) : (
                <>
                    {filteredFolders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Folders</h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {filteredFolders.map((folder, index) => {
                                    const colors = [
                                        "text-blue-500 fill-blue-500/20",
                                        "text-amber-500 fill-amber-500/20",
                                        "text-emerald-500 fill-emerald-500/20",
                                        "text-purple-500 fill-purple-500/20",
                                        "text-rose-500 fill-rose-500/20",
                                    ];
                                    const colorClass = colors[index % colors.length];
                                    const isSelected = isFolderSelected(folder.id);

                                    return (
                                        <div
                                            key={folder.id}
                                            className={`group relative flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all ${
                                                isSelected
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/30 dark:bg-primary/10"
                                                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <div
                                                className={`absolute left-2 top-2 z-10 transition-opacity ${
                                                    isSelected || selectionCount > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleFolder(folder.id);
                                                    }}
                                                    className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-primary accent-primary dark:border-neutral-600"
                                                />
                                            </div>

                                            <Link href={`/dashboard/folders/${folder.id}`} className="min-w-0 flex flex-1 items-center space-x-3 truncate pl-4">
                                                <Folder className={`h-5 w-5 flex-shrink-0 ${colorClass}`} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-200">{folder.name}</div>
                                                        {folder.is_shared && (
                                                            <span title={folder.shared_tooltip || "Shared"} className="flex flex-shrink-0 items-center">
                                                                <Share2 className="h-4 w-4 text-emerald-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    {folder.is_owner === false && (
                                                        <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                            {folder.access_level} access
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                            <div className="ml-3 opacity-0 transition-opacity group-hover:opacity-100">
                                                <FolderActions folder={folder} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {filteredFiles.length > 0 && (
                        <div>
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Files</h2>
                                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                    {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
                                </div>
                            </div>
                            <FileTable files={filteredFiles} showSearch={false} />
                        </div>
                    )}
                </>
            )}

            <BulkActionBar currentFolderId={uploadFolderId} files={filteredFiles} />
        </div>
    );
}
