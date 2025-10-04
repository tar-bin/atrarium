# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $5/month) and operational time by 80%.

**Current Phase**: Phase 0 → Phase 1 Transition
**Status**: Backend complete, VitePress docs live, dashboard pending

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

**Implemented Structure**:
```
src/                    # Cloudflare Workers backend (TypeScript)
├── index.ts           # Main entry point, Hono router, scheduled jobs
├── routes/            # API route handlers
│   ├── feed-generator.ts  # AT Protocol Feed Generator API
│   ├── auth.ts            # Authentication endpoints
│   ├── communities.ts     # Community management
│   ├── theme-feeds.ts     # Theme feed CRUD
│   ├── posts.ts           # Post submission/indexing
│   └── memberships.ts     # Membership management
├── models/            # Database models (D1 queries)
│   ├── community.ts
│   ├── theme-feed.ts
│   ├── membership.ts
│   ├── post-index.ts
│   ├── achievement.ts
│   └── owner-transition-log.ts
├── services/          # Business logic services
│   ├── atproto.ts         # AT Protocol client
│   ├── auth.ts            # JWT authentication
│   ├── cache.ts           # KV cache operations
│   └── db.ts              # Database utilities
├── schemas/           # Validation schemas
│   └── validation.ts      # Zod schemas
├── utils/             # Utilities
│   └── did.ts             # DID resolution
└── types.ts           # TypeScript type definitions

tests/                 # Test suite (Vitest + Cloudflare Workers)
├── contract/          # API contract tests
│   ├── dashboard/         # Dashboard API tests
│   └── feed-generator/    # Feed Generator API tests
├── integration/       # Integration tests
├── docs/              # VitePress documentation tests
│   ├── navigation.test.ts  # Navigation structure validation
│   ├── i18n.test.ts        # i18n parity check (en ↔ ja)
│   ├── links.test.ts       # Link validation (no 404s)
│   └── build.test.ts       # VitePress build validation
└── helpers/           # Test utilities
    ├── setup.ts           # Test database setup
    └── test-env.ts        # Test environment config

docs/                 # VitePress documentation site
├── en/                   # English documentation (10 pages)
│   ├── guide/               # Getting started guides
│   ├── architecture/        # System design docs
│   └── reference/           # API reference
├── ja/                   # Japanese documentation (10 pages, mirrors en/)
├── .vitepress/
│   ├── config.ts            # VitePress configuration (i18n, theme)
│   ├── locales/             # Locale-specific navigation
│   │   ├── en.ts
│   │   └── ja.ts
│   └── theme/               # Custom theme (Atrarium brand colors)
├── package.json          # VitePress dependencies
├── README.md             # Documentation site setup guide
├── CONTRIBUTING.md       # Documentation contribution guide
└── DEPLOYMENT.md         # Cloudflare Pages deployment checklist

schema.sql            # D1 database schema (SQLite)
wrangler.toml        # Cloudflare Workers configuration
vitest.config.ts     # Vitest configuration for Cloudflare Workers
vitest.docs.config.ts # Vitest configuration for documentation tests
```

**Documentation**:
- **[Documentation Site](https://atrarium-docs.pages.dev)** - VitePress documentation (EN/JA) - **primary reference**
- [README.md](README.md) - Project summary (English) - **source of truth for project info**
- [README.ja.md](README.ja.md) - Japanese translation (maintain sync with README.md)

**Documentation Policy**:
- **English (README.md)** is the primary/canonical version for project information
- **VitePress docs** (`docs/`) provide comprehensive guides, architecture details, and API references
- **Other languages (README.ja.md, docs/ja/)** are translations that should be kept in sync
- When updating project information, always update README.md first, then sync translations
- VitePress docs follow i18n contract: every `en/*.md` must have corresponding `ja/*.md`

## Database Schema

Six main tables (see [schema.sql](schema.sql)):

1. **communities**: Community metadata (id, name, stage, parent_id, feed_mix_own/parent/global, member_count, post_count)
2. **theme_feeds**: Theme feed configurations (id, community_id, name, status, posts_7d, active_users_7d)
3. **memberships**: User membership (composite key: community_id + user_did, roles: owner/moderator/member)
4. **post_index**: Post URI index (uri, feed_id, author_did, created_at, has_media, langs)
5. **owner_transition_log**: Owner succession history (community_id, previous_owner_did, new_owner_did, reason)
6. **achievements**: User achievements (user_did, achievement_id, community_id, unlocked_at) - Phase 1+

**Key Constraints**:
- `stage IN ('theme', 'community', 'graduated')`
- `feed_mix_own + feed_mix_parent + feed_mix_global = 1.0`
- `role IN ('owner', 'moderator', 'member')`
- `status IN ('active', 'warning', 'archived')`
- All timestamps are Unix epoch (INTEGER)

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Install Wrangler CLI (if not already installed)
npm install -g wrangler
wrangler login

# Create Cloudflare resources
wrangler d1 create atrarium-db          # Create D1 database
wrangler kv:namespace create POST_CACHE  # Create KV namespace

# Apply database schema
wrangler d1 execute atrarium-db --file=./schema.sql

# Update wrangler.toml with generated IDs
# Uncomment and add database_id and KV namespace id from above commands
```

### Development
```bash
npm run dev          # Run Workers locally with Miniflare
npm run typecheck    # TypeScript type checking (no emit)
npm test             # Run all tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run test:docs    # Run VitePress documentation tests

# Documentation site
cd docs
npm install          # Install VitePress dependencies (first time only)
npm run docs:dev     # Start VitePress dev server (http://localhost:5173)
npm run docs:build   # Build static site
npm run docs:preview # Preview production build

# Code quality
npm run lint         # ESLint
npm run format       # Prettier
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts

# The test suite uses @cloudflare/vitest-pool-workers for Cloudflare Workers environment
# Database schema is automatically loaded from tests/helpers/setup.ts
```

### Deployment
```bash
npm run deploy                    # Deploy Workers to production
wrangler secret put JWT_SECRET    # Set secrets (also: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)

# VitePress documentation site (Cloudflare Pages)
# Automatic deployment via GitHub integration:
# - Push to main → auto-deploys to https://atrarium-docs.pages.dev
# - Build command: cd docs && npm install && npm run docs:build
# - Build output: docs/.vitepress/dist

# Manual deployment (if needed)
cd docs
npm run docs:build
wrangler pages deploy .vitepress/dist --project-name=atrarium-docs
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

## Implementation Status

### ✅ Completed (Phase 0 MVP)
- [x] D1 database schema (6 tables with indexes)
- [x] Feed Generator API (DID document, getFeedSkeleton, describeFeedGenerator)
- [x] Community management (create, list, get)
- [x] Theme feed management (create, list, health metrics)
- [x] Post indexing (submit, retrieve by feed)
- [x] Membership management (join, leave, role-based access)
- [x] Authentication (JWT with DID verification)
- [x] Scheduled jobs (post deletion sync, feed health check)
- [x] Test suite (contract tests + integration tests + docs tests)
- [x] **VitePress documentation site** (20 pages, EN/JA, deployed to Cloudflare Pages)

### 🚧 In Progress / Pending
- [ ] React dashboard (UI for community/feed management)
- [ ] Firehose integration (Durable Objects for real-time indexing)
- [ ] Production deployment configuration for Workers

### 📅 Future Phases
- Achievement system (Phase 1)
- Automated feed archiving (Phase 1)
- Dynamic feed mixing (Phase 2)
- Community graduation/splitting (Phase 2)

## Common Patterns

### Architecture
- **Router**: Hono framework with type-safe routing
- **Models**: Database access layer (D1 prepared statements)
- **Services**: Business logic (AT Protocol client, auth, cache)
- **Routes**: HTTP handlers organized by domain
- **Validation**: Zod schemas in [src/schemas/validation.ts](src/schemas/validation.ts)

### TypeScript Types
All types are defined in [src/types.ts](src/types.ts). Key patterns:
- **Entities**: `Community`, `ThemeFeed`, `Membership`, `PostIndex` (camelCase)
- **Database Rows**: `CommunityRow`, `ThemeFeedRow` (snake_case from D1)
- **API Types**: `CreateCommunityRequest`, `CommunityResponse` (request/response)
- **Enums**: `CommunityStage`, `ThemeFeedStatus`, `MembershipRole`, `TransitionReason`

### Authentication
JWT-based authentication with DID verification ([src/services/auth.ts](src/services/auth.ts)):
- Dashboard JWT: `{ iss, sub, aud, handle, iat, exp, jti }`
- Service JWT: `{ iss, aud, exp, iat, jti, lxm }` (for AT Protocol)
- Middleware: `authMiddleware()` in routes requiring authentication
- Roles: `owner` (full control), `moderator` (moderation), `member` (view only)

### Database Patterns
- **Row mapping**: Models convert snake_case rows to camelCase entities
- **Prepared statements**: Always use for SQL injection prevention
- **Transactions**: Not used in Phase 0 (D1 limitation), manual rollback via try-catch
- **Timestamps**: Unix epoch (seconds) stored as INTEGER

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

### Testing Strategy
Tests use `@cloudflare/vitest-pool-workers` to simulate Cloudflare Workers environment:
- **Setup**: [tests/helpers/setup.ts](tests/helpers/setup.ts) loads schema before all tests
- **Environment**: D1 and KV bindings configured in [vitest.config.ts](vitest.config.ts)
- **Contract Tests**: API endpoint validation ([tests/contract/](tests/contract/))
- **Integration Tests**: End-to-end workflows ([tests/integration/](tests/integration/))
- **Documentation Tests**: VitePress validation ([tests/docs-site/](tests/docs-site/)) using [vitest.docs.config.ts](vitest.docs.config.ts)

```bash
# Run all tests
npm test

# Run specific test
npx vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts

# Run documentation tests
npm run test:docs

# Debug tests
npm run test:watch
```

### Local Development
```bash
# Run Workers locally (with Miniflare)
npm run dev

# The dev server includes:
# - D1 database (in-memory SQLite)
# - KV namespace (in-memory)
# - CORS enabled for local dashboard development
```

### Production Monitoring
```bash
# View live logs
wrangler tail

# View logs with formatting
wrangler tail --format pretty

# Run queries on production D1
wrangler d1 execute atrarium-db --command "SELECT * FROM communities LIMIT 5"
```

### Cloudflare Limits to Keep in Mind
- **Workers Paid**: $5/month, includes 10M requests/month
- **D1 Free Tier**: 5GB storage, 5M reads/day, 100k writes/day
- **KV**: First 100k reads/day free, then $0.50 per million reads
- **Durable Objects**: 400,000 requests/month included in Workers Paid
