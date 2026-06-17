-- ═══════════════════════════════════════════════════════════════════════════
-- pCloud — Add file_data column
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This adds a column to store actual file binary data in the database
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE files ADD COLUMN IF NOT EXISTS file_data TEXT;
