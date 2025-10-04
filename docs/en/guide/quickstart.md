---
title: Quickstart
description: Quick reference for common Atrarium tasks
order: 3
---

# Quickstart

Quick reference for common tasks and operations.

## Create a Community

```bash
# Via API (requires JWT token)
curl -X POST https://your-worker.workers.dev/api/communities \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TypeScript Enthusiasts",
    "stage": "theme",
    "parent_id": null
  }'
```

## Create a Theme Feed

```bash
curl -X POST https://your-worker.workers.dev/api/feeds \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "community_id": 1,
    "name": "TypeScript Tips",
    "filter_config": {
      "hashtags": ["#TypeScript", "#TS"],
      "keywords": ["typescript", "ts"],
      "authors": []
    }
  }'
```

## Get Feed Skeleton

```bash
# Feed Generator API endpoint
curl "https://your-worker.workers.dev/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:xxx/app.bsky.feed.generator/feed-id&limit=50"
```

## Manage Membership

```bash
# Add member to community
curl -X POST https://your-worker.workers.dev/api/communities/1/members \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_did": "did:plc:xxx",
    "role": "member"
  }'
```

## Database Queries

```bash
# List all communities
wrangler d1 execute atrarium-db --command "SELECT * FROM communities"

# View theme feeds
wrangler d1 execute atrarium-db --command "SELECT * FROM theme_feeds"

# Check community health
wrangler d1 execute atrarium-db --command "
  SELECT
    c.name,
    c.stage,
    c.health_metrics,
    COUNT(m.user_did) as member_count
  FROM communities c
  LEFT JOIN memberships m ON c.id = m.community_id
  GROUP BY c.id
"
```

## Monitor Logs

```bash
# Real-time logs
wrangler tail --format pretty

# Filter by status
wrangler tail --status error
```

## Testing Workflows

### Test Feed Generation

```bash
# 1. Seed test data
wrangler d1 execute atrarium-db --file=seeds/test-data.sql

# 2. Run feed skeleton test
npm test -- feed-skeleton.test.ts

# 3. Verify output
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:test/app.bsky.feed.generator/test-feed"
```

### Test Membership Flow

```bash
# 1. Create community
# 2. Add members
# 3. Verify roles
npm test -- membership.test.ts
```

## Common Patterns

### TypeScript Types

```typescript
import { Community, ThemeFeed, FilterConfig } from './types'

// Create filter config
const filter: FilterConfig = {
  hashtags: ['#React', '#Vue'],
  keywords: ['component', 'hooks'],
  authors: ['did:plc:example']
}

// Community with stage
const community: Community = {
  id: 1,
  name: 'Frontend Devs',
  stage: 'community',
  parent_id: null,
  feed_mix: { own: 80, parent: 15, global: 5 },
  health_metrics: { /* ... */ }
}
```

### Error Handling

```typescript
try {
  const response = await fetch('/api/communities', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const result = await response.json()
} catch (error) {
  console.error('Failed to create community:', error)
}
```

## Performance Tips

### Caching Strategy

- **Post URIs**: Cached in KV for 7 days
- **Feed skeletons**: No server-side cache (fetched on demand)
- **User DIDs**: Cached in memory during request lifecycle

### Rate Limiting

- Feed Generator API: 100 requests/hour/user (planned)
- Dashboard API: 1000 requests/hour/user (planned)

### Optimization

```typescript
// Use prepared statements for D1
const stmt = env.DB.prepare(
  'SELECT * FROM communities WHERE stage = ?'
).bind('theme')

const results = await stmt.all()
```

## Deployment Checklist

- [ ] Update wrangler.toml with production IDs
- [ ] Set all secrets (JWT_SECRET, BLUESKY credentials)
- [ ] Apply database schema to production D1
- [ ] Deploy workers: `npm run deploy`
- [ ] Verify DID document endpoint
- [ ] Register feed generator with Bluesky
- [ ] Test feed in Bluesky client

## Useful Links

- [System Architecture](/en/architecture/system-design)
- [Database Schema](/en/architecture/database)
- [API Reference](/en/reference/api-reference)
- [Implementation Guide](/en/reference/implementation)
