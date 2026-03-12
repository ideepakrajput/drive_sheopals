import { Folder, Share2, Users } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import Link from 'next/link';
import FileTable from '@/components/FileTable';
import FolderActions from '@/components/FolderActions';

export default async function SharedPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const userId = session.user.id;

    const [folders]: any = await pool.query(
        `SELECT f.*, u.email AS owner_email, u.name AS owner_name, s.permission AS access_level
         FROM shares s
         INNER JOIN folders f ON f.id = s.resource_id
         INNER JOIN users u ON u.id = f.owner_id
         WHERE s.resource_type = 'folder'
           AND s.shared_with_user_id = ?
           AND f.is_trashed = FALSE
         ORDER BY f.updated_at DESC`,
        [userId]
    );

    const [files]: any = await pool.query(
        `SELECT f.*, u.email AS owner_email, u.name AS owner_name, s.permission AS access_level
         FROM shares s
         INNER JOIN files f ON f.id = s.resource_id
         INNER JOIN users u ON u.id = f.owner_id
         WHERE s.resource_type = 'file'
           AND s.shared_with_user_id = ?
           AND f.is_trashed = FALSE
         ORDER BY f.updated_at DESC`,
        [userId]
    );

    const sharedFolders = folders.map((folder: any) => ({
        ...folder,
        is_owner: false,
        is_shared: true,
        shared_tooltip: `Shared by ${folder.owner_name || folder.owner_email} - ${folder.access_level} access`,
    }));
    const sharedFiles = files.map((file: any) => ({
        ...file,
        is_owner: false,
        is_shared: true,
        shared_tooltip: `Shared by ${file.owner_name || file.owner_email} - ${file.access_level} access`,
    }));

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center">
                    <Users className="mr-3 text-emerald-500 w-6 h-6" />
                    Shared with me
                </h1>
            </div>

            {sharedFolders.length === 0 && sharedFiles.length === 0 ? (
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
                    {sharedFolders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Folders</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {sharedFolders.map((folder: any, i: number) => {
                                    const colors = ['text-blue-500 fill-blue-500/20', 'text-amber-500 fill-amber-500/20', 'text-emerald-500 fill-emerald-500/20', 'text-rose-500 fill-rose-500/20'];
                                    const colorClass = colors[i % colors.length];

                                    return (
                                        <div key={folder.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm group">
                                            <Link href={`/dashboard/folders/${folder.id}`} className="min-w-0 flex flex-1 items-center space-x-3 truncate">
                                                <Folder className={`w-5 h-5 flex-shrink-0 ${colorClass}`} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-200">{folder.name}</div>
                                                        <span title={folder.shared_tooltip} className="flex flex-shrink-0 items-center">
                                                            <Share2 className="h-4 w-4 text-emerald-500" />
                                                        </span>
                                                    </div>
                                                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                        {folder.owner_name || folder.owner_email} - {folder.access_level}
                                                    </div>
                                                </div>
                                            </Link>
                                            <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <FolderActions folder={folder} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {sharedFiles.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Files</h2>
                            <FileTable files={sharedFiles} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
