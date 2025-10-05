# Data Model: PDS-First Architecture

**Feature**: 006-pds-1-db
**Date**: 2025-10-04

## Overview

This document describes the PDS-first data model for Atrarium. Data is stored primarily in users' Personal Data Servers (PDSs) as AT Protocol records, with Cloudflare **Durable Objects Storage** serving as a performance cache/index. The source of truth is always the PDS, not the centralized storage. **D1 database has been completely removed** from the architecture in favor of per-community Durable Object instances with isolated storage.

---

## Architecture Principles

1. **PDS as Source of Truth**: All authoritative data lives in user-owned PDSs
2. **Durable Objects Storage as Cache**: Per-community Durable Object instances maintain read-only caches derived from PDS records
3. **Firehose Synchronization**: Real-time sync from PDS → Durable Objects Storage via Bluesky Firehose (WebSocket in Durable Object)
4. **Eventual Consistency**: Durable Objects Storage may lag behind PDS, but eventually converges
5. **Multiple Feed Generators**: Any Feed Generator can rebuild its cache from PDS data
6. **Horizontal Scalability**: Each community = one Durable Object instance, unlimited scaling without database bottlenecks

---

## PDS Records (Source of Truth)

### 1. CommunityConfig

**Location**: Owner's PDS
**Collection**: `com.atrarium.community.config`
**Record Key**: `tid` (timestamp identifier, auto-generated)

```typescript
interface CommunityConfig {
  $type: 'com.atrarium.community.config';
  name: string;                    // Display name (max 100 graphemes)
  description?: string;             // Purpose statement (max 1000 graphemes)
  hashtag: string;                  // Unique hashtag: #atr_[8-hex]
  stage: 'theme' | 'community' | 'graduated';
  moderators: string[];             // Array of moderator DIDs (max 50)
  blocklist: string[];              // Array of blocked user DIDs (max 1000)
  feedMix: {
    own: number;                    // 0.0-1.0
    parent: number;                 // 0.0-1.0
    global: number;                 // 0.0-1.0 (sum must = 1.0)
  };
  parentCommunity?: string;         // AT-URI of parent community
  createdAt: string;                // ISO 8601 datetime
  updatedAt?: string;               // ISO 8601 datetime
}
```

**AT-URI Format**: `at://did:plc:owner/com.atrarium.community.config/3jzfcijpj2z2a`

**Example**:
```json
{
  "$type": "com.atrarium.community.config",
  "name": "Design Community",
  "description": "A community for designers to share work and feedback",
  "hashtag": "#atr_a1b2c3d4",
  "stage": "theme",
  "moderators": ["did:plc:alice123"],
  "blocklist": [],
  "feedMix": { "own": 1.0, "parent": 0.0, "global": 0.0 },
  "parentCommunity": null,
  "createdAt": "2025-10-04T12:00:00.000Z"
}
```

---

### 2. MembershipRecord

**Location**: Member's PDS
**Collection**: `com.atrarium.community.membership`
**Record Key**: `tid` (timestamp identifier, auto-generated)

```typescript
interface MembershipRecord {
  $type: 'com.atrarium.community.membership';
  community: string;                // AT-URI of CommunityConfig
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;                 // ISO 8601 datetime
  active: boolean;                  // false = left community
  invitedBy?: string;               // DID of inviter (optional)
  customTitle?: string;             // Custom role title (max 50 graphemes)
}
```

**AT-URI Format**: `at://did:plc:member/com.atrarium.community.membership/3k2j4xyz`

**Example**:
```json
{
  "$type": "com.atrarium.community.membership",
  "community": "at://did:plc:alice123/com.atrarium.community.config/3jzfcijpj2z2a",
  "role": "member",
  "joinedAt": "2025-10-04T12:30:00.000Z",
  "active": true,
  "invitedBy": "did:plc:alice123"
}
```

---

### 3. ModerationAction

**Location**: Moderator's PDS
**Collection**: `com.atrarium.moderation.action`
**Record Key**: `tid` (timestamp identifier, auto-generated)

```typescript
interface ModerationAction {
  $type: 'com.atrarium.moderation.action';
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: PostTarget | UserTarget;
  community: string;                // AT-URI of CommunityConfig
  reason?: string;                  // Moderation reason (max 2000 graphemes)
  createdAt: string;                // ISO 8601 datetime
}

interface PostTarget {
  uri: string;                      // AT-URI of post
  cid: string;                      // Content identifier
}

interface UserTarget {
  did: string;                      // User DID
}
```

**AT-URI Format**: `at://did:plc:moderator/com.atrarium.moderation.action/3m5n6pqr`

**Example (Hide Post)**:
```json
{
  "$type": "com.atrarium.moderation.action",
  "action": "hide_post",
  "target": {
    "uri": "at://did:plc:bob456/app.bsky.feed.post/3xyz789",
    "cid": "bafyreib2rxk3rw6putwqx7q7q7q7q7q7q7q7q7q7q7q"
  },
  "community": "at://did:plc:alice123/com.atrarium.community.config/3jzfcijpj2z2a",
  "reason": "Violates community guidelines",
  "createdAt": "2025-10-04T13:00:00.000Z"
}
```

---

## Durable Objects Storage (Cache Data)

**Important**: D1 database has been **completely removed**. Each community has a dedicated Durable Object instance with isolated Durable Objects Storage.

### Storage Key Schema

Durable Objects Storage uses key-value pairs with a hierarchical prefix structure for efficient `storage.list()` queries:

```typescript
// Storage key patterns
type StorageKey =
  | `config:${communityId}`                    // Community configuration cache
  | `member:${did}`                             // Membership record cache
  | `post:${timestamp}:${uri}`                  // Post metadata (sorted by time)
  | `moderation:${uri}`                         // Moderation action cache
  | `cache:members:${timestamp}`                // Member DID list (5min TTL)

// Examples:
config:3jzfcijpj2z2a                           // CommunityConfig for rkey 3jzfcijpj2z2a
member:did:plc:bob456                          // Bob's membership record
post:1704067200000:at://did:plc:bob/app.bsky.feed.post/xyz  // Post sorted by timestamp
moderation:at://did:plc:bob/app.bsky.feed.post/xyz  // Moderation action for post
cache:members:1704067200                       // Member list snapshot (5min cache)
```

### Storage Value Types

```typescript
interface StoredCommunityConfig extends CommunityConfig {
  pdsSyncedAt: number;  // Firehose event timestamp
  rkey: string;          // Record key from AT-URI
}

interface StoredMembershipRecord extends MembershipRecord {
  pdsSyncedAt: number;
  memberDid: string;     // Member's DID
}

interface StoredPostMetadata {
  uri: string;           // Post AT-URI
  authorDid: string;
  createdAt: number;     // Unix timestamp (used in key)
  hashtags: string[];
  moderationStatus: 'approved' | 'hidden' | 'reported';
  pdsSyncedAt: number;
}

interface StoredModerationAction extends ModerationAction {
  pdsSyncedAt: number;
  moderatorDid: string;
}
```

### Mapping: PDS Records → Durable Objects Storage

| PDS Record | Storage Key Pattern | Sync Logic |
|------------|---------------------|------------|
| `CommunityConfig` | `config:{rkey}` | Firehose event → parse record → storage.put() |
| `MembershipRecord` | `member:{did}` | Firehose event → parse record → storage.put() |
| `ModerationAction` | `moderation:{uri}` | Firehose event → parse record → storage.put() + update post status |
| Bluesky Post | `post:{timestamp}:{uri}` | Firehose event → verify membership → storage.put() |

### Sync Logic Examples

**Community Configuration**:
```typescript
// Inside CommunityFeedGenerator Durable Object
async handleFirehoseEvent(event: FirehoseCommit) {
  if (event.collection === 'com.atrarium.community.config') {
    const record = event.record as CommunityConfig;

    await this.storage.put(`config:${event.rkey}`, {
      ...record,
      pdsSyncedAt: event.indexedAt,
      rkey: event.rkey
    });
  }
}
```

**Membership Record**:
```typescript
async handleMembershipEvent(event: FirehoseCommit) {
  const record = event.record as MembershipRecord;

  if (record.active) {
    // Add membership
    await this.storage.put(`member:${event.repo}`, {
      ...record,
      pdsSyncedAt: event.indexedAt,
      memberDid: event.repo
    });
  } else {
    // Remove membership
    await this.storage.delete(`member:${event.repo}`);
  }
}
```

**Post Indexing**:
```typescript
async handlePost(event: FirehoseCommit) {
  const post = event.record as PostRecord;

  // Verify membership
  const member = await this.storage.get<StoredMembershipRecord>(`member:${event.repo}`);
  if (!member) return; // Not a member, skip

  // Index post
  const key = `post:${event.createdAt}:${event.uri}`;
  await this.storage.put(key, {
    uri: event.uri,
    authorDid: event.repo,
    createdAt: event.createdAt,
    hashtags: extractHashtags(post.text),
    moderationStatus: 'approved',
    pdsSyncedAt: event.indexedAt
  });

  // Cleanup old posts (7 days)
  await this.cleanupOldPosts();
}
```

**Moderation Action (Last-Write-Wins)**:
```typescript
async handleModerationAction(event: FirehoseCommit) {
  const action = event.record as ModerationAction;
  const targetUri = action.target.uri;

  // Check existing action timestamp (LWW)
  const existing = await this.storage.get<StoredModerationAction>(`moderation:${targetUri}`);
  if (existing && existing.pdsSyncedAt > event.indexedAt) {
    return; // Discard older action
  }

  // Store action
  await this.storage.put(`moderation:${targetUri}`, {
    ...action,
    pdsSyncedAt: event.indexedAt,
    moderatorDid: event.repo
  });

  // Update post status
  const posts = await this.storage.list<StoredPostMetadata>({
    prefix: 'post:',
    // Cannot filter by URI, must scan
  });

  for (const [key, post] of posts) {
    if (post.uri === targetUri) {
      post.moderationStatus = action.action === 'hide_post' ? 'hidden' : 'approved';
      await this.storage.put(key, post);
      break;
    }
  }
}

---

## Data Flow

### Write Flow (Create Community)

```
1. User (Alice) creates community via Dashboard
        ↓
2. Dashboard calls Worker API: POST /api/communities
        ↓
3. Worker writes CommunityConfig to Alice's PDS
   → agent.com.atproto.repo.createRecord(...)
        ↓
4. Worker creates Durable Object instance for this community
   → COMMUNITY_FEED.get(COMMUNITY_FEED.idFromName(communityId))
        ↓
5. Bluesky PDS emits commit to Firehose/Jetstream
        ↓
6. FirehoseReceiver DO receives WebSocket message
   → Lightweight filter: includes('#atr_')
   → Queue.sendBatch([event, ...])
        ↓
7. Cloudflare Queue buffers event
        ↓
8. FirehoseProcessor Worker consumes from Queue (batch: 100)
   → Heavyweight filter: /#atr_[0-9a-f]{8}/
   → Sharding check: hash(communityId) % totalShards
   → RPC: CommunityFeedGenerator.indexPost(event)
        ↓
9. CommunityFeedGenerator DO writes to Storage
   → storage.put(`config:${rkey}`, communityConfig)
        ↓
10. Community is ready for feed generation
```

### Read Flow (Get Feed Skeleton)

```
1. Client requests: GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=at://...
        ↓
2. Worker routes to Durable Object instance
   → stub = COMMUNITY_FEED.get(COMMUNITY_FEED.idFromName(communityId))
        ↓
3. Durable Object queries its Storage
   → const posts = await storage.list({ prefix: 'post:', reverse: true, limit: 50 })
        ↓
4. Filter by moderation status
   → exclude posts with moderationStatus === 'hidden'
        ↓
5. Return post URIs to client
   → { feed: [{ post: 'at://...' }, ...] }
        ↓
6. Client fetches full post content from Bluesky AppView
```

### Feed Rebuild Flow (Durable Object Restart)

```
1. Durable Object restarts (crash, deployment, etc.)
        ↓
2. Storage persists across restarts (Durable Objects feature)
        ↓
3. WebSocket reconnects to Firehose
        ↓
4. Durable Object continues indexing from last checkpoint
        ↓
5. No data loss, no manual rebuild needed
```

---

## Relationships

### PDS-Level Relationships

```
CommunityConfig (at://did:plc:alice/com.atrarium.community.config/xxx)
    ↑
    │ references (via AT-URI)
    │
MembershipRecord (at://did:plc:bob/com.atrarium.community.membership/yyy)
  community: "at://did:plc:alice/com.atrarium.community.config/xxx"
```

**Referential Integrity**:
- MembershipRecord.community MUST reference a valid CommunityConfig AT-URI
- Feed Generator validates references by fetching CommunityConfig from PDS
- Orphaned memberships (community deleted) are ignored during indexing

### Durable Objects Storage Relationships

```
CommunityFeedGenerator Durable Object Instance
├── config:{rkey} → CommunityConfig
├── member:{did1} → MembershipRecord
├── member:{did2} → MembershipRecord
├── post:{ts1}:{uri1} → PostMetadata
├── post:{ts2}:{uri2} → PostMetadata
└── moderation:{uri1} → ModerationAction
```

**Relationship Patterns**:
- All data within a single community is isolated to one Durable Object instance
- No foreign key constraints (key-value store)
- References validated by checking existence of keys (e.g., `storage.get(`member:${did}`)`)
- Orphaned records are ignored during queries

---

## Cache Invalidation Strategy

### Soft TTL (5 minutes)

If cache age > 5 minutes:
1. Attempt to revalidate from PDS
2. If PDS available: Update cache, return fresh data
3. If PDS unavailable: Serve stale cache, log warning

### Hard TTL (24 hours)

If cache age > 24 hours:
1. Attempt to fetch from PDS
2. If PDS available: Update cache, return fresh data
3. If PDS unavailable: Return HTTP 503 error

### Staleness Indicators

API responses include metadata:
```typescript
interface FeedResponse {
  feed: PostReference[];
  cursor?: string;
  metadata: {
    cacheStatus: 'fresh' | 'stale-revalidating' | 'stale-error';
    lastUpdated: number;      // Unix timestamp
    staleness?: number;        // Seconds since last fresh fetch
  };
}
```

---

## Migration from Existing D1-Centric Architecture

**Note**: Since no production environment exists, this is a **complete architectural replacement** rather than a migration.

### Implementation Approach

**Remove D1 Entirely, Use Durable Objects Storage**:
1. Remove all D1 dependencies (schema.sql, migrations/, wrangler.toml bindings)
2. Remove all KV dependencies (wrangler.toml bindings)
3. Create Durable Objects class: `CommunityFeedGenerator`
4. Each community becomes a Durable Object instance with dedicated Storage
5. Remove all `src/models/` (D1 query code)
6. Remove `src/services/db.ts` and `src/services/cache.ts`
7. All data flows through: User → PDS → Firehose → Durable Objects Storage

### Deployment Steps

1. **Remove D1/KV Infrastructure**
   ```bash
   # Delete schema and migrations
   rm schema.sql
   rm -rf migrations/

   # Remove from wrangler.toml
   # [[d1_databases]]  ← DELETE
   # [[kv_namespaces]] ← DELETE
   ```

2. **Add Durable Objects Configuration (wrangler.toml)**
   ```toml
   [durable_objects]
   bindings = [
     { name = "COMMUNITY_FEED", class_name = "CommunityFeedGenerator" }
   ]

   [[migrations]]
   tag = "v1"
   new_classes = ["CommunityFeedGenerator"]
   ```

3. **Create Durable Objects Class**
   - File: `src/durable-objects/community-feed-generator.ts`
   - WebSocket connection to Firehose
   - Storage API for indexing
   - getFeedSkeleton endpoint

4. **Update API Routes**
   - Replace `db.prepare('INSERT ...')` with `agent.com.atproto.repo.createRecord(...)`
   - Replace `db.prepare('SELECT ...')` with Durable Object fetch calls
   - Remove all D1 query code

5. **Verify Data Flow**
   - Test: Create community → verify PDS record → verify Durable Object created → verify Firehose event → verify Storage
   - Monitor: Durable Object request count, Storage size, Firehose lag

---

## Data Ownership & Privacy

| Data Type | Owner | Stored In | Visibility |
|-----------|-------|-----------|----------|
| CommunityConfig | Community Owner | Owner's PDS | Public (via Firehose) |
| MembershipRecord | Individual Member | Member's PDS | Public (via Firehose) |
| ModerationAction | Moderator | Moderator's PDS | Public (via Firehose) |
| Durable Objects Storage | Feed Generator | Cloudflare Durable Objects | Internal only (per-community isolation) |

**Key Properties**:
- Users own their data (can delete PDS records anytime)
- Feed Generators cannot modify PDS data (read-only access)
- Multiple Feed Generators can compete (no vendor lock-in)
- Data portability: Users can export PDS records via AT Protocol

---

## Summary

| Aspect | PDS-First + Queue + Durable Objects (New) | D1-Centric (Old) |
|--------|------------------------------------------|------------------|
| **Source of Truth** | User PDSs | Cloudflare D1 |
| **Cache Storage** | Durable Objects Storage (per-community) | Cloudflare D1 (shared) |
| **Event Processing** | Cloudflare Queue (async, parallel) | Synchronous DB writes |
| **Data Ownership** | Users (via PDS) | Atrarium (centralized) |
| **Vendor Lock-In** | None (multiple Feed Generators) | High (single database) |
| **Resilience** | High (rebuild from Firehose + Queue retry) | Low (D1 failure = data loss) |
| **Consistency** | Eventual (Firehose + Queue lag) | Strong (single DB) |
| **Throughput** | **2,000+ events/sec** (Queue buffering) | **Limited** (D1 write bottleneck) |
| **Horizontal Scaling** | **Unlimited** (per-community + sharding) | **Limited** (D1 100k writes/day) |
| **AT Protocol Compliance** | Full | Partial (violates decentralization) |
| **Cost (1000 communities)** | ~$0.40/month (DO + Queue) | ~$5/month (D1 paid tier) |

**Trade-off**: Performance for correctness, decentralization, data sovereignty, **unlimited horizontal scaling, and high-throughput event processing**.
