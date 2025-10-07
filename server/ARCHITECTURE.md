# ARCHITECTURE

**Consolidated from**: /server/ARCHITECTURE.md, /server/ARCHITECTURE.md

---

## From: system-design.md

---
title: System Architecture
description: Atrarium PDS-first architecture with Durable Objects
order: 1
---

# System Architecture

Atrarium implements a **PDS-first architecture** where all authoritative data is stored in user Personal Data Servers (PDSs) using AT Protocol Lexicon schemas. Cloudflare Durable Objects provide a 7-day feed index cache for fast feed generation.

**Current Phase**: Phase 1 (PDS-First Architecture)
**Status**: Production-ready

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  PDS (Source of Truth)                  │
│  - net.atrarium.community.config        │
│  - net.atrarium.community.membership    │
│  - net.atrarium.moderation.action       │
└──────────────┬──────────────────────────┘
               │
               ↓ Firehose (Jetstream WebSocket)
┌──────────────────────────────────────────┐
│  FirehoseReceiver (Durable Object)       │
│  - Lightweight filter: includes('#atrarium_') │
└──────────────┬───────────────────────────┘
               │
               ↓ Cloudflare Queue (batched)
┌──────────────────────────────────────────┐
│  FirehoseProcessor (Queue Consumer)      │
│  - Heavyweight filter: regex             │
└──────────────┬───────────────────────────┘
               │
               ↓ RPC call
┌──────────────────────────────────────────┐
│  CommunityFeedGenerator (Durable Object) │
│  - Durable Objects Storage (7-day cache) │
│    • config:<communityId>                │
│    • member:<did>                        │
│    • post:<timestamp>:<rkey>             │
│    • moderation:<uri>                    │
└──────────────┬───────────────────────────┘
               │
               ↓ Feed Generator API
┌──────────────────────────────────────────┐
│  Client (Bluesky AppView)                │
│  - Fetches full post content             │
└──────────────────────────────────────────┘
```

## Design Principles

### 1. PDS as Source of Truth
- All community metadata, memberships, and moderation actions stored in user PDSs
- AT Protocol Lexicon schemas ensure data portability
- Users own their data (DID-based identity)

### 2. Durable Objects for Feed Index
- Per-community feed index stored in isolated Durable Object Storage
- 7-day retention for posts (PDS remains permanent storage)
- Horizontal scaling without database bottlenecks

### 3. Queue-Based Processing
- Two-stage filtering: lightweight → Queue → heavyweight
- Efficient Firehose ingestion (5000 msg/sec capacity)
- Batched processing reduces costs

### 4. Cost Efficiency
- ~$0.40/month for 1000 communities (DO + Queue)
- No D1/KV dependencies (92% cost reduction)
- Minimal storage footprint

## Technology Stack

### Backend
- **Cloudflare Workers**: Serverless edge functions (TypeScript 5.7, Node.js via nodejs_compat)
- **Durable Objects**: Per-community feed index + Firehose WebSocket receiver
- **Cloudflare Queues**: Firehose event processing (5000 msg/sec capacity)
- **AT Protocol**: @atproto/api ^0.13.35, @atproto/identity ^0.4.3
- **Frameworks**: Hono ^4.6.14 (routing), Zod ^3.23.8 (validation)

### Frontend (Dashboard)
- **React 19** + TypeScript + Vite
- **TanStack Router v1** (file-based routing)
- **TanStack Query v5** (server state)
- **TanStack Table v8** (data tables)
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **Cloudflare Pages** (hosting)

### External Services
- **Bluesky Firehose** (Jetstream WebSocket)
- **User PDSs** (AT Protocol Personal Data Servers)

### Cost Estimate (1000 communities)
| Component | Cost/Month |
|-----------|-----------|
| Workers Paid | $5.00 (includes 10M requests, 400k DO requests) |
| Durable Objects | Included |
| Queues | ~$0.22 (2.6M events × $0.40/million) |
| Storage | ~$0.18 (1000 communities × 10MB × $0.20/GB) |
| **Total** | **~$5.40/month** |

**Note**: D1 and KV no longer used (previous architecture: $10/month)

## Data Storage

For detailed data storage architecture, see [Data Storage Architecture](/architecture/database).

### Storage Layers

#### 1. PDS (Source of Truth) - Permanent Storage

All community data is stored in user PDSs using AT Protocol Lexicon schemas:

**`net.atrarium.community.config`** (Community metadata)
```typescript
{
  $type: 'net.atrarium.community.config';
  name: string;              // Community name (max 100 chars)
  hashtag: string;           // Unique hashtag: #atrarium_[0-9a-f]{8}
  stage: 'theme' | 'community' | 'graduated';
  parentCommunity?: string;  // AT-URI of parent config
  feedMix: { own: number; parent: number; global: number; };
  moderators: string[];      // DIDs (max 50)
  createdAt: string;         // ISO 8601
}
```

**`net.atrarium.community.membership`** (User memberships)
```typescript
{
  $type: 'net.atrarium.community.membership';
  community: string;         // AT-URI of community config
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;          // ISO 8601
  active: boolean;
}
```

**`net.atrarium.moderation.action`** (Moderation actions)
```typescript
{
  $type: 'net.atrarium.moderation.action';
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: string;            // AT-URI or DID
  community: string;         // AT-URI of community config
  reason?: string;           // Optional explanation
  createdAt: string;         // ISO 8601
}
```

#### 2. Durable Objects Storage - 7-Day Feed Index Cache

Each community has its own `CommunityFeedGenerator` Durable Object instance with isolated storage:

**Storage Keys**:
- `config:<communityId>`: Community metadata cache
- `member:<did>`: Membership record cache
- `post:<timestamp>:<rkey>`: Post index (7-day retention)
- `moderation:<uri>`: Moderation action cache

## Data Flow

### Write Flow (PDS → Firehose → Durable Object)

1. **User posts to PDS** with community hashtag (e.g., `#atrarium_a1b2c3d4`)
2. **Jetstream Firehose** emits event → FirehoseReceiver DO
3. **Lightweight filter** (`includes('#atrarium_')`) → Cloudflare Queue
4. **FirehoseProcessor Worker** applies heavyweight regex (`/#atrarium_[0-9a-f]{8}/`)
5. **CommunityFeedGenerator DO** stores post in Durable Objects Storage

```typescript
// Example: User creates community
const result = await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.config',
  record: {
    $type: 'net.atrarium.community.config',
    name: 'TypeScript Enthusiasts',
    hashtag: '#atrarium_a1b2c3d4',
    stage: 'theme',
    feedMix: { own: 0.8, parent: 0.15, global: 0.05 },
    moderators: [],
    createdAt: new Date().toISOString()
  }
});
// Firehose automatically indexes into Durable Object
```

### Read Flow (Client → Durable Object)

1. **Client requests** `getFeedSkeleton` with feed URI
2. **Feed Generator API** makes RPC call to CommunityFeedGenerator DO
3. **Durable Object** queries storage (reverse chronological order)
4. **Returns post URIs** with pagination cursor
5. **Client fetches** full post content from Bluesky AppView

## API Endpoints

For detailed API reference, see [API Design](/architecture/api) or the auto-generated OpenAPI documentation.

### Feed Generator API (AT Protocol)

**`GET /.well-known/did.json`** - DID document
**`GET /xrpc/app.bsky.feed.getFeedSkeleton`** - Feed skeleton (post URIs)
**`GET /xrpc/app.bsky.feed.describeFeedGenerator`** - Feed metadata

### Dashboard API (Internal)

**Authentication**: All endpoints require JWT token in `Authorization` header

**Communities**:
- `POST /api/communities` - Create community (writes to PDS)
- `GET /api/communities` - List communities
- `GET /api/communities/:id` - Get community details
- `PUT /api/communities/:id` - Update community

**Memberships**:
- `POST /api/communities/:id/members` - Add member (writes to PDS)
- `GET /api/communities/:id/members` - List members
- `PUT /api/communities/:id/members/:did` - Update role

**Moderation**:
- `POST /api/moderation/actions` - Create moderation action (writes to PDS)
- `GET /api/moderation/actions` - List moderation actions

## Hashtag System

Each community has a unique system-generated hashtag:

**Format**: `#atrarium_[0-9a-f]{8}` (8-character hexadecimal)
**Example**: `#atrarium_a1b2c3d4`

**Two-Stage Filtering**:
1. **Lightweight filter** (FirehoseReceiver): `includes('#atrarium_')` → Queue
2. **Heavyweight filter** (FirehoseProcessor): `regex /#atrarium_[0-9a-f]{8}/` → Durable Object

**Membership Validation**: Posts must be from community members (verified in Durable Object)

```

### Achievement System (Phase 2+)

Future feature for gamification of community participation:
- User badges for community milestones
- Achievements for owners/moderators
- Community lineage tracking

### Automated Community Lifecycle (Phase 2+)

Future feature for community growth management:
- Auto-promotion suggestion (Theme → Community)
- Growth monitoring (200+ member warning)
- Auto-archiving for inactive feeds
- Community graduation/splitting

## Security & Authentication

### JWT Authentication

All Dashboard API endpoints require JWT token in `Authorization` header:

```typescript
const token = request.headers.get('Authorization');
const decoded = jwt.verify(token, env.JWT_SECRET);

// DID verification
if (!await verifyDID(decoded.did)) {
  return new Response('Unauthorized', { status: 401 });
}

// Membership check
const isMember = await checkMembership(communityId, decoded.did);
if (!isMember) {
  return new Response('Forbidden', { status: 403 });
}
```

### DID Verification

```typescript
async function verifyDID(did: string): Promise<boolean> {
  try {
    const doc = await resolveDID(did);
    return doc !== null;
  } catch (err) {
    return false;
  }
}
```

### Rate Limiting (Planned)

Future implementation for abuse prevention:
- Feed Generator API: 100 requests/hour/user
- Dashboard API: 1000 requests/hour/user

## Performance Targets

| Metric | Target |
|--------|--------|
| Feed generation | < 200ms |
| API response (p95) | < 100ms |
| Workers uptime | > 99.9% |
| Durable Object read | < 10ms |
| Queue throughput | 5000 msg/sec |
| Post indexing latency | < 5s (Firehose → queryable) |

## Related Documentation

- [Data Storage Architecture](/architecture/database) - Detailed storage design
- [API Design](/architecture/api) - Detailed API reference
- [Quickstart Guide](/guide/quickstart) - Get started with Atrarium
- [Implementation Guide](/reference/implementation) - Development guide


---

## From: database.md

---
title: Data Storage Architecture
description: Atrarium PDS-first data storage with Durable Objects
order: 2
---

# Data Storage Architecture

Atrarium implements a **PDS-first architecture** where all authoritative data is stored in user Personal Data Servers (PDSs) using AT Protocol Lexicon schemas. Cloudflare Durable Objects provide a 7-day feed index cache for fast feed generation.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  PDS (Source of Truth)                  │
│  - net.atrarium.community.config        │
│  - net.atrarium.community.membership    │
│  - net.atrarium.moderation.action       │
└──────────────┬──────────────────────────┘
               │
               ↓ Firehose (Jetstream WebSocket)
┌──────────────────────────────────────────┐
│  FirehoseReceiver (Durable Object)       │
│  - Lightweight filter: includes('#atrarium_') │
└──────────────┬───────────────────────────┘
               │
               ↓ Cloudflare Queue (batched)
┌──────────────────────────────────────────┐
│  FirehoseProcessor (Queue Consumer)      │
│  - Heavyweight filter: regex             │
└──────────────┬───────────────────────────┘
               │
               ↓ RPC call
┌──────────────────────────────────────────┐
│  CommunityFeedGenerator (Durable Object) │
│  - Durable Objects Storage (7-day cache) │
│    • config:<communityId>                │
│    • member:<did>                        │
│    • post:<timestamp>:<rkey>             │
│    • moderation:<uri>                    │
└──────────────────────────────────────────┘
```

## Storage Layers

### 1. PDS (Permanent Storage)

All community data is stored in user PDSs using AT Protocol Lexicon schemas.

#### net.atrarium.community.config

Community metadata stored in the owner's PDS.

```typescript
{
  $type: 'net.atrarium.community.config';
  name: string;              // Community name (max 100 chars)
  hashtag: string;           // Unique hashtag: #atrarium_[0-9a-f]{8}
  stage: 'theme' | 'community' | 'graduated';
  parentCommunity?: string;  // AT-URI of parent config
  feedMix: {
    own: number;             // 0-1, sum must = 1.0
    parent: number;
    global: number;
  };
  moderators: string[];      // DIDs (max 50)
  createdAt: string;         // ISO 8601
  description?: string;      // Max 500 chars
}
```

**AT-URI Format**: `at://did:plc:owner/net.atrarium.community.config/3jzfcijpj2z2a`

#### net.atrarium.community.membership

User membership records stored in each member's PDS.

```typescript
{
  $type: 'net.atrarium.community.membership';
  community: string;         // AT-URI of community config
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;          // ISO 8601
  active: boolean;
}
```

**AT-URI Format**: `at://did:plc:member/net.atrarium.community.membership/3k2j4xyz`

#### net.atrarium.moderation.action

Moderation actions stored in moderator's PDS.

```typescript
{
  $type: 'net.atrarium.moderation.action';
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: string;            // AT-URI or DID
  community: string;         // AT-URI of community config
  reason?: string;           // Optional explanation
  createdAt: string;         // ISO 8601
}
```

**AT-URI Format**: `at://did:plc:moderator/net.atrarium.moderation.action/3m5n6pqr`

::: warning Privacy Warning
Moderation actions are stored as **public records** in the moderator's PDS. The `reason` field should NOT contain:
- Personal information (emails, phone numbers, addresses, etc.)
- Confidential information (internal communications, private user reports, etc.)
- Defamatory or offensive language

Recommended `reason` examples:
- ✅ "Spam post"
- ✅ "Community guidelines violation"
- ✅ "Duplicate post"
- ❌ "Removed based on report from user XXX (email: xxx@example.com)"
- ❌ "This user has history of problematic behavior (see internal records)"
:::

### 2. Durable Objects Storage (7-Day Cache)

Each community has its own `CommunityFeedGenerator` Durable Object instance with isolated storage.

#### Storage Keys

**Community Config**:
- Key: `config:<communityId>`
- Value: `{ name, hashtag, stage, createdAt }`

**Membership Records**:
- Key: `member:<did>`
- Value: `{ did, role, joinedAt, active }`

**Post Index**:
- Key: `post:<timestamp>:<rkey>`
- Value: `{ uri, authorDid, createdAt, moderationStatus, indexedAt }`

**Moderation Actions**:
- Key: `moderation:<uri>`
- Value: `{ action, targetUri, reason, createdAt }`

#### Example Storage Operations

```typescript
// Write post to storage
await storage.put(
  `post:${Date.now()}:${rkey}`,
  { uri, authorDid, createdAt, moderationStatus: 'approved', indexedAt: new Date().toISOString() }
);

// List posts (reverse chronological)
const posts = await storage.list<PostMetadata>({
  prefix: 'post:',
  reverse: true,
  limit: 50
});

// Delete old posts (7-day retention)
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
await storage.delete(`post:${timestamp}:${rkey}`);
```

## Data Flow

### Write Flow (PDS → Firehose → Durable Object)

1. **User posts to PDS** with community hashtag (e.g., `#atrarium_a1b2c3d4`)
2. **Firehose emits event** → FirehoseReceiver DO
3. **Lightweight filter** (`includes('#atrarium_')`) → Cloudflare Queue
4. **FirehoseProcessor Worker** applies heavyweight regex filter (`/#atrarium_[0-9a-f]{8}/`)
5. **CommunityFeedGenerator DO** stores post in Durable Objects Storage

### Read Flow (Client → Durable Object)

1. **Client requests** `getFeedSkeleton` with feed URI
2. **Feed Generator API** makes RPC call to CommunityFeedGenerator DO
3. **Durable Object** queries storage with reverse chronological order
4. **Returns post URIs** with pagination cursor
5. **Client fetches** full post content from Bluesky AppView

## Performance Characteristics

### Storage Limits

- **Durable Objects**: 10GB per object (enough for ~1M posts per community)
- **Expected usage**: 1000 communities × 10k posts × 200 bytes = 2GB total
- **7-day retention**: Automatic cleanup via scheduled alarms

### Query Performance

- **Feed skeleton**: < 10ms (Durable Objects Storage is fast)
- **Membership check**: < 5ms (in-memory map in Durable Object)
- **Post indexing**: < 50ms (write to storage + index update)

### Cost Comparison

| Component | D1 Architecture | PDS-First (Durable Objects) | Savings |
|-----------|-----------------|---------------------------|---------|
| **Database** | $5/month (D1 paid) | $0 (no database) | 100% |
| **Storage** | Included in D1 | $0.18/month (1000 communities × 10MB) | - |
| **Requests** | Included in D1 | Included in Workers Paid | - |
| **Total** | $5/month | $0.40/month | **92%** |

## Resilience & Recovery

### Durable Objects Durability

- **Automatic replication**: Cloudflare replicates Durable Objects Storage across data centers
- **Crash recovery**: State persists across Worker crashes
- **Migration**: Durable Objects can migrate between locations

### Rebuild from Firehose

If Durable Object storage is lost:

1. **Replay Firehose** from cursor 0 (or oldest available)
2. **Re-index posts** for affected communities
3. **7-day retention** limits data loss (older posts already expired)

### PDS as Source of Truth

All community metadata and memberships remain in PDSs:
- No data loss even if all Durable Objects are cleared
- Community owners can always recover from their PDS
- Feed index rebuilds automatically from Firehose

## Common Operations

### Create Community

```typescript
// 1. Write to PDS
const result = await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.config',
  record: {
    $type: 'net.atrarium.community.config',
    name: 'TypeScript Enthusiasts',
    hashtag: '#atrarium_a1b2c3d4',
    stage: 'theme',
    feedMix: { own: 0.8, parent: 0.15, global: 0.05 },
    moderators: [],
    createdAt: new Date().toISOString()
  }
});

// 2. Create Durable Object instance
const communityId = result.uri.split('/').pop();
const stub = env.COMMUNITY_FEED.get(env.COMMUNITY_FEED.idFromName(communityId));
await stub.initialize(communityConfig);
```

### Join Community

```typescript
// Write membership record to user's PDS
await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.membership',
  record: {
    $type: 'net.atrarium.community.membership',
    community: 'at://did:plc:alice/net.atrarium.community.config/xxx',
    role: 'member',
    joinedAt: new Date().toISOString(),
    active: true
  }
});

// Firehose will automatically update Durable Object membership cache
```

### Hide Post (Moderation)

```typescript
// Write moderation action to moderator's PDS
await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.moderation.action',
  record: {
    $type: 'net.atrarium.moderation.action',
    action: 'hide_post',
    target: 'at://did:plc:user/app.bsky.feed.post/xxx',
    community: 'at://did:plc:alice/net.atrarium.community.config/yyy',
    reason: 'Off-topic',
    createdAt: new Date().toISOString()
  }
});

// Firehose will automatically update Durable Object moderation state
```

## Migration from D1 Architecture

Previous versions of Atrarium used Cloudflare D1 (SQLite) for data storage. The PDS-first architecture offers:

**Benefits**:
- 🔓 **True data ownership**: Users own their community data via DIDs
- 💰 **92% cost reduction**: $5/month → $0.40/month
- 📈 **Unlimited scalability**: No database bottlenecks
- 🔄 **Automatic sync**: Firehose keeps Durable Objects in sync with PDSs

**Migration Steps**:
1. Export community/membership data from D1
2. Write records to user PDSs using AT Protocol
3. Firehose will automatically index into Durable Objects
4. Verify feed generation works correctly
5. Decommission D1 database

## Related Documentation

- [System Architecture](/architecture/system-design)
- [AT Protocol Lexicon Schemas](https://github.com/tar-bin/atrarium/tree/main/specs/006-pds-1-db/contracts/lexicon)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [AT Protocol Specification](https://atproto.com/specs/lexicon)


---

