"use client";

import Link from "next/link";
import { Folder, Share2 } from "lucide-react";
import { useSelection } from "@/hooks/use-selection";
import FolderActions from "./FolderActions";

type SelectableFolderCardProps = {
    folder: any;
    colorClass: string;
    navigable?: boolean; // false for trash items that shouldn't be clickable
};

export default function SelectableFolderCard({ folder, colorClass, navigable = true }: SelectableFolderCardProps) {
    const { isFolderSelected, toggleFolder, selectionCount } = useSelection();
    const isSelected = isFolderSelected(folder.id);

    const content = (
        <>
            <Folder className={`h-5 w-5 flex-shrink-0 ${navigable ? colorClass : "text-neutral-400"}`} />
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <div className={`truncate text-sm font-medium ${navigable ? "text-neutral-900 dark:text-neutral-200" : "text-neutral-600 dark:text-neutral-400"}`}>
                        {folder.name}
                    </div>
                    {folder.is_shared && (
                        <span title={folder.shared_tooltip || "Shared"} className="flex flex-shrink-0 items-center">
                            <Share2 className="h-4 w-4 text-emerald-500" />
                        </span>
                    )}
                </div>
                {folder.is_owner === false && (
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {folder.owner_name || folder.owner_email} - {folder.access_level}
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div
            className={`group relative flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all ${
                isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30 dark:bg-primary/10"
                    : navigable
                    ? "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 opacity-60 hover:opacity-100 transition-opacity"
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

            {navigable ? (
                <Link href={`/dashboard/folders/${folder.id}`} className="min-w-0 flex flex-1 items-center space-x-3 truncate pl-4">
                    {content}
                </Link>
            ) : (
                <div className="min-w-0 flex flex-1 items-center space-x-3 truncate pl-4">
                    {content}
                </div>
            )}

            <div className="ml-3 opacity-0 transition-opacity group-hover:opacity-100">
                <FolderActions folder={folder} />
            </div>
        </div>
    );
}
