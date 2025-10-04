# Data Model: Direct Feed Posting by Feed ID

**Feature**: 003-id | **Date**: 2025-10-04
**Phase**: Phase 1 - Database schema and entity design

## Overview

This feature extends the existing Atrarium database schema to support hashtag-based feed posting with membership validation and moderation capabilities.

**Design Principles**:
- Extend existing tables (theme_feeds, post_index) rather than create new ones
- Add moderation layer without breaking existing Feed Generator API
- Maintain AT Protocol compliance (user data in PDS, metadata in D1)

---

## Schema Changes

### 1. Extend `theme_feeds` Table

**Add Column**:
```sql
ALTER TABLE theme_feeds ADD COLUMN hashtag TEXT UNIQUE;
```

**Migration Script** (`migrations/003-add-feed-hashtags.sql`):
```sql
-- Migration 003: Add hashtag support for direct feed posting
PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- 1. Add hashtag column
ALTER TABLE theme_feeds ADD COLUMN hashtag TEXT UNIQUE;

-- 2. Generate hashtags for existing feeds
UPDATE theme_feeds
SET hashtag = '#atr_' || lower(hex(randomblob(4)))
WHERE hashtag IS NULL;

-- 3. Make hashtag NOT NULL after backfill
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
CREATE TABLE theme_feeds_new (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  hashtag TEXT NOT NULL UNIQUE, -- Added field
  last_post_at INTEGER,
  posts_7d INTEGER NOT NULL DEFAULT 0,
  active_users_7d INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  archived_at INTEGER,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (status IN ('active', 'warning', 'archived'))
);

-- Copy data
INSERT INTO theme_feeds_new SELECT
  id, community_id, name, description, status, hashtag,
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

COMMIT;

PRAGMA foreign_keys = ON;
```

**Updated Schema**:
```sql
CREATE TABLE theme_feeds (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  hashtag TEXT NOT NULL UNIQUE, -- NEW
  last_post_at INTEGER,
  posts_7d INTEGER NOT NULL DEFAULT 0,
  active_users_7d INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  archived_at INTEGER,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (status IN ('active', 'warning', 'archived'))
);

CREATE UNIQUE INDEX idx_theme_feeds_hashtag ON theme_feeds(hashtag);
```

---

### 2. Extend `post_index` Table

**Add Columns**:
```sql
ALTER TABLE post_index ADD COLUMN moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'hidden', 'reported'));
ALTER TABLE post_index ADD COLUMN indexed_at INTEGER NOT NULL DEFAULT (unixepoch());
```

**Migration Script** (part of `migrations/003-add-feed-hashtags.sql`):
```sql
-- Extend post_index for moderation
CREATE TABLE post_index_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL UNIQUE,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT 0,
  langs TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'approved', -- NEW
  indexed_at INTEGER NOT NULL, -- NEW
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE,
  CHECK (moderation_status IN ('approved', 'hidden', 'reported'))
);

-- Copy data
INSERT INTO post_index_new
SELECT id, uri, feed_id, author_did, created_at, has_media, langs,
       'approved', created_at -- Default moderation_status and indexed_at
FROM post_index;

DROP TABLE post_index;
ALTER TABLE post_index_new RENAME TO post_index;

-- Recreate indexes
CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_author ON post_index(author_did);
CREATE INDEX idx_post_index_uri ON post_index(uri);
CREATE INDEX idx_post_index_moderation ON post_index(feed_id, moderation_status, created_at DESC);
```

**Updated Schema**:
```sql
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL UNIQUE,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT 0,
  langs TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'approved', -- NEW
  indexed_at INTEGER NOT NULL, -- NEW (Firehose detection timestamp)
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE,
  CHECK (moderation_status IN ('approved', 'hidden', 'reported'))
);

CREATE INDEX idx_post_index_moderation ON post_index(feed_id, moderation_status, created_at DESC);
```

---

### 3. New Table: `feed_blocklist`

**Purpose**: Block specific users from appearing in feeds (moderator action)

**Schema**:
```sql
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
```

**TypeScript Type**:
```typescript
// src/types.ts
export interface FeedBlocklist {
  feedId: string;
  blockedUserDid: string;
  reason?: string;
  blockedByDid: string;
  blockedAt: number; // Unix timestamp
}

export interface FeedBlocklistRow {
  feed_id: string;
  blocked_user_did: string;
  reason: string | null;
  blocked_by_did: string;
  blocked_at: number;
}
```

---

### 4. New Table: `moderation_logs`

**Purpose**: Audit trail for all moderation actions

**Schema**:
```sql
CREATE TABLE moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_uri TEXT NOT NULL, -- Post URI or user DID
  feed_id TEXT, -- NULL for community-wide actions
  community_id TEXT, -- For community-level actions
  moderator_did TEXT NOT NULL,
  reason TEXT,
  performed_at INTEGER NOT NULL,
  CHECK (action IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user', 'remove_member'))
);

CREATE INDEX idx_moderation_logs_time ON moderation_logs(performed_at DESC);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_uri);
CREATE INDEX idx_moderation_logs_feed ON moderation_logs(feed_id);
CREATE INDEX idx_moderation_logs_community ON moderation_logs(community_id);
```

**TypeScript Type**:
```typescript
// src/types.ts
export type ModerationAction =
  | 'hide_post'
  | 'unhide_post'
  | 'block_user'
  | 'unblock_user'
  | 'remove_member';

export interface ModerationLog {
  id: number;
  action: ModerationAction;
  targetUri: string; // Post URI or user DID
  feedId?: string;
  communityId?: string;
  moderatorDid: string;
  reason?: string;
  performedAt: number; // Unix timestamp
}

export interface ModerationLogRow {
  id: number;
  action: string;
  target_uri: string;
  feed_id: string | null;
  community_id: string | null;
  moderator_did: string;
  reason: string | null;
  performed_at: number;
}
```

---

## Entity Relationships

```
communities (existing)
  ├─ theme_feeds (extended with hashtag column)
  │   ├─ post_index (extended with moderation_status, indexed_at)
  │   └─ feed_blocklist (new)
  ├─ memberships (existing, validates feed access)
  └─ moderation_logs (new, audit trail)
```

**Key Relationships**:
- `theme_feeds.hashtag` → Used for Firehose filtering
- `post_index.moderation_status` → Filters feed skeleton results
- `feed_blocklist.blocked_user_did` → Excludes user's posts from feed
- `memberships.user_did` → Validates post author is community member

---

## Query Patterns

### 1. Generate Feed Skeleton (with moderation + membership)

```sql
SELECT p.uri
FROM post_index p
INNER JOIN theme_feeds f ON p.feed_id = f.id
INNER JOIN memberships m ON p.author_did = m.user_did AND m.community_id = f.community_id
LEFT JOIN feed_blocklist b ON b.feed_id = p.feed_id AND b.blocked_user_did = p.author_did
WHERE p.feed_id = ?
  AND p.moderation_status = 'approved'
  AND b.blocked_user_did IS NULL -- Exclude blocked users
ORDER BY p.created_at DESC
LIMIT ?;
```

### 2. Index Post from Firehose (with membership check)

```sql
-- 1. Lookup feed by hashtag
SELECT id, community_id FROM theme_feeds WHERE hashtag = ?;

-- 2. Check membership
SELECT 1 FROM memberships
WHERE community_id = ? AND user_did = ?;

-- 3. Insert if member
INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
VALUES (?, ?, ?, ?, ?, 'approved');
```

### 3. Hide Post (moderator action)

```sql
-- 1. Update moderation status
UPDATE post_index
SET moderation_status = 'hidden'
WHERE uri = ?;

-- 2. Log action
INSERT INTO moderation_logs (action, target_uri, feed_id, moderator_did, reason, performed_at)
VALUES ('hide_post', ?, ?, ?, ?, ?);
```

### 4. Block User from Feed

```sql
-- 1. Insert block record
INSERT INTO feed_blocklist (feed_id, blocked_user_did, blocked_by_did, reason, blocked_at)
VALUES (?, ?, ?, ?, ?);

-- 2. Log action
INSERT INTO moderation_logs (action, target_uri, feed_id, moderator_did, reason, performed_at)
VALUES ('block_user', ?, ?, ?, ?, ?);

-- 3. Count affected posts (for UI feedback)
SELECT COUNT(*) FROM post_index
WHERE feed_id = ? AND author_did = ?;
```

### 5. Remove User from Community (invalidate all posts)

```sql
-- 1. Delete membership
DELETE FROM memberships WHERE community_id = ? AND user_did = ?;

-- 2. Log action
INSERT INTO moderation_logs (action, target_uri, community_id, moderator_did, reason, performed_at)
VALUES ('remove_member', ?, ?, ?, ?, ?);

-- 3. Count affected posts across all feeds
SELECT COUNT(*) FROM post_index p
INNER JOIN theme_feeds f ON p.feed_id = f.id
WHERE f.community_id = ? AND p.author_did = ?;

-- Note: Posts remain in post_index but won't appear in feeds (membership JOIN fails)
```

---

## Validation Rules

### Hashtag Format
- **Pattern**: `/^#atr_[0-9a-f]{8}$/`
- **Generation**: `#atr_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
- **Uniqueness**: Enforced by UNIQUE constraint on theme_feeds.hashtag

### Moderation Status
- **Valid Values**: `'approved'`, `'hidden'`, `'reported'`
- **Default**: `'approved'` (on index creation)
- **Transitions**:
  - `approved` → `hidden` (moderator action)
  - `hidden` → `approved` (moderator unhide)
  - `approved` → `reported` (user report)
  - `reported` → `approved` or `hidden` (moderator review)

### Membership Validation
- **Required**: User MUST be in memberships table for community
- **Checked At**: Indexing time (Firehose) + Query time (getFeedSkeleton)
- **Enforcement**: INNER JOIN on memberships table

---

## Data Lifecycle

### Post Indexing Flow
1. Firehose delivers post with `#atr_f7a3b2c1`
2. Lookup theme_feeds WHERE hashtag = '#atr_f7a3b2c1'
3. Check memberships WHERE community_id = X AND user_did = author
4. If member: INSERT INTO post_index (moderation_status = 'approved')

### Post Removal Triggers
- **User deletes post in PDS** → Firehose delete event → DELETE FROM post_index WHERE uri = X
- **User removed from community** → Membership JOIN fails → Posts disappear from feeds
- **Moderator hides post** → UPDATE moderation_status = 'hidden' → Excluded from WHERE clause
- **User blocked from feed** → LEFT JOIN feed_blocklist → Excluded by WHERE b.blocked_user_did IS NULL

### Cleanup Jobs
**Daily Orphan Removal**:
```sql
-- Remove post_index entries for non-members
DELETE FROM post_index
WHERE id IN (
  SELECT p.id FROM post_index p
  INNER JOIN theme_feeds f ON p.feed_id = f.id
  LEFT JOIN memberships m ON p.author_did = m.user_did AND m.community_id = f.community_id
  WHERE m.user_did IS NULL
);
```

---

## TypeScript Model Interfaces

```typescript
// src/types.ts

// Existing types (extended)
export interface ThemeFeed {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  status: ThemeFeedStatus;
  hashtag: string; // NEW
  lastPostAt?: number;
  posts7d: number;
  activeUsers7d: number;
  createdAt: number;
  archivedAt?: number;
}

export interface PostIndex {
  id: number;
  uri: string;
  feedId: string;
  authorDid: string;
  createdAt: number;
  hasMedia: boolean;
  langs?: string;
  moderationStatus: ModerationStatus; // NEW
  indexedAt: number; // NEW
}

// New types
export type ModerationStatus = 'approved' | 'hidden' | 'reported';

export interface FeedBlocklist {
  feedId: string;
  blockedUserDid: string;
  reason?: string;
  blockedByDid: string;
  blockedAt: number;
}

export interface ModerationLog {
  id: number;
  action: ModerationAction;
  targetUri: string;
  feedId?: string;
  communityId?: string;
  moderatorDid: string;
  reason?: string;
  performedAt: number;
}
```

---

**Phase 1 Data Model Complete** | Next: API Contracts
