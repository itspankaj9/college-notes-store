# CloudVault — Google Drive Clone

A full-stack file management web application with a premium Google Drive-style UI, built with Node.js + Express backend and vanilla HTML/CSS/JS frontend.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Node.js + Express |
| **Database** | SQLite (via `better-sqlite3`) — zero config, file-based |
| **File Storage** | Local filesystem (`/uploads` directory) |
| **Icons** | Google Material Symbols |
| **Font** | Inter (Google Fonts) |

## User Review Required

> [!IMPORTANT]
> **Storage Choice: Backend (Option 2)**
> Per your recommendation, we'll use Node.js + Express with SQLite and local file storage. This gives permanent storage and a real Google Drive experience. Files persist across browser sessions.

> [!NOTE]
> **Phase 12 (Advanced Features)** — Login/Signup, file sharing, drag & drop, multiple file upload, dark mode, and storage usage bar will be implemented as a follow-up after the core phases (1–11) are complete and verified.

## Open Questions

> [!IMPORTANT]
> **Port Number**: The dev server will run on `http://localhost:3000`. Is that acceptable, or do you prefer a different port?

> [!NOTE]
> **Max File Size**: We'll default to a 100 MB upload limit. Let us know if you need a different limit.

---

## Proposed Changes

### Project Structure

```
C:\Users\Neti\.gemini\antigravity\scratch\cloudvault\
├── package.json
├── server.js                    # Express server + API routes
├── database.js                  # SQLite setup & queries
├── uploads/                     # Uploaded files stored here
├── public/                      # Static frontend files
│   ├── index.html               # Single-page app shell
│   ├── css/
│   │   └── styles.css           # Full design system + components
│   └── js/
│       ├── app.js               # Main app controller & routing
│       ├── api.js               # API client (fetch wrappers)
│       ├── ui.js                # UI rendering & DOM manipulation
│       ├── search.js            # Search functionality
│       └── utils.js             # Helpers (format size, dates, etc.)
└── data/
    └── cloudvault.db            # SQLite database (auto-created)
```

---

### Backend — Server & API

#### [NEW] `package.json`
- Project metadata, scripts (`npm start`, `npm run dev`)
- Dependencies: `express`, `better-sqlite3`, `multer`, `uuid`, `nodemon` (dev)

#### [NEW] `server.js`
Express server with these REST API routes:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/folders` | List all folders (optionally by parent) |
| `POST` | `/api/folders` | Create a new folder |
| `PATCH` | `/api/folders/:id` | Rename a folder |
| `DELETE` | `/api/folders/:id` | Soft-delete folder → Trash |
| `GET` | `/api/files` | List files (optionally by folder) |
| `POST` | `/api/files/upload` | Upload a file (multipart) |
| `PATCH` | `/api/files/:id` | Rename a file |
| `DELETE` | `/api/files/:id` | Soft-delete file → Trash |
| `GET` | `/api/files/:id/download` | Download a file |
| `GET` | `/api/trash` | List trashed items |
| `POST` | `/api/trash/:id/restore` | Restore from trash |
| `DELETE` | `/api/trash/:id` | Permanently delete |
| `GET` | `/api/search?q=` | Search files & folders by name |
| `GET` | `/api/recent` | Recently uploaded/modified files |

#### [NEW] `database.js`
SQLite schema with two tables:

```sql
-- Folders table (supports nested folders)
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,              -- NULL = root level
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_trashed BOOLEAN DEFAULT 0,
  trashed_at DATETIME
);

-- Files table
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  folder_id TEXT,              -- NULL = root level
  storage_path TEXT NOT NULL,  -- path on disk
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_trashed BOOLEAN DEFAULT 0,
  trashed_at DATETIME
);
```

---

### Frontend — UI & Interaction

#### [NEW] `public/index.html`
Single-page application shell with:
- **Top Navbar**: Logo ("CloudVault"), search box with live filtering, "Upload" button, "New Folder" button
- **Left Sidebar**: Navigation links — Home, My Files, Recent, Trash — with Material Symbols icons and active state highlighting
- **Main Content Area**: Dynamic content area that renders based on current view (home, folder contents, recent, trash, search results)
- Google Fonts (Inter) and Material Symbols loaded via CDN
- SEO meta tags, proper heading hierarchy

#### [NEW] `public/css/styles.css`
Premium design system featuring:

- **Color palette**: Clean whites, soft grays, vibrant blue accent (`#1a73e8` — Google's blue), with subtle gradients
- **Typography**: Inter font family, proper scale (14px body, 24px headings)
- **Layout**: CSS Grid for the app shell (sidebar + header + main), CSS Grid with `auto-fill` for file/folder cards
- **Components**:
  - Navbar with glassmorphism effect and subtle backdrop blur
  - Sidebar with hover animations and active indicators
  - Folder cards with rounded corners, hover lift effect (box-shadow + transform), and folder icon
  - File cards with file-type-specific color coding and thumbnails
  - Modal dialogs for rename/create folder (with smooth fade-in)
  - Context menus for right-click actions
  - Toast notifications for success/error feedback
  - Breadcrumb navigation for nested folders
  - Empty state illustrations
- **Animations**: Smooth transitions on card hover, sidebar toggle, modal open/close, skeleton loading states
- **Responsive**: Collapsible sidebar on mobile, cards reflow to single column

#### [NEW] `public/js/app.js`
Main application controller:
- Client-side routing (hash-based: `#home`, `#folder/id`, `#recent`, `#trash`, `#search/query`)
- State management (current folder, view mode, selected items)
- Event delegation for all interactive elements
- Breadcrumb path tracking for nested folder navigation
- Keyboard shortcuts (Delete, F2 for rename, Ctrl+N for new folder)

#### [NEW] `public/js/api.js`
API client module:
- `fetchFolders(parentId)` — get folders
- `createFolder(name, parentId)` — create folder
- `uploadFile(file, folderId)` — upload with progress
- `downloadFile(id)` — trigger download
- `renameItem(id, type, newName)` — rename file/folder
- `deleteItem(id, type)` — soft delete
- `getTrash()` — list trash
- `restoreItem(id, type)` — restore from trash
- `permanentDelete(id, type)` — permanent delete
- `search(query)` — search
- `getRecent()` — recent files

#### [NEW] `public/js/ui.js`
UI rendering module:
- `renderFolderCard(folder)` — folder card with icon, name, date
- `renderFileCard(file)` — file card with type icon, name, size, date
- `renderBreadcrumbs(path)` — clickable breadcrumb trail
- `renderEmptyState(type)` — friendly empty state for each view
- `showModal(type, data)` — create/rename modals
- `showToast(message, type)` — success/error notifications
- `showContextMenu(event, item)` — right-click menu (Download, Rename, Delete)
- `renderFileInfo(file)` — file details panel (name, size, date, type)

#### [NEW] `public/js/search.js`
- Debounced search input (300ms delay)
- Highlights matching text in results
- Searches across all folders

#### [NEW] `public/js/utils.js`
- `formatFileSize(bytes)` — "2.3 MB", "450 KB"
- `formatDate(date)` — "15 June 2026"
- `getFileIcon(mimeType)` — maps MIME types to Material Symbols icons
- `getFileColor(mimeType)` — maps file types to accent colors
- `truncateName(name, maxLength)` — truncate long file names

---

## Phases Mapped to Implementation

| Phase | Description | Files Involved |
|-------|-------------|----------------|
| 1 | Homepage Layout (Navbar, Sidebar, Content) | `index.html`, `styles.css`, `app.js` |
| 2 | Folder System (Create, Display) | `server.js`, `database.js`, `api.js`, `ui.js` |
| 3 | File Upload System | `server.js` (multer), `api.js`, `ui.js` |
| 4 | Folder Navigation (Nested) | `app.js`, `ui.js` (breadcrumbs) |
| 5 | File Information Display | `ui.js`, `utils.js` |
| 6 | Download Feature | `server.js`, `api.js` |
| 7 | Data Storage (SQLite + FS) | `database.js`, `server.js` |
| 8 | Search Feature | `server.js`, `search.js` |
| 9 | Rename Feature | `server.js`, `api.js`, `ui.js` (modal) |
| 10 | Delete/Trash Feature | `server.js`, `api.js`, `ui.js` (trash view) |
| 11 | Google Drive Style UI Polish | `styles.css` (all polish) |

---

## Verification Plan

### Automated Tests
```bash
# Install dependencies
cd C:\Users\Neti\.gemini\antigravity\scratch\cloudvault
npm install

# Start the dev server
npm run dev

# Verify server is running
curl http://localhost:3000
```

### Manual Verification
After the server starts, we'll verify each feature:
1. **Layout**: Navbar, sidebar, and main content area render correctly
2. **Create Folder**: Click "New Folder", enter name, see it appear in the grid
3. **Upload File**: Click "Upload", select a file, see it appear in the current folder
4. **Navigate Folders**: Click a folder card, see its contents, breadcrumbs update
5. **File Info**: Hover/click files to see name, size, date, type
6. **Download**: Click download on a file, verify the original file downloads
7. **Search**: Type in search box, see matching files/folders across all folders
8. **Rename**: Right-click → Rename on files and folders
9. **Trash**: Delete items → appear in Trash → Restore or Permanently Delete
10. **Responsive**: Resize browser to verify mobile layout
