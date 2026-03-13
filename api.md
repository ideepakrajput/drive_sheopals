# API Reference

### Auth
- `POST /api/auth/register` - Registers a new user.
- `POST /api/auth/login` - Authenticates user and creates session.
- `POST /api/auth/logout` - Destroys user session.
- `GET /api/users` - Lists registered users available for sharing.

### Files
- `GET /api/files` - Retrieves all active (non-trashed) files for the user.
- `POST /api/files/upload` - Uploads a new file and creates database entry.
- `GET /api/files/[id]/download` - Streams file content for download or preview.
- `PATCH /api/files/[id]` - Renames an existing file.
- `POST /api/files/[id]/move` - Moves a file to another folder or root.
- `POST /api/files/[id]/copy` - Copies a file to another folder or root.
- `DELETE /api/files/[id]` - Permanently deletes a file from disk and database.
- `GET /api/files/[id]/share` - Lists users this file is shared with.
- `POST /api/files/[id]/share` - Shares a file with a registered user by email.
- `DELETE /api/files/[id]/share` - Removes a user's access to a shared file.
- `POST /api/files/[id]/star` - Toggles the starred status of a file.
- `POST /api/files/[id]/trash` - Moves a file to the trash (soft delete).
- `POST /api/files/[id]/restore` - Restores a file from the trash.

### Folders
- `GET /api/folders` - Retrieves all root-level folders for the user.
- `GET /api/folders/options` - Lists all active folders for folder pickers.
- `POST /api/folders` - Creates a new folder.
- `GET /api/folders/[id]` - Retrieves contents (files/subfolders) of a specific folder.
- `PATCH /api/folders/[id]` - Renames an existing folder.
- `POST /api/folders/[id]/move` - Moves a folder to another parent or root.
- `POST /api/folders/[id]/copy` - Copies a folder tree to another parent or root.
- `DELETE /api/folders/[id]` - Permanently deletes a folder.
- `GET /api/folders/[id]/share` - Lists users this folder is shared with.
- `POST /api/folders/[id]/share` - Shares a folder recursively with a registered user by email.
- `DELETE /api/folders/[id]/share` - Removes a user's access to a shared folder tree.
- `POST /api/folders/[id]/trash` - Moves a folder to the trash.
- `POST /api/folders/[id]/restore` - Restores a folder from the trash.
