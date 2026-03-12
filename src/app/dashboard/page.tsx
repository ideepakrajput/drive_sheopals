import { Folder, MoreVertical, FileText, FileImage, File, Download } from 'lucide-react';
import { getSession } from '@/lib/auth';
import FileUploadButton from '@/components/FileUploadButton';
import FileActions from '@/components/FileActions';
import { pool } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import FileTable from '@/components/FileTable';
import FolderActions from '@/components/FolderActions';

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const userId = session.user.id;

    // Fetch Root Folders
    const [folders]: any = await pool.query(
        'SELECT * FROM folders WHERE owner_id = ? AND parent_folder_id IS NULL AND is_trashed = FALSE ORDER BY name ASC',
        [userId]
    );

    // Fetch Root Files
    const [files]: any = await pool.query(
        'SELECT * FROM files WHERE owner_id = ? AND folder_id IS NULL AND is_trashed = FALSE ORDER BY created_at DESC',
        [userId]
    );

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">My Files</h1>
                <FileUploadButton />
            </div>

            {folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                    <Folder className="w-16 h-16 mb-4 text-neutral-300 dark:text-neutral-700" />
                    <h2 className="text-lg text-neutral-900 dark:text-neutral-400 font-medium">This folder is empty</h2>
                    <p className="text-sm mt-1 text-neutral-500">Drag and drop files here to upload</p>
                </div>
            ) : (
                <>
                    {folders.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">Folders</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {folders.map((folder: any, i: number) => {
                                    // Generate consistent pseudo-random vibrant colors based on folder ID/index
                                    const colors = ['text-blue-500 fill-blue-500/20', 'text-amber-500 fill-amber-500/20', 'text-emerald-500 fill-emerald-500/20', 'text-purple-500 fill-purple-500/20', 'text-rose-500 fill-rose-500/20'];
                                    const colorClass = colors[i % colors.length];

                                    return (
                                        <Link href={`/dashboard/folders/${folder.id}`} key={folder.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer group block">
                                            <div className="flex items-center space-x-3 truncate">
                                                <Folder className={`w-5 h-5 flex-shrink-0 ${colorClass}`} />
                                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200 truncate">{folder.name}</span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <FolderActions folder={folder} />
                                            </div>
                                        </Link>
                                    );
                                })}
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
        </div>
    );
}
