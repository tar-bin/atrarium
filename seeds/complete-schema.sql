-- Atrarium Complete Database Schema (with migrations applied)
-- SQLite (Cloudflare D1)
-- Version: 1.1.0 (includes migration 003-add-feed-hashtags)
-- Date: 2025-10-04

PRAGMA foreign_keys = ON;

-- 1. Communities
CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'theme',
  parent_id TEXT,
  feed_mix_own REAL NOT NULL DEFAULT 1.0,
  feed_mix_parent REAL NOT NULL DEFAULT 0.0,
  feed_mix_global REAL NOT NULL DEFAULT 0.0,
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  graduated_at INTEGER,
  archived_at INTEGER,
  FOREIGN KEY (parent_id) REFERENCES communities(id) ON DELETE SET NULL,
  CHECK (stage IN ('theme', 'community', 'graduated')),
  CHECK (feed_mix_own + feed_mix_parent + feed_mix_global = 1.0),
  CHECK (feed_mix_own >= 0 AND feed_mix_own <= 1),
  CHECK (feed_mix_parent >= 0 AND feed_mix_parent <= 1),
  CHECK (feed_mix_global >= 0 AND feed_mix_global <= 1)
);

CREATE INDEX idx_communities_stage ON communities(stage);
CREATE INDEX idx_communities_parent ON communities(parent_id);
CREATE INDEX idx_communities_created ON communities(created_at DESC);

-- 2. Theme Feeds (with hashtag column from migration 003)
CREATE TABLE theme_feeds (
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

CREATE INDEX idx_theme_feeds_community ON theme_feeds(community_id);
CREATE INDEX idx_theme_feeds_status ON theme_feeds(status);
CREATE INDEX idx_theme_feeds_last_post ON theme_feeds(last_post_at DESC);
CREATE UNIQUE INDEX idx_theme_feeds_hashtag ON theme_feeds(hashtag);

-- 3. Memberships
CREATE TABLE memberships (
  community_id TEXT NOT NULL,
  user_did TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (community_id, user_did),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (role IN ('owner', 'moderator', 'member'))
);

CREATE INDEX idx_memberships_user ON memberships(user_did);
CREATE INDEX idx_memberships_role ON memberships(role);

-- 4. Post Index (with moderation columns from migration 003)
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL UNIQUE,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  text_content TEXT,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT 0,
  langs TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  indexed_at INTEGER NOT NULL,
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE,
  CHECK (moderation_status IN ('approved', 'hidden', 'reported'))
);

CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_author ON post_index(author_did);
CREATE INDEX idx_post_index_uri ON post_index(uri);
CREATE INDEX idx_post_index_moderation ON post_index(feed_id, moderation_status, created_at DESC);

-- 5. Feed Blocklist (from migration 003)
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

-- 6. Moderation Logs (from migration 003)
CREATE TABLE moderation_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_uri TEXT NOT NULL,
  feed_id TEXT,
  community_id TEXT,
  moderator_did TEXT NOT NULL,
  reason TEXT,
  performed_at INTEGER NOT NULL,
  CHECK (action IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user', 'remove_member')),
  CHECK (target_type IN ('post', 'user'))
);

CREATE INDEX idx_moderation_logs_time ON moderation_logs(performed_at DESC);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_uri);
CREATE INDEX idx_moderation_logs_feed ON moderation_logs(feed_id);
CREATE INDEX idx_moderation_logs_community ON moderation_logs(community_id);

-- 7. Owner Transition Log
CREATE TABLE owner_transition_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id TEXT NOT NULL,
  previous_owner_did TEXT NOT NULL,
  new_owner_did TEXT NOT NULL,
  reason TEXT NOT NULL,
  transitioned_at INTEGER NOT NULL,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (reason IN ('manual', 'inactivity', 'resignation'))
);

CREATE INDEX idx_owner_transition_community ON owner_transition_log(community_id);
CREATE INDEX idx_owner_transition_time ON owner_transition_log(transitioned_at DESC);

-- 8. Achievements (for future Phase 1)
CREATE TABLE achievements (
  user_did TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  community_id TEXT,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_did, achievement_id),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL
);

CREATE INDEX idx_achievements_user ON achievements(user_did);
CREATE INDEX idx_achievements_community ON achievements(community_id);
