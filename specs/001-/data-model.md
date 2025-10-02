# Data Model: Atrarium MVP

**Feature**: Atrarium MVP - Community Management System on AT Protocol
**Branch**: `001-`
**Date**: 2025-10-02
**Status**: Design Complete

## Overview

This document defines the complete data model for Atrarium MVP, including D1 (SQLite) relational tables, validation rules, state transitions, and relationships. The design prioritizes simplicity, AT Protocol compliance, and <200ms query performance.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   communities   │
└────────┬────────┘
         │ 1
         │
         │ *
┌────────┴────────┐          ┌──────────────┐
│   theme_feeds   │────────┬─│ memberships  │
└────────┬────────┘     *  │ └──────┬───────┘
         │ 1              │         │
         │                │         │ * (user_did)
         │ *              │         │
┌────────┴────────┐       │ ┌──────┴───────────┐
│   post_index    │       └─│ owner_transition │
└─────────────────┘         └──────────────────┘

Legend:
1 = one, * = many
```

---

## 1. communities

**Purpose**: Represents a community space with members, configuration, and lineage.

### Schema
```sql
CREATE TABLE communities (
  id TEXT PRIMARY KEY,                    -- UUID v4
  name TEXT NOT NULL,                      -- Community display name
  description TEXT,                        -- Optional description
  stage TEXT NOT NULL DEFAULT 'theme',     -- 'theme' | 'community' | 'graduated'
  parent_id TEXT,                          -- Reference to parent community (nullable)
  feed_mix_own REAL NOT NULL DEFAULT 1.0, -- Own community posts ratio (0.0-1.0)
  feed_mix_parent REAL NOT NULL DEFAULT 0.0, -- Parent community ratio
  feed_mix_global REAL NOT NULL DEFAULT 0.0, -- Global Bluesky ratio
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,             -- Unix epoch (seconds)
  graduated_at INTEGER,                    -- Timestamp when graduated (nullable)
  archived_at INTEGER,                     -- Timestamp when archived (nullable)
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
```

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`) |
| name | TEXT | NOT NULL | Max 100 characters, user-facing name |
| description | TEXT | NULLABLE | Max 500 characters, markdown allowed |
| stage | TEXT | NOT NULL, CHECK | Community lifecycle stage |
| parent_id | TEXT | NULLABLE, FK | Lineage tracking, nullable for root communities |
| feed_mix_own | REAL | NOT NULL, DEFAULT 1.0 | Ratio of own community posts (Phase 0: always 1.0) |
| feed_mix_parent | REAL | NOT NULL, DEFAULT 0.0 | Ratio of parent community posts (Phase 2+) |
| feed_mix_global | REAL | NOT NULL, DEFAULT 0.0 | Ratio of global Bluesky posts (Phase 2+) |
| member_count | INTEGER | NOT NULL, DEFAULT 0 | Cached count, updated via triggers/application logic |
| post_count | INTEGER | NOT NULL, DEFAULT 0 | Cached count, updated via triggers/application logic |
| created_at | INTEGER | NOT NULL | Unix epoch (seconds since 1970-01-01 00:00:00 UTC) |
| graduated_at | INTEGER | NULLABLE | Timestamp when stage changed to 'graduated' |
| archived_at | INTEGER | NULLABLE | Soft delete timestamp (archived communities hidden from UI) |

### Validation Rules

1. **Name uniqueness**: Not enforced at DB level (allow duplicate names), but UI should warn
2. **Feed mix sum**: `feed_mix_own + feed_mix_parent + feed_mix_global MUST = 1.0`
3. **Stage transitions**: Only valid transitions allowed (see State Transitions below)
4. **Parent reference**: Cannot create circular references (parent → child → parent)
5. **Archived communities**: Cannot have new members or posts

### State Transitions

```
theme ──────────────┐
  │                 │
  │ (promote)       │ (graduate)
  ↓                 ↓
community ──────→ graduated
  │
  │ (archive)
  ↓
[archived]
```

| From | To | Trigger | Requirements |
|------|----|---------| -------------|
| theme | community | Manual promotion | 15+ members, 14+ days, 30+ posts (FR-029) |
| community | graduated | Manual graduation | Owner decision |
| graduated | community | Manual return | Owner decision (FR-030) |
| any | [archived] | Auto-archive | No owner, no moderators (FR-041) |

---

## 2. theme_feeds

**Purpose**: Discussion channels within communities where users post directly.

### Schema
```sql
CREATE TABLE theme_feeds (
  id TEXT PRIMARY KEY,                     -- UUID v4
  community_id TEXT NOT NULL,              -- Parent community
  name TEXT NOT NULL,                       -- Feed display name
  description TEXT,                         -- Optional description
  status TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'warning' | 'archived'
  last_post_at INTEGER,                    -- Unix epoch of most recent post (nullable)
  posts_7d INTEGER NOT NULL DEFAULT 0,     -- Post count in last 7 days
  active_users_7d INTEGER NOT NULL DEFAULT 0, -- Unique authors in last 7 days
  created_at INTEGER NOT NULL,             -- Unix epoch
  archived_at INTEGER,                     -- Timestamp when archived (nullable)
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (status IN ('active', 'warning', 'archived'))
);

CREATE INDEX idx_theme_feeds_community ON theme_feeds(community_id);
CREATE INDEX idx_theme_feeds_status ON theme_feeds(status);
CREATE INDEX idx_theme_feeds_last_post ON theme_feeds(last_post_at DESC);
```

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| community_id | TEXT | NOT NULL, FK | Parent community (cascading delete) |
| name | TEXT | NOT NULL | Max 100 characters |
| description | TEXT | NULLABLE | Max 500 characters |
| status | TEXT | NOT NULL, CHECK | Health status indicator |
| last_post_at | INTEGER | NULLABLE | Updated on each new post |
| posts_7d | INTEGER | NOT NULL, DEFAULT 0 | Rolling 7-day window, recalculated daily |
| active_users_7d | INTEGER | NOT NULL, DEFAULT 0 | Unique `author_did` count, recalculated daily |
| created_at | INTEGER | NOT NULL | Feed creation timestamp |
| archived_at | INTEGER | NULLABLE | Soft delete timestamp |

### Validation Rules

1. **Name uniqueness**: Within a community (enforced at application level, not DB)
2. **Status updates**: Automated via scheduled job (Cron Trigger)
3. **Health metrics**: Recalculated daily by background job
4. **Archived feeds**: Cannot receive new posts, but posts remain visible

### State Transitions

```
active ──────→ warning ──────→ archived
  ↑              (7 days)       (14 days)
  │                              │
  └──────────────────────────────┘
           (revival: 5+ posts/week, 3+ users)
```

| From | To | Trigger | Requirements |
|------|----|---------| -------------|
| active | warning | Auto (daily job) | `last_post_at` > 7 days ago (FR-010) |
| warning | archived | Auto (daily job) | `last_post_at` > 14 days ago (FR-011) |
| archived | active | Auto (daily job) | 5+ posts/week + 3+ active users (FR-012) |

---

## 3. memberships

**Purpose**: User association with communities, roles, and activity tracking.

### Schema
```sql
CREATE TABLE memberships (
  community_id TEXT NOT NULL,
  user_did TEXT NOT NULL,                  -- AT Protocol DID (e.g., did:plc:xxx)
  role TEXT NOT NULL DEFAULT 'member',     -- 'owner' | 'moderator' | 'member'
  joined_at INTEGER NOT NULL,              -- Unix epoch
  last_activity_at INTEGER,                -- Unix epoch of last action (nullable)
  PRIMARY KEY (community_id, user_did),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (role IN ('owner', 'moderator', 'member'))
);

CREATE INDEX idx_memberships_user ON memberships(user_did);
CREATE INDEX idx_memberships_role ON memberships(community_id, role);
```

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| community_id | TEXT | PRIMARY KEY (composite) | Community reference |
| user_did | TEXT | PRIMARY KEY (composite) | AT Protocol DID |
| role | TEXT | NOT NULL, CHECK | Permission level |
| joined_at | INTEGER | NOT NULL | Membership creation timestamp |
| last_activity_at | INTEGER | NULLABLE | Updated on post, comment, moderation action |

### Validation Rules

1. **One owner per community**: Enforced at application level (not DB constraint)
2. **Owner cannot leave**: Must transfer ownership first
3. **Unique membership**: Composite primary key ensures one membership per (community, user)
4. **Role permissions**: See Role-Based Access Control below

### Role-Based Access Control (FR-018)

| Role | Permissions |
|------|-------------|
| **owner** | Full control: manage community settings, create/delete theme feeds, assign roles, delete community |
| **moderator** | Moderation: archive posts, warn users, manage theme feed status (cannot delete community or assign owner) |
| **member** | View and participate: post to feeds, view all content, leave community |

---

## 4. post_index

**Purpose**: References to posts made to theme feeds (stores URIs only, not content).

### Schema
```sql
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL UNIQUE,                -- AT Protocol URI: at://did:plc:xxx/app.bsky.feed.post/yyy
  feed_id TEXT NOT NULL,                   -- Target theme feed
  author_did TEXT NOT NULL,                -- Post author DID
  created_at INTEGER NOT NULL,             -- Unix epoch
  has_media BOOLEAN NOT NULL DEFAULT 0,    -- True if post contains images/video
  langs TEXT,                               -- JSON array: ["en", "ja"] (nullable)
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_author ON post_index(author_did);
CREATE INDEX idx_post_index_uri ON post_index(uri);
```

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal ID for efficiency |
| uri | TEXT | NOT NULL, UNIQUE | AT-URI format, globally unique |
| feed_id | TEXT | NOT NULL, FK | Which theme feed this post belongs to |
| author_did | TEXT | NOT NULL | Post author (not FK to avoid tight coupling) |
| created_at | INTEGER | NOT NULL | Post timestamp (from AT Protocol record) |
| has_media | BOOLEAN | NOT NULL, DEFAULT 0 | Quick filter for media-only feeds |
| langs | TEXT | NULLABLE | BCP-47 language codes as JSON array |

### Validation Rules

1. **URI format**: Must match `at://did:plc:xxx/app.bsky.feed.post/yyy` pattern
2. **URI uniqueness**: Global uniqueness constraint prevents duplicate posts
3. **Content storage**: Does NOT store post text/media (defers to Bluesky PDS per FR-026)
4. **Deletion sync**: Removed via scheduled job when post deleted on Bluesky (FR-042)

### Example URIs
```
at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3k44dddkhc322
at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3l42dddabcd12
```

---

## 5. owner_transition_log

**Purpose**: Audit log for ownership changes (accountability and debugging).

### Schema
```sql
CREATE TABLE owner_transition_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id TEXT NOT NULL,
  previous_owner_did TEXT NOT NULL,        -- Former owner
  new_owner_did TEXT NOT NULL,             -- New owner
  reason TEXT NOT NULL,                     -- 'deletion' | 'inactivity' | 'vacation' | 'manual'
  transitioned_at INTEGER NOT NULL,        -- Unix epoch
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (reason IN ('deletion', 'inactivity', 'vacation', 'manual'))
);

CREATE INDEX idx_owner_transition_community ON owner_transition_log(community_id);
CREATE INDEX idx_owner_transition_time ON owner_transition_log(transitioned_at DESC);
```

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Log entry ID |
| community_id | TEXT | NOT NULL, FK | Community reference |
| previous_owner_did | TEXT | NOT NULL | Former owner DID |
| new_owner_did | TEXT | NOT NULL | New owner DID |
| reason | TEXT | NOT NULL, CHECK | Transition reason code |
| transitioned_at | INTEGER | NOT NULL | Timestamp of ownership change |

### Transition Reasons

| Reason | Trigger | Auto/Manual |
|--------|---------|-------------|
| deletion | Owner account deleted on AT Protocol (FR-040) | Automatic |
| inactivity | Owner inactive >30 days (future phase) | Automatic |
| vacation | Owner requests temporary transfer | Manual |
| manual | Owner manually transfers ownership | Manual |

---

## 6. achievements (Phase 1+)

**Purpose**: Gamification rewards for user actions (deferred to Phase 1).

### Schema
```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_did TEXT NOT NULL,
  achievement_id TEXT NOT NULL,            -- 'first_join', 'first_split', 'veteran', etc.
  community_id TEXT,                       -- Associated community (nullable)
  unlocked_at INTEGER NOT NULL,            -- Unix epoch
  UNIQUE(user_did, achievement_id, community_id),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL
);

CREATE INDEX idx_achievements_user ON achievements(user_did);
CREATE INDEX idx_achievements_type ON achievements(achievement_id);
```

**Note**: Not implemented in Phase 0. Included in spec for completeness.

---

## Database Initialization Script

### schema.sql
```sql
-- Atrarium MVP Database Schema
-- SQLite (Cloudflare D1)
-- Version: 1.0.0
-- Date: 2025-10-02

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

-- 2. Theme Feeds
CREATE TABLE theme_feeds (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
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

-- 3. Memberships
CREATE TABLE memberships (
  community_id TEXT NOT NULL,
  user_did TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  last_activity_at INTEGER,
  PRIMARY KEY (community_id, user_did),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (role IN ('owner', 'moderator', 'member'))
);

CREATE INDEX idx_memberships_user ON memberships(user_did);
CREATE INDEX idx_memberships_role ON memberships(community_id, role);

-- 4. Post Index
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL UNIQUE,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT 0,
  langs TEXT,
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_author ON post_index(author_did);
CREATE INDEX idx_post_index_uri ON post_index(uri);

-- 5. Owner Transition Log
CREATE TABLE owner_transition_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id TEXT NOT NULL,
  previous_owner_did TEXT NOT NULL,
  new_owner_did TEXT NOT NULL,
  reason TEXT NOT NULL,
  transitioned_at INTEGER NOT NULL,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  CHECK (reason IN ('deletion', 'inactivity', 'vacation', 'manual'))
);

CREATE INDEX idx_owner_transition_community ON owner_transition_log(community_id);
CREATE INDEX idx_owner_transition_time ON owner_transition_log(transitioned_at DESC);

-- 6. Achievements (Phase 1+, not used in Phase 0)
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_did TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  community_id TEXT,
  unlocked_at INTEGER NOT NULL,
  UNIQUE(user_did, achievement_id, community_id),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL
);

CREATE INDEX idx_achievements_user ON achievements(user_did);
CREATE INDEX idx_achievements_type ON achievements(achievement_id);
```

---

## Performance Considerations

### Query Patterns

#### 1. Get Feed Skeleton (Most Frequent Query)
```sql
SELECT uri, created_at
FROM post_index
WHERE feed_id = ?
  AND created_at < ?
ORDER BY created_at DESC
LIMIT ?;
```
**Index**: `idx_post_index_feed_created` (covering index)
**Expected latency**: 10-50ms (D1 Sessions API with read replicas)

#### 2. List Theme Feeds for Community
```sql
SELECT id, name, status, last_post_at, posts_7d
FROM theme_feeds
WHERE community_id = ?
  AND archived_at IS NULL
ORDER BY last_post_at DESC;
```
**Index**: `idx_theme_feeds_community`
**Expected latency**: 5-20ms

#### 3. User's Communities
```sql
SELECT c.id, c.name, c.stage, m.role
FROM memberships m
JOIN communities c ON m.community_id = c.id
WHERE m.user_did = ?
  AND c.archived_at IS NULL
ORDER BY m.last_activity_at DESC;
```
**Index**: `idx_memberships_user`, `idx_communities_stage`
**Expected latency**: 10-30ms

### Batch Operations

Use D1 batch API for bulk inserts (10-11x faster than loops):
```typescript
const statements = posts.map(post =>
  env.DB.prepare('INSERT INTO post_index VALUES (?, ?, ?, ?, ?, ?)')
    .bind(null, post.uri, post.feedId, post.author, post.createdAt, post.hasMedia, post.langs)
);
await env.DB.batch(statements);
```

### Caching Strategy

- **KV Cache**: Post metadata (7-day TTL)
- **Application Cache**: Community metadata (1-hour TTL in Workers memory)
- **No cache**: Membership data (changes frequently, security-sensitive)

---

## Migration Strategy

### D1 Migrations
```bash
# Create migration
wrangler d1 migrations create atrarium-db initial_schema

# Apply migration locally
wrangler d1 migrations apply atrarium-db --local

# Apply migration to production
wrangler d1 migrations apply atrarium-db --remote
```

### Versioning
- Schema version stored in `pragma user_version`
- Breaking changes require new major version
- Migration scripts in `/migrations` directory

---

## Data Validation

### TypeScript Interfaces (src/types.ts)
```typescript
export interface Community {
  id: string;
  name: string;
  description: string | null;
  stage: 'theme' | 'community' | 'graduated';
  parentId: string | null;
  feedMixOwn: number;
  feedMixParent: number;
  feedMixGlobal: number;
  memberCount: number;
  postCount: number;
  createdAt: number;
  graduatedAt: number | null;
  archivedAt: number | null;
}

export interface ThemeFeed {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  status: 'active' | 'warning' | 'archived';
  lastPostAt: number | null;
  posts7d: number;
  activeUsers7d: number;
  createdAt: number;
  archivedAt: number | null;
}

export interface Membership {
  communityId: string;
  userDid: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: number;
  lastActivityAt: number | null;
}

export interface PostIndex {
  id: number;
  uri: string;
  feedId: string;
  authorDid: string;
  createdAt: number;
  hasMedia: boolean;
  langs: string[] | null;
}
```

---

## Testing Considerations

### Seed Data (seeds/test-data.sql)
```sql
INSERT INTO communities VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Test Community', 'A test community', 'theme', NULL, 1.0, 0.0, 0.0, 5, 10, 1696291200, NULL, NULL);

INSERT INTO theme_feeds VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'General', 'General discussion', 'active', 1696291200, 10, 5, 1696291200, NULL);

INSERT INTO memberships VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'did:plc:test123', 'owner', 1696291200, 1696291200);
```

### Integration Tests
- Create community → Create theme feed → Post to feed → Verify in feed skeleton
- Owner deletion → Automatic ownership transfer
- Feed inactivity → Status transitions (active → warning → archived)

---

**Status**: Data model design complete. Ready for contract generation.
