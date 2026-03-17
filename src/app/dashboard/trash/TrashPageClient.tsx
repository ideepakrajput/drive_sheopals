"use client";

import { File } from 'lucide-react';
import FileTable from '@/components/FileTable';
import SelectableFolderCard from '@/components/SelectableFolderCard';
import BulkActionBar from '@/components/BulkActionBar';

export default function TrashPageClient({ folders, files }: { folders: any[]; files: any[] }) {
    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Trash</h1>
            </div>

            {folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                    <div className="w-16 h-16 mb-4 text-neutral-200 dark:text-neutral-800 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center">
                        <File className="w-8 h-8 opacity-50" />
                    </div>
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">Trash is empty</h2>
                    <p className="text-sm mt-1 text-neutral-500">Items you move to trash will appear here.</p>
                </div>
            ) : (
                <>
                    {folders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Folders</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {folders.map((folder: any) => (
                                    <SelectableFolderCard
                                        key={folder.id}
                                        folder={folder}
                                        colorClass="text-neutral-400"
                                        navigable={false}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {files.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Files</h2>
                            <FileTable files={files} />
                        </div>
                    )}
                </>
            )}

            <p className="mt-8 text-xs text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                Items in trash help you recover accidental deletions.
            </p>

            <BulkActionBar pageContext="trash" files={files} />
        </div>
    );
}
