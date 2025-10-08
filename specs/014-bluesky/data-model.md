# Data Model: net.atrarium.community.post

**Feature**: 014-bluesky
**Date**: 2025-10-08
**Status**: Design Complete

## Overview

This document defines the data model for `net.atrarium.community.post`, a custom AT Protocol Lexicon record type for community-specific posts stored in user PDSs.

---

## Entity: net.atrarium.community.post

**Type**: AT Protocol Lexicon `record`
**Collection**: `net.atrarium.community.post`
**Storage**: User's Personal Data Server (PDS)
**Caching**: Durable Objects Storage (7-day TTL)

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `$type` | string | Yes | `"net.atrarium.community.post"` | Lexicon type identifier |
| `text` | string | Yes | Max 300 chars, non-empty | Post content (plain text only, no rich media) |
| `communityId` | string | Yes | Regex: `^[0-9a-f]{8}$` | 8-character hex community identifier (immutable, survives stage transitions) |
| `createdAt` | string | Yes | ISO 8601 datetime | Post creation timestamp |

**Community Lifecycle Note**:
- `communityId` remains **constant** when a community transitions between stages (theme → community → graduated)
- Posts are **permanently associated** with their original community
- Posts automatically **carry over** during stage transitions
- Community stage is stored in `net.atrarium.community.config`, not in individual posts

**Example Record**:
```json
{
  "$type": "net.atrarium.community.post",
  "text": "Welcome to our community! 🎉",
  "communityId": "a1b2c3d4",
  "createdAt": "2025-10-08T10:00:00.000Z"
}
```

**AT-URI Format**:
```
at://did:plc:abc123xyz/net.atrarium.community.post/3k2l5m6n7p8q
```

### Validation Rules

**Business Logic Validation** (enforced by Atrarium API):
1. **Community Membership**: Author MUST have active membership in community (`net.atrarium.community.membership`)
2. **Community Exists**: `communityId` MUST reference valid `net.atrarium.community.config` record (any stage: theme, community, or graduated)
3. **Text Content**: Non-empty after trimming whitespace
4. **Rate Limiting**: Max 100 posts per user per hour (prevents spam)
5. **Stage-Agnostic**: Posts can be created in communities at any stage (no stage-based restrictions)

**Lexicon Schema Validation** (enforced by PDS):
- `text`: String, max 300 characters
- `communityId`: String, matches `^[0-9a-f]{8}$` pattern
- `createdAt`: String, valid ISO 8601 datetime

### State Transitions

Posts are **immutable** after creation (no updates). State changes handled via:
- **Deletion**: User can delete post via `com.atproto.repo.deleteRecord`
- **Moderation**: Separate `net.atrarium.moderation.action` record (hide/unhide)

```
[Created] → [Visible in Timeline]
    ↓
    ├─→ [User Deletes] → [Removed from PDS + Cache]
    └─→ [Moderator Hides] → [Hidden in Timeline, remains in PDS]
```

---

## Entity: PostMetadata (Durable Objects Cache)

**Type**: Durable Objects Storage value
**Key Format**: `post:<timestamp>:<rkey>`
**Purpose**: Performance cache for feed generation (7-day TTL)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `uri` | string | AT-URI of post (e.g., `at://did:plc:xxx/net.atrarium.community.post/rkey`) |
| `collection` | string | Lexicon collection (`net.atrarium.community.post` or `app.bsky.feed.post`) |
| `authorDid` | string | DID of post author |
| `text` | string | Post content (cached for display) |
| `createdAt` | string | Post creation timestamp (ISO 8601) |
| `communityId` | string | 8-character hex community identifier |
| `moderationStatus` | enum | `'approved'` \| `'hidden'` \| `'reported'` |
| `indexedAt` | string | Timestamp when post was indexed (ISO 8601) |

**Example**:
```typescript
{
  uri: 'at://did:plc:abc123xyz/net.atrarium.community.post/3k2l5m6n7p8q',
  collection: 'net.atrarium.community.post',
  authorDid: 'did:plc:abc123xyz',
  text: 'Welcome to our community! 🎉',
  createdAt: '2025-10-08T10:00:00.000Z',
  communityId: 'a1b2c3d4',
  moderationStatus: 'approved',
  indexedAt: '2025-10-08T10:00:02.123Z'
}
```

---

## Relationships

### Post → Community Config
- **Type**: Reference
- **Field**: `communityId` → `net.atrarium.community.config.hashtag` (without `#atrarium_` prefix)
- **Cardinality**: Many posts → One community
- **Validation**: Community MUST exist before post creation

### Post → Community Membership
- **Type**: Implicit (validation check)
- **Logic**: `authorDid` MUST have active `net.atrarium.community.membership` record for `communityId`
- **Cardinality**: Many posts → Many memberships
- **Enforcement**: Checked at post creation time

### Post → Actor Profile
- **Type**: External reference (Bluesky Lexicon)
- **Field**: `authorDid` → `app.bsky.actor.profile`
- **Cardinality**: Many posts → One profile
- **Usage**: Fetch avatar, display name for UI rendering

### Post → Moderation Action
- **Type**: Reference (separate record)
- **Link**: `net.atrarium.moderation.action.targetUri` → Post AT-URI
- **Cardinality**: One post → Many moderation actions (hide, unhide, etc.)

---

## Data Flow

### Write Path (Post Creation)
```
1. User submits post via Dashboard API
   ↓
2. Validate membership (query net.atrarium.community.membership from PDS)
   ↓
3. Validate community exists (query net.atrarium.community.config from PDS)
   ↓
4. Write record to user's PDS (com.atproto.repo.createRecord)
   ↓
5. PDS broadcasts to AT Protocol Relay
   ↓
6. Firehose (Jetstream) delivers to FirehoseReceiver
   ↓
7. Queue → FirehoseProcessor → CommunityFeedGenerator
   ↓
8. Index in Durable Objects Storage (7-day cache)
```

### Read Path (Timeline Display)
```
1. Client requests feed (GET /api/communities/{id}/posts)
   ↓
2. Query Durable Objects Storage (list posts with prefix='post:', reverse=true)
   ↓
3. Filter by moderationStatus='approved'
   ↓
4. Fetch author profiles (app.bsky.actor.profile from Bluesky AppView)
   ↓
5. Return merged data (post + profile) to client
```

---

## Migration Considerations

### Coexistence with app.bsky.feed.post

During transition period (7 days), both record types coexist:

| Aspect | app.bsky.feed.post (legacy) | net.atrarium.community.post (new) |
|--------|------------------------------|-----------------------------------|
| **Storage** | User's PDS | User's PDS |
| **Community Link** | Hashtag (`#atrarium_a1b2c3d4`) | Field (`communityId: "a1b2c3d4"`) |
| **Visibility** | Public Bluesky timeline | Atrarium only |
| **Indexing** | Firehose filter (hashtag regex) | Firehose filter (collection NSID) |
| **Timeline Display** | Merged chronologically | Merged chronologically |

**No Data Migration Required**: Legacy posts naturally expire from 7-day cache.

---

## Performance Characteristics

**Write Performance**:
- PDS write: ~50-100ms (network latency to user's PDS)
- Firehose latency: <5s (typical Jetstream delivery time)
- Indexing: <10ms (Durable Objects write)

**Read Performance**:
- Feed query: <10ms (Durable Objects list operation)
- Profile fetch: <50ms (parallel requests to Bluesky AppView)
- Total p95: <100ms (target maintained)

**Storage**:
- Per post: ~200 bytes (PostMetadata JSON)
- 1000 posts/community: ~200KB
- 7-day retention: Auto-cleanup via scheduled alarm

---

## Summary

**New Entities**:
1. `net.atrarium.community.post` (Lexicon record in PDS)
2. `PostMetadata` (Durable Objects cache, updated type)

**Updated Entities**:
- `PostMetadata`: Add `collection` field to distinguish record types

**Relationships**: 4 relationships defined (Community Config, Membership, Profile, Moderation)

**Constitution Compliance**: ✅ All data in PDS (Principle 4, 5, 8), no new databases (Principle 2)
