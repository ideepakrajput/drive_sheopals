"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Folder, Home, Search, Share2 } from "lucide-react";
import FileTable from "@/components/FileTable";
import FolderActions from "@/components/FolderActions";
import FileUploadButton from "@/components/FileUploadButton";
import BulkActionBar from "@/components/BulkActionBar";
import { useSelection } from "@/hooks/use-selection";

type Breadcrumb = {
    id: string;
    name: string;
};

type DriveExplorerPageProps = {
    title?: string;
    breadcrumbs?: Breadcrumb[];
    currentFolderName?: string;
    folders: any[];
    files: any[];
    allowUpload?: boolean;
    uploadFolderId?: string | null;
    sharedBanner?: string | null;
    emptyTitle?: string;
    emptyDescription?: string;
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
    const [search, setSearch] = useState("");
    const { isFolderSelected, toggleFolder, selectionCount } = useSelection();

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

    return (
        <div className="p-8">
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
