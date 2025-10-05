# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $5/month) and operational time by 80%.

**Current Phase**: Phase 1 (PDS-First Architecture)
**Status**: PDS-first architecture complete, ready for production deployment
**Active Branch**: `006-pds-1-db` (PDS-First Data Architecture)

## Architecture

### Tech Stack
- **Backend**: Cloudflare Workers + Durable Objects (TypeScript 5.7, Node.js via nodejs_compat)
- **Storage**: Durable Objects Storage (per-community isolation, no D1/KV dependencies)
- **Queue**: Cloudflare Queues (Firehose event processing, 5000 msg/sec capacity)
- **Frontend (Dashboard)**:
  - React 19 + TypeScript + Vite
  - TanStack Router v1 (file-based routing)
  - TanStack Query v5 (server state)
  - TanStack Table v8 (data tables)
  - shadcn/ui (Radix UI + Tailwind CSS)
  - react-hook-form + Zod (form validation)
  - i18next (EN/JA translations)
  - Cloudflare Pages (hosting)
- **External**: AT Protocol (@atproto/api ^0.13.35 with AtpAgent, @atproto/identity ^0.4.3), Bluesky Firehose (Jetstream WebSocket), Local PDS (testing)
- **Frameworks**: Hono ^4.6.14 (routing), Zod ^3.23.8 (validation)

### Core Components (PDS-First Architecture)

```
PDS (Source of Truth)
  ↓ (Firehose: Jetstream WebSocket)
FirehoseReceiver (Durable Object)
  ↓ (Lightweight filter: includes('#atr_'))
Cloudflare Queue (FIREHOSE_EVENTS)
  ↓ (Batched processing: 100 msg/batch)
FirehoseProcessor (Queue Consumer Worker)
  ↓ (Heavyweight filter: regex /#atr_[0-9a-f]{8}/)
CommunityFeedGenerator (Durable Object per community)
  ↓ (Storage: config:, member:, post:, moderation:)
Feed Generator API (getFeedSkeleton)
  ↓
Client (Bluesky AppView fetches post content)
```

**Architecture Principles (006-pds-1-db)**:
- **PDS as Source of Truth**: All community config, memberships, and moderation actions stored in user PDSs using AT Protocol Lexicon schemas
- **Durable Objects Storage**: Per-community feed index stored in isolated Durable Object Storage (no D1/KV dependencies)
- **Queue-Based Processing**: Two-stage filtering (lightweight → Queue → heavyweight) for efficient Firehose ingestion
- **Horizontal Scaling**: Unlimited communities without database bottlenecks (each community = 1 Durable Object)
- **Cost Efficiency**: ~$0.40/month for 1000 communities (DO + Queue) vs $5/month (D1 paid tier)
- **7-Day Retention**: Posts auto-expire from Durable Object Storage after 7 days (PDS remains permanent storage)

## Project Structure

**Implemented Structure**:
```
src/                    # Cloudflare Workers backend (TypeScript)
├── index.ts           # Main entry point, Hono router, Durable Objects + Queue bindings
├── routes/            # API route handlers
│   ├── feed-generator.ts  # AT Protocol Feed Generator API (proxies to CommunityFeedGenerator DO)
│   ├── auth.ts            # Authentication endpoints
│   ├── communities.ts     # Community management (writes to PDS, creates Durable Object)
│   ├── memberships.ts     # Membership management (writes to PDS)
│   └── moderation.ts      # Moderation API (writes to PDS) - 003-id
├── durable-objects/   # Durable Objects (006-pds-1-db)
│   ├── community-feed-generator.ts  # Per-community feed index (Storage: config:, member:, post:, moderation:)
│   └── firehose-receiver.ts         # Firehose WebSocket → Queue (lightweight filter)
├── workers/           # Queue Consumer Workers (006-pds-1-db)
│   └── firehose-processor.ts       # Queue → CommunityFeedGenerator (heavyweight filter)
├── services/          # Business logic services
│   ├── atproto.ts         # AT Protocol client (PDS read/write methods) - 006-pds-1-db
│   └── auth.ts            # JWT authentication
├── schemas/           # Validation schemas
│   ├── validation.ts      # Zod schemas
│   └── lexicon.ts         # AT Protocol Lexicon validation (TypeScript types + Zod) - 006-pds-1-db
├── utils/             # Utilities
│   ├── did.ts             # DID resolution
│   └── hashtag.ts         # Feed hashtag generation - 003-id
└── types.ts           # TypeScript type definitions

tests/                 # Test suite (Vitest + Cloudflare Workers)
├── contract/          # API contract tests
│   ├── dashboard/         # Dashboard API tests
│   │   ├── post-to-feed-with-hashtag.test.ts  # Hashtag posting - 003-id
│   │   └── moderation.test.ts                 # Moderation API - 003-id
│   ├── feed-generator/    # Feed Generator API tests
│   │   └── get-feed-skeleton-with-hashtags.test.ts  # Hashtag filtering - 003-id
│   ├── durable-object-storage.test.ts  # Durable Objects Storage operations - 006-pds-1-db
│   └── queue-consumer.test.ts          # Queue consumer processing - 006-pds-1-db
├── integration/       # Integration tests
│   ├── hashtag-indexing-flow.test.ts   # End-to-end hashtag flow - 003-id
│   ├── moderation-flow.test.ts         # End-to-end moderation - 003-id
│   ├── pds-posting.test.ts             # PDS integration test - 003-id
│   ├── queue-to-feed-flow.test.ts      # Queue → CommunityFeedGenerator flow - 006-pds-1-db
│   └── pds-to-feed-flow.test.ts        # Quickstart scenario (Alice-Bob) - 006-pds-1-db
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

wrangler.toml        # Cloudflare Workers configuration (Durable Objects + Queues)
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

## Data Storage (PDS-First Architecture - 006-pds-1-db)

**Storage Layers**:

1. **PDS (Source of Truth)** - Permanent storage in user Personal Data Servers
   - `net.atrarium.community.config`: Community metadata (name, hashtag, stage, moderators, feedMix)
   - `net.atrarium.community.membership`: User membership records (community, role, joinedAt, active)
   - `net.atrarium.moderation.action`: Moderation actions (action, target, community, reason)

2. **Durable Objects Storage (Per-Community Cache)** - 7-day feed index
   - `config:<communityId>`: CommunityConfig (name, hashtag, stage, createdAt)
   - `member:<did>`: MembershipRecord (did, role, joinedAt, active)
   - `post:<timestamp>:<rkey>`: PostMetadata (uri, authorDid, createdAt, moderationStatus, indexedAt)
   - `moderation:<uri>`: ModerationAction (action, targetUri, reason, createdAt)

**Data Flow**:
- **Writes**: Dashboard → PDS (Lexicon records) → Firehose → Queue → Durable Object Storage
- **Reads**: Feed Generator API → Durable Object Storage (7-day cache) → Client
- **Resilience**: If Durable Object Storage lost, replay Firehose from cursor 0 to rebuild

**Key Constraints**:
- `stage IN ('theme', 'community', 'graduated')`
- `role IN ('owner', 'moderator', 'member')`
- `moderationStatus IN ('approved', 'hidden', 'reported')`
- `action IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user')`
- All timestamps are ISO 8601 strings

**Hashtag System (003-id)**:
- Each community has a unique system-generated hashtag (`#atr_[0-9a-f]{8}` format)
- Posts include community hashtags to associate with specific feeds
- Membership verification ensures only community members can post
- Two-stage filtering: lightweight (`includes('#atr_')`) → heavyweight (`regex /#atr_[0-9a-f]{8}/`)

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Install Wrangler CLI (if not already installed)
npm install -g wrangler
wrangler login

# Create Cloudflare Queue (006-pds-1-db)
wrangler queues create firehose-events
wrangler queues create firehose-dlq  # Dead letter queue

# Update wrangler.toml with Queue configuration (already configured)
# Durable Objects are automatically provisioned on first deploy
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

### Durable Objects Management (006-pds-1-db)
```bash
# View Durable Objects logs
wrangler tail --format pretty

# Durable Objects are automatically created on first request
# Each community gets its own CommunityFeedGenerator instance
# Storage is persistent and isolated per community

# Note: D1 database deprecated in favor of Durable Objects Storage
```

## Key AT Protocol Concepts

### Feed Generator API Endpoints

**`GET /.well-known/did.json`**: Returns DID document identifying this feed generator
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.net",
  "service": [{
    "id": "#bsky_fg",
    "type": "BskyFeedGenerator",
    "serviceEndpoint": "https://atrarium.net"
  }]
}
```

**`GET /xrpc/app.bsky.feed.getFeedSkeleton`**: Returns feed skeleton (post URIs only)
- Params: `feed` (feed URI), `cursor` (optional), `limit` (optional, default 50)
- Returns: `{ feed: [{ post: "at://..." }], cursor?: "..." }`

The client fetches actual post content from Bluesky's AppView using these URIs.

### Data Flow (PDS-First Architecture - 006-pds-1-db)

**Post Ingestion**:
1. User posts to PDS with community hashtag (e.g., `#atr_a1b2c3d4`)
2. Jetstream Firehose → FirehoseReceiver DO (lightweight filter: `includes('#atr_')`)
3. Cloudflare Queue → FirehoseProcessor Worker (heavyweight filter: `regex /#atr_[0-9a-f]{8}/`)
4. FirehoseProcessor → CommunityFeedGenerator DO (RPC call)
5. CommunityFeedGenerator stores post in Durable Object Storage (7-day TTL)

**Feed Retrieval**:
1. Client requests `getFeedSkeleton` with feed URI
2. Feed Generator API → CommunityFeedGenerator DO (RPC call)
3. CommunityFeedGenerator queries Durable Object Storage (reverse chronological)
4. Return post URIs with cursor for pagination
5. Client fetches full post data from Bluesky AppView using returned URIs

## Implementation Status

### ✅ Completed
- [x] **Feed Generator API** (DID document, getFeedSkeleton, describeFeedGenerator)
- [x] **AT Protocol Lexicon schemas** (`net.atrarium.*` - migrated from `com.atrarium.*`)
  - [x] `net.atrarium.community.config` (community metadata)
  - [x] `net.atrarium.community.membership` (user memberships)
  - [x] `net.atrarium.moderation.action` (moderation actions)
- [x] **PDS read/write service** (@atproto/api with AtpAgent - BskyAgent deprecated)
- [x] **Durable Objects architecture**
  - [x] CommunityFeedGenerator (per-community feed index with Storage API)
  - [x] FirehoseReceiver (Jetstream WebSocket → Queue, lightweight filter)
- [x] **Cloudflare Queues** (firehose-events, firehose-dlq, 5000 msg/sec)
- [x] **FirehoseProcessor Worker** (Queue consumer, heavyweight regex filter)
- [x] **API routes** (communities, memberships, moderation - write to PDS, proxy to DOs)
- [x] **Hashtag system** (system-generated `#atr_[0-9a-f]{8}`, unique per community)
- [x] **Moderation system** (hide posts, block users, role-based access)
- [x] **Authentication** (JWT with DID verification)
- [x] **Test suite** (contract + integration + unit + docs tests)
- [x] **VitePress documentation** (20 pages, EN/JA, deployed to Cloudflare Pages)
- [x] **React dashboard** (Phase 0-1: full web UI with PDS integration)
- [x] **Local PDS integration** (DevContainer with Bluesky PDS for testing)
- [x] **Domain migration** (atrarium.net acquired, all references updated)

### 🚧 In Progress / Pending
- [ ] Production deployment (Cloudflare Workers + Durable Objects + Queues)
- [ ] Dashboard API integration (update to use PDS-first endpoints)
- [ ] Firehose connection monitoring and auto-reconnect
- [ ] Feed Generator registration in Bluesky AppView

### 📅 Future Phases
- Achievement system (Phase 1)
- Automated feed archiving (Phase 1)
- Dynamic feed mixing (Phase 2)
- Community graduation/splitting (Phase 2)

## Common Patterns

### Architecture (006-pds-1-db)
- **Router**: Hono framework with type-safe routing
- **Durable Objects**: Per-community isolation using CommunityFeedGenerator class
- **Queue Processing**: FirehoseProcessor consumes batched events from Cloudflare Queue
- **Services**: Business logic (AT Protocol client, auth)
- **Routes**: HTTP handlers that write to PDS and proxy to Durable Objects
- **Validation**: Zod schemas in [src/schemas/validation.ts](src/schemas/validation.ts) and [src/schemas/lexicon.ts](src/schemas/lexicon.ts)

### TypeScript Types
All types are defined in [src/types.ts](src/types.ts). Key patterns:
- **PDS Lexicon Types**: `CommunityConfig`, `MembershipRecord`, `ModerationAction` (from Lexicon schemas)
- **Durable Object Types**: `PostMetadata`, `PostEvent`, `ModerationAction` (internal to CommunityFeedGenerator)
- **API Types**: `CreateCommunityRequest`, `CommunityResponse` (request/response)
- **Enums**: `CommunityStage`, `MembershipRole`, `ModerationStatus`

### Authentication
JWT-based authentication with DID verification ([src/services/auth.ts](src/services/auth.ts)):
- Dashboard JWT: `{ iss, sub, aud, handle, iat, exp, jti }`
- Service JWT: `{ iss, aud, exp, iat, jti, lxm }` (for AT Protocol)
- Middleware: `authMiddleware()` in routes requiring authentication
- Roles: `owner` (full control), `moderator` (moderation), `member` (view only)

### Durable Objects Storage Patterns (006-pds-1-db)
- **Key schema**: Prefix-based namespacing (`config:`, `member:`, `post:`, `moderation:`)
- **Post keys**: `post:<timestamp>:<rkey>` for chronological ordering
- **Listing**: `storage.list({ prefix: 'post:', reverse: true })` for newest-first
- **Cleanup**: Scheduled alarm deletes posts older than 7 days
- **Timestamps**: ISO 8601 strings (consistent with AT Protocol)

## Performance Targets (006-pds-1-db)

| Metric | Target |
|--------|--------|
| Feed generation | < 200ms |
| API response (p95) | < 100ms |
| Workers uptime | > 99.9% |
| Durable Object read | < 10ms |
| Queue throughput | 5000 msg/sec |
| Post indexing latency | < 5s (from Firehose to queryable) |

## References

- [AT Protocol Documentation](https://atproto.com/docs)
- [AT Protocol Lexicon Schemas](https://atproto.com/specs/lexicon)
- [Bluesky Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Queues Docs](https://developers.cloudflare.com/queues/)

## Development Notes

### Critical Implementation Details (006-pds-1-db)
- **Jetstream WebSocket URL**: `wss://jetstream2.us-east.bsky.network/subscribe` (Firehose alternative)
- **Timestamps**: Use ISO 8601 strings for AT Protocol compatibility
- **CORS**: Must configure CORS headers for dashboard-to-Workers communication
- **Post URIs**: Format is `at://did:plc:xxx/app.bsky.feed.post/yyy`
- **Feed URIs**: Format is `at://did:plc:xxx/app.bsky.feed.generator/feed-id`
- **Durable Object Storage**: 7-day retention for posts (auto-cleanup via scheduled alarm)
- **Feed Hashtags**: Format is `#atr_[0-9a-f]{8}` (8-character hex, system-generated, unique per community) - **003-id**
- **Two-Stage Filtering**: Lightweight filter (`includes('#atr_')`) → Queue → Heavyweight filter (`regex /#atr_[0-9a-f]{8}/`) - **006-pds-1-db**
- **Moderation**: Only moderators/owners can hide posts or block users - **003-id**
- **Membership Validation**: Posts must be from community members (verified in Durable Object Storage) - **006-pds-1-db**
- **PDS as Source of Truth**: All writes go to PDS first, then indexed via Firehose - **006-pds-1-db**
- **Lexicon Collections**: `net.atrarium.community.config`, `net.atrarium.community.membership`, `net.atrarium.moderation.action` - **006-pds-1-db**

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

### Local Development (006-pds-1-db)
```bash
# Run Workers locally (with Miniflare)
npm run dev

# The dev server includes:
# - Durable Objects (in-memory simulation)
# - Cloudflare Queues (in-memory simulation)
# - CORS enabled for local dashboard development

# Note: Firehose WebSocket connection requires production deployment
# Use PDS integration tests for local development
```

### Production Monitoring
```bash
# View live logs
wrangler tail

# View logs with formatting
wrangler tail --format pretty

# Monitor Durable Objects performance
wrangler tail --format json | grep "CommunityFeedGenerator"

# Monitor Queue processing
wrangler tail --format json | grep "FirehoseProcessor"
```

### Cloudflare Costs (006-pds-1-db)
**Expected monthly cost for 1000 communities**: ~$0.40

Breakdown:
- **Workers Paid**: $5/month (includes 10M requests/month)
- **Durable Objects**: Included in Workers Paid (400k requests/month free, then $0.15/million)
- **Queues**: ~$0.22/month (2000 events/sec × 2.6M events/month at $0.40/million writes)
- **Storage**: ~$0.18/month (1000 communities × 10MB avg × $0.20/GB/month)

**Note**: D1 and KV no longer used, saving $5/month vs previous architecture
