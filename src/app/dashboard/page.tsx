import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';
import { redirect } from 'next/navigation';
import { getResourceShareMetadata } from '@/lib/sharing';
import DriveExplorerPage from '@/components/DriveExplorerPage';

type FolderRow = RowDataPacket & {
    id: string;
    name: string;
};

type FileRow = RowDataPacket & {
    id: string;
    original_name: string;
};

function DashboardSkeleton() {
    return (
        <div className="p-8">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-11 w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 sm:w-[320px]" />
                    <div className="h-11 w-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                </div>
            </div>
            <div className="mb-8">
                <div className="mb-4 h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
                    ))}
                </div>
            </div>
            <div>
                <div className="mb-4 h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-16 animate-pulse border-b border-neutral-200 bg-white last:border-b-0 dark:border-neutral-800 dark:bg-neutral-900" />
                    ))}
                </div>
            </div>
        </div>
    );
}

async function DashboardContent({ userId }: { userId: string }) {
    const [foldersResult, filesResult] = await Promise.all([
        pool.query<FolderRow[]>(
            'SELECT * FROM folders WHERE owner_id = ? AND parent_folder_id IS NULL AND is_trashed = FALSE ORDER BY name ASC',
            [userId]
        ),
        pool.query<FileRow[]>(
            'SELECT * FROM files WHERE owner_id = ? AND folder_id IS NULL AND is_trashed = FALSE ORDER BY created_at DESC',
            [userId]
        ),
    ]);

    const [folders] = foldersResult;
    const [files] = filesResult;

    const [folderShares, fileShares] = await Promise.all([
        getResourceShareMetadata('folder', folders.map((folder) => folder.id)),
        getResourceShareMetadata('file', files.map((file) => file.id)),
    ]);

    const visibleFolders = folders.map((folder) => ({
        ...folder,
        is_shared: folderShares.has(folder.id),
        shared_tooltip: folderShares.get(folder.id)?.tooltip,
    }));
    const visibleFiles = files.map((file) => ({
        ...file,
        is_shared: fileShares.has(file.id),
        shared_tooltip: fileShares.get(file.id)?.tooltip,
    }));

    return <DriveExplorerPage title="My Files" folders={visibleFolders} files={visibleFiles} allowUpload />;
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent userId={session.user.id} />
        </Suspense>
    );
}
