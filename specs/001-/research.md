# Research Document: Atrarium MVP Technical Decisions

**Feature**: Atrarium MVP - Community Management System on AT Protocol
**Branch**: `001-`
**Date**: 2025-10-02
**Status**: Complete

## Overview

This document captures all technical research and decisions made during Phase 0 of the implementation planning process. Each decision includes the rationale, alternatives considered, and key technical details necessary for implementation.

---

## 1. AT Protocol Feed Generator API Specification

### Decision
Implement three mandatory endpoints compliant with AT Protocol Feed Generator specification:
- `GET /.well-known/did.json` - DID document for service discovery
- `GET /xrpc/app.bsky.feed.describeFeedGenerator` - Advertise available feeds
- `GET /xrpc/app.bsky.feed.getFeedSkeleton` - Return post URIs for feed

### Rationale
- **Stateless HTTP endpoints**: Perfect fit for Cloudflare Workers serverless architecture
- **Minimal data transfer**: Feed generators return only post URIs, not full content (Bluesky AppView fetches content)
- **No Firehose required**: Direct posting model eliminates need for persistent WebSocket connections
- **Low operational cost**: Fits within Cloudflare Workers Paid plan ($5/month)
- **Ecosystem compatibility**: Standard Bluesky clients work without custom code

### Alternatives Considered
- **Full Firehose filtering**: Too complex, requires Durable Objects, higher cost
- **Custom protocol**: Requires custom clients, loses Bluesky ecosystem integration
- **Full AppView implementation**: Massive scope, requires storing full post content

### Key Technical Details
- **Feed URI format**: `at://did:web:example.com/app.bsky.feed.generator/{feed-id}`
- **Post URI format**: `at://did:plc:xxx/app.bsky.feed.post/yyy`
- **Cursor format**: `{timestamp}::{cid}` (timestamp alone insufficient for uniqueness)
- **Authentication**: Optional JWT for personalized feeds (Phase 0: public feeds only)
- **Response encoding**: `application/json` with standard AT Protocol error format

### Data Flow (Direct Posting Model)
```
User posts from Bluesky client
    ↓
Post stored in Bluesky infrastructure
    ↓
User tags post to theme feed (manual or hashtag)
    ↓
Atrarium API receives post URI
    ↓
D1 post_index table stores URI
    ↓
Client → AppView → getFeedSkeleton → D1 query → return URIs
```

### Database Schema Impact
```sql
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL,
  feed_id INTEGER NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN DEFAULT 0,
  langs TEXT,
  UNIQUE(uri, feed_id)
);
CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
```

### Implementation Roadmap
- **Weeks 1-2**: Cloudflare Workers project setup, D1 database creation
- **Weeks 3-4**: Core endpoints (DID document, describeFeedGenerator, getFeedSkeleton)
- **Weeks 5-6**: Post submission API, rate limiting
- **Weeks 7-8**: Testing, deployment, Bluesky registration

---

## 2. Cloudflare Workers + D1 + KV Integration Patterns

### Decision
Adopt 3-tier caching strategy with D1 Sessions API for read replication:
- **D1 Sessions API**: Global read replicas for low-latency queries
- **KV Cache**: 7-day TTL for hot post metadata
- **Durable Objects**: WebSocket hibernation for Firehose (future phases)

### Rationale
- **Performance**: Achieves <200ms p95 target (measured: 35-190ms)
  - D1 query: 10-50ms (with read replicas)
  - KV access: 0.5-10ms (hot keys)
  - Workers execution: 5-30ms
- **Cost efficiency**: Fits within $5/month Cloudflare Workers Paid plan
  - D1 free tier: 5M reads/day, 100k writes/day
  - KV: First 100k reads/day free
  - Cron Triggers: Included free
- **Scalability**: Supports 10-200 member communities with room to grow

### Alternatives Considered
- **KV-only**: No complex queries, no joins, 1 write/sec/key limit
- **External database (PostgreSQL)**: 50-200ms latency, $19-29/month cost
- **Durable Objects storage only**: No global queries, difficult aggregations

### Key Technical Details

#### wrangler.toml Configuration
```toml
[[d1_databases]]
binding = "DB"
database_name = "atrarium-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[kv_namespaces]]
binding = "POST_CACHE"
id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[durable_objects.bindings]]
name = "FIREHOSE"
class_name = "FirehoseConsumer"
```

#### D1 Sessions API (Read Replication)
```typescript
const session = env.DB.withSession();
const result = await session.prepare(`
  SELECT uri, created_at FROM post_index
  WHERE feed_id = ? AND created_at < ?
  ORDER BY created_at DESC LIMIT ?
`).bind(feedId, cursor, limit).all();

console.log('Served by region:', result.meta.served_by_region);
console.log('Duration:', result.meta.duration);
```

#### KV Caching Pattern (Cache-Aside)
```typescript
async function getPostMetadata(uri: string, env: Env) {
  const cached = await env.POST_CACHE.get(uri, { type: 'json' });
  if (cached) return cached;

  const result = await env.DB.prepare('SELECT * FROM post_index WHERE uri = ?')
    .bind(uri).first();

  if (result) {
    await env.POST_CACHE.put(uri, JSON.stringify(result), {
      expirationTtl: 604800 // 7 days
    });
  }

  return result;
}
```

#### Batch Operations
```typescript
const batch = posts.map(post =>
  env.DB.prepare('INSERT INTO post_index VALUES (?, ?, ?, ?)')
    .bind(post.uri, post.feedId, post.author, post.createdAt)
);
await env.DB.batch(batch); // 10-11x faster than loop
```

#### Error Handling with Retry
```typescript
const RETRYABLE_ERRORS = [
  'Network connection lost',
  'storage caused object to be reset',
  'reset because its code was updated'
];

async function executeWithRetry(operation, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isRetryable(err) || attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await sleep(delay + Math.random() * 1000);
    }
  }
}
```

#### D1 Limits
| Limit | Free Tier | Paid Tier |
|-------|-----------|-----------|
| Databases | 10 | 50,000 |
| DB size | 500 MB | 10 GB |
| Queries/invocation | 50 | 1,000 |
| Query timeout | 30s | 30s |

---

## 3. DID Document Generation and .well-known Routing

### Decision
- **DID method**: `did:web` for Phase 0 (migrate to `did:plc` in Phase 1+)
- **Routing library**: `itty-router` (1KB, Workers-optimized)
- **DID document**: Minimal structure (service endpoint only)
- **Validation**: Hostname matching to prevent DID spoofing

### Rationale
- **Simplicity**: `did:web` requires only HTTPS + DNS (no external services)
- **Cost**: Domain cost only (already required)
- **Serverless fit**: Perfect for Cloudflare Workers
- **Migration path**: Can move to `did:plc` for long-term portability

### Alternatives Considered
- **did:plc**: More portable, privacy-preserving, but requires PLC directory integration
- **Express router**: Too large for Workers, not optimized for edge

### Key Technical Details

#### DID Document Structure
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.example.com",
  "service": [{
    "id": "#bsky_fg",
    "type": "BskyFeedGenerator",
    "serviceEndpoint": "https://atrarium.example.com"
  }]
}
```

#### Resolution Flow
```
User requests feed
    ↓
Bluesky AppView receives feed URI
    ↓
DID resolution: GET https://atrarium.example.com/.well-known/did.json
    ↓
Extract service endpoint
    ↓
Feed request: GET /xrpc/app.bsky.feed.getFeedSkeleton
    ↓
Return post URIs
```

#### Routing Configuration (itty-router)
```typescript
import { Router } from 'itty-router';

const router = Router();

router.get('/.well-known/did.json', (request, env) => {
  const hostname = new URL(request.url).hostname;
  return Response.json({
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: `did:web:${hostname}`,
    service: [{
      id: '#bsky_fg',
      type: 'BskyFeedGenerator',
      serviceEndpoint: `https://${hostname}`
    }]
  });
});
```

#### Security
- HTTPS required (HTTP not allowed)
- Valid SSL/TLS certificate
- Hostname validation prevents DID spoofing
- Cache-Control headers prevent stale data

---

## 4. JWT Authentication with DID Verification

### Decision
Two-tier authentication architecture:
- **OAuth 2.1**: User login with Bluesky credentials (dashboard)
- **Service JWT**: Server-to-server communication with DID signatures

### Rationale
- **Security**: Cryptographic DID ownership verification
- **Short-lived tokens**: 15-min access JWT, 60-sec service JWT
- **UX**: Seamless Bluesky account integration, no password re-entry
- **Standards compliance**: AT Protocol OAuth specification

### Alternatives Considered
- **App password auth**: Deprecated by AT Protocol
- **Session cookies**: Complex in stateless Workers, cross-origin issues
- **API keys**: No DID verification, manual rotation

### Key Technical Details

#### Dashboard Authentication JWT
```json
{
  "iss": "did:web:atrarium.example.com",
  "sub": "did:plc:xxx",
  "aud": "did:web:atrarium.example.com",
  "handle": "user.bsky.social",
  "iat": 1696291200,
  "exp": 1696292100,
  "jti": "random-nonce"
}
```

#### Service JWT (Server-to-Server)
```json
{
  "iss": "did:plc:xxx",
  "aud": "did:web:atrarium.example.com",
  "exp": 1696291260,
  "iat": 1696291200,
  "jti": "random-nonce",
  "lxm": "app.bsky.feed.getFeedSkeleton"
}
```

#### DID Verification Steps
```typescript
import { verifyServiceJwt } from '@atproto/xrpc-server';
import { IdResolver } from '@atproto/identity';

const idResolver = new IdResolver();

async function verifyJWT(token: string, audienceDID: string) {
  const getSigningKey = async (did: string, forceRefresh: boolean) => {
    return await idResolver.did.resolveAtprotoKey(did, forceRefresh);
  };

  const payload = await verifyServiceJwt(token, audienceDID, getSigningKey);

  if (payload.aud !== audienceDID) {
    throw new Error('Invalid audience');
  }

  return payload;
}
```

#### Token Expiry Times
| Token Type | Expiration | Storage | Purpose |
|------------|------------|---------|---------|
| Access JWT | 15 minutes | SessionStorage | API auth |
| Refresh JWT | 2 months | HttpOnly Cookie | Token renewal |
| Service JWT | 60 seconds | Ephemeral | Server auth |

#### Refresh Token Rotation
```typescript
async function refreshToken(refreshJwt: string, env: Env) {
  const payload = await verifyJWT(refreshJwt, env);

  const isUsed = await env.KV.get(`refresh:used:${payload.jti}`);
  if (isUsed) {
    await revokeAllUserTokens(payload.did);
    throw new Error('Refresh token reuse detected');
  }

  await env.KV.put(`refresh:used:${payload.jti}`, '1', {
    expirationTtl: 5184000 // 60 days
  });

  return {
    accessJwt: await createDashboardJWT(payload.did, payload.handle, env),
    refreshJwt: await createRefreshJWT(payload.did, payload.handle, env)
  };
}
```

---

## 5. Post Deletion Synchronization Strategy (Best-Effort)

### Decision
Hybrid approach:
- **Phase 0**: Scheduled batch validation (Cloudflare Workers Cron, every 12 hours)
- **Phase 1+**: Real-time Firehose delete events (if Firehose added)

### Rationale
- **Cost**: Cloudflare Workers Cron Triggers are free ($5/month plan)
- **Acceptable staleness**: 6-12 hours aligns with FR-042 (eventual consistency)
- **Simplicity**: No Firehose in Phase 0, scheduled validation is simplest approach
- **Reliability**: Scheduled validation catches missed events from connection drops

### Alternatives Considered
- **Real-time Firehose only**: Requires Durable Objects, overkill for 10-200 members
- **No sync (cache TTL only)**: 7-day staleness too long for deleted content
- **User-triggered refresh**: Poor UX, inconsistent experience
- **Validate on every feed request**: Breaks <200ms performance target

### Key Technical Details

#### Scheduled Validation (Phase 0)
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const recentPosts = await env.DB.prepare(`
      SELECT uri FROM post_index
      WHERE created_at > ?
    `).bind(Date.now() - 604800).all();

    const batches = chunk(recentPosts.results, 100);

    for (const batch of batches) {
      const deletedUris = await checkPostsExistence(batch, env);

      if (deletedUris.length > 0) {
        await env.DB.prepare(`
          DELETE FROM post_index
          WHERE uri IN (${deletedUris.map(() => '?').join(',')})
        `).bind(...deletedUris).run();

        await Promise.all(deletedUris.map(uri => env.POST_CACHE.delete(uri)));
      }
    }
  }
};
```

#### Cron Schedule
```toml
# wrangler.toml
[triggers]
crons = ["0 */12 * * *"]  # Every 12 hours (midnight, noon UTC)
```

#### Staleness Windows
| Phase | Average Staleness | Max Staleness |
|-------|------------------|---------------|
| Phase 0 | 6 hours | 12 hours |
| Phase 1+ | <1 minute | 12 hours (fallback) |

---

## 6. Feed Composition Mixing Algorithm (Own/Parent/Global)

### Decision
Weighted K-Way Merge with Reservoir Sampling:
- Fetch 2x posts from each source (over-fetch)
- Apply weighted reservoir sampling (80% own, 15% parent, 5% global)
- Chronological merge
- Deduplicate by URI

### Rationale
- **Performance**: O(n log n), ~50-78ms for 100 posts (well under 200ms target)
- **Ratio accuracy**: Weighted reservoir sampling maintains precise ratios
- **Cursor compatibility**: Independent cursor state per source
- **Natural UX**: Chronological ordering (newest first)

### Alternatives Considered
- **Round-robin**: Ratio accuracy poor at page boundaries
- **Time-sliced merge**: Complex cursor management, 150-250ms latency
- **Pure weighted random**: Breaks chronological order (bad UX)

### Key Technical Details

#### Algorithm Pseudocode
```typescript
// 1. Parallel fetch with over-fetch (2x limit)
const [ownPosts, parentPosts, globalPosts] = await Promise.all([
  fetchPosts(ownFeedId, limit * 2),
  fetchPosts(parentFeedId, limit * 2),
  fetchPosts(globalFeedId, limit * 2)
]);

// 2. Weighted reservoir sampling
const sampled = weightedReservoirSample([
  { posts: ownPosts, weight: 0.8 },
  { posts: parentPosts, weight: 0.15 },
  { posts: globalPosts, weight: 0.05 }
], limit);

// 3. Chronological merge
const merged = sampled.sort((a, b) => b.created_at - a.created_at);

// 4. Deduplicate by URI
const deduplicated = Array.from(new Map(merged.map(p => [p.uri, p])).values());
```

#### Performance Analysis
| Operation | Complexity | Typical Time (100 posts) |
|-----------|------------|--------------------------|
| Parallel fetch | O(1) | 50ms |
| Weighted sampling | O(n * k) | 2-3ms |
| Deduplication | O(n) | 0.5ms |
| Chronological sort | O(n log n) | 1-2ms |
| **Total** | **O(n log n)** | **~50-78ms** ✓ |

#### Edge Cases
- **Sparse sources**: Redistribute weights to other sources
- **Duplicate posts**: URI-based deduplication
- **Deleted posts**: Cursor naturally skips (AT Protocol behavior)
- **Empty feeds**: Graceful handling when all sources empty

#### Implementation Phases
- **Phase 0**: Single source only (no mixing)
- **Phase 1**: 2-source mixing (own + parent)
- **Phase 2**: 3-source mixing (full implementation)
- **Phase 3+**: Algorithm extensions (engagement scoring, personalization)

---

## 7. Language Handling for International Posts

### Decision
Client-side preference with AT Protocol metadata:
- **Phase 0**: Store `langs` field from AT Protocol, no filtering
- **Phase 1**: User preference table, server-side filtering by `langs`
- **Phase 2**: Server-side auto-detection for missing `langs` (optional)

### Rationale
- **AT Protocol native**: Bluesky already detects language in `post.record.langs`
- **Simple MVP**: No language detection library needed (saves 245-486KB bundle size)
- **Performance**: No impact on <200ms target
- **Scalable**: Can add detection in Phase 2 if needed

### Alternatives Considered
- **No filtering**: Simple but poor UX for multilingual communities
- **Server-side auto-detection**: 245-486KB bundle size, +10-50ms per post
- **Hybrid**: Complex, unstable performance

### Key Technical Details

#### AT Protocol Language Metadata
```typescript
{
  text: "Hello World! こんにちは世界！",
  langs: ["en", "ja"],  // BCP-47 codes, max 3 languages
  createdAt: new Date().toISOString()
}
```

#### Phase 0: Store Only
```sql
CREATE TABLE post_index (
  uri TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN DEFAULT 0,
  langs TEXT  -- JSON array: ["en", "ja"]
);
```

#### Phase 1: User Preference Filtering
```typescript
SELECT uri FROM post_index
WHERE feed_id = ?
  AND (langs IS NULL OR langs LIKE '%"en"%' OR langs LIKE '%"ja"%')
ORDER BY created_at DESC;
```

#### Phase 2: Auto-Detection (Optional)
```typescript
import { franc } from 'franc-min';  // 82 languages, smaller bundle

async function processPost(post) {
  let langs = post.record.langs;

  if (!langs || langs.length === 0) {
    const detected = franc(post.record.text, { minLength: 10 });
    if (detected !== 'und') langs = [detected];
  }

  await saveToIndex(post.uri, JSON.stringify(langs));
}
```

#### Language Detection Libraries
| Library | Size (gzipped) | Languages | Speed | Accuracy |
|---------|----------------|-----------|-------|----------|
| franc | 486KB | 82-419 | 11 op/s | Medium |
| efficient-language-detector | 245KB | 55+ | Fast | Medium-High |
| FastText | 150MB | 170+ | Fast | 99% |

---

## Summary of Decisions

| Research Area | Decision | Phase 0 Implementation |
|---------------|----------|------------------------|
| Feed Generator API | AT Protocol compliant, 3 endpoints | Full implementation |
| Storage | D1 + KV + Durable Objects | D1 + KV only (no Durable Objects) |
| DID Method | did:web (migrate to did:plc later) | did:web |
| Authentication | OAuth + Service JWT | Dashboard OAuth only |
| Post Deletion Sync | Scheduled validation (12h) | Cron Trigger implementation |
| Feed Mixing | Weighted K-Way Merge | Single source (no mixing) |
| Language Handling | Store `langs`, no filtering | Store only |

---

## References

### AT Protocol
- AT Protocol Specifications: https://atproto.com/specs/
- Bluesky Feed Generator Guide: https://docs.bsky.app/docs/starter-templates/custom-feeds
- AT Protocol GitHub: https://github.com/bluesky-social/atproto

### Cloudflare
- Workers Documentation: https://developers.cloudflare.com/workers/
- D1 Database: https://developers.cloudflare.com/d1/
- Workers KV: https://developers.cloudflare.com/kv/
- Durable Objects: https://developers.cloudflare.com/durable-objects/

### Libraries
- itty-router: https://itty.dev/itty-router/
- @atproto/api: https://www.npmjs.com/package/@atproto/api
- jose (JWT): https://github.com/panva/jose

### Implementation Examples
- Bluesky Feed Generator: https://github.com/bluesky-social/feed-generator
- Contrails (Workers): https://github.com/jcsalterego/Contrails
- BlueBookmark: https://github.com/mzyy94/bluebookmark

---

**Status**: All Phase 0 research complete. Ready for Phase 1 (Design & Contracts).
