---
title: Database Schema
description: Atrarium D1 database structure and design
order: 2
---

# Database Schema

Atrarium uses Cloudflare D1 (SQLite) for structured data storage.

## Schema Overview

The database consists of 4 main tables:

1. **communities** - Community metadata and settings
2. **theme_feeds** - Feed configurations for filtering posts
3. **memberships** - User membership and roles
4. **post_index** - Indexed post URIs for feed generation

## Table Definitions

### communities

Stores community metadata, lifecycle stage, and health metrics.

```sql
CREATE TABLE communities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('theme', 'community', 'graduated')),
  parent_id INTEGER,
  feed_mix TEXT NOT NULL DEFAULT '{"own":80,"parent":15,"global":5}',
  health_metrics TEXT NOT NULL DEFAULT '{}',
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (parent_id) REFERENCES communities(id)
);

CREATE INDEX idx_communities_stage ON communities(stage);
CREATE INDEX idx_communities_parent ON communities(parent_id);
```

**Fields**:
- `id`: Auto-increment primary key
- `name`: Community display name
- `stage`: Lifecycle stage (theme/community/graduated)
- `parent_id`: Reference to parent community (for nested structure)
- `feed_mix`: JSON config for feed composition ratios
- `health_metrics`: JSON metrics (activity_score, growth_rate, engagement)
- `member_count`: Cached member count
- `post_count`: Cached post count

**Indexes**:
- Stage-based queries (find all theme feeds)
- Parent-child relationships

### theme_feeds

Feed configurations for post filtering.

```sql
CREATE TABLE theme_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  feed_uri TEXT NOT NULL UNIQUE,
  filter_config TEXT NOT NULL,
  health_metrics TEXT NOT NULL DEFAULT '{}',
  post_count INTEGER NOT NULL DEFAULT 0,
  last_post_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE INDEX idx_theme_feeds_community ON theme_feeds(community_id);
CREATE UNIQUE INDEX idx_theme_feeds_uri ON theme_feeds(feed_uri);
```

**Fields**:
- `feed_uri`: AT Protocol feed URI (at://did:plc:xxx/app.bsky.feed.generator/feed-id)
- `filter_config`: JSON filter rules

**filter_config Structure**:
```json
{
  "hashtags": ["#TypeScript", "#React"],
  "keywords": ["webdev", "frontend"],
  "authors": ["did:plc:xxx", "did:plc:yyy"]
}
```

### memberships

User membership in communities with roles.

```sql
CREATE TABLE memberships (
  community_id INTEGER NOT NULL,
  user_did TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'moderator', 'member')),
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (community_id, user_did),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE INDEX idx_memberships_user ON memberships(user_did);
CREATE INDEX idx_memberships_role ON memberships(community_id, role);
```

**Roles**:
- `owner`: Full control (create feeds, manage members, delete community)
- `moderator`: Moderation powers (approve posts, manage members)
- `member`: View-only access

### post_index

Indexed post URIs for feed generation.

```sql
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  uri TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_index_feed ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_index_uri ON post_index(uri);
CREATE INDEX idx_post_index_author ON post_index(author_did);
```

**Design Notes**:
- Only stores URIs (references), not content
- Content fetched from user's PDS via AT Protocol
- Indexes optimized for feed skeleton queries

## Common Queries

### Get Feed Skeleton

```sql
SELECT uri
FROM post_index
WHERE feed_id = ?
ORDER BY created_at DESC
LIMIT 50
OFFSET ?
```

### Community Health Check

```sql
SELECT
  c.name,
  c.stage,
  c.member_count,
  c.post_count,
  json_extract(c.health_metrics, '$.activity_score') as activity
FROM communities c
WHERE c.stage = 'theme'
  AND json_extract(c.health_metrics, '$.activity_score') < 0.3
```

### User's Communities

```sql
SELECT
  c.id,
  c.name,
  c.stage,
  m.role
FROM communities c
JOIN memberships m ON c.id = m.community_id
WHERE m.user_did = ?
ORDER BY m.joined_at DESC
```

## Migration Strategy

### Version Management

Database migrations tracked in `migrations/` directory:

```
migrations/
├── 001_initial_schema.sql
├── 002_add_health_metrics.sql
└── 003_add_post_index.sql
```

### Apply Migration

```bash
wrangler d1 execute atrarium-db --file=./migrations/001_initial_schema.sql
```

## Performance Considerations

### Indexing Strategy

- **Feed queries**: Composite index on (feed_id, created_at DESC)
- **User lookups**: Index on user_did for membership queries
- **Parent-child**: Index on parent_id for community hierarchy

### Data Retention

- **Post URIs**: Kept indefinitely (lightweight, just URIs)
- **KV Cache**: 7-day TTL for post content
- **Inactive feeds**: No automatic deletion (manual archival)

### Limits

- **D1 Free Tier**: 5GB storage, 5M reads/day, 100k writes/day
- **Expected usage**: ~1000 communities × 50k posts = 50M rows (well under limit)

## Backup & Recovery

### Manual Backup

```bash
# Export entire database
wrangler d1 export atrarium-db --output backup.sql
```

### Restore from Backup

```bash
# Import from SQL dump
wrangler d1 execute atrarium-db --file=backup.sql
```

## Schema Updates

When modifying schema:

1. Create migration file: `migrations/00X_description.sql`
2. Test locally: `npm run dev`
3. Apply to production: `wrangler d1 execute atrarium-db --file=migrations/00X_description.sql`
4. Update `schema.sql` to reflect current state

## Related Documentation

- [System Architecture](/en/architecture/system-design)
- [API Design](/en/architecture/api)
- [Implementation Guide](/en/reference/implementation)
