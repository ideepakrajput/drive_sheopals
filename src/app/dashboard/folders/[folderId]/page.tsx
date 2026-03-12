import { Folder, ChevronRight, Home } from 'lucide-react';
import { getSession } from '@/lib/auth';
import FileUploadButton from '@/components/FileUploadButton';
import { pool } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import FileTable from '@/components/FileTable';
import FolderActions from '@/components/FolderActions';
import { getFolderAccess } from '@/lib/sharing';

export default async function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const resolvedParams = await params;
    const folderId = resolvedParams.folderId;
    const userId = session.user.id;
    const access = await getFolderAccess(folderId, userId);

    if (!access.allowed) {
        redirect('/dashboard/shared');
    }

    // Fetch Target Folder to verify access and get name
    const [targetFolderArr]: any = await pool.query(
        `SELECT f.*, u.email AS owner_email, u.name AS owner_name
         FROM folders f
         INNER JOIN users u ON u.id = f.owner_id
         WHERE f.id = ? AND f.is_trashed = FALSE`,
        [folderId]
    );

    if (targetFolderArr.length === 0) {
        redirect('/dashboard');
    }
    const currentFolder = targetFolderArr[0];
    const isOwner = currentFolder.owner_id === userId;
    const accessLevel = isOwner ? 'edit' : access.permission;

    // Build breadcrumbs
    const breadcrumbs = [];
    let currentTrackerId = currentFolder.parent_folder_id;
    while(currentTrackerId) {
        const [parentArr]: any = await pool.query(
            'SELECT id, name, parent_folder_id FROM folders WHERE id = ?',
            [currentTrackerId]
        );
        if (parentArr.length === 0) break;
        const p = parentArr[0];
        const parentAccess = await getFolderAccess(p.id, userId);
        if (!parentAccess.allowed) break;
        breadcrumbs.unshift({ id: p.id, name: p.name });
        currentTrackerId = p.parent_folder_id;
    }

    // Fetch Folders in this folder
    const [folders]: any = await pool.query(
        `SELECT f.*, u.email AS owner_email, u.name AS owner_name
         FROM folders f
         INNER JOIN users u ON u.id = f.owner_id
         WHERE f.owner_id = ? AND f.parent_folder_id = ? AND f.is_trashed = FALSE
         ORDER BY f.name ASC`,
        [currentFolder.owner_id, folderId]
    );

    // Fetch Files in this folder
    const [files]: any = await pool.query(
        `SELECT f.*, u.email AS owner_email, u.name AS owner_name
         FROM files f
         INNER JOIN users u ON u.id = f.owner_id
         WHERE f.owner_id = ? AND f.folder_id = ? AND f.is_trashed = FALSE
         ORDER BY f.created_at DESC`,
        [currentFolder.owner_id, folderId]
    );

    const visibleFolders = folders.map((folder: any) => ({
        ...folder,
        is_owner: isOwner,
        access_level: accessLevel,
    }));
    const visibleFiles = files.map((file: any) => ({
        ...file,
        is_owner: isOwner,
        access_level: accessLevel,
    }));

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xl font-medium text-neutral-600 dark:text-neutral-400">
                    <Link href="/dashboard" className="hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 rounded-md transition-colors flex items-center justify-center">
                       <Home className="w-5 h-5" />
                    </Link>
                    <ChevronRight className="w-5 h-5 flex-shrink-0" />
                    {breadcrumbs.map((bc) => (
                        <div key={bc.id} className="flex items-center space-x-2">
                           <Link href={`/dashboard/folders/${bc.id}`} className="hover:text-black dark:hover:text-white transition-colors truncate max-w-[150px]">
                               {bc.name}
                           </Link>
                           <ChevronRight className="w-5 h-5 flex-shrink-0" />
                        </div>
                    ))}
                    <span className="text-black dark:text-white font-semibold truncate max-w-[200px]">
                        {currentFolder.name}
                    </span>
                </div>
                {isOwner ? <FileUploadButton folderId={folderId} /> : null}
            </div>

            {!isOwner && (
                <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                    Shared by {currentFolder.owner_name || currentFolder.owner_email} with {accessLevel} access.
                </div>
            )}

            {visibleFolders.length === 0 && visibleFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                    <Folder className="w-16 h-16 mb-4 text-neutral-300 dark:text-neutral-700" />
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">This folder is empty</h2>
                    <p className="text-sm mt-1 text-neutral-500">Drag and drop files here to upload</p>
                </div>
            ) : (
                <>
                    {visibleFolders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Folders</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {visibleFolders.map((folder: any, i: number) => {
                                    const colors = ['text-blue-500 fill-blue-500/20', 'text-amber-500 fill-amber-500/20', 'text-emerald-500 fill-emerald-500/20', 'text-purple-500 fill-purple-500/20', 'text-rose-500 fill-rose-500/20'];
                                    const colorClass = colors[i % colors.length];

                                    return (
                                        <div key={folder.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm group">
                                            <Link href={`/dashboard/folders/${folder.id}`} className="min-w-0 flex flex-1 items-center space-x-3 truncate">
                                                <Folder className={`w-5 h-5 flex-shrink-0 ${colorClass}`} />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-200 truncate">{folder.name}</div>
                                                    {!folder.is_owner && (
                                                        <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{folder.access_level} access</div>
                                                    )}
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

                    {visibleFiles.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Files</h2>
                            <FileTable files={visibleFiles} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
