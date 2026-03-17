"use client";

import { Clock } from 'lucide-react';
import FileTable from '@/components/FileTable';
import BulkActionBar from '@/components/BulkActionBar';

export default function RecentPageClient({ files }: { files: any[] }) {
    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center">
                    <Clock className="mr-3 text-blue-500 w-6 h-6" />
                    Recent
                </h1>
            </div>

            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500 text-center">
                    <div className="w-20 h-20 mb-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-blue-500/30" />
                    </div>
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">No recent files</h2>
                    <p className="text-sm mt-1 text-neutral-500 max-w-xs">
                        Files you upload or modify will appear here temporarily for quick access.
                    </p>
                </div>
            ) : (
                <div>
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Last 20 Files</h2>
                    <FileTable files={files} />
                </div>
            )}

            <BulkActionBar pageContext="recent" files={files} />
        </div>
    );
}
