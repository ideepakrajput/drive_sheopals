"use client";

import { useState } from "react";
import { FileText, FileImage, File, Share2, Star } from 'lucide-react';
import FileActions from './FileActions';
import FilePreview from './FilePreview';

function formatDate(value: string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
}

export default function FileTable({ files }: { files: any[] }) {
    const [previewFile, setPreviewFile] = useState<any | null>(null);

    return (
        <>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                                Last Modified
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                                File Size
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                        {files.map((file: any) => {
                            let FileIcon = File;
                            if (file.mime_type?.includes('image/')) FileIcon = FileImage;
                            else if (file.mime_type?.includes('text/')) FileIcon = FileText;
                            const isStarred = Boolean(file.is_starred);
                            const isShared = Boolean(file.is_shared);

                            return (
                                <tr 
                                    key={file.id} 
                                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
                                    onClick={() => setPreviewFile(file)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FileIcon className="flex-shrink-0 h-5 w-5 text-neutral-400" />
                                            <div className="ml-4 truncate max-w-xs md:max-w-md">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-200 truncate">{file.original_name}</div>
                                                    {isStarred && (
                                                        <Star className="h-4 w-4 flex-shrink-0 fill-yellow-400 text-yellow-400" />
                                                    )}
                                                    {isShared && (
                                                        <span title={file.shared_tooltip || "Shared"} className="flex flex-shrink-0 items-center">
                                                            <Share2 className="h-4 w-4 text-emerald-500" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                            {formatDate(file.updated_at)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 hidden sm:table-cell">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                        <FileActions file={file} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {previewFile && (
                <FilePreview 
                    file={previewFile} 
                    allFiles={files}
                    onClose={() => setPreviewFile(null)} 
                />
            )}
        </>
    );
}
