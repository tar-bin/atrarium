# Atrarium MVP - Implementation Guide

**Status**: Phase 0 - Core Implementation Complete

This document provides technical details for developers working on Atrarium MVP.

## Implementation Status

### ✅ Completed (Phase 3.1-3.3)

**Setup & Infrastructure** (T001-T006):
- [x] Project structure (src/, tests/, schema.sql, wrangler.toml)
- [x] TypeScript configuration (ES2022, Cloudflare Workers runtime)
- [x] ESLint & Prettier setup
- [x] D1 database schema (6 tables)
- [x] Cloudflare Workers bindings (D1, KV, Cron)
- [x] TypeScript type definitions (49 interfaces/types)

**Database Layer** (T021):
- [x] DatabaseService with D1 Sessions API
- [x] Retry logic with exponential backoff
- [x] Batch operations (10-11x faster)
- [x] Helper functions (UUID, timestamps, JSON parsing)

**Models** (T022-T027):
- [x] CommunityModel (CRUD, stage transitions, feed mix validation)
- [x] ThemeFeedModel (CRUD, health metrics, status transitions)
- [x] MembershipModel (CRUD, role-based access, owner transfer)
- [x] PostIndexModel (CRUD, AT-URI validation, pagination)
- [x] OwnerTransitionLogModel (audit trail)
- [x] AchievementModel (stub for Phase 1+)

**Services** (T028-T032):
- [x] AuthService (JWT creation/verification, OAuth mock)
- [x] CacheService (KV cache-aside pattern, 7-day TTL)
- [x] ATProtoService (post existence check, metadata fetch)
- [x] DID document generator (did:web)
- [x] Validation schemas (Zod)

**Routes** (T033-T040):
- [x] Feed Generator API (DID document, describeFeedGenerator, getFeedSkeleton)
- [x] Auth routes (login, callback, refresh)
- [x] Communities routes (list, create, get, update)
- [x] Theme feeds routes (list, create)
- [x] Posts routes (submit)
- [x] Memberships routes (join, leave)

**Integration** (T041-T042):
- [x] Main router with Hono
- [x] CORS middleware
- [x] Global error handler
- [x] Scheduled job for post deletion sync and feed health check

### ⏳ Not Implemented (Phase 0)

**Tests** (T007-T020):
- [ ] 8 contract tests (AT Protocol + Dashboard API)
- [ ] 6 integration tests (quickstart scenarios)

**Dashboard Frontend**:
- [ ] React SPA (deferred to Phase 0 Weeks 13-16)

## Quick Start

### Prerequisites

```bash
# Required
node --version    # v18+
npm --version     # v9+

# Install Wrangler CLI
npm install -g wrangler

# Cloudflare account (free tier works)
wrangler login
```

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create D1 database
wrangler d1 create atrarium-db
# Output: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 3. Create KV namespaces
wrangler kv:namespace create POST_CACHE
# Output: id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

wrangler kv:namespace create POST_CACHE --preview
# Output: preview_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"

# 4. Update wrangler.toml
# Uncomment and fill in the IDs from steps 2-3

# 5. Apply database schema
wrangler d1 execute atrarium-db --local --file=./schema.sql
wrangler d1 execute atrarium-db --remote --file=./schema.sql

# 6. Generate JWT secret
openssl rand -hex 32

# 7. Set secrets (production only)
wrangler secret put JWT_SECRET
# Paste the output from step 6
```

### Development

```bash
# Start local dev server
npm run dev

# Server runs at http://127.0.0.1:8787

# Test endpoints
curl http://127.0.0.1:8787/.well-known/did.json
curl http://127.0.0.1:8787/health
```

## API Usage Examples

### 1. Authentication (Mock OAuth - Phase 0)

```bash
# Login
curl -X POST http://127.0.0.1:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle": "alice.bsky.social"}'

# Response:
# {
#   "accessJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "did": "did:plc:alicebskysocial",
#   "handle": "alice.bsky.social"
# }

# Save access token
export ACCESS_TOKEN="<accessJwt from above>"
```

### 2. Create Community

```bash
curl -X POST http://127.0.0.1:8787/api/communities \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Community",
    "description": "A community for tech discussions"
  }'

# Response:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "Tech Community",
#   "description": "A community for tech discussions",
#   "stage": "theme",
#   "parentId": null,
#   "memberCount": 1,
#   "postCount": 0,
#   "createdAt": 1696291200
# }

# Save community ID
export COMMUNITY_ID="<id from above>"
```

### 3. Create Theme Feed

```bash
curl -X POST http://127.0.0.1:8787/api/communities/$COMMUNITY_ID/feeds \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General Discussion",
    "description": "General tech discussions"
  }'

# Response:
# {
#   "id": "770e8400-e29b-41d4-a716-446655440002",
#   "communityId": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "General Discussion",
#   "description": "General tech discussions",
#   "status": "active",
#   "lastPostAt": null,
#   "posts7d": 0,
#   "activeUsers7d": 0,
#   "createdAt": 1696291200
# }

# Save feed ID
export FEED_ID="<id from above>"
```

### 4. Submit Post

```bash
curl -X POST http://127.0.0.1:8787/api/posts \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "at://did:plc:alicebskysocial/app.bsky.feed.post/3k44dddkhc322",
    "feedId": "'"$FEED_ID"'"
  }'

# Response:
# {
#   "id": 1,
#   "uri": "at://did:plc:alicebskysocial/app.bsky.feed.post/3k44dddkhc322",
#   "feedId": "770e8400-e29b-41d4-a716-446655440002",
#   "authorDid": "did:plc:alicebskysocial",
#   "createdAt": 1696291200,
#   "hasMedia": false,
#   "langs": null
# }
```

### 5. Get Feed Skeleton (AT Protocol)

```bash
curl "http://127.0.0.1:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:127.0.0.1:8787/app.bsky.feed.generator/$FEED_ID&limit=10"

# Response:
# {
#   "feed": [
#     {"post": "at://did:plc:alicebskysocial/app.bsky.feed.post/3k44dddkhc322"}
#   ],
#   "cursor": "1696291200::1"
# }
```

## Architecture Details

### Request Flow

```
1. Client → Cloudflare Workers (Hono Router)
2. Middleware: CORS, Logging, JWT Auth
3. Route Handler → Validation (Zod)
4. Model → DatabaseService → D1
5. Cache → CacheService → KV
6. Response → JSON
```

### Database Access Pattern

```typescript
// Read with Sessions API (read replicas)
const db = new DatabaseService(env);
const result = await db.query<CommunityRow>(
  `SELECT * FROM communities WHERE id = ?`,
  communityId
);

// Write
await db.execute(
  `INSERT INTO communities (id, name, created_at) VALUES (?, ?, ?)`,
  uuid, name, timestamp
);

// Batch (10-11x faster)
const statements = [
  db.prepare('INSERT INTO ...').bind(...),
  db.prepare('UPDATE ...').bind(...),
];
await db.batch(statements);
```

### Caching Strategy

```typescript
// Cache-aside pattern
const cacheService = new CacheService(env);

// Try cache first
const cached = await cacheService.getPostMetadata(uri);
if (cached) return cached;

// Query database
const post = await postIndexModel.getByUri(uri);

// Store in cache (7-day TTL)
await cacheService.setPostMetadata(uri, post);
```

### Error Handling

```typescript
// Retry with exponential backoff
await executeWithRetry(async () => {
  return await env.DB.prepare('...').run();
}, 5); // Max 5 attempts

// Global error handler
app.onError((err, c) => {
  console.error('[Global Error]', err);
  return c.json({ error: 'InternalServerError', message: '...' }, 500);
});
```

## Deployment

### Production Deployment

```bash
# 1. Deploy Workers
npm run deploy

# 2. Set production secrets
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD

# 3. Verify deployment
curl https://atrarium.your-subdomain.workers.dev/health

# 4. View logs
wrangler tail
```

### Environment Variables

```toml
# wrangler.toml
[vars]
ENVIRONMENT = "development"  # or "production"
```

### Secrets (Set with wrangler secret put)

- `JWT_SECRET`: HS256 signing key (generate with openssl rand -hex 32)
- `BLUESKY_HANDLE`: Optional, for OAuth (Phase 0: not used)
- `BLUESKY_APP_PASSWORD`: Optional, for OAuth (Phase 0: not used)

## Performance

### Targets (research.md)

| Metric | Target | Status |
|--------|--------|--------|
| Feed generation | <200ms p95 | ✅ Implemented |
| API response | <100ms p95 | ✅ Implemented |
| D1 query | <50ms | ✅ Sessions API |
| KV access | <10ms | ✅ Implemented |
| Uptime | >99.9% | ⏳ To be measured |

### Optimizations

1. **D1 Sessions API**: Read replication for low latency
2. **Batch operations**: 10-11x faster than loops
3. **KV caching**: 7-day TTL for post metadata
4. **Retry logic**: Exponential backoff for transient errors
5. **Prepared statements**: SQL injection prevention + performance

## Security

### JWT Authentication

```typescript
// Access token: 15 minutes
// Refresh token: 60 days

// Payload
{
  iss: "did:web:example.com",
  sub: "did:plc:xxx",
  aud: "did:web:example.com",
  handle: "user.bsky.social",
  iat: 1696291200,
  exp: 1696292100,
  jti: "random-nonce"
}
```

### Role-Based Access

| Role | Permissions |
|------|-------------|
| **owner** | Full control: manage community, create feeds, assign roles, delete community |
| **moderator** | Moderation: archive posts, manage feed status (cannot delete community or assign owner) |
| **member** | View and participate: post to feeds, view all content, leave community |

### Input Validation

All requests validated with Zod schemas:

```typescript
export const CreateCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().optional(),
});
```

## Scheduled Jobs

### Cron Schedule

```toml
# wrangler.toml
[triggers]
crons = ["0 */12 * * *"]  # Every 12 hours
```

### Job Tasks

1. **Post Deletion Sync**:
   - Get recent posts (last 7 days)
   - Check existence on Bluesky
   - Delete missing posts from D1 and KV

2. **Feed Health Check**:
   - Update health metrics (posts_7d, active_users_7d)
   - Transition statuses: active→warning (7 days), warning→archived (14 days)
   - Revival: archived→active (5+ posts/week, 3+ users)

## Troubleshooting

### Common Issues

**Issue**: `wrangler d1 execute` fails with "Database not found"

**Solution**: Ensure `database_id` in `wrangler.toml` matches output from `wrangler d1 create`

---

**Issue**: JWT authentication fails

**Solution**: Check `JWT_SECRET` is set correctly with `wrangler secret list`

---

**Issue**: Feed returns empty array

**Solution**:
1. Verify posts exist in `post_index` table
2. Check `feed_id` matches the requested feed URI
3. Inspect Workers logs with `wrangler tail`

---

**Issue**: Performance test shows >200ms p95

**Solution**:
1. Ensure D1 Sessions API is enabled
2. Reduce query complexity (check `EXPLAIN QUERY PLAN`)
3. Add missing indexes

## Next Steps

### Phase 0 Remaining

- [ ] **Tests**: Implement contract and integration tests (T007-T020)
- [ ] **Dashboard**: React frontend (Weeks 13-16)
- [ ] **Validation**: Run quickstart.md scenarios
- [ ] **Performance**: Apache Bench testing

### Phase 1+ Features

- Achievement system
- Advanced moderation
- Dynamic feed mixing
- Community graduation
- Analytics dashboard

## References

- [Feature Specification](specs/001-/spec.md)
- [Implementation Plan](specs/001-/plan.md)
- [Technical Research](specs/001-/research.md)
- [Database Schema](specs/001-/data-model.md)
- [API Contracts](specs/001-/contracts/)
- [Quickstart Guide](specs/001-/quickstart.md)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
