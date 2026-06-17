require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─── Supabase Configuration ────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rvvthnfdqketulgsslhs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2dnRobmZkcWtldHVsZ3NzbGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODcyNDcsImV4cCI6MjA5NzI2MzI0N30.YttpdiF3tX0IAngrxeD4Nm6J6-UD4-C557lBJ6yk2G0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Initialization ────────────────────────────────────────────────────────

async function initDatabase() {
  // Test connection by querying folders
  const { error } = await supabase.from('folders').select('id').limit(1);
  if (error) {
    console.error('  ❌ Supabase connection failed:', error.message);
    console.error('  ➡  Make sure you run supabase_migration.sql in your Supabase SQL Editor first.');
    throw error;
  }
  console.log('  📦 Connected to Supabase');
}

// ─── Folders ────────────────────────────────────────────────────────────────

async function getFolders(parentId) {
  let query = supabase
    .from('folders')
    .select('*')
    .eq('is_trashed', false)
    .order('name', { ascending: true });

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getFolderById(id) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

async function createFolder(id, name, parentId) {
  const { error } = await supabase
    .from('folders')
    .insert({ id, name, parent_id: parentId || null });

  if (error) throw error;
}

async function renameFolder(id, name) {
  const { error } = await supabase
    .from('folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

async function trashFolder(id) {
  const { error } = await supabase
    .from('folders')
    .update({ is_trashed: true, trashed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

async function restoreFolder(id) {
  const { error } = await supabase
    .from('folders')
    .update({ is_trashed: false, trashed_at: null })
    .eq('id', id);

  if (error) throw error;
}

async function permanentDeleteFolder(id) {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Files ──────────────────────────────────────────────────────────────────

// Column list WITHOUT file_data (to avoid loading huge blobs in list queries)
const FILE_COLUMNS = 'id, name, original_name, mime_type, size, folder_id, storage_path, created_at, updated_at, is_trashed, trashed_at';

async function getFiles(folderId) {
  let query = supabase
    .from('files')
    .select(FILE_COLUMNS)
    .eq('is_trashed', false)
    .order('name', { ascending: true });

  if (folderId) {
    query = query.eq('folder_id', folderId);
  } else {
    query = query.is('folder_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getFileById(id) {
  const { data, error } = await supabase
    .from('files')
    .select(FILE_COLUMNS)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// Get file binary data (base64 string) — only called for download/view
async function getFileData(id) {
  const { data, error } = await supabase
    .from('files')
    .select('file_data')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? data.file_data : null;
}

async function createFile(id, name, originalName, mimeType, size, folderId, storagePath, fileDataBase64) {
  const { error } = await supabase
    .from('files')
    .insert({
      id,
      name,
      original_name: originalName,
      mime_type: mimeType,
      size,
      folder_id: folderId || null,
      storage_path: storagePath,
      file_data: fileDataBase64,
    });

  if (error) throw error;
}

async function renameFile(id, name) {
  const { error } = await supabase
    .from('files')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

async function trashFile(id) {
  const { error } = await supabase
    .from('files')
    .update({ is_trashed: true, trashed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

async function restoreFile(id) {
  const { error } = await supabase
    .from('files')
    .update({ is_trashed: false, trashed_at: null })
    .eq('id', id);

  if (error) throw error;
}

async function permanentDeleteFile(id) {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Trash ──────────────────────────────────────────────────────────────────

async function getTrashedFolders() {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('is_trashed', true)
    .order('trashed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(f => ({ ...f, type: 'folder' }));
}

async function getTrashedFiles() {
  const { data, error } = await supabase
    .from('files')
    .select(FILE_COLUMNS)
    .eq('is_trashed', true)
    .order('trashed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(f => ({ ...f, type: 'file' }));
}

// ─── Search ─────────────────────────────────────────────────────────────────

async function searchFolders(query) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('is_trashed', false)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(f => ({ ...f, type: 'folder' }));
}

async function searchFiles(query) {
  const { data, error } = await supabase
    .from('files')
    .select(FILE_COLUMNS)
    .eq('is_trashed', false)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(f => ({ ...f, type: 'file' }));
}

// ─── Recent ─────────────────────────────────────────────────────────────────

async function getRecentFiles() {
  const { data, error } = await supabase
    .from('files')
    .select(FILE_COLUMNS)
    .eq('is_trashed', false)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

// ─── Folder Path (breadcrumbs) ──────────────────────────────────────────────

async function getFolderPath(folderId) {
  const pathArr = [];
  let currentId = folderId;

  // Walk up the parent chain (max 20 levels to prevent infinite loops)
  let safety = 0;
  while (currentId && safety < 20) {
    const folder = await getFolderById(currentId);
    if (!folder) break;
    pathArr.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_id;
    safety++;
  }

  return pathArr;
}

// ─── Recursive children (for cascade trash/delete) ──────────────────────────

async function getAllChildFolderIds(parentId) {
  const ids = [];

  const { data: children, error } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', parentId);

  if (error) throw error;

  for (const child of (children || [])) {
    ids.push(child.id);
    const grandchildren = await getAllChildFolderIds(child.id);
    ids.push(...grandchildren);
  }

  return ids;
}

async function getFilesInFolder(folderId) {
  const { data, error } = await supabase
    .from('files')
    .select(FILE_COLUMNS)
    .eq('folder_id', folderId);

  if (error) throw error;
  return data || [];
}

// ─── Storage Usage ──────────────────────────────────────────────────────────

async function getTotalStorageUsed() {
  // Sum the size of all files (including trashed, since they still occupy disk)
  const { data, error } = await supabase
    .from('files')
    .select('size');

  if (error) throw error;
  const total = (data || []).reduce((sum, f) => sum + (f.size || 0), 0);
  return total;
}

module.exports = {
  supabase,
  initDatabase,
  getFolders,
  getFolderById,
  createFolder,
  renameFolder,
  trashFolder,
  restoreFolder,
  permanentDeleteFolder,
  getFiles,
  getFileById,
  getFileData,
  createFile,
  renameFile,
  trashFile,
  restoreFile,
  permanentDeleteFile,
  getTrashedFolders,
  getTrashedFiles,
  searchFolders,
  searchFiles,
  getRecentFiles,
  getFolderPath,
  getAllChildFolderIds,
  getFilesInFolder,
  getTotalStorageUsed,
};
