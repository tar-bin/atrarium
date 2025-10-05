# Research: PDS-First Data Architecture

**Feature**: 006-pds-1-db
**Date**: 2025-10-04
**Status**: Complete

## Overview

This document consolidates research findings for migrating Atrarium from a centralized Cloudflare D1 architecture to a PDS-first decentralized design. All data (community configs, memberships, moderation decisions) will be stored in users' Personal Data Servers (PDSs) as AT Protocol records, with D1 serving only as a performance cache.

---

## 1. AT Protocol Lexicon Schema Design

### Decision: Use Standard Lexicon Structure with `tid` Keys

**Chosen Approach**:
- Define 3 custom Lexicon schemas: `net.atrarium.community.config`, `net.atrarium.community.membership`, `net.atrarium.moderation.action`
- Use `tid` (timestamp identifier) for record keys to enable chronological ordering
- Follow AT Protocol conventions: ISO 8601 timestamps, `maxGraphemes` for user text, `enum` for fixed values

**Rationale**:
- `tid` keys provide temporal ordering for community/membership history
- Standard Lexicon ensures interoperability with AT Protocol ecosystem
- `maxGraphemes` prevents unicode exploits (emoji taking unlimited space)

**Alternatives Considered**:
- **Literal keys** (`literal:self`) - Rejected: Would limit one community per user
- **Custom rkeys** (e.g., `community-<uuid>`) - Rejected: Harder to sort chronologically
- **Unix timestamps** instead of ISO 8601 - Rejected: AT Protocol mandates ISO 8601

### Schema Examples

#### Community Config Schema

```json
{
  "lexicon": 1,
  "id": "net.atrarium.community.config",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["name", "hashtag", "stage", "createdAt"],
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 200,
            "maxGraphemes": 100
          },
          "description": {
            "type": "string",
            "maxLength": 2000,
            "maxGraphemes": 1000
          },
          "hashtag": {
            "type": "string",
            "pattern": "^#atr_[0-9a-f]{8}$"
          },
          "stage": {
            "type": "string",
            "enum": ["theme", "community", "graduated"]
          },
          "moderators": {
            "type": "array",
            "maxLength": 50,
            "items": { "type": "string", "format": "did" }
          },
          "blocklist": {
            "type": "array",
            "maxLength": 1000,
            "items": { "type": "string", "format": "did" }
          },
          "feedMix": {
            "type": "ref",
            "ref": "#feedMixConfig"
          },
          "parentCommunity": {
            "type": "string",
            "format": "at-uri"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    },
    "feedMixConfig": {
      "type": "object",
      "required": ["own", "parent", "global"],
      "properties": {
        "own": { "type": "number", "minimum": 0, "maximum": 1 },
        "parent": { "type": "number", "minimum": 0, "maximum": 1 },
        "global": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    }
  }
}
```

#### Membership Record Schema

```json
{
  "lexicon": 1,
  "id": "net.atrarium.community.membership",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["community", "role", "joinedAt"],
        "properties": {
          "community": {
            "type": "string",
            "format": "at-uri",
            "description": "URI of community config record"
          },
          "role": {
            "type": "string",
            "enum": ["owner", "moderator", "member"]
          },
          "joinedAt": {
            "type": "string",
            "format": "datetime"
          },
          "active": {
            "type": "boolean",
            "default": true
          }
        }
      }
    }
  }
}
```

#### Moderation Action Schema

```json
{
  "lexicon": 1,
  "id": "net.atrarium.moderation.action",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["action", "target", "community", "createdAt"],
        "properties": {
          "action": {
            "type": "string",
            "enum": ["hide_post", "unhide_post", "block_user", "unblock_user"]
          },
          "target": {
            "type": "union",
            "refs": ["#postTarget", "#userTarget"]
          },
          "community": {
            "type": "string",
            "format": "at-uri"
          },
          "reason": {
            "type": "string",
            "maxLength": 4000,
            "maxGraphemes": 2000
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    },
    "postTarget": {
      "type": "object",
      "required": ["uri", "cid"],
      "properties": {
        "uri": { "type": "string", "format": "at-uri" },
        "cid": { "type": "string", "format": "cid" }
      }
    },
    "userTarget": {
      "type": "object",
      "required": ["did"],
      "properties": {
        "did": { "type": "string", "format": "did" }
      }
    }
  }
}
```

---

## 2. PDS Record Storage & Retrieval

### Decision: Use @atproto/api Agent Methods for CRUD Operations

**Chosen Approach**:
- `agent.com.atproto.repo.createRecord` for new records with auto-generated `tid`
- `agent.com.atproto.repo.putRecord` for create-or-update with specific rkey
- `agent.com.atproto.repo.getRecord` for single record retrieval
- `agent.com.atproto.repo.listRecords` for querying all records of a collection
- `agent.com.atproto.repo.deleteRecord` for tombstones

**Rationale**:
- Official @atproto/api provides type safety and handles auth automatically
- `createRecord` auto-generates unique `tid` keys (no collision risk)
- `listRecords` supports pagination via cursors (handles large result sets)

**Alternatives Considered**:
- **Direct XRPC calls** - Rejected: More boilerplate, error-prone
- **Custom PDS client** - Rejected: Reinventing the wheel

### Code Example: Write Community Config

```typescript
import { BskyAgent, TID } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });
await agent.login({
  identifier: 'alice.bsky.social',
  password: process.env.APP_PASSWORD,
});

const response = await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: 'net.atrarium.community.config',
  record: {
    $type: 'net.atrarium.community.config',
    name: 'Design Community',
    hashtag: '#atr_a1b2c3d4',
    stage: 'theme',
    moderators: [agent.session.did],
    blocklist: [],
    feedMix: { own: 1.0, parent: 0.0, global: 0.0 },
    parentCommunity: null,
    createdAt: new Date().toISOString(),
  },
});

console.log(response.uri); // at://did:plc:xxx/net.atrarium.community.config/3jzfcijpj2z2a
```

### Code Example: Read Membership Records

```typescript
// List all memberships for current user
const response = await agent.com.atproto.repo.listRecords({
  repo: agent.session.did,
  collection: 'net.atrarium.community.membership',
  limit: 100,
});

for (const { uri, value } of response.records) {
  console.log(`Member of ${value.community} as ${value.role}`);
}
```

### Error Handling

```typescript
try {
  const record = await agent.com.atproto.repo.getRecord({
    repo: 'did:plc:xxx',
    collection: 'net.atrarium.community.config',
    rkey: 'self',
  });
} catch (error: any) {
  if (error.status === 404) {
    // Record not found
  } else if (error.status === 429) {
    // Rate limited - implement exponential backoff
    const retryAfter = error.headers?.['retry-after'] || 60;
  } else if (error.status >= 500) {
    // PDS unavailable - serve stale cache
  }
}
```

---

## 3. Firehose Integration Patterns

### Decision: Use Cloudflare Durable Objects for Firehose Subscription

**Chosen Approach**:
- **Durable Object** maintains persistent WebSocket connection to `wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos`
- Filter events by `op.path.startsWith('net.atrarium.')`
- Decode CAR blocks using `@ipld/car` and `@ipld/dag-cbor`
- Forward filtered events to Worker for D1 cache updates
- Store cursor in Durable Object storage for resume/replay

**Rationale**:
- Durable Objects can maintain long-lived WebSocket connections (Workers cannot)
- Built-in transactional storage for cursor persistence
- Single Durable Object instance ensures no duplicate event processing
- Workers CPU limits (10-50ms) prevent direct Firehose subscription

**Alternatives Considered**:
- **Regular Workers** - Rejected: Cannot maintain persistent WebSocket (request-scoped)
- **External Node.js server** - Rejected: Requires managing separate infrastructure
- **Cloudflare Queues** - Rejected: Firehose is push-based, not poll-based

### Architecture Diagram

```
Bluesky Firehose (wss://bsky.network)
         │
         │ WebSocket (persistent)
         ▼
┌─────────────────────────────────┐
│  Durable Object: Firehose       │
│  • Subscribe to repo commits    │
│  • Filter net.atrarium.* ops    │
│  • Decode CAR blocks            │
│  • Store cursor in DO storage   │
└────────────┬────────────────────┘
             │ Filtered events (HTTP POST)
             ▼
┌─────────────────────────────────┐
│  Worker: Event Indexer          │
│  • Validate Lexicon schemas     │
│  • Update D1 cache (communities,│
│    memberships, moderation)     │
│  • Update KV (post cache)       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Cloudflare D1 + KV             │
│  • D1: Indexed PDS records      │
│  • KV: Cursor state             │
└─────────────────────────────────┘
```

### Code Example: Durable Object Firehose Subscriber

```typescript
import { Firehose } from '@atproto/api';
import { DurableObject } from 'cloudflare:workers';

export class FirehoseSubscriber extends DurableObject {
  private firehose: Firehose | null = null;

  async fetch(request: Request): Promise<Response> {
    if (!this.firehose) {
      const cursor = await this.ctx.storage.get<number>('cursor');

      this.firehose = new Firehose({
        service: 'wss://bsky.network',
        cursor,
      });

      this.firehose.on('commit', async (evt) => {
        // Save cursor for resume
        await this.ctx.storage.put('cursor', evt.seq);

        // Filter Atrarium records
        for (const op of evt.ops) {
          if (op.path.startsWith('net.atrarium.')) {
            // Forward to Worker indexer
            await fetch('https://atrarium-indexer.workers.dev/index', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                repo: evt.repo,
                op,
                blocks: Array.from(evt.blocks), // Convert Uint8Array
              }),
            });
          }
        }
      });

      this.firehose.on('error', (err) => {
        console.error('Firehose error:', err);
        // Reconnect handled automatically by @atproto/api
      });

      await this.firehose.start();
    }

    return new Response('Firehose running');
  }
}
```

### Event Filtering Logic

```typescript
// Worker: Event Indexer
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { repo, op, blocks } = await request.json();

    // Decode CAR blocks
    const car = await CarReader.fromBytes(new Uint8Array(blocks));
    for await (const block of car.blocks()) {
      if (block.cid.equals(op.cid)) {
        const record = cbor.decode(block.bytes);

        // Route by $type
        if (record.$type === 'net.atrarium.community.config') {
          await indexCommunityConfig(env.DB, repo, op.path, record);
        } else if (record.$type === 'net.atrarium.community.membership') {
          await indexMembership(env.DB, repo, op.path, record);
        } else if (record.$type === 'net.atrarium.moderation.action') {
          await indexModerationAction(env.DB, repo, op.path, record);
        }
      }
    }

    return new Response('Indexed');
  },
};
```

---

## 4. PDS Unavailability Handling

### Decision: Dual TTL Cache (Soft 5min / Hard 24h) + Exponential Backoff

**Chosen Approach**:
- **Soft TTL (5 minutes)**: Revalidate in background, serve stale if PDS unavailable
- **Hard TTL (24 hours)**: Absolute max age; fail with 503 if exceeded
- **Exponential Backoff**: Retry 3 times with jitter (100ms → 200ms → 400ms)
- **Circuit Breaker**: Open after 5 failures, wait 60s before half-open

**Rationale**:
- Soft TTL balances freshness vs. availability (5min is acceptable staleness)
- Hard TTL prevents serving ancient data (24h aligns with Bluesky's post retention)
- Exponential backoff reduces PDS load during outages
- Circuit breaker prevents thundering herd

**Alternatives Considered**:
- **No cache** - Rejected: Unacceptable latency and PDS load
- **Infinite TTL** - Rejected: Data never updates after PDS recovery
- **Fixed retry delay** - Rejected: Amplifies cascading failures

### Cache Strategy Table

| Data Type | Soft TTL | Hard TTL | Rationale |
|-----------|----------|----------|-----------|
| User Profile | 5min | 24h | Rarely changes, safe to serve stale |
| Post Data | 1min | 48h | Bluesky GCs after 48h |
| DID Document | 1h | 7d | PDS migration detection, changes rare |
| Community Config | 10min | 7d | Config changes infrequent |
| Membership | 5min | 24h | Membership changes moderate |
| Moderation Action | 1min | 24h | Moderation needs fast propagation |

### Code Example: Dual TTL Cache

```typescript
interface CachedData<T> {
  data: T;
  softTTL: number; // Unix timestamp
  hardTTL: number; // Unix timestamp
  cachedAt: number;
}

async function getPDSDataWithFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: { soft: number; hard: number }
): Promise<T> {
  const cacheKey = `pds:${key}`;
  const cached = await KV.get<CachedData<T>>(cacheKey, 'json');
  const now = Date.now() / 1000;

  // Fresh cache
  if (cached && now <= cached.softTTL) {
    return cached.data;
  }

  // Stale but within hard TTL
  if (cached && now <= cached.hardTTL) {
    try {
      const fresh = await retryWithBackoff(fetcher);
      await updateCache(cacheKey, fresh, ttl);
      return fresh;
    } catch (error) {
      console.warn('PDS unavailable, serving stale', { key, age: now - cached.softTTL });
      return cached.data; // Serve stale
    }
  }

  // No cache or hard TTL expired
  try {
    const fresh = await retryWithBackoff(fetcher);
    await updateCache(cacheKey, fresh, ttl);
    return fresh;
  } catch (error) {
    if (cached) {
      console.error('Serving expired cache', { key, age: now - cached.hardTTL });
      return cached.data; // Last resort
    }
    throw new HTTPException(503, { message: 'PDS unavailable', retryAfter: 60 });
  }
}
```

### Exponential Backoff Implementation

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) break;

      const baseDelay = 100 * Math.pow(2, attempt); // 100ms, 200ms, 400ms
      const jitter = baseDelay * 0.1 * (Math.random() - 0.5) * 2; // ±10%
      const delay = baseDelay + jitter;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

---

## 5. Conflict Resolution (Last-Write-Wins)

### Decision: Use Firehose Event Timestamps for LWW

**Chosen Approach**:
- For moderation actions from multiple moderators, use `indexed_at` (Firehose event timestamp) as tie-breaker
- Latest `indexed_at` wins when conflicting actions exist
- Store all actions in `moderation_logs` for audit trail
- Final state in D1 cache reflects most recent action

**Rationale**:
- Firehose provides globally ordered sequence numbers (`evt.seq`)
- `indexed_at` reflects when Feed Generator observed the event (consistent across instances)
- Storing all actions enables conflict resolution verification

**Alternatives Considered**:
- **User-provided timestamps** - Rejected: Clock skew, malicious users
- **Vector clocks** - Rejected: Too complex for this use case
- **Consensus protocol** (Paxos/Raft) - Rejected: Overkill, requires multiple nodes

### Code Example: LWW Moderation

```typescript
async function applyModerationAction(
  db: D1Database,
  action: ModerationAction,
  indexedAt: number
) {
  // Check if newer action already exists
  const existing = await db
    .prepare(
      'SELECT indexed_at FROM moderation_logs WHERE target_uri = ? AND action IN (?, ?) ORDER BY indexed_at DESC LIMIT 1'
    )
    .bind(
      action.target.uri,
      'hide_post',
      'unhide_post'
    )
    .first<{ indexed_at: number }>();

  if (existing && existing.indexed_at > indexedAt) {
    console.log('Ignoring older moderation action', { action, indexedAt });
    return; // Discard older action
  }

  // Apply action (newer timestamp wins)
  if (action.action === 'hide_post') {
    await db
      .prepare('UPDATE post_index SET moderation_status = ? WHERE uri = ?')
      .bind('hidden', action.target.uri)
      .run();
  } else if (action.action === 'unhide_post') {
    await db
      .prepare('UPDATE post_index SET moderation_status = ? WHERE uri = ?')
      .bind('approved', action.target.uri)
      .run();
  }

  // Log action for audit trail
  await db
    .prepare(
      'INSERT INTO moderation_logs (action, target_uri, moderator_did, indexed_at) VALUES (?, ?, ?, ?)'
    )
    .bind(action.action, action.target.uri, action.moderatorDid, indexedAt)
    .run();
}
```

---

## 6. Migration Path from D1-Centric Architecture

### Decision: Clean Slate Implementation (No Production Environment)

**Chosen Approach**:
- **Complete D1 schema replacement** with PDS-first design
- **No data migration required** (no production environment exists)
- Remove all direct D1 write operations from codebase
- All writes go to PDS → Firehose → D1 cache pipeline
- D1 becomes read-only cache, rebuilt from Firehose on deployment

**Rationale**:
- No production environment = no backward compatibility concerns
- Clean implementation without technical debt from legacy D1-centric code
- Simpler than gradual migration approach
- Aligns perfectly with AT Protocol's decentralization principles

**Alternatives Considered**:
- **Dual-write (D1 + PDS)** - Rejected: Unnecessary complexity when no production data exists
- **Gradual migration** - Rejected: No legacy data to migrate
- **Backward compatible schema** - Rejected: Adds complexity without benefit

### Implementation Steps

1. **Phase 1: Replace D1 schema**
   ```sql
   -- Drop existing tables (no production data to preserve)
   DROP TABLE IF EXISTS communities;
   DROP TABLE IF EXISTS theme_feeds;
   DROP TABLE IF EXISTS memberships;
   DROP TABLE IF EXISTS post_index;
   DROP TABLE IF EXISTS moderation_logs;

   -- Create new schema with pds_synced_at columns
   CREATE TABLE communities (
     id TEXT PRIMARY KEY,
     owner_did TEXT NOT NULL,
     name TEXT NOT NULL,
     description TEXT,
     stage TEXT NOT NULL,
     -- ... other columns ...
     pds_synced_at INTEGER DEFAULT 0,
     created_at INTEGER NOT NULL
   );

   CREATE INDEX idx_communities_pds_sync ON communities(pds_synced_at);
   -- ... create other tables ...
   ```

2. **Phase 2: Deploy Firehose Durable Object**
   - Subscribe to `wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos`
   - Filter for `net.atrarium.*` collections
   - Forward events to Worker Indexer

3. **Phase 3: Deploy Worker Indexer**
   - Receive Firehose events
   - Validate Lexicon schemas
   - Write to D1 cache (populate `pds_synced_at`)

4. **Phase 4: Update API routes**
   - Replace `db.prepare('INSERT ...')` with PDS writes
   - Keep `db.prepare('SELECT ...')` for reads (cache)
   - Add cache staleness checks

### New D1 Schema (Complete)

See [data-model.md](./data-model.md) for full schema definition with `pds_synced_at` columns included from the start.

---

## 7. Multiple Feed Generator Support

### Decision: Use DID Documents for Feed Generator Discovery

**Chosen Approach**:
- Community owners publish their `CommunityConfig` records in their PDS
- Multiple Feed Generators can independently:
  1. Subscribe to Firehose for `net.atrarium.*` events
  2. Query users' PDSs for community/membership records
  3. Build independent D1 caches
- No coordination required between Feed Generators

**Rationale**:
- PDS is source of truth (no vendor lock-in to single Feed Generator)
- AT Protocol's federation model supports multiple competing services
- Feed Generators are stateless (can be horizontally scaled)

**Alternatives Considered**:
- **Centralized registry** - Rejected: Single point of failure, defeats decentralization
- **Gossip protocol** - Rejected: Too complex, unnecessary for AT Protocol
- **Manual configuration** - Rejected: Poor UX, doesn't scale

### Discovery Mechanism

```typescript
// Feed Generator discovers communities by:

// 1. Subscribe to Firehose for net.atrarium.community.config creates
firehose.on('commit', (evt) => {
  for (const op of evt.ops) {
    if (op.path.startsWith('net.atrarium.community.config')) {
      // New community discovered!
      const communityUri = `at://${evt.repo}/${op.path}`;
      await indexCommunity(communityUri);
    }
  }
});

// 2. Query known users' PDSs for communities
const knownUsers = ['did:plc:alice', 'did:plc:bob'];
for (const userDid of knownUsers) {
  const pdsUrl = await resolveDID(userDid);
  const communities = await agent.com.atproto.repo.listRecords({
    repo: userDid,
    collection: 'net.atrarium.community.config',
  });

  for (const { uri, value } of communities.records) {
    await indexCommunity(uri);
  }
}
```

### Feed Generator Independence

```
┌─────────────────────────────────────────────┐
│           Bluesky Firehose                  │
│  (Single source of truth for events)        │
└───────────────┬─────────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│Feed Gen A   │   │Feed Gen B   │
│(Atrarium)   │   │(Competitor) │
├─────────────┤   ├─────────────┤
│• D1 Cache A │   │• Postgres B │
│• KV Cache A │   │• Redis B    │
└─────────────┘   └─────────────┘

Both read from same PDS records:
  at://did:plc:alice/net.atrarium.community.config/xxx
  at://did:plc:bob/net.atrarium.community.membership/yyy
```

**Key Properties**:
- **No lock-in**: Users can switch Feed Generators without data migration
- **Competition**: Multiple Feed Generators improve quality via competition
- **Resilience**: If one Feed Generator fails, others continue working
- **Specialization**: Feed Generators can offer different features (e.g., advanced moderation, analytics)

---

## 8. Cloudflare Storage Options Comparison

### Decision: Use Durable Objects Storage, Remove D1 Entirely

**Chosen Approach**:
- **Durable Objects Storage** as primary cache (per-community instances)
- **Remove D1 database completely** (no relational database)
- **Remove KV namespace** (Durable Objects Storage handles caching)

**Rationale**:
- **Horizontal scalability**: Each community = one Durable Object instance, unlimited scaling
- **No database bottlenecks**: D1's 100k writes/day limit eliminated
- **Strong consistency**: Durable Objects Storage is transactional
- **WebSocket integration**: Firehose WebSocket runs inside Durable Object
- **Cost efficiency**: ~$0.10/month for 1000 communities vs. ~$5/month for D1 paid tier

### Storage Options Evaluated

| Option | Type | Pros | Cons | Verdict |
|--------|------|------|------|---------|
| **Durable Objects Storage** | Transactional KV | Range queries (list()), strong consistency, WebSocket support | Higher cost than D1 free tier | ✅ **SELECTED** |
| **Cloudflare D1** | SQLite (relational) | SQL queries, free tier (5GB) | **100k writes/day bottleneck**, shared resource | ❌ REJECTED |
| **Cloudflare KV** | Eventually consistent KV | Very cheap, global edge cache | No range queries, list() only returns keys | ❌ REJECTED |
| **Cloudflare R2** | Object storage (S3) | Unlimited storage, cheap | No query capabilities, HTTP API overhead | ❌ REJECTED |

### Durable Objects Storage API

**Key Methods**:
```typescript
// Get single value
await storage.get<T>(key: string): Promise<T | undefined>

// Range query (critical for feed generation)
await storage.list<T>(options: {
  prefix?: string,
  reverse?: boolean,  // Sort descending
  limit?: number,
  start?: string,
  end?: string
}): Promise<Map<string, T>>

// Transactional write
await storage.put(key: string, value: any): Promise<void>

// Batch delete
await storage.delete(keys: string[]): Promise<void>
```

**Feed Generation Example**:
```typescript
// Get 50 most recent posts
const posts = await storage.list<PostMetadata>({
  prefix: 'post:',
  reverse: true,  // Newest first
  limit: 50
});

// Key format: post:{timestamp}:{uri}
// Example: post:1704067200000:at://did:plc:bob/app.bsky.feed.post/xyz
```

### Cost Analysis (Durable Objects vs. D1)

**Assumptions**:
- 1000 communities
- 10 posts/community/day
- 7-day retention
- 50 getFeedSkeleton requests/day/community

**Durable Objects**:
```
Storage:
  1000 communities × 70 posts × 0.5KB = 35MB
  35MB × $0.15/GB-month = ~$0.005/month

Requests:
  1000 communities × 50 requests/day × 30 days = 1.5M requests/month
  1.5M requests × $0.02/million = ~$0.03/month

Total: ~$0.04/month
```

**D1 (for comparison)**:
```
Writes:
  1000 communities × 10 posts/day × 2 writes (post + stats) = 20,000 writes/day
  20,000 writes/day < 100,000 writes/day → FREE TIER OK

BUT: At 5,000 communities, exceeds free tier → $5/month required

Total: FREE (< 1000 communities), $5/month (> 1000 communities)
```

**Winner**: Durable Objects (no scaling bottleneck, consistent cost)

### Storage Key Schema Design

```typescript
// Hierarchical key design for efficient list() queries
type StorageKey =
  | `config:${communityId}`              // Community config
  | `member:${did}`                       // Membership record
  | `post:${timestamp}:${uri}`            // Post (sorted by time)
  | `moderation:${uri}`                   // Moderation action
  | `cache:members:${timestamp}`          // Member list snapshot (5min TTL)

// Benefits:
// 1. Prefix-based queries: storage.list({ prefix: 'post:' })
// 2. Temporal ordering: timestamp as first part of key
// 3. Reverse iteration: storage.list({ prefix: 'post:', reverse: true })
```

---

## 9. Cloudflare Queues for High-Throughput Event Processing

### Decision: Use Queue-Based Architecture for Firehose Ingestion

**Architecture**: FirehoseReceiver DO → Cloudflare Queue → FirehoseProcessor Workers

**Rationale**:
- Firehose sends 2,000 events/sec, single DO cannot process synchronously
- WebSocket.onmessage must be fast (~0.2ms/event) to avoid backpressure
- Queue enables parallel consumer Workers (up to 250 concurrent)
- Automatic retries, Dead Letter Queue, message batching (100 messages/batch)

**Performance Analysis**:
- Synchronous: 20 events/sec (2,000 needed) → ❌ 100x too slow
- Queue-based: 5,000 events/sec capacity → ✅ Sufficient + headroom

**Two-Stage Filtering**:
```typescript
// Stage 1: FirehoseReceiver (lightweight)
if (!text?.includes('#atr_')) return;  // 0.01ms, 99.9% reduction

// Stage 2: FirehoseProcessor (heavyweight)
const hashtag = text.match(/#atr_[0-9a-f]{8}/);  // 1ms, exact match
```

**Cost**: 520k events/month × 3 ops = $0.22/month (vs $623 without filtering)

---

## Summary of Decisions

| Research Topic | Decision | Rationale |
|----------------|----------|-----------|
| **Lexicon Schemas** | 3 schemas with `tid` keys, ISO 8601 timestamps | Standard AT Protocol conventions, chronological ordering |
| **PDS CRUD** | @atproto/api Agent methods | Official library, type-safe, handles auth |
| **Firehose Ingestion** | **Queue-based: FirehoseReceiver → Queue → Processor** | Decouple ingestion from processing, handle 2,000 events/sec |
| **Event Processing** | **Cloudflare Queues with batch consumers (100 msg/batch)** | Parallel scaling, automatic retries, cost-efficient ($0.22/month) |
| **Filtering Strategy** | **Two-stage: includes() → regex** | Lightweight in DO, heavyweight in Workers, 99.9% cost reduction |
| **PDS Unavailability** | Dual TTL cache (5min/24h) + exponential backoff | Balances freshness vs. availability |
| **Conflict Resolution** | Last-write-wins using Firehose `indexed_at` | Globally ordered sequence, simple to implement |
| **Migration** | **Complete removal of D1/KV** | No production data exists, clean slate simplifies implementation |
| **Storage Backend** | **Durable Objects Storage (per-community)** | Unlimited horizontal scaling, no database bottlenecks |
| **Multiple Feed Generators** | DID-based discovery, independent caches | No vendor lock-in, competition improves quality |

---

## Dependencies Required

```json
{
  "dependencies": {
    "@atproto/api": "^0.13.35",
    "@atproto/identity": "^0.4.3",
    "@ipld/car": "^5.3.0",
    "@ipld/dag-cbor": "^9.2.0",
    "multiformats": "^13.0.0"
  }
}
```

---

## Next Steps (Phase 1)

1. Define Lexicon JSON schemas in `specs/006-pds-1-db/contracts/lexicon/`
2. Create TypeScript types in `src/schemas/lexicon.ts`
3. Write contract tests for PDS read/write operations
4. Design D1 schema additions (`pds_synced_at` column)
5. Update `data-model.md` with PDS-first architecture
6. Generate `quickstart.md` integration test scenario

---

**Status**: Research complete ✅
**Ready for**: Phase 1 (Design & Contracts)
