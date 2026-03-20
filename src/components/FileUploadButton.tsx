"use client";

import { startTransition, useRef, useState } from "react";
import type { AxiosProgressEvent } from "axios";
import { Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@/hooks/use-files";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type UploadStatus = {
    fileName: string;
    progress: number;
    timeRemaining: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

export default function FileUploadButton({ folderId = null }: { folderId?: string | null }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadStartedAtRef = useRef<number | null>(null);
    const finalizeStartedAtRef = useRef<number | null>(null);
    const finalizeDurationMsRef = useRef<number | null>(null);
    const finalizeIntervalRef = useRef<number | null>(null);
    const lastProgressUiUpdateAtRef = useRef(0);
    const lastProgressStatusKeyRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const router = useRouter();
    const { mutate: uploadFile, isPending: isUploading } = useUploadFile();
    const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);

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
        abortControllerRef.current = null;
        setUploadStatus(null);
    };

    const startFinalizeAnimation = (fileName: string, fileSize: number) => {
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
            const statusKey = `${progress}-${timeRemaining}`;

            lastProgressUiUpdateAtRef.current = Date.now();
            lastProgressStatusKeyRef.current = statusKey;

            setUploadStatus({
                fileName,
                progress,
                timeRemaining,
            });
        };

        updateFinalizeStatus();
        finalizeIntervalRef.current = window.setInterval(updateFinalizeStatus, FINALIZE_PROGRESS_TICK_MS);
    };

    const handleUploadProgress = (fileName: string, fileSize: number) => (progressEvent: AxiosProgressEvent) => {
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
            startFinalizeAnimation(fileName, fileSize);
            return;
        }

        const statusKey = `${progress}-${timeRemaining}`;
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
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading file...");
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        uploadStartedAtRef.current = Date.now();
        clearFinalizeAnimation();
        setUploadStatus({
            fileName: file.name,
            progress: 0,
            timeRemaining: "Estimating time...",
        });
        lastProgressUiUpdateAtRef.current = Date.now();
        lastProgressStatusKeyRef.current = "0-Estimating time...";

        uploadFile(
            {
                file,
                folderId,
                signal: abortController.signal,
                onUploadProgress: handleUploadProgress(file.name, file.size),
            },
            {
                onSuccess: () => {
                    toast.success("File uploaded successfully", { id: toastId });
                    startTransition(() => {
                        router.refresh();
                    });
                },
                onError: (error: unknown) => {
                    if (abortController.signal.aborted) {
                        toast.error("Upload canceled", { id: toastId });
                        return;
                    }

                    toast.error(getErrorMessage(error, "Failed to upload file"), { id: toastId });
                },
                onSettled: () => {
                    resetUploadState();
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ""; // Reset input
                    }
                }
            }
        );
    };

    const handleCancelUpload = () => {
        abortControllerRef.current?.abort();
    };

    return (
        <div className="space-y-3">
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload File"}
            </button>
            {uploadStatus ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {uploadStatus.fileName}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {uploadStatus.progress}% uploaded
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleCancelUpload}>
                            Cancel
                        </Button>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-[width]"
                            style={{ width: `${uploadStatus.progress}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {uploadStatus.timeRemaining}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
