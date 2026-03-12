import { Folder, File, Share2 } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { redirect } from 'next/navigation';
import FileTable from '@/components/FileTable';
import FolderActions from '@/components/FolderActions';
import { getResourceShareMetadata } from '@/lib/sharing';

export default async function TrashPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const userId = session.user.id;

    // Fetch Trashed Folders
    const [folders]: any = await pool.query(
        'SELECT * FROM folders WHERE owner_id = ? AND is_trashed = TRUE ORDER BY updated_at DESC',
        [userId]
    );

    // Fetch Trashed Files
    const [files]: any = await pool.query(
        'SELECT * FROM files WHERE owner_id = ? AND is_trashed = TRUE ORDER BY updated_at DESC',
        [userId]
    );
    const folderShares = await getResourceShareMetadata('folder', folders.map((folder: any) => folder.id));
    const fileShares = await getResourceShareMetadata('file', files.map((file: any) => file.id));
    const visibleFolders = folders.map((folder: any) => ({
        ...folder,
        is_shared: folderShares.has(folder.id),
        shared_tooltip: folderShares.get(folder.id)?.tooltip,
    }));
    const visibleFiles = files.map((file: any) => ({
        ...file,
        is_shared: fileShares.has(file.id),
        shared_tooltip: fileShares.get(file.id)?.tooltip,
    }));

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Trash</h1>
            </div>

            {visibleFolders.length === 0 && visibleFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                    <div className="w-16 h-16 mb-4 text-neutral-200 dark:text-neutral-800 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center">
                        <File className="w-8 h-8 opacity-50" />
                    </div>
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">Trash is empty</h2>
                    <p className="text-sm mt-1 text-neutral-500">Items you move to trash will appear here.</p>
                </div>
            ) : (
                <>
                    {visibleFolders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Folders</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {visibleFolders.map((folder: any) => {
                                    return (
                                        <div key={folder.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-sm group opacity-60 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center space-x-3 truncate">
                                                <Folder className="w-5 h-5 flex-shrink-0 text-neutral-400" />
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 truncate">{folder.name}</span>
                                                    {folder.is_shared && (
                                                        <span title={folder.shared_tooltip || 'Shared'} className="flex flex-shrink-0 items-center">
                                                            <Share2 className="h-4 w-4 text-emerald-500" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <FolderActions folder={folder} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {visibleFiles.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Files</h2>
                            <FileTable files={visibleFiles} />
                        </div>
                    )}
                </>
            )}
            
            <p className="mt-8 text-xs text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                Items in trash help you recover accidental deletions.
            </p>
        </div>
    );
}
