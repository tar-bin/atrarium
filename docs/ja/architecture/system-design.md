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
│  - Lightweight filter: includes('#atr_') │
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

For detailed data storage architecture, see [Data Storage Architecture](/ja/architecture/database).

### Storage Layers

#### 1. PDS (Source of Truth) - Permanent Storage

All community data is stored in user PDSs using AT Protocol Lexicon schemas:

**`net.atrarium.community.config`** (Community metadata)
```typescript
{
  $type: 'net.atrarium.community.config';
  name: string;              // Community name (max 100 chars)
  hashtag: string;           // Unique hashtag: #atr_[0-9a-f]{8}
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

1. **User posts to PDS** with community hashtag (e.g., `#atr_a1b2c3d4`)
2. **Jetstream Firehose** emits event → FirehoseReceiver DO
3. **Lightweight filter** (`includes('#atr_')`) → Cloudflare Queue
4. **FirehoseProcessor Worker** applies heavyweight regex (`/#atr_[0-9a-f]{8}/`)
5. **CommunityFeedGenerator DO** stores post in Durable Objects Storage

```typescript
// Example: User creates community
const result = await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.config',
  record: {
    $type: 'net.atrarium.community.config',
    name: 'TypeScript Enthusiasts',
    hashtag: '#atr_a1b2c3d4',
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

For detailed API reference, see [API Design](/ja/architecture/api) or the auto-generated OpenAPI documentation.

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

**Format**: `#atr_[0-9a-f]{8}` (8-character hexadecimal)
**Example**: `#atr_a1b2c3d4`

**Two-Stage Filtering**:
1. **Lightweight filter** (FirehoseReceiver): `includes('#atr_')` → Queue
2. **Heavyweight filter** (FirehoseProcessor): `regex /#atr_[0-9a-f]{8}/` → Durable Object

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

- [Data Storage Architecture](/ja/architecture/database) - Detailed storage design
- [API Design](/ja/architecture/api) - Detailed API reference
- [Quickstart Guide](/ja/guide/quickstart) - Get started with Atrarium
- [Implementation Guide](/ja/reference/implementation) - Development guide
