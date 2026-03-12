import { Folder, Star } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { redirect } from 'next/navigation';
import FileTable from '@/components/FileTable';
import FolderActions from '@/components/FolderActions';
import Link from 'next/link';

export default async function StarredPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const userId = session.user.id;

    // Fetch Starred Files (Folders don't have is_starred currently in shared snippets, but let's check)
    const [files]: any = await pool.query(
        'SELECT * FROM files WHERE owner_id = ? AND is_starred = TRUE AND is_trashed = FALSE ORDER BY created_at DESC',
        [userId]
    );

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center">
                    <Star className="mr-3 text-yellow-500 fill-yellow-500 w-6 h-6" />
                    Starred
                </h1>
            </div>

            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500 text-center">
                    <div className="w-20 h-20 mb-6 bg-yellow-500/10 rounded-full flex items-center justify-center">
                        <Star className="w-10 h-10 text-yellow-500/30" />
                    </div>
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">No starred items</h2>
                    <p className="text-sm mt-1 text-neutral-500 max-w-xs">
                        Star items you want to find easily later. They will appear here.
                    </p>
                </div>
            ) : (
                <div>
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Files</h2>
                    <FileTable files={files} />
                </div>
            )}
        </div>
    );
}
