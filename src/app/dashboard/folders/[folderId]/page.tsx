import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getFolderAccess, getResourceShareMetadata } from '@/lib/sharing';
import DriveExplorerPage from '@/components/DriveExplorerPage';

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
    const folderShares = isOwner ? await getResourceShareMetadata('folder', folders.map((folder: any) => folder.id)) : null;
    const fileShares = isOwner ? await getResourceShareMetadata('file', files.map((file: any) => file.id)) : null;

    const visibleFolders = folders.map((folder: any) => ({
        ...folder,
        is_owner: isOwner,
        access_level: accessLevel,
        is_shared: isOwner ? folderShares?.has(folder.id) : true,
        shared_tooltip: isOwner
            ? folderShares?.get(folder.id)?.tooltip
            : `Shared by ${currentFolder.owner_name || currentFolder.owner_email} - ${accessLevel} access`,
    }));
    const visibleFiles = files.map((file: any) => ({
        ...file,
        is_owner: isOwner,
        access_level: accessLevel,
        is_shared: isOwner ? fileShares?.has(file.id) : true,
        shared_tooltip: isOwner
            ? fileShares?.get(file.id)?.tooltip
            : `Shared by ${currentFolder.owner_name || currentFolder.owner_email} - ${accessLevel} access`,
    }));

    return (
        <DriveExplorerPage
            breadcrumbs={breadcrumbs}
            currentFolderName={currentFolder.name}
            folders={visibleFolders}
            files={visibleFiles}
            allowUpload={isOwner}
            uploadFolderId={folderId}
            sharedBanner={!isOwner ? `Shared by ${currentFolder.owner_name || currentFolder.owner_email} with ${accessLevel} access.` : null}
        />
    );
}
