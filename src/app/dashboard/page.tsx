import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getResourceShareMetadata } from '@/lib/sharing';
import DriveExplorerPage from '@/components/DriveExplorerPage';

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

    return <DriveExplorerPage title="My Files" folders={visibleFolders} files={visibleFiles} allowUpload />;
}
