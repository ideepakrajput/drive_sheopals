Below is a **clear product description + technical structure** you can use to build your **Sheopal's-like internal drive system** for **10–20 users**. I’m structuring it like a **mini product spec** so development stays organized.

---

# Product: Sheopal's Drive (Internal File Sharing System)

## Overview

Sheopal's Drive is a **secure internal file management platform** that enables teams to **store, organize, and share files and folders** with controlled access. The platform is designed to provide a **Sheopal's Drive experience** optimized for **small teams (10–20 users)** and hosted on a **private server**.

It allows users to upload files, organize them into deep folder structures, securely share them with team members, and manage everything through a familiar, modern UI using **passwordless email-based OTP authentication**.

---

# Key Features (Sheopal's Drive Experience)

### 1. Core Sheopal's Drive Capabilities

Users can manage files and folders with an intuitive, seamless experience.

- **Drag & Drop Uploads:** Easily upload files or entire folders.
- **Nested Folder Structure:** Create infinite folder hierarchies for organization.
- **Trash & Recovery:** Soft-delete system with a "Bin" to restore accidentally deleted files.
- **Starred/Favorites:** Mark important files/folders for quick access.
- **Recent Files:** Auto-tracked history of recently accessed or uploaded documents.

### 2. Advanced Search & Organization

Finding files should be instant and intuitive.

- **Global Search:** Real-time search for files and folders by name.
- **Smart Filters:** Filter by file type (PDF, Images, Docs), owner, or modification date.
- **Sorting:** Sort views by name, file size, or last modified date.

### 3. Collaboration & Sharing

Robust sharing mechanisms tailored for internal team workflows.

- **Granular Permissions:** Share with specific users granting either Viewer or Editor access.
- **Shared Workspaces:** Dedicated "Shared with me" and "Shared by me" isolated views.
- **Public Share Links:** (Optional) Generate restricted external links for clients.
- **Access Revocation:** Instantly remove user access to any file or folder.

### 4. User Dashboard & Experience

A modern UI optimized for productivity and familiarity.

- **Views:** Toggle between Grid (thumbnails) and List layouts.
- **Context Menus:** Right-click options for quick actions (Rename, Download, Share, Move, Trash).
- **File Previews:** Built-in viewer for images, PDFs, and text files.
- **Storage Quotas:** Visual indicators displaying storage used vs. limit per user.

### 5. Secure Identity & Access

- **Email + OTP Login:** Passwordless, highly secure team access.
- **Session Management:** Secure token-based authentication (JWT or session cookies).
- **Activity Logs:** Track who viewed, downloaded, or edited a file.

---

# System Architecture

### Frontend

Next.js (App Router recommended)

- **UI & Experience:** Sheopal's Drive interface, Context Menus, File previews.
- **State Management:** Zustand for global state, React Query for server data syncing.
- **Styling:** TailwindCSS with Radix UI / shadcn/ui for accessible dropdowns and dialogs.
- **Drag & Drop:** `react-dropzone` or `@dnd-kit/core` for advanced interactions.

### Backend

Next.js Route Handlers (API) or Node.js Express API.

- **Authentication:** OTP generation and validation.
- **File Processing:** Handling multipart form data, streaming uploads directly to disk.
- **Permissions Framework:** Checking sharing rules before allowing file access.

### Database

MySQL or PostgreSQL.

- Manages users, file metadata, hierarchy relationships, and sharing rules.

### File Storage

Files strictly stored on the server's local filesystem to avoid external cloud costs.

- **Storage Path:** `/storage/files/`
- **Naming System:** Files stored as UUIDs to prevent malicious names and conflicts (e.g., `a8s72hs7d2.pdf`).

---

# Database Schema

### Users Table

```sql
users
-----
id (UUID)
email
name
otp_code
otp_expiry
storage_used (int, bytes)
created_at
```

### Folders Table

```sql
folders
-------
id (UUID)
name
parent_folder_id (UUID, null if root)
owner_id (UUID)
is_starred (boolean)
is_trashed (boolean)
created_at
updated_at
```

### Files Table

```sql
files
-----
id (UUID)
original_name
stored_name (UUID)
folder_id (UUID, null if root)
owner_id (UUID)
size (int, bytes)
mime_type
is_starred (boolean)
is_trashed (boolean)
created_at
updated_at
```

### Shares Table

```sql
shares
------
id (UUID)
resource_type ('file' | 'folder')
resource_id (UUID)
owner_id (UUID)
shared_with_user_id (UUID)
permission ('view' | 'edit')
created_at
```

---

# Core Workflows

### 1. File Upload Flow

1. User drops a file into the UI.
2. Frontend chunks and sends the file to the API.
3. Server generates a `stored_name` (UUID).
4. File is written to server disk (e.g., `/storage/files/9834fhs82.pdf`).
5. Metadata (`original_name`, `folder_id`, `size`, `owner`) is saved in the Database.

### 2. File Download Flow

1. User clicks download or double-clicks to preview.
2. API validates the session token.
3. API checks if the user is the `owner` or has an entry in the `shares` table.
4. If authorized, the server streams the file from disk using the `stored_name`.
5. If unauthorized, returns 403 Forbidden.

### 3. Sharing Logic Workflow

1. User A right-clicks a folder and selects "Share".
2. Adds User B's email and assigns 'View' permission.
3. API creates a record in the `shares` table.
4. When User B navigates to "Shared with me", the DB queries all files/folders where `shared_with_user_id` is User B.

---

# Infrastructure & Deployment

**Example Subdomain:** `drive.company.com`

**Server Setup:**

- Windows Server or Ubuntu VPS.
- Node.js App running on an internal port (e.g., `3000`).
- **Reverse Proxy:** IIS (Windows) or Nginx (Linux) forwarding `drive.company.com` traffic to port `3000`.
- **SSL:** Let's Encrypt for HTTPS.

---

# Minimal MVP Features (V1 Release)

To launch the internal drive quickly and gather feedback:

✔ Email + OTP Login System
✔ Sheopal's Drive Layout (Sidebar + Main Grid/List view)
✔ Drag & Drop File Uploads
✔ Folder Creation & Navigation
✔ Right-Click Context Menus (Rename, Delete, Download)
✔ Soft Delete System (Trash Bin)
✔ Internal Sharing System (View/Edit)
✔ Storage File System Handlers

This establishes a true **Sheopal's Drive foundation** that feels familiar, professional, and is fully functional.

---

# Estimated Development Timeline

| Task                                                           | Estimated Time |
| :------------------------------------------------------------- | :------------- |
| **Auth System** (Email + OTP)                                  | 5 hours        |
| **Storage Engine** (Uploads, Downloads, Disk Management)       | 6 hours        |
| **Database & Models** (Hierarchy, Metadata, Shares)            | 4 hours        |
| **Frontend UI Foundation** (Layouts, Drag/Drop, Context Menus) | 12 hours       |
| **Sharing & Permissions Engine**                               | 6 hours        |
| **Integration & QA Testing**                                   | 5 hours        |

**Total Estimated Time: ~38–40 hours (About 4–5 days of active development)**

---

# Future Enhancements (V2+)

- **Deep File Previews:** View Word, Excel, and Video files directly in the browser.
- **Bulk Zip Downloads:** Download entire folders as a `.zip` archive.
- **Version History:** Track changes and restore older versions of files.
- **Activity Feed:** "User A uploaded Document.pdf" right sidebar panel.
- **Tagging System:** Apply custom color labels to folders and files.

---

If you want, I can also show you a **super clean folder structure for the Next.js project (like production SaaS apps use)** so the whole **drive system can be built in ~1500 lines of code and remain scalable**.
