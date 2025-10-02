# AT Protocol Feed Generator API Research

**Date**: 2025-10-02
**Status**: Complete
**Context**: Building a serverless community management system on Cloudflare Workers that implements AT Protocol Feed Generator specification

---

## Executive Summary

### Decision
Implement AT Protocol Feed Generator API with three required endpoints:
1. `GET /.well-known/did.json` - DID document for service discovery
2. `GET /xrpc/app.bsky.feed.describeFeedGenerator` - Advertise available feeds
3. `GET /xrpc/app.bsky.feed.getFeedSkeleton` - Return feed post URIs

### Rationale
- **Serverless-friendly**: Stateless HTTP endpoints align perfectly with Cloudflare Workers architecture
- **Minimal data transfer**: Feed generators only return post URIs, not full content - Bluesky AppView hydrates posts
- **No Firehose required**: Users post directly to theme feeds via standard Bluesky clients, eliminating need for WebSocket connections to Firehose
- **Low operational complexity**: Only need to store post URIs in D1, not full post content
- **Cost-effective**: Fits within Cloudflare free/paid tiers ($5/month)

### Alternatives Considered
1. **Full Firehose filtering** - Rejected: Too complex, requires persistent WebSocket connections via Durable Objects, higher costs
2. **Custom protocol** - Rejected: Would require custom client, loses Bluesky ecosystem integration
3. **Full AppView implementation** - Rejected: Massive scope, requires post storage and indexing at scale

### Key Technical Details
- Feed URIs: `at://did:web:example.com/app.bsky.feed.generator/{feed-id}`
- Post URIs: `at://did:plc:xxx/app.bsky.feed.post/yyy`
- Authentication: Optional JWT signed by user's repo signing key (only needed for personalized feeds)
- Cursor format: Opaque string, fully at feed generator's discretion (e.g., `timestamp::cid`)
- Response encoding: `application/json`

---

## 1. Required Endpoints

### 1.1 DID Document (`/.well-known/did.json`)

**Purpose**: Service discovery and identity verification

**HTTP Method**: GET

**Response Format**:
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

**Implementation Notes**:
- Must be accessible via HTTPS on port 443
- DID format: `did:web:{hostname}` (simpler than `did:plc` for Phase 0)
- Service type MUST be `BskyFeedGenerator`
- Service endpoint MUST match actual deployment URL

**Reference Implementation** (TypeScript):
```typescript
router.get('/.well-known/did.json', (_req, res) => {
  if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
    return res.sendStatus(404)
  }
  res.json({
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: ctx.cfg.serviceDid,
    service: [{
      id: '#bsky_fg',
      type: 'BskyFeedGenerator',
      serviceEndpoint: `https://${ctx.cfg.hostname}`
    }]
  })
})
```

### 1.2 Describe Feed Generator (`/xrpc/app.bsky.feed.describeFeedGenerator`)

**Purpose**: Advertise available feeds to Bluesky clients

**HTTP Method**: GET (XRPC query)

**Lexicon ID**: `app.bsky.feed.describeFeedGenerator`

**Parameters**: None

**Response Format**:
```json
{
  "did": "did:web:atrarium.example.com",
  "feeds": [
    {
      "uri": "at://did:web:atrarium.example.com/app.bsky.feed.generator/react-devs"
    },
    {
      "uri": "at://did:web:atrarium.example.com/app.bsky.feed.generator/typescript-tips"
    }
  ]
}
```

**Implementation Notes**:
- Returns list of all feeds hosted by this generator
- Feed URIs follow format: `at://{service-did}/app.bsky.feed.generator/{feed-id}`
- Bluesky calls this endpoint after feed registration to verify availability
- Should query `theme_feeds` table in D1 to build feed list dynamically

### 1.3 Get Feed Skeleton (`/xrpc/app.bsky.feed.getFeedSkeleton`)

**Purpose**: Return ordered list of post URIs for a specific feed

**HTTP Method**: GET (XRPC query)

**Lexicon ID**: `app.bsky.feed.getFeedSkeleton`

**Lexicon Schema**:
```json
{
  "lexicon": 1,
  "id": "app.bsky.feed.getFeedSkeleton",
  "defs": {
    "main": {
      "type": "query",
      "description": "Get a skeleton of a feed provided by a feed generator. Auth is optional, depending on provider requirements.",
      "parameters": {
        "type": "params",
        "required": ["feed"],
        "properties": {
          "feed": {
            "type": "string",
            "format": "at-uri",
            "description": "Reference to feed generator record describing the specific feed"
          },
          "limit": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "default": 50
          },
          "cursor": {
            "type": "string"
          }
        }
      },
      "output": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["feed"],
          "properties": {
            "cursor": {"type": "string"},
            "feed": {
              "type": "array",
              "items": {
                "type": "ref",
                "ref": "app.bsky.feed.defs#skeletonFeedPost"
              }
            },
            "reqId": {
              "type": "string",
              "description": "Unique identifier per request that may be passed back alongside interactions",
              "maxLength": 100
            }
          }
        }
      },
      "errors": [
        {"name": "UnknownFeed"}
      ]
    }
  }
}
```

**Parameters**:
- `feed` (required): AT-URI of feed (e.g., `at://did:web:example.com/app.bsky.feed.generator/react-devs`)
- `limit` (optional): Number of posts to return (1-100, default 50)
- `cursor` (optional): Opaque pagination cursor

**Response Format**:
```json
{
  "cursor": "1683654690921::bafyreia3tbsfxe3cc75xrxyyn6qc42oupi73fxiox76prlyi5bpx7hr72u",
  "feed": [
    {
      "post": "at://did:plc:abc123/app.bsky.feed.post/xyz789"
    },
    {
      "post": "at://did:plc:def456/app.bsky.feed.post/uvw012",
      "reason": {
        "repost": "at://did:plc:ghi789/app.bsky.feed.repost/rst345"
      }
    }
  ]
}
```

**skeletonFeedPost Schema**:
```json
{
  "type": "object",
  "required": ["post"],
  "properties": {
    "post": {
      "type": "string",
      "format": "at-uri"
    },
    "reason": {
      "type": "union",
      "refs": ["#skeletonReasonRepost", "#skeletonReasonPin"]
    },
    "feedContext": {
      "type": "string",
      "description": "Context that will be passed through to client",
      "maxLength": 2000
    }
  }
}
```

**Implementation Strategy** (for Atrarium):
1. Parse `feed` parameter to extract feed ID
2. Query D1 `post_index` table:
   ```sql
   SELECT uri, created_at, has_media
   FROM post_index
   WHERE feed_id = ?
   ORDER BY created_at DESC
   LIMIT ? OFFSET ?
   ```
3. Construct cursor from last item: `{timestamp}::{last_uri_cid}`
4. Return array of post URIs with cursor

**Error Handling**:
```json
{
  "error": "UnknownFeed",
  "message": "The requested feed was not found"
}
```
HTTP Status: 400 Bad Request

---

## 2. XRPC Protocol Specification

### 2.1 Path Structure
- Format: `/xrpc/{NSID}`
- Example: `/xrpc/app.bsky.feed.getFeedSkeleton`
- NSID maps to Lexicon `id` field

### 2.2 Request Types
- **Query** (HTTP GET): Cacheable, read-only operations
- **Procedure** (HTTP POST): Non-cacheable, may mutate state

Feed generators only need queries (GET requests).

### 2.3 HTTP Headers

**Request Headers**:
- `Authorization: Bearer {jwt}` (optional for personalized feeds)
- `Accept-Language: en-US,ja-JP` (optional for language filtering)

**Response Headers**:
- `Content-Type: application/json` (required)
- `Content-Language: en-US` (optional if language filtering applied)

### 2.4 Error Response Format

**Standard Error Response**:
```json
{
  "error": "ErrorName",
  "message": "Human-readable description"
}
```

**HTTP Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required but missing
- `403 Forbidden`: Authentication valid but insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Names** (must match Lexicon schema):
- `UnknownFeed`: Requested feed does not exist

---

## 3. Authentication & Authorization

### 3.1 JWT Authentication (Optional)

**When to Use**:
- Personalized feeds (user's follows, muted accounts)
- Private/membership-gated feeds

**When NOT Needed**:
- Generic public feeds (Phase 0 theme feeds)
- Algorithm-based feeds without user context

### 3.2 JWT Structure

**Payload**:
```json
{
  "iss": "did:plc:abc123",  // User's DID
  "aud": "did:web:atrarium.example.com",  // Service DID
  "exp": 1683654750  // Expiration (typically <60 seconds)
}
```

**Signature**: Signed by user's atproto signing key (from DID document)

### 3.3 JWT Validation (TypeScript)

```typescript
import { verifyServiceJwt } from '@atproto/xrpc-server'
import { IdResolver } from '@atproto/identity'

const idResolver = new IdResolver()

const getSigningKey = async (did: string, forceRefresh: boolean): Promise<string> => {
  return idResolver.did.resolveAtprotoKey(did, forceRefresh)
}

// In request handler
const authHeader = req.headers.get('Authorization')
if (authHeader?.startsWith('Bearer ')) {
  const jwt = authHeader.slice(7)
  try {
    const payload = await verifyServiceJwt(
      jwt,
      'did:web:atrarium.example.com',
      getSigningKey
    )
    // payload.iss contains user's DID
  } catch (err) {
    // Invalid JWT
  }
}
```

**Validation Steps**:
1. Extract JWT from `Authorization: Bearer {token}` header
2. Resolve user's DID to get signing key
3. Verify JWT signature matches signing key
4. Verify `aud` matches service DID
5. Verify `exp` is not expired

**Phase 0 Decision**: Skip JWT validation - all theme feeds are public.

---

## 4. Feed Record Creation

### 4.1 Feed Generator Record

**Collection**: `app.bsky.feed.generator`

**Created in**: Creator's Bluesky repository (not the feed generator service)

**Record Structure**:
```typescript
{
  did: "did:web:atrarium.example.com",  // Feed generator service DID
  displayName: "React Developers",
  description: "Latest posts about React.js",
  avatar: BlobRef,  // Optional avatar image
  createdAt: "2025-10-02T12:00:00Z",
  contentMode: "video-only"  // Optional: video-only feeds
}
```

### 4.2 Publishing Script Example

```typescript
import { AtpAgent } from '@atproto/api'

const agent = new AtpAgent({ service: 'https://bsky.social' })
await agent.login({
  identifier: 'user.bsky.social',
  password: 'app-password'
})

await agent.com.atproto.repo.putRecord({
  repo: agent.session.did,
  collection: 'app.bsky.feed.generator',
  rkey: 'react-devs',  // Feed ID (becomes part of URI)
  record: {
    did: 'did:web:atrarium.example.com',
    displayName: 'React Developers',
    description: 'Latest posts about React.js',
    createdAt: new Date().toISOString()
  }
})
```

**Result**: Feed URI = `at://{user-did}/app.bsky.feed.generator/react-devs`

### 4.3 Record vs Feed Generator Service

**Important Distinction**:
- **Feed Generator Service** (Atrarium): Identified by DID, hosts multiple feeds
- **Feed Generator Record**: Stored in creator's repo, points to service DID, contains display metadata

**One-to-Many Relationship**: One service DID → Many feed records

---

## 5. Pagination & Cursors

### 5.1 Cursor Format

**Specification**: Opaque string, fully at feed generator's discretion

**Recommended Format**: `{timestamp}::{identifier}`

**Example**: `1683654690921::bafyreia3tbsfxe3cc75xrxyyn6qc42oupi73fxiox76prlyi5bpx7hr72u`

**Why Compound Keys**:
- Timestamp alone insufficient (multiple posts at same millisecond)
- CID/URI provides uniqueness guarantee
- Allows resumable pagination

### 5.2 Cursor Behavior

**Client → AppView → Feed Generator**:
1. Client requests feed (no cursor)
2. AppView calls `getFeedSkeleton` (no cursor)
3. Feed generator returns posts + cursor
4. Client requests next page (includes cursor)
5. AppView passes cursor through to feed generator

**Opaque Nature**:
- Clients MUST NOT parse or construct cursors
- Feed generator owns cursor format
- AppView passes cursor verbatim

### 5.3 Implementation Strategy

```typescript
// Generate cursor from last item
const generateCursor = (lastPost: PostIndex): string => {
  const timestamp = lastPost.created_at
  const cid = extractCid(lastPost.uri)
  return `${timestamp}::${cid}`
}

// Parse cursor to resume query
const parseCursor = (cursor: string): { timestamp: number; cid: string } | null => {
  const [timestamp, cid] = cursor.split('::')
  if (!timestamp || !cid) return null
  return { timestamp: parseInt(timestamp), cid }
}

// Query with cursor
const getPosts = async (feedId: string, limit: number, cursor?: string) => {
  let query = 'SELECT uri, created_at FROM post_index WHERE feed_id = ?'
  const params = [feedId]

  if (cursor) {
    const parsed = parseCursor(cursor)
    if (parsed) {
      query += ' AND created_at <= ?'
      params.push(parsed.timestamp)
    }
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit + 1)  // Fetch one extra to determine if more pages exist

  const results = await db.query(query, params)
  const hasMore = results.length > limit
  const posts = results.slice(0, limit)

  return {
    posts,
    cursor: hasMore ? generateCursor(posts[posts.length - 1]) : undefined
  }
}
```

### 5.4 Known Limitations

**No Backward Pagination**:
- Cursors only support forward (past) navigation
- Cannot fetch newer posts than current cursor position
- Use case: Real-time updates require new requests without cursor

**Non-Chronological Feeds**:
- Cursors may be unstable if feed order changes
- Algorithm-based feeds (trending, recommended) harder to paginate
- Phase 0 theme feeds are chronological → stable cursors

---

## 6. AT URI Format

### 6.1 General Structure

**Format**: `at://{authority}/{collection}/{rkey}`

**Components**:
- **Authority**: DID or handle (DIDs preferred for durability)
- **Collection**: Lexicon type (e.g., `app.bsky.feed.post`)
- **Record Key (rkey)**: Unique identifier within collection

### 6.2 Feed URIs

**Format**: `at://{service-did}/app.bsky.feed.generator/{feed-id}`

**Examples**:
- `at://did:web:atrarium.example.com/app.bsky.feed.generator/react-devs`
- `at://did:web:norsky.snorre.io/app.bsky.feed.generator/bokmaal`

**Note**: Feed generator record is in **creator's repo**, not service's repo:
```
Feed record location: at://{creator-did}/app.bsky.feed.generator/{feed-id}
Record content: { did: "did:web:service.example.com", ... }
```

### 6.3 Post URIs

**Format**: `at://{author-did}/app.bsky.feed.post/{post-id}`

**Example**: `at://did:plc:abc123xyz/app.bsky.feed.post/3jwdwj2ctlk26`

**CID Extraction**: Post ID (rkey) is typically a TID (timestamp-based ID) or base32-encoded CID

### 6.4 Handle vs DID URIs

**Handle-based** (not recommended):
```
at://alice.bsky.social/app.bsky.feed.post/abc123
```
Problems:
- Not durable (breaks if handle changes)
- Ambiguous (handle could be reassigned)

**DID-based** (recommended):
```
at://did:plc:abc123xyz/app.bsky.feed.post/abc123
```
Benefits:
- Durable (survives handle changes)
- Unambiguous (DID never reassigned)

**Best Practice**: Always use DIDs in stored post URIs (Atrarium `post_index.uri` column)

---

## 7. Data Flow & Architecture

### 7.1 Standard Feed Generator Flow (with Firehose)

**NOT applicable to Atrarium Phase 0**:

```
Firehose WebSocket → Durable Object → Filter posts → Write to D1
                                                          ↓
Client → AppView → getFeedSkeleton → Query D1 → Return post URIs
                                                          ↓
Client ← AppView ← Hydrate posts ← Bluesky's post storage
```

### 7.2 Atrarium's Direct Posting Flow

**Phase 0 Architecture**:

```
User creates post via Bluesky client
    ↓
Post stored in Bluesky's infrastructure
    ↓
User manually tags post for theme feed (via hashtag or feed selection)
    ↓
Atrarium API endpoint receives post URI (from Bluesky webhook or manual submission)
    ↓
Write post URI to D1 post_index table
    ↓
Client → AppView → getFeedSkeleton → Query D1 → Return post URIs
```

**Key Difference**: No Firehose filtering - users explicitly submit posts to feeds

### 7.3 Client-Side Hydration

**Feed Skeleton Response**:
```json
{
  "feed": [
    { "post": "at://did:plc:abc123/app.bsky.feed.post/xyz789" }
  ]
}
```

**Bluesky AppView Hydration**:
1. AppView receives post URIs from feed generator
2. AppView fetches full post data from Bluesky's post storage
3. AppView returns hydrated posts to client:
   ```json
   {
     "feed": [
       {
         "post": {
           "uri": "at://did:plc:abc123/app.bsky.feed.post/xyz789",
           "cid": "bafyreib2rxk3rz6gu...",
           "author": {
             "did": "did:plc:abc123",
             "handle": "alice.bsky.social",
             "displayName": "Alice",
             "avatar": "https://cdn.bsky.app/..."
           },
           "record": {
             "text": "Just shipped a new React component!",
             "createdAt": "2025-10-02T12:00:00Z"
           },
           "likeCount": 42,
           "repostCount": 7
         }
       }
     ]
   }
   ```

**Why Skeleton-Only**:
- Feed generators don't need to store/cache full post content
- Bluesky's infrastructure handles post storage and caching
- Reduces data transfer and storage costs for feed generators
- Separates concerns: feed logic vs content delivery

---

## 8. Cloudflare Workers Implementation Patterns

### 8.1 Reference Implementations

**Contrails** (https://github.com/jcsalterego/Contrails):
- Full feed generator on Cloudflare Workers
- Uses Bluesky Search API (Palomar) instead of Firehose
- Configuration-based feed definitions (CONFIG.md)
- GitHub Actions deployment workflow

**BlueBookmark** (https://github.com/mzyy94/bluebookmark):
- Private bookmark feed using Workers
- Uses Hono framework for routing
- Demonstrates auth patterns

**Zero-Cost Feeds** (https://amitness.com/posts/bluesky-custom-feed/):
- Cloudflare Pages + GitHub Actions
- Static JSON generation (no dynamic queries)
- Ultra-minimal approach for simple filters

### 8.2 Cloudflare Workers Patterns

**Routing**:
```typescript
import { Router } from 'itty-router'

const router = Router()

router.get('/.well-known/did.json', handleDidDocument)
router.get('/xrpc/app.bsky.feed.describeFeedGenerator', handleDescribeFeed)
router.get('/xrpc/app.bsky.feed.getFeedSkeleton', handleGetFeedSkeleton)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(request, env).catch(handleError)
  }
}
```

**D1 Database Access**:
```typescript
const handleGetFeedSkeleton = async (request: Request, env: Env) => {
  const url = new URL(request.url)
  const feed = url.searchParams.get('feed')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const cursor = url.searchParams.get('cursor')

  // Extract feed ID from AT-URI
  const feedId = extractFeedId(feed)

  // Query D1
  const { results } = await env.DB.prepare(
    'SELECT uri FROM post_index WHERE feed_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(feedId, limit).all()

  return new Response(JSON.stringify({
    feed: results.map(r => ({ post: r.uri }))
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**Error Handling**:
```typescript
const handleError = (err: Error) => {
  console.error(err)
  return new Response(JSON.stringify({
    error: 'InternalServerError',
    message: 'An unexpected error occurred'
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### 8.3 CORS Configuration

**Not Required** for Phase 0:
- Feed generators communicate with AppView (server-to-server)
- Bluesky clients never directly call feed generator endpoints
- CORS only needed if building custom web dashboard that directly queries feed endpoints

**If Needed Later**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

router.options('*', () => new Response(null, { headers: corsHeaders }))
```

---

## 9. Database Schema Implications

### 9.1 Required Tables

**`post_index`** (stores post URIs for feed retrieval):
```sql
CREATE TABLE post_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL,            -- AT-URI: at://did:plc:xxx/app.bsky.feed.post/yyy
  feed_id INTEGER NOT NULL,     -- Foreign key to theme_feeds.id
  author_did TEXT NOT NULL,     -- Post author's DID
  created_at INTEGER NOT NULL,  -- Unix epoch timestamp
  has_media BOOLEAN DEFAULT 0,
  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id) ON DELETE CASCADE,
  UNIQUE(uri, feed_id)          -- Prevent duplicate posts in same feed
);
CREATE INDEX idx_post_index_feed_created ON post_index(feed_id, created_at DESC);
```

**`theme_feeds`** (feed metadata for describeFeedGenerator):
```sql
CREATE TABLE theme_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL,
  feed_name TEXT NOT NULL,      -- Used in AT-URI: react-devs
  display_name TEXT NOT NULL,   -- "React Developers"
  description TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);
```

### 9.2 Query Patterns

**getFeedSkeleton Query**:
```sql
-- Basic chronological feed
SELECT uri, created_at
FROM post_index
WHERE feed_id = ?
ORDER BY created_at DESC
LIMIT ?;

-- With cursor pagination
SELECT uri, created_at
FROM post_index
WHERE feed_id = ?
  AND created_at <= ?  -- Cursor timestamp
ORDER BY created_at DESC
LIMIT ?;

-- Filter media posts only
SELECT uri, created_at
FROM post_index
WHERE feed_id = ?
  AND has_media = 1
ORDER BY created_at DESC
LIMIT ?;
```

**describeFeedGenerator Query**:
```sql
-- Get all feeds for service
SELECT feed_name, display_name, description
FROM theme_feeds
WHERE community_id IN (
  SELECT id FROM communities WHERE stage != 'archived'
);
```

### 9.3 Optimization Strategies

**Index Design**:
- Composite index on `(feed_id, created_at DESC)` for fast chronological queries
- Covering index avoids table lookups

**Data Retention**:
- Optional: Prune posts older than 7 days to reduce storage
- KV cache can store post URIs temporarily, D1 for permanent storage

**Performance Targets**:
- `getFeedSkeleton` query: <50ms (D1 target)
- Full endpoint response: <200ms (including network latency)

---

## 10. Implementation Roadmap for Atrarium

### Phase 0 (Weeks 1-8): MVP Feed Generator

**Week 1-2: Foundation**
- [ ] Set up Cloudflare Workers project with TypeScript
- [ ] Create D1 database and schema (post_index, theme_feeds tables)
- [ ] Implement routing for 3 required endpoints

**Week 3-4: Core Endpoints**
- [ ] Implement `/.well-known/did.json` with did:web configuration
- [ ] Implement `describeFeedGenerator` querying theme_feeds table
- [ ] Implement `getFeedSkeleton` with basic chronological sorting
- [ ] Add cursor pagination logic

**Week 5-6: Post Submission API**
- [ ] Create endpoint for users to submit post URIs to feeds
- [ ] Validate AT-URI format before insertion
- [ ] Add duplicate prevention (UNIQUE constraint)
- [ ] Implement basic rate limiting (100 requests/hour)

**Week 7-8: Testing & Deployment**
- [ ] Register feed generator with Bluesky using publishFeedGen script
- [ ] Test feeds in Bluesky official app
- [ ] Monitor D1 query performance
- [ ] Document API for community members

### Phase 1 (Weeks 9-16): Enhanced Features

**Authentication**:
- [ ] Add JWT validation for membership-gated feeds
- [ ] Query memberships table to filter posts by access level

**Moderation**:
- [ ] Add blocklist table (banned DIDs)
- [ ] Filter blocked authors from feed results

**Analytics**:
- [ ] Track feed request counts in KV
- [ ] Log cursor usage patterns

**Dashboard Integration**:
- [ ] React dashboard to browse feeds
- [ ] Submit post form with AT-URI input

### Phase 2 (Future): Advanced Feed Algorithms

**Not Required for MVP**:
- Dynamic feed mixing (80% theme / 15% parent / 5% global)
- Trending posts (weighted by engagement metrics)
- Personalized feeds (based on user's follows)
- Automated feed graduation (theme → community)

---

## 11. Testing & Validation

### 11.1 Endpoint Testing

**Manual Testing with curl**:
```bash
# Test DID document
curl https://atrarium.example.com/.well-known/did.json

# Test describeFeedGenerator
curl https://atrarium.example.com/xrpc/app.bsky.feed.describeFeedGenerator

# Test getFeedSkeleton
curl "https://atrarium.example.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:atrarium.example.com/app.bsky.feed.generator/react-devs&limit=10"
```

**Expected Responses**:
- DID document: Valid JSON with service endpoint
- describeFeedGenerator: Array of feed URIs
- getFeedSkeleton: Array of post URIs with optional cursor

### 11.2 Integration Testing

**Register Feed with Bluesky**:
```typescript
// scripts/publishFeed.ts
import { AtpAgent } from '@atproto/api'

const agent = new AtpAgent({ service: 'https://bsky.social' })
await agent.login({
  identifier: process.env.BLUESKY_HANDLE,
  password: process.env.BLUESKY_APP_PASSWORD
})

await agent.com.atproto.repo.putRecord({
  repo: agent.session.did,
  collection: 'app.bsky.feed.generator',
  rkey: 'react-devs',
  record: {
    did: 'did:web:atrarium.example.com',
    displayName: 'React Developers',
    description: 'Latest posts about React.js from the community',
    createdAt: new Date().toISOString()
  }
})

console.log('Feed published: at://' + agent.session.did + '/app.bsky.feed.generator/react-devs')
```

**Test in Bluesky App**:
1. Open Bluesky mobile/web app
2. Search for feed: "React Developers"
3. Subscribe to feed
4. Verify posts appear correctly
5. Test pagination (scroll to load more)

### 11.3 Performance Testing

**Load Testing with k6**:
```javascript
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  vus: 10,
  duration: '30s'
}

export default function() {
  let res = http.get('https://atrarium.example.com/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:atrarium.example.com/app.bsky.feed.generator/react-devs&limit=50')

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has feed array': (r) => JSON.parse(r.body).feed !== undefined
  })
}
```

**Target Metrics**:
- p50 latency: <100ms
- p95 latency: <200ms
- Error rate: <0.1%
- Throughput: 1000+ requests/second (Cloudflare Workers scale)

---

## 12. Reference Links

### Official Documentation
- [AT Protocol XRPC Specification](https://atproto.com/specs/xrpc)
- [AT URI Scheme](https://atproto.com/specs/at-uri-scheme)
- [Bluesky Custom Feeds Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds)
- [app.bsky.feed.getFeedSkeleton API](https://docs.bsky.app/docs/api/app-bsky-feed-get-feed-skeleton)
- [app.bsky.feed.describeFeedGenerator API](https://docs.bsky.app/docs/api/app-bsky-feed-describe-feed-generator)

### Lexicon Schemas
- [getFeedSkeleton.json](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/getFeedSkeleton.json)
- [defs.json (skeletonFeedPost)](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/defs.json)

### Reference Implementations
- [Official Feed Generator Starter Kit (TypeScript)](https://github.com/bluesky-social/feed-generator)
- [Contrails (Cloudflare Workers)](https://github.com/jcsalterego/Contrails)
- [BlueBookmark (Cloudflare Workers + Hono)](https://github.com/mzyy94/bluebookmark)

### Cloudflare Resources
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Hono Web Framework](https://hono.dev/)

### Community Articles
- [Zero-Cost Custom Feeds on Bluesky](https://amitness.com/posts/bluesky-custom-feed/) - Static feed generation approach
- [Bluesky Feed Generators](https://snorre.io/blog/2023-10-01-bluesky-feed-generators-giving-users-algorithmic-choice/) - Architecture overview
- [Manually Creating a Bluesky Custom Feed](https://edavis.dev/notes/bluesky-custom-feeds/) - Step-by-step walkthrough

---

## Appendix A: Complete Lexicon Schema Reference

### app.bsky.feed.defs#skeletonFeedPost
```json
{
  "type": "object",
  "required": ["post"],
  "properties": {
    "post": {
      "type": "string",
      "format": "at-uri"
    },
    "reason": {
      "type": "union",
      "refs": ["#skeletonReasonRepost", "#skeletonReasonPin"]
    },
    "feedContext": {
      "type": "string",
      "description": "Context that will be passed through to client",
      "maxLength": 2000
    }
  }
}
```

### app.bsky.feed.defs#skeletonReasonRepost
```json
{
  "type": "object",
  "required": ["repost"],
  "properties": {
    "repost": {
      "type": "string",
      "format": "at-uri"
    }
  }
}
```

### app.bsky.feed.defs#skeletonReasonPin
```json
{
  "type": "object",
  "properties": {}
}
```

---

## Appendix B: Error Codes Reference

| Error Name | HTTP Status | Description | When to Use |
|------------|-------------|-------------|-------------|
| `UnknownFeed` | 400 | Feed URI not recognized | Invalid feed parameter |
| `InvalidRequest` | 400 | Malformed request | Missing required params |
| `AuthenticationRequired` | 401 | Auth token missing | Private feed without auth |
| `Forbidden` | 403 | Insufficient permissions | User not member of feed |
| `NotFound` | 404 | Resource not found | DID document route mismatch |
| `RateLimitExceeded` | 429 | Too many requests | Rate limit hit |
| `InternalServerError` | 500 | Server error | Database connection failed |

---

## Appendix C: Cloudflare Workers Limits

### Free Tier
- 100,000 requests/day
- 10ms CPU time per request
- 128MB memory
- 1MB response size

### Paid Plan ($5/month)
- 10,000,000 requests/month (included)
- 50ms CPU time per request
- 128MB memory
- No bandwidth charges

### D1 Database (Free Tier)
- 5GB storage
- 5,000,000 reads/day
- 100,000 writes/day
- First 1 billion rows read/month free

### Recommendations for Atrarium
- Start on Paid Workers plan ($5/month) for 50ms CPU time
- D1 Free Tier sufficient for Phase 0 (estimated <1M reads/day)
- KV namespace for caching feed results (100k reads/day free)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-02
**Status**: Complete - Ready for implementation
