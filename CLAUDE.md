# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $5/month) and operational time by 80%.

**Current Phase**: Phase 0 → Phase 1 Transition
**Status**: Backend complete, VitePress docs live, dashboard implemented
**Active Branch**: `005-pds-web-atrarim` (Web Dashboard with Local PDS Integration)

## Architecture

### Tech Stack
- **Backend**: Cloudflare Workers + Durable Objects (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Frontend (Dashboard)**:
  - React 19 + TypeScript + Vite
  - TanStack Router v1 (file-based routing)
  - TanStack Query v5 (server state)
  - TanStack Table v8 (data tables)
  - shadcn/ui (Radix UI + Tailwind CSS)
  - react-hook-form + Zod (form validation)
  - i18next (EN/JA translations)
  - Cloudflare Pages (hosting)
- **External**: AT Protocol (@atproto/api), Bluesky Firehose (WebSocket), Local PDS (testing)

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
│   ├── memberships.ts     # Membership management
│   └── moderation.ts      # Moderation API (hide/unhide posts, block users) - 003-id
├── models/            # Database models (D1 queries)
│   ├── community.ts
│   ├── theme-feed.ts
│   ├── membership.ts
│   ├── post-index.ts
│   ├── feed-blocklist.ts  # Feed-specific user blocklist - 003-id
│   ├── moderation-log.ts  # Moderation action history - 003-id
│   ├── achievement.ts
│   └── owner-transition-log.ts
├── services/          # Business logic services
│   ├── atproto.ts         # AT Protocol client
│   ├── auth.ts            # JWT authentication
│   ├── cache.ts           # KV cache operations
│   ├── moderation.ts      # Moderation business logic - 003-id
│   └── db.ts              # Database utilities
├── schemas/           # Validation schemas
│   └── validation.ts      # Zod schemas
├── utils/             # Utilities
│   ├── did.ts             # DID resolution
│   └── hashtag.ts         # Feed hashtag generation - 003-id
└── types.ts           # TypeScript type definitions

tests/                 # Test suite (Vitest + Cloudflare Workers)
├── contract/          # API contract tests
│   ├── dashboard/         # Dashboard API tests
│   │   ├── post-to-feed-with-hashtag.test.ts  # Hashtag posting - 003-id
│   │   └── moderation.test.ts                 # Moderation API - 003-id
│   └── feed-generator/    # Feed Generator API tests
│       └── get-feed-skeleton-with-hashtags.test.ts  # Hashtag filtering - 003-id
├── integration/       # Integration tests
│   ├── hashtag-indexing-flow.test.ts   # End-to-end hashtag flow - 003-id
│   ├── moderation-flow.test.ts         # End-to-end moderation - 003-id
│   └── pds-posting.test.ts             # PDS integration test - 003-id
├── unit/              # Unit tests
│   ├── feed-hashtag-generator.test.ts  # Hashtag generation - 003-id
│   └── membership-validation.test.ts   # Membership checks - 003-id
├── docs/              # VitePress documentation tests
│   ├── navigation.test.ts  # Navigation structure validation
│   ├── i18n.test.ts        # i18n parity check (en ↔ ja)
│   ├── links.test.ts       # Link validation (no 404s)
│   └── build.test.ts       # VitePress build validation
└── helpers/           # Test utilities
    ├── setup.ts           # Test database setup
    └── test-env.ts        # Test environment config

dashboard/            # React web dashboard (Phase 0-1)
├── src/
│   ├── components/          # React components
│   │   ├── communities/        # Community management components
│   │   ├── feeds/              # Feed management components
│   │   ├── posts/              # Post creation & display components
│   │   ├── moderation/         # Moderation components
│   │   ├── pds/                # PDS login component
│   │   ├── layout/             # Layout components (Header, Sidebar, Layout)
│   │   └── ui/                 # shadcn/ui components (button, card, etc.)
│   ├── routes/              # TanStack Router file-based routes
│   │   ├── __root.tsx          # Root route with Layout
│   │   ├── index.tsx           # Home page
│   │   ├── communities/        # Community routes
│   │   └── moderation.tsx      # Moderation log page
│   ├── contexts/            # React Context providers
│   │   └── PDSContext.tsx      # PDS session management
│   ├── lib/                 # Utilities
│   │   ├── api.ts              # API client (placeholder)
│   │   ├── pds.ts              # PDS integration (@atproto/api)
│   │   ├── queryClient.ts      # TanStack Query client
│   │   └── utils.ts            # Tailwind utilities
│   ├── i18n/                # i18next translations
│   │   ├── index.ts            # i18n setup
│   │   └── locales/            # EN/JA translations
│   ├── types.ts             # TypeScript type definitions
│   ├── router.tsx           # TanStack Router instance
│   └── main.tsx             # Entry point
├── tests/               # Component & integration tests
│   ├── components/          # Component tests (Vitest + Testing Library)
│   ├── integration/         # Integration tests (DEFERRED)
│   └── helpers/             # Test utilities
├── package.json         # Dashboard dependencies (React 19, TanStack, shadcn/ui)
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # Dashboard setup guide

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

Eight main tables (see [schema.sql](schema.sql) and [migrations/003-add-feed-hashtags.sql](migrations/003-add-feed-hashtags.sql)):

1. **communities**: Community metadata (id, name, stage, parent_id, feed_mix_own/parent/global, member_count, post_count)
2. **theme_feeds**: Theme feed configurations (id, community_id, name, status, **hashtag**, posts_7d, active_users_7d)
3. **memberships**: User membership (composite key: community_id + user_did, roles: owner/moderator/member)
4. **post_index**: Post URI index (uri, feed_id, author_did, created_at, has_media, langs, **moderation_status**, **indexed_at**)
5. **feed_blocklist**: User blocklist per feed (feed_id, blocked_user_did, reason, blocked_by_did) - **003-id**
6. **moderation_logs**: Moderation action history (action, target_uri, feed_id, moderator_did, reason) - **003-id**
7. **owner_transition_log**: Owner succession history (community_id, previous_owner_did, new_owner_did, reason)
8. **achievements**: User achievements (user_did, achievement_id, community_id, unlocked_at) - Phase 1+

**Key Constraints**:
- `stage IN ('theme', 'community', 'graduated')`
- `feed_mix_own + feed_mix_parent + feed_mix_global = 1.0`
- `role IN ('owner', 'moderator', 'member')`
- `status IN ('active', 'warning', 'archived')`
- `moderation_status IN ('approved', 'hidden', 'reported')` - **003-id**
- `action IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user', 'remove_member')` - **003-id**
- All timestamps are Unix epoch (INTEGER)

**Hashtag System (003-id)**:
- Each theme feed has a unique system-generated hashtag (`#atr_xxxxx` format)
- Posts include feed hashtags to associate with specific feeds
- Membership verification ensures only community members can post
- No automatic filter-based matching (direct feed association)

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

# Dashboard (Web UI)
cd dashboard
npm install          # Install dashboard dependencies (first time only)
npm run dev          # Start dashboard dev server (http://localhost:5173)
npm run build        # Build production bundle
npm run preview      # Preview production build
npm test             # Run dashboard tests

# Code quality
npm run lint         # ESLint
npm run format       # Prettier
```

### Development with Local PDS (DevContainer)
```bash
# Open project in DevContainer (VS Code)
# This automatically starts a local Bluesky PDS for testing

# Setup test accounts (run after DevContainer starts)
.devcontainer/setup-pds.sh

# Run PDS integration tests
npx vitest run tests/integration/pds-posting.test.ts

# PDS is available at http://localhost:3000 (or http://pds:3000 from container)
# Environment variable: PDS_URL=http://pds:3000
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

# Dashboard (Cloudflare Pages)
# Recommended deployment via GitHub integration:
# - Build command: cd dashboard && npm install && npm run build
# - Build output: dashboard/dist
# - Environment variables: VITE_API_URL, VITE_PDS_URL

# Manual deployment (if needed)
cd dashboard
npm run build
wrangler pages deploy dist --project-name=atrarium-dashboard
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
- [x] D1 database schema (8 tables with indexes)
- [x] Feed Generator API (DID document, getFeedSkeleton, describeFeedGenerator)
- [x] Community management (create, list, get)
- [x] Theme feed management (create, list, health metrics)
- [x] Post indexing (submit, retrieve by feed)
- [x] Membership management (join, leave, role-based access)
- [x] Authentication (JWT with DID verification)
- [x] Scheduled jobs (post deletion sync, feed health check)
- [x] Test suite (contract tests + integration tests + unit tests + docs tests)
- [x] **VitePress documentation site** (20 pages, EN/JA, deployed to Cloudflare Pages)
- [x] **Hashtag-based feed posting** (003-id: system-generated unique hashtags per feed)
- [x] **Moderation system** (003-id: hide posts, block users, moderation logs)
- [x] **Local PDS integration** (003-id: DevContainer with Bluesky PDS for testing)
- [x] **React dashboard** (005-pds-web-atrarim: full web UI with PDS integration)
  - [x] Component library (15 components: communities, feeds, posts, moderation, PDS login)
  - [x] TanStack Router (file-based routing with type-safe params)
  - [x] TanStack Query (server state management)
  - [x] shadcn/ui components (Radix UI + Tailwind CSS)
  - [x] PDS session management (localStorage persistence)
  - [x] i18n support (EN/JA translations)
  - [x] Component tests (Vitest + Testing Library)
  - [x] Production build (427KB gzip, <500KB target)

### 🚧 In Progress / Pending
- [ ] Dashboard API integration (currently using placeholder client)
- [ ] Firehose integration (Durable Objects for real-time indexing)
- [ ] Production deployment configuration for Workers
- [ ] Dashboard deployment to Cloudflare Pages

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
- **Feed Hashtags**: Format is `#atr_xxxxx` (8-character hex, system-generated, unique per feed) - **003-id**
- **Moderation**: Only moderators/owners can hide posts or block users - **003-id**
- **Membership Validation**: Posts must be from community members (verified via memberships table) - **003-id**

### Testing Strategy
Tests use `@cloudflare/vitest-pool-workers` to simulate Cloudflare Workers environment:
- **Setup**: [tests/helpers/setup.ts](tests/helpers/setup.ts) loads schema + migrations before all tests
- **Environment**: D1 and KV bindings configured in [vitest.config.ts](vitest.config.ts)
- **Contract Tests**: API endpoint validation ([tests/contract/](tests/contract/))
- **Integration Tests**: End-to-end workflows ([tests/integration/](tests/integration/))
- **Unit Tests**: Isolated logic validation ([tests/unit/](tests/unit/)) - **003-id**
- **Documentation Tests**: VitePress validation ([tests/docs/](tests/docs/)) using [vitest.docs.config.ts](vitest.docs.config.ts)
- **PDS Integration**: Real Bluesky PDS testing in DevContainer ([tests/integration/pds-posting.test.ts](tests/integration/pds-posting.test.ts)) - **003-id**

```bash
# Run all tests
npm test

# Run specific test
npx vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts

# Run hashtag-related tests (003-id)
npx vitest run tests/contract/dashboard/post-to-feed-with-hashtag.test.ts
npx vitest run tests/integration/hashtag-indexing-flow.test.ts

# Run moderation tests (003-id)
npx vitest run tests/contract/dashboard/moderation.test.ts
npx vitest run tests/integration/moderation-flow.test.ts

# Run PDS integration test (requires DevContainer)
npx vitest run tests/integration/pds-posting.test.ts

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
