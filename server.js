require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_STORAGE = 1 * 1024 * 1024 * 1024; // 1 GB

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(express.json());

// Custom cookie parsing middleware
app.use((req, res, next) => {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts.shift().trim();
      const val = parts.join('=');
      list[name] = decodeURIComponent(val);
    });
  }
  req.cookies = list;
  next();
});

const crypto = require('crypto');
const adminUser = process.env.ADMIN_USERNAME || 'pankaj';
const adminPass = process.env.ADMIN_PASSWORD || '@P1a2n3k4a5j6;';
const SESSION_TOKEN = crypto.createHash('sha256').update(`${adminUser}:${adminPass}`).digest('hex');

function isAuthenticated(req) {
  return req.cookies.pcloud_session === SESSION_TOKEN;
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Auth status check
app.get('/api/auth/status', (req, res) => {
  if (isAuthenticated(req)) {
    return res.json({ authenticated: true, username: 'pankaj' });
  }
  res.json({ authenticated: false });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser && password === adminPass) {
    res.cookie('pcloud_session', SESSION_TOKEN, {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });
    return res.json({ success: true, username });
  }
  res.status(400).json({ error: 'Invalid username or password' });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('pcloud_session', { path: '/' });
  res.json({ success: true });
});

app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config — store files with UUID names, preserving extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ─── FOLDER ROUTES ──────────────────────────────────────────────────────────

// List folders (optionally by parent)
app.get('/api/folders', requireAuth, async (req, res) => {
  try {
    const parentId = req.query.parentId || null;
    const folders = await db.getFolders(parentId);
    res.json(folders);
  } catch (err) {
    console.error('Error fetching folders:', err);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Get single folder (for breadcrumbs / info)
app.get('/api/folders/:id', requireAuth, async (req, res) => {
  try {
    const folder = await db.getFolderById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    const pathArr = await db.getFolderPath(req.params.id);
    res.json({ ...folder, path: pathArr });
  } catch (err) {
    console.error('Error fetching folder:', err);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

// Create folder
app.post('/api/folders', requireAuth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    const id = uuidv4();
    await db.createFolder(id, name.trim(), parentId || null);
    const folder = await db.getFolderById(id);
    res.status(201).json(folder);
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Rename folder
app.patch('/api/folders/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    const folder = await db.getFolderById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    await db.renameFolder(req.params.id, name.trim());
    const updated = await db.getFolderById(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Error renaming folder:', err);
    res.status(500).json({ error: 'Failed to rename folder' });
  }
});

// Soft-delete folder → Trash
app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  try {
    const folder = await db.getFolderById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Also trash all child folders and their files recursively
    const childIds = await db.getAllChildFolderIds(req.params.id);
    const allFolderIds = [req.params.id, ...childIds];

    for (const fId of allFolderIds) {
      await db.trashFolder(fId);
      // Trash all files in this folder
      const files = await db.getFilesInFolder(fId);
      for (const file of files) {
        await db.trashFile(file.id);
      }
    }

    res.json({ message: 'Folder moved to trash' });
  } catch (err) {
    console.error('Error trashing folder:', err);
    res.status(500).json({ error: 'Failed to trash folder' });
  }
});

// ─── FILE ROUTES ────────────────────────────────────────────────────────────

// List files (optionally by folder)
app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const folderId = req.query.folderId || null;
    const files = await db.getFiles(folderId);
    res.json(files);
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get single file
app.get('/api/files/:id', requireAuth, async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch (err) {
    console.error('Error fetching file:', err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Upload file
app.post('/api/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check 1 GB storage limit
    const usedStorage = await db.getTotalStorageUsed();
    if (usedStorage + req.file.size > MAX_STORAGE) {
      // Delete the uploaded temp file from disk
      fs.unlinkSync(req.file.path);
      return res.status(413).json({
        error: 'Storage limit exceeded. Maximum 1 GB allowed.',
        used: usedStorage,
        max: MAX_STORAGE,
      });
    }

    const id = uuidv4();
    let folderId = req.body.folderId || null;
    if (folderId === 'null') folderId = null;

    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    // Upload to Supabase
    await db.uploadFileToStorage(fileBuffer, req.file.filename, req.file.mimetype);
    // Delete local temp file
    fs.unlinkSync(req.file.path);

    await db.createFile(
      id,
      req.file.originalname,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      folderId,
      req.file.filename
    );

    const file = await db.getFileById(id);
    res.status(201).json(file);
  } catch (err) {
    console.error('Error uploading file:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Rename file
app.patch('/api/files/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'File name is required' });
    }
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    await db.renameFile(req.params.id, name.trim());
    const updated = await db.getFileById(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Error renaming file:', err);
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

// Soft-delete file → Trash
app.delete('/api/files/:id', requireAuth, async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    await db.trashFile(req.params.id);
    res.json({ message: 'File moved to trash' });
  } catch (err) {
    console.error('Error trashing file:', err);
    res.status(500).json({ error: 'Failed to trash file' });
  }
});

// Download file
app.get('/api/files/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const publicUrl = db.getFilePublicUrl(file.storage_path);
    res.redirect(`${publicUrl}?download=${encodeURIComponent(file.original_name)}`);
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// View file inline (previews)
app.get('/api/files/:id/view', requireAuth, async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const publicUrl = db.getFilePublicUrl(file.storage_path);
    res.redirect(publicUrl);
  } catch (err) {
    console.error('Error viewing file:', err);
    res.status(500).json({ error: 'Failed to view file' });
  }
});

// ─── TRASH ROUTES ───────────────────────────────────────────────────────────

// List trashed items
app.get('/api/trash', requireAuth, async (req, res) => {
  try {
    const folders = await db.getTrashedFolders();
    const files = await db.getTrashedFiles();
    const items = [...folders, ...files].sort(
      (a, b) => new Date(b.trashed_at) - new Date(a.trashed_at)
    );
    res.json(items);
  } catch (err) {
    console.error('Error fetching trash:', err);
    res.status(500).json({ error: 'Failed to fetch trash' });
  }
});

// Restore from trash
app.post('/api/trash/:id/restore', requireAuth, async (req, res) => {
  try {
    const { type } = req.body; // 'file' or 'folder'
    if (type === 'folder') {
      await db.restoreFolder(req.params.id);
    } else {
      await db.restoreFile(req.params.id);
    }
    res.json({ message: 'Item restored' });
  } catch (err) {
    console.error('Error restoring item:', err);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// Permanently delete
app.delete('/api/trash/:id', requireAuth, async (req, res) => {
  try {
    const { type } = req.body;
    if (type === 'folder') {
      // Delete all files in this folder from Supabase Storage
      const files = await db.getFilesInFolder(req.params.id);
      for (const file of files) {
        await db.deleteFileFromStorage(file.storage_path);
        await db.permanentDeleteFile(file.id);
      }
      await db.permanentDeleteFolder(req.params.id);
    } else {
      const file = await db.getFileById(req.params.id);
      if (file) {
        await db.deleteFileFromStorage(file.storage_path);
        await db.permanentDeleteFile(req.params.id);
      }
    }
    res.json({ message: 'Item permanently deleted' });
  } catch (err) {
    console.error('Error permanently deleting:', err);
    res.status(500).json({ error: 'Failed to permanently delete' });
  }
});

// ─── SEARCH ROUTE ───────────────────────────────────────────────────────────

app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || !q.trim()) {
      return res.json([]);
    }
    const query = q.trim();
    const folders = await db.searchFolders(query);
    const files = await db.searchFiles(query);
    res.json([...folders, ...files]);
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── RECENT ROUTE ───────────────────────────────────────────────────────────

app.get('/api/recent', requireAuth, async (req, res) => {
  try {
    const files = await db.getRecentFiles();
    res.json(files);
  } catch (err) {
    console.error('Error fetching recent files:', err);
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

// ─── STORAGE ROUTE ──────────────────────────────────────────────────────────

app.get('/api/storage', requireAuth, async (req, res) => {
  try {
    const used = await db.getTotalStorageUsed();
    res.json({ used, max: MAX_STORAGE });
  } catch (err) {
    console.error('Error fetching storage:', err);
    res.status(500).json({ error: 'Failed to fetch storage info' });
  }
});

// ─── SPA Fallback ───────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start Server (after DB init) ───────────────────────────────────────────

async function start() {
  await db.initDatabase();

  app.listen(PORT, () => {
    console.log(`\n  ☁️  pCloud server running at http://localhost:${PORT}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
