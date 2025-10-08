# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small & open communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $0.40-5/month) and operational time by 80% (5 hours/week → 1 hour/week).

### Project Constitution

**All features MUST comply with the [Project Constitution](.specify/memory/constitution.md) v1.3.0.**

Nine core principles govern all technical decisions:
1. **Protocol-First Architecture**: Lexicon schemas are API contract, implementations are replaceable
2. **Simplicity and Minimal Complexity**: No new projects/databases/services without necessity
3. **Economic Efficiency**: <$5/month for communities with <200 members
4. **Decentralized Identity and Data Ownership**: PDS stores all user data
5. **PDS-First Architecture**: PDS as source of truth, Durable Objects as 7-day cache
6. **Operational Burden Reduction**: <1 hour/week maintenance
7. **Code Quality and Pre-Commit Validation**: Biome linting/formatting, TypeScript type checks before commit
8. **AT Protocol + PDS + Lexicon Constraints**: All features must be implementable using AT Protocol + PDS + Lexicon only (no separate databases)
9. **Git Workflow and Commit Integrity**: All changes fully committed before merge, no --no-verify bypasses without approval

See [constitution.md](.specify/memory/constitution.md) for detailed rules and rationale.

### Design Philosophy (Core Principles)

**The true value of Atrarium lies in AT Protocol Lexicon schemas (`net.atrarium.*`), NOT in the implementation.**

1. **Protocol-First Architecture**:
   - Community semantics are defined in AT Protocol Lexicon schemas
   - Lexicon schemas are the API contract and single source of truth
   - Current client/server implementations are reference implementations

2. **Implementation Agnostic**:
   - Cloudflare Workers stack is replaceable with any AT Protocol-compatible server
   - React dashboard is replaceable with any client (official Bluesky apps work)
   - No vendor lock-in by design

3. **Economic Rationality, Not Architectural Necessity**:
   - Cloudflare chosen for 95% cost reduction vs traditional VPS
   - Infrastructure choice driven by economics, not technical limitations
   - Can migrate to alternative platforms if economics change

4. **Interoperability First**:
   - All data stored in user PDSs using standard AT Protocol records
   - DIDs enable portability across services
   - Community membership is attestable independently of Atrarium infrastructure

**Positioning**: Atrarium is positioned as an alternative to:
- **Fediverse (Mastodon/Misskey)**: Open communities like Fediverse, but without the high operational burden (no VPS management, no database bottlenecks, DID portable identity)
- **Discord**: Low operational burden like Discord, but with open/public communities instead of closed servers (no platform lock-in, decentralized identity)
- **Standard Bluesky**: Built on Bluesky, but adds membership-based feed filtering not available in standard feeds (community-specific logic while remaining compatible with official apps)

**Current Phase**: Phase 1 (PDS-First Architecture)
**Status**: PDS-first architecture complete, ready for production deployment

**Future Vision (Phase 2+)**: "Maintain optimal community size" (ちょうどいい大きさを保つ) - automated community splitting/graduation when growth exceeds healthy scale (200+ members), ensuring communities remain intimate and engaged.

## Architecture

For detailed data flow visualization, see [CONCEPT.md](CONCEPT.md).

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
- **Frameworks**: Hono ^4.6.14 (routing), Zod ^4.1.11 (validation), oRPC ^1.9.3 (type-safe RPC)

### Core Components (PDS-First Architecture)

```
PDS (Source of Truth)
  ↓ (Firehose: Jetstream WebSocket)
FirehoseReceiver (Durable Object)
  ↓ (Lightweight filter: includes('#atrarium_'))
Cloudflare Queue (FIREHOSE_EVENTS)
  ↓ (Batched processing: 100 msg/batch)
FirehoseProcessor (Queue Consumer Worker)
  ↓ (Heavyweight filter: regex /#atrarium_[0-9a-f]{8}/)
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

**Monorepo Organization** (pnpm workspaces):
- Root: Workspace coordinator with component-specific documentation
- `shared/contracts/`: oRPC API contracts (@atrarium/contracts - shared types/schemas)
- `server/`: Backend implementation (Cloudflare Workers - @atrarium/server)
- `client/`: Web dashboard (React)
- `lexicons/`: Protocol definitions (shared across implementations)

**Implemented Structure**:
```
lexicons/              # AT Protocol Lexicon schemas (protocol definition, implementation-agnostic)
├── net.atrarium.community.config.json
├── net.atrarium.community.membership.json
├── net.atrarium.moderation.action.json
└── README.md          # Lexicon schema documentation

shared/                # Shared code across workspaces
└── contracts/         # oRPC API contracts (@atrarium/contracts)
    ├── src/
    │   ├── router.ts       # oRPC router contract (routes, middleware, schemas)
    │   ├── schemas.ts      # Zod validation schemas
    │   ├── types.ts        # TypeScript types (inferred from Zod)
    │   ├── client-types.ts # Client-compatible RouterClient type
    │   └── index.ts        # Central export point
    ├── package.json        # Dependencies: @orpc/server, @orpc/zod, zod
    └── tsconfig.json

server/                # Cloudflare Workers backend (pnpm workspace: @atrarium/server)
├── src/
├── ├── index.ts           # Main entry point, Hono router, Durable Objects + Queue bindings
├── routes/            # API route handlers
│   ├── feed-generator.ts  # AT Protocol Feed Generator API (proxies to CommunityFeedGenerator DO)
│   ├── auth.ts            # Authentication endpoints
│   ├── communities.ts     # Community management (writes to PDS, creates Durable Object)
│   ├── memberships.ts     # Membership management (writes to PDS)
│   ├── moderation.ts      # Moderation API (writes to PDS) - 003-id
│   └── lexicon.ts         # NEW (010-lexicon): Lexicon publication endpoints (serves lexicons/)
├── durable-objects/   # Durable Objects (006-pds-1-db)
│   ├── community-feed-generator.ts  # Per-community feed index (Storage: config:, member:, post:, moderation:)
│   └── firehose-receiver.ts         # Firehose WebSocket → Queue (lightweight filter)
├── workers/           # Queue Consumer Workers (006-pds-1-db)
│   └── firehose-processor.ts       # Queue → CommunityFeedGenerator (heavyweight filter)
├── services/          # Business logic services
│   ├── atproto.ts         # AT Protocol client (PDS read/write methods) - 006-pds-1-db
│   └── auth.ts            # JWT authentication
├── schemas/           # Validation schemas
│   ├── generated/         # NEW (010-lexicon): Auto-generated TypeScript from lexicons/
│   ├── validation.ts      # Zod schemas
│   └── lexicon.ts         # AT Protocol Lexicon validation (TypeScript types + Zod) - 006-pds-1-db
├── utils/             # Utilities
│   ├── did.ts             # DID resolution
│   └── hashtag.ts         # Feed hashtag generation - 003-id
├── └── types.ts           # TypeScript type definitions
├── tests/             # Server test suite (Vitest + Cloudflare Workers)
│   ├── contract/          # API contract tests
│   │   ├── dashboard/         # Dashboard API tests
│   │   │   ├── post-to-feed-with-hashtag.test.ts  # Hashtag posting - 003-id
│   │   │   └── moderation.test.ts                 # Moderation API - 003-id
│   │   ├── feed-generator/    # Feed Generator API tests
│   │   │   └── get-feed-skeleton-with-hashtags.test.ts  # Hashtag filtering - 003-id
│   │   ├── durable-object-storage.test.ts  # Durable Objects Storage operations - 006-pds-1-db
│   │   └── queue-consumer.test.ts          # Queue consumer processing - 006-pds-1-db
│   ├── integration/       # Integration tests
│   │   ├── hashtag-indexing-flow.test.ts   # End-to-end hashtag flow - 003-id
│   │   ├── moderation-flow.test.ts         # End-to-end moderation - 003-id
│   │   ├── pds-posting.test.ts             # PDS integration test - 003-id
│   │   ├── queue-to-feed-flow.test.ts      # Queue → CommunityFeedGenerator flow - 006-pds-1-db
│   │   └── pds-to-feed-flow.test.ts        # Quickstart scenario (Alice-Bob) - 006-pds-1-db
│   ├── unit/              # Unit tests
│   │   ├── feed-hashtag-generator.test.ts  # Hashtag generation - 003-id
│   │   └── membership-validation.test.ts   # Membership checks - 003-id
│   └── helpers/           # Test utilities
│       ├── setup.ts           # Test database setup
│       └── test-env.ts        # Test environment config
├── package.json       # Server dependencies (Hono, Zod v4, @atproto/api)
├── wrangler.toml      # Cloudflare Workers configuration
├── tsconfig.json      # TypeScript configuration
└── vitest.*.config.ts # Vitest configurations (main, pds, docs)

client/               # React web dashboard (pnpm workspace: client)
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
    │   │   ├── api.ts              # API client (TODO: update to oRPC v1.9.3)
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
    ├── package.json         # Dashboard dependencies (React 19, Zod v4, TanStack, shadcn/ui)
    ├── vite.config.ts       # Vite configuration
    ├── vitest.config.ts     # Vitest configuration for component tests
    ├── playwright.config.ts # Playwright E2E test configuration
    ├── tsconfig.json        # TypeScript configuration
    └── README.md            # Dashboard setup guide

# Root documentation files (previously in docs/)
CONCEPT.md           # System design and architecture
QUICKSTART.md        # Getting started guide
SETUP.md             # Development setup instructions
CONTRIBUTING.md      # Contribution guidelines

pnpm-workspace.yaml  # pnpm workspace configuration
package.json         # Root workspace coordinator
start-dev.sh         # Parallel development startup script (server + dashboard)
```

**Documentation**:
- [README.md](README.md) - Project summary (English) - **source of truth for project info**
- [README.ja.md](README.ja.md) - Japanese translation (maintain sync with README.md)
- [CONCEPT.md](CONCEPT.md) - System design and architecture
- [QUICKSTART.md](QUICKSTART.md) - Getting started guide
- [SETUP.md](SETUP.md) - Development setup instructions
- Component-specific documentation:
  - [lexicons/README.md](lexicons/README.md) - AT Protocol Lexicon schemas
  - [server/](server/) - Backend documentation (API.md, ARCHITECTURE.md, DEPLOYMENT.md, etc.)
  - [client/README.md](client/README.md) - Web dashboard documentation

**Documentation Policy**:
- **English (README.md)** is the primary/canonical version for project information
- Component-specific docs are located in respective directories (lexicons/, server/, client/)
- README.ja.md should be kept in sync with README.md for Japanese speakers
- When updating project information, always update README.md first, then sync translations

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
- Each community has a unique system-generated hashtag (`#atrarium_[0-9a-f]{8}` format)
- Posts include community hashtags to associate with specific feeds
- Membership verification ensures only community members can post
- Two-stage filtering: lightweight (`includes('#atrarium_')`) → heavyweight (`regex /#atrarium_[0-9a-f]{8}/`)

## Development Commands

### Setup
```bash
# Install all workspace dependencies (uses pnpm workspaces)
pnpm install

# Install Wrangler CLI (if not already installed)
pnpm add -g wrangler
wrangler login

# Create Cloudflare Queue (006-pds-1-db)
wrangler queues create firehose-events
wrangler queues create firehose-dlq  # Dead letter queue

# Queue configuration in wrangler.toml:
# - max_batch_size: 100 (process up to 100 messages per batch)
# - max_batch_timeout: 5s (wait up to 5 seconds for batch to fill)
# - max_retries: 3 (retry failed messages 3 times before DLQ)
# Durable Objects are automatically provisioned on first deploy
```

### Development
```bash
# Server development (can run from root or server/)
pnpm --filter server dev          # Run Workers locally with Miniflare (localhost:8787)
pnpm --filter server typecheck    # TypeScript type checking
pnpm --filter server test         # Run server tests
pnpm --filter server build        # Build server (dry-run deploy)

# Dashboard development (can run from root or client/)
pnpm --filter client dev       # Start dashboard dev server (http://localhost:5173)
pnpm --filter client build     # Build dashboard production bundle
pnpm --filter client test      # Run dashboard tests

# Parallel development (server + dashboard)
./start-dev.sh                # Start both server and client in parallel (if available)
# Or manually: pnpm --filter server dev & pnpm --filter client dev

# Run all workspaces (from root only)
pnpm -r build        # Build all workspaces
pnpm -r test         # Run all tests
pnpm -r typecheck    # Type check all workspaces

# Lexicon TypeScript Code Generation (010-lexicon)
pnpm --filter server codegen      # Generate TypeScript types from lexicons/*.json
                                  # Output: server/src/schemas/generated/
                                  # Note: Generated code excluded from tsconfig, use JSON imports
```

### Development with Local PDS (DevContainer)
```bash
# Open project in DevContainer (VS Code)
# This automatically starts a local Bluesky PDS for testing

# Setup test accounts (run after DevContainer starts)
.devcontainer/setup-pds.sh

# Run PDS integration tests (from server directory)
pnpm --filter server test:pds

# PDS is available at http://localhost:3000 (or http://pds:3000 from container)
# Environment variable: PDS_URL=http://pds:3000
```

### Testing

**For detailed testing guide (local vs deployed, troubleshooting), see [TESTING.md](TESTING.md).**

```bash
# Run all workspace tests
pnpm -r test

# Server tests
pnpm --filter server test           # Run all server tests
pnpm --filter server test:watch     # Watch mode
pnpm --filter server test:pds       # PDS integration tests

# Dashboard tests
pnpm --filter client test        # Run dashboard tests

# Run specific test file (in server)
pnpm --filter server exec vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts

# The test suite uses @cloudflare/vitest-pool-workers for Cloudflare Workers environment
# PDS-specific tests use vitest.pds.config.ts for isolated PDS testing
```

### Deployment
```bash
# Server deployment
pnpm --filter server deploy                # Deploy Workers to production
wrangler secret put JWT_SECRET             # Set secrets (also: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)

# Dashboard (Cloudflare Pages)
# Recommended deployment via GitHub integration:
# - Build command: cd client && pnpm install && pnpm run build
# - Build output: client/dist
# - Environment variables: VITE_API_URL, VITE_PDS_URL

# Manual deployment (if needed)
pnpm --filter client build
wrangler pages deploy client/dist --project-name=atrarium-dashboard
```

### Durable Objects Management (006-pds-1-db)
```bash
# View Durable Objects logs
wrangler tail --format pretty

# Durable Objects are automatically created on first request
# Each community gets its own CommunityFeedGenerator instance
# Storage is persistent and isolated per community

# Scheduled cleanup runs every 12 hours (configured in wrangler.toml)
# Cron trigger: "0 */12 * * *" - deletes posts older than 7 days

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

**`GET /xrpc/net.atrarium.lexicon.get`**: Returns AT Protocol Lexicon schemas (010-lexicon)
- Params: `nsid` (Lexicon NSID, e.g., `net.atrarium.community.config`)
- Returns: Lexicon JSON schema
- Headers: `ETag` (SHA-256 content hash), `Cache-Control: public, max-age=3600` (beta period)
- Supports conditional requests (If-None-Match → 304 Not Modified)

### Data Flow (PDS-First Architecture - 006-pds-1-db)

**Post Ingestion**:
1. User posts to PDS with community hashtag (e.g., `#atrarium_a1b2c3d4`)
2. Jetstream Firehose → FirehoseReceiver DO (lightweight filter: `includes('#atrarium_')`)
3. Cloudflare Queue → FirehoseProcessor Worker (heavyweight filter: `regex /#atrarium_[0-9a-f]{8}/`)
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
- [x] **Hashtag system** (system-generated `#atrarium_[0-9a-f]{8}`, unique per community)
- [x] **Moderation system** (hide posts, block users, role-based access)
- [x] **Authentication** (JWT with DID verification)
- [x] **Test suite** (contract + integration + unit tests)
- [x] **Component documentation** (consolidated from VitePress, organized by component)
- [x] **React dashboard** (Phase 0-1: full web UI with PDS integration)
- [x] **Local PDS integration** (DevContainer with Bluesky PDS for testing)
- [x] **Domain migration** (atrarium.net acquired, all references updated)
- [x] **Lexicon publication API** (010-lexicon: HTTP endpoints with ETag caching, beta status documented)

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

### oRPC Type Safety (011-lexicons-server-client)
End-to-end type-safe API communication using `@atrarium/contracts`:

**Server-side** ([server/src/router.ts](server/src/router.ts)):
```typescript
import { contract } from '@atrarium/contracts/router';

export const router = {
  communities: {
    list: contract.communities.list.handler(async () => { /* ... */ }),
    create: contract.communities.create.handler(async ({ input }) => { /* ... */ }),
  },
};
```

**Client-side** ([client/src/lib/api.ts](client/src/lib/api.ts)):
```typescript
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ClientRouter } from '@atrarium/contracts';

const link = new RPCLink({
  url: baseURL,
  headers: () => ({ Authorization: `Bearer ${token}` }),
});

export const apiClient: ClientRouter = createORPCClient(link);
```

**Key Benefits**:
- ✅ **Zero code generation**: Types flow from server to client automatically
- ✅ **Compile-time safety**: TypeScript validates inputs, outputs, and method names
- ✅ **Single source of truth**: Contract definitions in `shared/contracts/`
- ✅ **Runtime validation**: Zod schemas enforce type safety at runtime
- ✅ **Auto-completion**: Full IntelliSense support for API calls

**Architecture**:
- `shared/contracts/src/router.ts`: Contract definition (routes, schemas, middleware)
- `shared/contracts/src/client-types.ts`: `RouterClient<typeof router>` for client typing
- `server/src/router.ts`: Server implementation with `.handler()` methods
- `client/src/lib/api.ts`: Type-safe client using `ClientRouter` type

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

### .specify Workflow (Feature Development)

This project uses `.specify/` slash commands for feature development workflow:

```bash
# Feature development workflow commands (in Claude Code)
/specify      # Create spec.md from feature description
/plan         # Generate plan.md with implementation design
/tasks        # Generate tasks.md with dependency-ordered tasks
/implement    # Execute tasks.md automatically
/analyze      # Cross-artifact consistency check
/clarify      # Ask clarification questions for underspecified areas
/constitution # Update project constitution (requires principle inputs)
```

**Key files**:
- `.specify/templates/spec-template.md` - Feature specification template
- `.specify/templates/plan-template.md` - Implementation plan template (includes Constitution Check)
- `.specify/templates/tasks-template.md` - Task generation template
- `.specify/memory/constitution.md` - Project constitution v1.0.0 (6 principles)

**Workflow**:
1. `/specify` with feature description → generates `specs/{feature-id}/spec.md`
2. `/plan` → generates `specs/{feature-id}/plan.md` (validates against constitution)
3. `/tasks` → generates `specs/{feature-id}/tasks.md` (dependency-ordered)
4. `/implement` → executes tasks autonomously
5. `/analyze` → validates consistency across spec.md, plan.md, tasks.md

All outputs include Constitution Check section validating compliance with 7 principles.

### Critical Implementation Details (006-pds-1-db)
- **Jetstream WebSocket URL**: `wss://jetstream2.us-east.bsky.network/subscribe` (Firehose alternative)
- **Timestamps**: Use ISO 8601 strings for AT Protocol compatibility
- **CORS**: Must configure CORS headers for dashboard-to-Workers communication
- **Post URIs**: Format is `at://did:plc:xxx/app.bsky.feed.post/yyy`
- **Feed URIs**: Format is `at://did:plc:xxx/app.bsky.feed.generator/feed-id`
- **Durable Object Storage**: 7-day retention for posts (auto-cleanup via scheduled alarm)
- **Feed Hashtags**: Format is `#atrarium_[0-9a-f]{8}` (8-character hex, system-generated, unique per community) - **003-id**
- **Two-Stage Filtering**: Lightweight filter (`includes('#atrarium_')`) → Queue → Heavyweight filter (`regex /#atrarium_[0-9a-f]{8}/`) - **006-pds-1-db**
- **Moderation**: Only moderators/owners can hide posts or block users - **003-id**
- **Membership Validation**: Posts must be from community members (verified in Durable Object Storage) - **006-pds-1-db**
- **PDS as Source of Truth**: All writes go to PDS first, then indexed via Firehose - **006-pds-1-db**
- **Lexicon Collections**: `net.atrarium.community.config`, `net.atrarium.community.membership`, `net.atrarium.moderation.action` - **006-pds-1-db**
- **Lexicon Publication** (010-lexicon): Schemas published at `/xrpc/net.atrarium.lexicon.get?nsid={nsid}` with ETag caching (SHA-256, 1-hour beta period)

### Testing Strategy
Tests use `@cloudflare/vitest-pool-workers` to simulate Cloudflare Workers environment:
- **Setup**: Durable Objects are auto-provisioned on first use (no schema migrations needed)
- **Environment**: Durable Objects and Queue bindings configured in [wrangler.toml](wrangler.toml)
- **Contract Tests**: API endpoint validation ([tests/contract/](tests/contract/))
- **Integration Tests**: End-to-end workflows ([tests/integration/](tests/integration/))
- **Unit Tests**: Isolated logic validation ([tests/unit/](tests/unit/)) - **003-id**
- **PDS Integration**: Real Bluesky PDS testing in DevContainer ([tests/integration/pds-posting.test.ts](tests/integration/pds-posting.test.ts)) - **003-id**

```bash
# Run all tests
pnpm --filter server test

# Run specific test
pnpm --filter server exec vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts

# Run hashtag-related tests (003-id)
pnpm --filter server exec vitest run tests/contract/dashboard/post-to-feed-with-hashtag.test.ts
pnpm --filter server exec vitest run tests/integration/hashtag-indexing-flow.test.ts

# Run moderation tests (003-id)
pnpm --filter server exec vitest run tests/contract/dashboard/moderation.test.ts
pnpm --filter server exec vitest run tests/integration/moderation-flow.test.ts

# Run PDS integration test (requires DevContainer)
pnpm --filter server test:pds

# Debug tests
pnpm --filter server test:watch
```

### Local Development (006-pds-1-db)
```bash
# Run Workers locally (with Miniflare)
pnpm --filter server dev

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
