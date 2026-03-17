"use client";

import { Users } from 'lucide-react';
import FileTable from '@/components/FileTable';
import SelectableFolderCard from '@/components/SelectableFolderCard';
import BulkActionBar from '@/components/BulkActionBar';

export default function SharedPageClient({ folders, files }: { folders: any[]; files: any[] }) {
    const colors = ['text-blue-500 fill-blue-500/20', 'text-amber-500 fill-amber-500/20', 'text-emerald-500 fill-emerald-500/20', 'text-rose-500 fill-rose-500/20'];

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center">
                    <Users className="mr-3 text-emerald-500 w-6 h-6" />
                    Shared with me
                </h1>
            </div>

            {folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500 text-center">
                    <div className="w-20 h-20 mb-6 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <Users className="w-10 h-10 text-emerald-500/30" />
                    </div>
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">No shared items</h2>
                    <p className="text-sm mt-1 text-neutral-500 max-w-xs">
                        Files and folders shared with you by others will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {folders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Folders</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {folders.map((folder: any, i: number) => (
                                    <SelectableFolderCard
                                        key={folder.id}
                                        folder={folder}
                                        colorClass={colors[i % colors.length]}
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

            <BulkActionBar pageContext="shared" files={files} />
        </div>
    );
}
