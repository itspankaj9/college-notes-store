-- ═══════════════════════════════════════════════════════════════════════════
-- pCloud — Supabase Migration
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Folders table (supports nested folders)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_trashed BOOLEAN DEFAULT false,
  trashed_at TIMESTAMPTZ
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_trashed BOOLEAN DEFAULT false,
  trashed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_trashed ON folders(is_trashed);
CREATE INDEX IF NOT EXISTS idx_files_trashed ON files(is_trashed);
CREATE INDEX IF NOT EXISTS idx_files_updated ON files(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);

-- Disable RLS for simplicity (single-user app, no auth yet)
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (no auth)
CREATE POLICY "Allow all operations on folders" ON folders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on files" ON files
  FOR ALL USING (true) WITH CHECK (true);
