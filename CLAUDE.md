# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $5/month) and operational time by 80%.

**Current Phase**: Phase 0 (MVP Development, Weeks 1-16)
**Target**: Basic Custom Feed implementation and first community migration

## Architecture

### Tech Stack
- **Backend**: Cloudflare Workers + Durable Objects (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Frontend**: React 18 + Vite + Tailwind CSS (Cloudflare Pages)
- **External**: AT Protocol (@atproto/api), Bluesky Firehose (WebSocket)

### Core Components

```
Client (React) → Workers (Feed Generator API) → D1 Database
                      ↓
                Durable Objects ← Bluesky Firehose (WebSocket)
                      ↓
                  KV Cache (7 days)
```

The system implements AT Protocol's Feed Generator specification to create custom feeds. Durable Objects maintain persistent WebSocket connections to Bluesky's Firehose, filtering and indexing posts into D1. The Feed Generator API returns post URIs (not full content), which clients fetch from Bluesky AppView.

## Project Structure

**Current Status**: Pre-implementation (Phase 0 planning stage). No implementation files exist yet - only documentation.

**Planned Structure** (to be created):
```
src/                    # Cloudflare Workers backend (TypeScript)
├── index.ts           # Main entry point, router, Feed Generator API
├── firehose.ts        # Durable Objects for Firehose WebSocket connection
├── feed-generator.ts  # Feed skeleton generation logic
├── filters.ts         # Post filtering (hashtags, keywords, DIDs)
├── auth.ts           # JWT authentication for dashboard
├── utils.ts          # Shared utilities
└── types.ts          # TypeScript type definitions

dashboard/             # React frontend (not started)
├── src/
│   ├── App.tsx
│   ├── components/   # CommunityList, ThemeFeedForm, Stats
│   └── pages/        # Home, Community, Settings
├── vite.config.ts
└── package.json

schema.sql            # D1 database schema (to be created)
wrangler.toml        # Cloudflare Workers configuration (to be created)
```

**Existing Documentation**:
- [docs/01-overview.md](docs/01-overview.md) - Project overview and design philosophy
- [docs/02-system-design.md](docs/02-system-design.md) - Architecture and database design
- [docs/03-implementation.md](docs/03-implementation.md) - Week-by-week implementation plan
- [docs/development-spec.md](docs/development-spec.md) - Complete development specification

## Database Schema

Four main tables:

1. **communities**: Community metadata (id, name, stage, parent_id, feed_mix, member_count)
2. **theme_feeds**: Theme feed configurations (filter_config as JSON: hashtags/keywords/authors)
3. **memberships**: User membership (composite key: community_id + user_did, roles: member/moderator/owner)
4. **post_index**: Post URI index (uri, feed_id, author_did, created_at, has_media)

Feed configurations use JSON fields. For example, `filter_config`:
```json
{
  "hashtags": ["#React", "#TypeScript"],
  "keywords": ["webdev", "frontend"],
  "authors": ["did:plc:xxx"]
}
```

## Development Commands

**Note**: These commands are for the planned implementation. The project is currently in the planning phase.

### Setup (Phase 0, Weeks 1-4)
```bash
# Install Wrangler CLI
npm install -g wrangler
wrangler login                           # Authenticate with Cloudflare

# Create Cloudflare resources
wrangler d1 create atrarium-db          # Create D1 database
wrangler kv:namespace create POST_CACHE  # Create KV namespace
wrangler d1 execute atrarium-db --file=./schema.sql  # Apply schema (once created)

# After creating resources, update wrangler.toml with the generated IDs

# Install dependencies (once package.json exists)
npm install                              # Install backend dependencies
cd dashboard && npm install && cd ..     # Install frontend dependencies (Phase 0, Weeks 13-16)
```

### Development (once implemented)
```bash
npm run dev              # Run Workers locally (Miniflare)
npm run dashboard:dev    # Run React dashboard (port 3000, Phase 0, Weeks 13-16)
npm run typecheck       # Type checking without emit
npm run test            # Run tests with vitest
wrangler tail           # View live logs from production
```

### Deployment
```bash
npm run deploy                    # Deploy Workers to production
npm run dashboard:deploy          # Build and deploy dashboard to Pages
wrangler secret put JWT_SECRET    # Set secrets (also: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)
```

### Database Management
```bash
# Insert test data
wrangler d1 execute atrarium-db --file=seeds/test-data.sql

# Run queries directly
wrangler d1 execute atrarium-db --command "SELECT * FROM communities"

# View database info
wrangler d1 info atrarium-db
```

## Key AT Protocol Concepts

### Feed Generator API Endpoints

**`GET /.well-known/did.json`**: Returns DID document identifying this feed generator
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

**`GET /xrpc/app.bsky.feed.getFeedSkeleton`**: Returns feed skeleton (post URIs only)
- Params: `feed` (feed URI), `cursor` (optional), `limit` (optional, default 50)
- Returns: `{ feed: [{ post: "at://..." }], cursor?: "..." }`

The client fetches actual post content from Bluesky's AppView using these URIs.

### Data Flow

**Post Ingestion**:
1. Firehose WebSocket → Durable Object receives post
2. Apply filters (hashtags/keywords/authors from theme_feeds.filter_config)
3. Write matching post URIs to D1 post_index
4. Cache post content in KV (7 days TTL)
5. Update statistics (post_count, health_metrics)

**Feed Retrieval**:
1. Client requests `getFeedSkeleton` with feed URI
2. Query D1: `SELECT uri FROM post_index WHERE feed_id = ? ORDER BY created_at DESC`
3. Return URIs with cursor for pagination
4. Client fetches full post data from Bluesky AppView

## Phase 0 Scope (MVP)

### Implementing (Weeks 1-16)
- D1 database setup with schema.sql
- Basic Feed Generator API (/.well-known/did.json, getFeedSkeleton)
- Hashtag-based filtering in Durable Objects
- Post indexing to D1
- Simple React dashboard (community list, theme feed creation form)

### Not Implementing (Later Phases)
- Membership management (Phase 1)
- Achievement system (Phase 1)
- Automated archiving of inactive feeds (Phase 1)
- Dynamic feed mixing (80% own / 15% parent / 5% global) (Phase 2)
- Community graduation/splitting (Phase 2)

## Common Patterns

### TypeScript Types
All types are defined in [src/types.ts](src/types.ts). Key interfaces:
- `Community`: stage ('theme' | 'community' | 'graduated'), feed_mix ratios
- `ThemeFeed`: filter_config, health_metrics (JSON fields)
- `FilterConfig`: hashtags, keywords, authors arrays
- `PostIndex`: uri (AT Protocol URI: at://did:plc:xxx/app.bsky.feed.post/yyy)

### Authentication
Uses JWT with DID verification. Payload contains:
```typescript
{ did: "did:plc:xxx", handle: "user.bsky.social", iat, exp }
```

Roles: owner (full control), moderator (moderation), member (view only)

### Rate Limiting
Target: 100 requests/hour/user (implement in Phase 1)

## Performance Targets

| Metric | Target |
|--------|--------|
| Feed generation | < 200ms |
| API response (p95) | < 100ms |
| Workers uptime | > 99.9% |
| D1 query time | < 50ms |
| KV access time | < 10ms |

## References

- [AT Protocol Documentation](https://atproto.com/docs)
- [Bluesky Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)

## Development Notes

### Critical Implementation Details
- **Firehose WebSocket URL**: `wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos`
- **Timestamps**: Use Unix epoch (INTEGER type in D1) for all timestamps
- **CORS**: Must configure CORS headers for dashboard-to-Workers communication
- **Security**: Always use prepared statements for D1 queries to prevent SQL injection
- **Post URIs**: Format is `at://did:plc:xxx/app.bsky.feed.post/yyy`
- **Feed URIs**: Format is `at://did:plc:xxx/app.bsky.feed.generator/feed-id`
- **Cache TTL**: KV cache expires after 7 days (604800 seconds)

### Testing
```bash
# Seed test data (once schema.sql and seeds exist)
wrangler d1 execute atrarium-db --file=seeds/test-data.sql

# Local development with Miniflare
npm run dev

# Monitor production logs
wrangler tail --format pretty
```

### Cloudflare Limits to Keep in Mind
- **Workers Paid**: $5/month, includes 10M requests/month
- **D1 Free Tier**: 5GB storage, 5M reads/day, 100k writes/day
- **KV**: First 100k reads/day free, then $0.50 per million reads
- **Durable Objects**: 400,000 requests/month included in Workers Paid
