"use client";

import { useState } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, File, FileImage, FileText, Search, Share2, Star } from "lucide-react";
import FileActions from "./FileActions";
import FilePreview from "./FilePreview";

function formatDate(value: string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatFileSize(size: number) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function FileTable({ files }: { files: any[] }) {
    const [previewFile, setPreviewFile] = useState<any | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "original_name",
            header: ({ column }) => (
                <button
                    className="flex items-center gap-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => {
                const file = row.original;
                let FileIcon = File;
                if (file.mime_type?.includes("image/")) FileIcon = FileImage;
                else if (file.mime_type?.includes("text/")) FileIcon = FileText;

                return (
                    <div className="flex items-center">
                        <FileIcon className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                        <div className="ml-4 min-w-0 max-w-xs md:max-w-md">
                            <div className="flex items-center gap-2 truncate">
                                <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-200">
                                    {file.original_name}
                                </div>
                                {Boolean(file.is_starred) && (
                                    <Star className="h-4 w-4 flex-shrink-0 fill-yellow-400 text-yellow-400" />
                                )}
                                {Boolean(file.is_shared) && (
                                    <span title={file.shared_tooltip || "Shared"} className="flex flex-shrink-0 items-center">
                                        <Share2 className="h-4 w-4 text-emerald-500" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "updated_at",
            header: ({ column }) => (
                <button
                    className="hidden items-center gap-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 md:flex"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Last Modified
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => (
                <div className="hidden text-sm text-neutral-500 dark:text-neutral-400 md:block">
                    {formatDate(row.original.updated_at)}
                </div>
            ),
        },
        {
            accessorKey: "size",
            header: ({ column }) => (
                <button
                    className="hidden items-center gap-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 sm:flex"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    File Size
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => (
                <div className="hidden text-sm text-neutral-500 dark:text-neutral-400 sm:block">
                    {formatFileSize(row.original.size)}
                </div>
            ),
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => <FileActions file={row.original} />,
        },
    ];

    const table = useReactTable({
        data: files,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, _columnId, filterValue) => {
            const value = String(filterValue || "").toLowerCase();
            if (!value) return true;

            const file = row.original;
            return [
                file.original_name,
                file.mime_type,
                file.owner_name,
                file.owner_email,
            ]
                .filter(Boolean)
                .some((entry) => String(entry).toLowerCase().includes(value));
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <>
            <div className="mb-4 flex items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                    <input
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder="Search files..."
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 shadow-sm outline-none transition-colors focus:border-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-white"
                    />
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {table.getRowModel().rows.length} files
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} scope="col" className="px-6 py-3 text-left">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
                        {table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                className="group cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                onClick={() => setPreviewFile(row.original)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className={`px-6 py-4 ${
                                            cell.column.id === "actions"
                                                ? "whitespace-nowrap text-right text-sm font-medium"
                                                : "whitespace-nowrap"
                                        }`}
                                        onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {previewFile && (
                <FilePreview
                    file={previewFile}
                    allFiles={table.getRowModel().rows.map((row) => row.original)}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </>
    );
}
