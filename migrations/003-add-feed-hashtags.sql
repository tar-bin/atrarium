-- Migration 003: Add hashtag support for direct feed posting
-- Feature: Direct Feed Posting by Feed ID (003-id)
-- Date: 2025-10-04

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- ============================================================================
-- 1. Extend theme_feeds table with hashtag column
-- ============================================================================

-- Step 1a: Add hashtag column (nullable initially)
ALTER TABLE theme_feeds ADD COLUMN hashtag TEXT UNIQUE;

-- Step 1b: Generate hashtags for existing feeds
UPDATE theme_feeds
SET hashtag = '#atr_' || lower(hex(randomblob(4)))
WHERE hashtag IS NULL;

-- Step 1c: Recreate table to make hashtag NOT NULL
-- (SQLite doesn't support ALTER COLUMN, so we recreate the table)
CREATE TABLE theme_feeds_new (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  hashtag TEXT NOT NULL UNIQUE,
  last_post_at INTEGER,
  posts_7d INTEGER NOT NULL DEFAULT 0,
  active_users_7d INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  archived_at INTEGER,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (status IN ('active', 'warning', 'archived'))
);

-- Copy data
INSERT INTO theme_feeds_new
SELECT id, community_id, name, description, status, hashtag,
       last_post_at, posts_7d, active_users_7d, created_at, archived_at
FROM theme_feeds;

-- Drop old table
DROP TABLE theme_feeds;

-- Rename new table
ALTER TABLE theme_feeds_new RENAME TO theme_feeds;

-- Recreate indexes
CREATE INDEX idx_theme_feeds_community ON theme_feeds(community_id);
CREATE INDEX idx_theme_feeds_status ON theme_feeds(status);
CREATE INDEX idx_theme_feeds_last_post ON theme_feeds(last_post_at DESC);
CREATE UNIQUE INDEX idx_theme_feeds_hashtag ON theme_feeds(hashtag);

-- ============================================================================
-- 2. Extend post_index table with moderation columns
-- ============================================================================

CREATE TABLE post_index_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL UNIQUE,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT 0,
  langs TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  indexed_at INTEGER NOT NULL,
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE,
  CHECK (moderation_status IN ('approved', 'hidden', 'reported'))
);

-- Copy data (use created_at as default indexed_at for existing entries)
INSERT INTO post_index_new
SELECT id, uri, feed_id, author_did, created_at, has_media, langs,
       'approved', created_at
FROM post_index;

-- Drop old table
DROP TABLE post_index;

-- Rename new table
ALTER TABLE post_index_new RENAME TO post_index;

-- Recreate indexes
CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_author ON post_index(author_did);
CREATE INDEX idx_post_index_uri ON post_index(uri);
CREATE INDEX idx_post_index_moderation ON post_index(feed_id, moderation_status, created_at DESC);

-- ============================================================================
-- 3. Create feed_blocklist table
-- ============================================================================

CREATE TABLE feed_blocklist (
  feed_id TEXT NOT NULL,
  blocked_user_did TEXT NOT NULL,
  reason TEXT,
  blocked_by_did TEXT NOT NULL,
  blocked_at INTEGER NOT NULL,
  PRIMARY KEY (feed_id, blocked_user_did),
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_feed_blocklist_user ON feed_blocklist(blocked_user_did);

-- ============================================================================
-- 4. Create moderation_logs table
-- ============================================================================

CREATE TABLE moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_uri TEXT NOT NULL,
  feed_id TEXT,
  community_id TEXT,
  moderator_did TEXT NOT NULL,
  reason TEXT,
  performed_at INTEGER NOT NULL,
  CHECK (action IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user', 'remove_member'))
);

CREATE INDEX idx_moderation_logs_time ON moderation_logs(performed_at DESC);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_uri);
CREATE INDEX idx_moderation_logs_feed ON moderation_logs(feed_id);
CREATE INDEX idx_moderation_logs_community ON moderation_logs(community_id);

COMMIT;

PRAGMA foreign_keys = ON;

-- Migration complete
-- Verify with: SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('theme_feeds', 'post_index', 'feed_blocklist', 'moderation_logs');
