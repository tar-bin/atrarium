# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small & open communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $0.40-5/month) and operational time by 80% (5 hours/week → 1 hour/week).

### Project Constitution

**All features MUST comply with the [Project Constitution](.specify/memory/constitution.md) v1.5.0.**

Ten core principles govern all technical decisions:
1. **Protocol-First Architecture**: Lexicon schemas are API contract, implementations are replaceable
2. **Simplicity and Minimal Complexity**: No new projects/databases/services without necessity
3. **Economic Efficiency**: <$5/month for communities with <200 members
4. **Decentralized Identity and Data Ownership**: PDS stores all user data
5. **PDS-First Architecture**: PDS as source of truth, Durable Objects as 7-day cache
6. **Operational Burden Reduction**: <1 hour/week maintenance
7. **Code Quality and Pre-Commit Validation**: Biome linting/formatting, TypeScript type checks before commit
8. **AT Protocol + PDS + Lexicon Constraints**: All features must be implementable using AT Protocol + PDS + Lexicon only (no separate databases)
9. **Git Workflow and Commit Integrity**: All changes fully committed before merge, no --no-verify bypasses without approval
10. **Complete Implementation Over MVP Excuses**: Features must be fully implemented per spec, no "MVP" labels to justify incomplete work

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

**Key Directories**:
- `lexicons/` - AT Protocol Lexicon schemas (protocol definition, implementation-agnostic)
- `shared/contracts/` - oRPC API contracts (type-safe RPC between client/server)
  - `src/router.ts` - Contract definition (routes, schemas, middleware)
  - `src/schemas.ts` - Zod validation schemas
  - `src/types.ts` - TypeScript types (inferred from Zod)
  - `src/client-types.ts` - Client-compatible RouterClient type
- `server/` - Cloudflare Workers backend (@atrarium/server)
  - `src/router.ts` - oRPC router implementation (type-safe API handlers for Posts, Reactions, Moderation)
  - `src/durable-objects/` - Per-community feed storage (CommunityFeedGenerator, FirehoseReceiver)
  - `src/routes/` - Legacy Hono routes (feed-generator, communities, memberships, auth) + deprecated routes (posts, emoji, reactions - marked for removal after 30-day monitoring)
  - `src/workers/` - Queue consumers (FirehoseProcessor)
  - `src/services/` - Business logic (AT Protocol client, auth)
  - `src/schemas/` - Validation schemas (Zod, Lexicon types)
  - `tests/` - Contract, integration, unit tests (Vitest + @cloudflare/vitest-pool-workers)
- `client/` - React dashboard (TanStack Router + Query + Table)
  - `src/components/` - React components (communities, feeds, posts, moderation, reactions, emoji, layout, UI)
  - `src/routes/` - TanStack Router file-based routes
  - `src/contexts/` - React Context providers (PDS session management)
  - `src/lib/` - Utilities (API client with reaction/emoji helpers, PDS integration, TanStack Query client)
  - `src/i18n/` - i18next translations (EN/JA)
  - `tests/` - Component tests (Vitest + Testing Library), E2E tests (Playwright)

**Detailed Structure** (for reference):
```
lexicons/              # AT Protocol Lexicon schemas (protocol definition, implementation-agnostic)
├── net.atrarium.community.config.json
├── net.atrarium.community.membership.json
├── net.atrarium.community.reaction.json  # NEW (016-slack-mastodon-misskey): Reaction records
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
│   ├── reactions.ts       # NEW (016-slack-mastodon-misskey): Reaction management (POST /add, DELETE /remove, GET /list)
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
    │   │   ├── reactions/          # NEW (016-slack-mastodon-misskey): Reaction UI components
    │   │   │   ├── ReactionBar.tsx      # Display reaction counts with toggle
    │   │   │   ├── ReactionPicker.tsx   # Simple emoji selector (10 common emojis)
    │   │   │   └── EmojiPicker.tsx      # Full emoji picker (6 categories, search, custom emojis)
    │   │   ├── emoji/              # NEW (016-slack-mastodon-misskey): Custom emoji management
    │   │   │   ├── CustomEmojiUpload.tsx  # Upload form with validation
    │   │   │   ├── CustomEmojiList.tsx    # User's emoji list with delete
    │   │   │   └── EmojiApproval.tsx      # Owner approval queue
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
    │   │   ├── api.ts              # API client with reaction/emoji helpers (016-slack-mastodon-misskey)
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
   - `net.atrarium.community.post`: Community posts (text, communityId, createdAt) - **014-bluesky**
   - `net.atrarium.community.reaction`: Post reactions (postUri, emoji, communityId, createdAt) - **016-slack-mastodon-misskey**
   - `net.atrarium.moderation.action`: Moderation actions (action, target, community, reason)

2. **Durable Objects Storage (Per-Community Cache)** - 7-day feed index
   - `config:<communityId>`: CommunityConfig (name, hashtag, stage, createdAt)
   - `member:<did>`: MembershipRecord (did, role, joinedAt, active)
   - `reaction:{postUri}:{emojiKey}`: ReactionAggregate (emoji, count, reactors[]) - **016-slack-mastodon-misskey**
   - `reaction_record:{reactionUri}`: ReactionRecord (reactionUri, postUri, emoji, reactor, createdAt) - **016-slack-mastodon-misskey**
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

### Quick Reference

**Root-level commands** (run from any directory):
```bash
pnpm install                    # Install all workspace dependencies
pnpm -r build                   # Build all workspaces
pnpm -r test                    # Run all tests
pnpm -r typecheck               # Type check all workspaces
pnpm lint                       # Check linting issues
pnpm lint:fix                   # Auto-fix linting issues
pnpm format                     # Auto-format code
pnpm format:check               # Check formatting
```

**Workspace-specific commands**:
```bash
pnpm --filter server <command>              # Run server command
pnpm --filter client <command>              # Run client command
pnpm --filter @atrarium/contracts <command> # Run contracts command
```

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

# Load test data (creates accounts + communities + posts)
./scripts/load-test-data.sh

# Run PDS integration tests (from server directory)
pnpm --filter server test:pds

# PDS is available at http://localhost:3000 (or http://pds:3000 from container)
# Environment variable: PDS_URL=http://pds:3000
```

### Development Server Startup (start-dev.sh)
```bash
# Start all services (PDS + Server + Client)
./start-dev.sh all

# Start only specific services
./start-dev.sh client    # Client only (default)
./start-dev.sh server    # Server only
./start-dev.sh pds       # Local PDS only

# The script automatically:
# - Starts Docker Compose for local PDS
# - Creates test accounts (alice.test, bob.test, moderator.test)
# - Runs server in background, client in foreground
# - Server logs: tail -f /tmp/atrarium-server.log

# Services:
# - PDS:    http://localhost:3000 (real Bluesky PDS)
# - Client: http://localhost:5173 (Vite dev server)
# - Server: http://localhost:8787 (Miniflare with real Durable Objects/Queue)

# Note: MSW is NOT used during development
# - Development uses real server (Miniflare) and real PDS
# - MSW is only used in client component tests (pnpm --filter client test)
```

### Load Test Data (scripts/load-test-data.sh)
```bash
# Load sample communities and posts into local environment
# Prerequisites: PDS and Server must be running
./scripts/load-test-data.sh

# The script automatically:
# - Verifies PDS (localhost:3000) and Server (localhost:8787) are running
# - Logs in as test accounts (alice.test, bob.test, moderator.test)
# - Creates 3 communities (Design, Tech, Game)
# - Adds members with appropriate roles
# - Creates ~7 sample posts across communities

# Test accounts and roles:
# - alice.test: Owner of Design & Tech communities
# - bob.test: Owner of Game community, member of others
# - moderator.test: Moderator of Design community

# Access the dashboard:
# - URL: http://localhost:5173
# - Login: alice.test / test123 (or bob.test, moderator.test)

# To reset data:
# 1. Restart PDS: docker compose -f .devcontainer/docker-compose.yml restart pds
# 2. Restart server: Ctrl+C and pnpm --filter server dev
# 3. Run script again: ./scripts/load-test-data.sh
```

### Code Quality and Pre-commit Validation

**Automated quality gates** (enforced by pre-commit hooks):
- **Biome linting/formatting**: Auto-fixes staged files via lint-staged
- **TypeScript type checking**: Validates types across all workspaces (`pnpm -r typecheck`)
- **Configuration**: [.husky/pre-commit](.husky/pre-commit), [biome.json](biome.json), [package.json](package.json)
- **Bypassing validation**: Prohibited per Constitution Principle 9 (emergency bypasses require maintainer approval)

**Biome configuration** ([biome.json](biome.json)):
- Line width: 100 characters
- Indent: 2 spaces
- Quote style: Single quotes (JS), double quotes (JSX)
- Semicolons: Always
- Trailing commas: ES5
- Line ending: LF

**Manual validation**:
```bash
pnpm lint              # Check linting issues
pnpm lint:fix          # Auto-fix linting issues
pnpm format            # Auto-format code
pnpm format:check      # Check formatting only
pnpm -r typecheck      # Type check all workspaces
```

### Testing

**For detailed testing guide (local vs deployed, troubleshooting), see [TESTING.md](TESTING.md).**

```bash
# Run all workspace tests
pnpm -r test

# Server tests (uses @cloudflare/vitest-pool-workers)
pnpm --filter server test           # Run all server tests
pnpm --filter server test:watch     # Watch mode
pnpm --filter server test:pds       # PDS integration tests (requires local PDS)

# Client tests (uses MSW for API mocking)
pnpm --filter client test           # Run component tests with MSW
pnpm --filter client test:watch     # Watch mode
pnpm --filter client test:e2e       # E2E tests with Playwright (no MSW)

# Run specific test file
pnpm --filter server exec vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts

# Test environment differences:
# - Server tests: Real Miniflare environment (Durable Objects, Queue)
# - Client tests: MSW mocks API responses (client/tests/mocks/handlers.ts)
# - PDS tests: Real Bluesky PDS via DevContainer (vitest.pds.config.ts)
# - E2E tests: Real server + real PDS (Playwright)
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
  - [x] `net.atrarium.community.post` (community posts, custom Lexicon) - **014-bluesky**
  - [x] `net.atrarium.community.reaction` (post reactions with emoji) - **016-slack-mastodon-misskey**
  - [x] `net.atrarium.moderation.action` (moderation actions)
- [x] **PDS read/write service** (@atproto/api with AtpAgent - BskyAgent deprecated)
- [x] **Durable Objects architecture**
  - [x] CommunityFeedGenerator (per-community feed index with Storage API)
  - [x] FirehoseReceiver (Jetstream WebSocket → Queue, lightweight filter)
- [x] **Cloudflare Queues** (firehose-events, firehose-dlq, 5000 msg/sec)
- [x] **FirehoseProcessor Worker** (Queue consumer, heavyweight regex filter)
- [x] **API routes** (communities, memberships, moderation, reactions - write to PDS, proxy to DOs)
- [x] **Hashtag system** (system-generated `#atrarium_[0-9a-f]{8}`, unique per community)
- [x] **Moderation system** (hide posts, block users, role-based access)
- [x] **Authentication** (JWT with DID verification)
- [x] **Test suite** (contract + integration + unit tests)
- [x] **Component documentation** (consolidated from VitePress, organized by component)
- [x] **React dashboard** (Phase 0-1: full web UI with PDS integration)
- [x] **Local PDS integration** (DevContainer with Bluesky PDS for testing)
- [x] **Domain migration** (atrarium.net acquired, all references updated)
- [x] **Lexicon publication API** (010-lexicon: HTTP endpoints with ETag caching, beta status documented)
- [x] **Custom emoji reactions** (016-slack-mastodon-misskey: Slack/Mastodon/Misskey-style reactions)
  - [x] Backend: Reaction PDS methods, Durable Objects aggregation, API routes
  - [x] Frontend Components: ReactionBar, ReactionPicker, EmojiPicker (6 Unicode categories, 60+ emojis, search, custom emoji integration)
  - [x] Custom Emoji Management: CustomEmojiUpload, CustomEmojiList, EmojiApproval (upload, validation, approval queue)
  - [x] API Helpers: addReaction, removeReaction, listReactions, uploadEmoji, deleteEmoji, listEmojis, listUserEmojis, listPendingEmojis, approveEmoji
- [x] **oRPC Router Implementation** (018-api-orpc: Type-safe API migration) ✅ **COMPLETED**
  - [x] Posts API (create, list, get) - Fully migrated with contract tests
  - [x] Emoji API (upload, list, submit, listPending, approve, revoke, registry) - **Completed with base64 approach**
  - [x] Reactions API (add, remove, list) - Fully migrated with contract tests
  - [x] Moderation API fix (list with communityUri parameter)
  - [x] Contract tests (14 tests covering Posts, Emoji, Reactions, Moderation)
  - [x] Integration tests (Post creation flow, Emoji approval flow, Moderation list validation)
  - [x] Performance validation (p95 < 100ms target)
  - [x] Legacy route removal (Posts, Emoji routes deleted - SSE endpoint kept)
  - [x] Client integration (all TypeScript errors resolved, MSW mocks updated)
  - [x] Type safety validation (`pnpm -r typecheck` passes across all workspaces)

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

### oRPC Handler Pattern (018-api-orpc)
Standard pattern for implementing oRPC route handlers:

```typescript
// Example: Posts.create handler
export const router = {
  posts: {
    create: contract.posts.create.handler(async ({ input, context }) => {
      // 1. Extract context
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // 2. Business logic validation (e.g., membership check via Durable Object RPC)
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);
      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not a member of this community',
        });
      }

      // 3. PDS write operation
      const result = await atproto.createCommunityPost({
        $type: 'net.atrarium.group.post',
        text: input.text,
        communityId: input.communityId,
        createdAt: new Date().toISOString(),
      }, userDid);

      // 4. Return validated response (Zod schema ensures correctness)
      return {
        uri: result.uri,
        rkey: result.rkey,
        createdAt: new Date().toISOString(),
      };
    }),
  },
};
```

**Key Differences vs Legacy Hono Routes**:
- ✅ Automatic input/output validation via Zod schemas (no manual checks)
- ✅ Consistent error handling using `ORPCError` (no `c.json({ error }, status)`)
- ✅ Full type safety (input/output inferred from contract)
- ✅ Framework-agnostic (no Hono Context dependency)
- ✅ 20-30% less code due to automatic validation

**Common ORPCError Codes**:
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): User lacks required permissions
- `BAD_REQUEST` (400): Invalid input data
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource already exists
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

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
- `.specify/memory/constitution.md` - Project constitution v1.5.0 (10 principles)

**Workflow**:
1. `/specify` with feature description → generates `specs/{feature-id}/spec.md`
2. `/plan` → generates `specs/{feature-id}/plan.md` (validates against constitution)
3. `/tasks` → generates `specs/{feature-id}/tasks.md` (dependency-ordered)
4. `/implement` → executes tasks autonomously
5. `/analyze` → validates consistency across spec.md, plan.md, tasks.md

All outputs include Constitution Check section validating compliance with 10 principles.

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
- **Lexicon Collections**: `net.atrarium.community.config`, `net.atrarium.community.membership`, `net.atrarium.community.post`, `net.atrarium.moderation.action` - **006-pds-1-db + 014-bluesky**
- **Custom Post Lexicon** (014-bluesky): `net.atrarium.community.post` replaces `app.bsky.feed.post` for community posts, indexed via Firehose, stored in user PDSs
- **Feed Generator API Deprecation** (014-bluesky): Feed Generator API (`getFeedSkeleton`) being deprecated because Bluesky AppView cannot render custom Lexicon posts. Timeline fetching migrated to Dashboard API (`/api/communities/{id}/posts`). Legacy `app.bsky.feed.post` indexing continues for backward compatibility during transition period.
- **Lexicon Publication** (010-lexicon): Schemas published at `/xrpc/net.atrarium.lexicon.get?nsid={nsid}` with ETag caching (SHA-256, 1-hour beta period)

### Testing Strategy

**Server Tests** (uses `@cloudflare/vitest-pool-workers`):
- **Setup**: Durable Objects auto-provisioned on first use (no schema migrations)
- **Environment**: Real Miniflare with Durable Objects and Queue bindings ([wrangler.toml](wrangler.toml))
- **Mock Data**: Generated per-test in [tests/helpers/test-env.ts](tests/helpers/test-env.ts)
- **Test Types**:
  - Contract tests: API endpoint validation ([tests/contract/](tests/contract/))
  - Integration tests: End-to-end workflows ([tests/integration/](tests/integration/))
  - Unit tests: Isolated logic validation ([tests/unit/](tests/unit/))
  - PDS tests: Real Bluesky PDS via DevContainer ([tests/integration/pds-posting.test.ts](tests/integration/pds-posting.test.ts))

**Client Tests** (uses MSW + Testing Library):
- **Setup**: MSW server started in [tests/setup.ts](client/tests/setup.ts)
- **Mock Handlers**: API responses in [tests/mocks/handlers.ts](client/tests/mocks/handlers.ts)
- **Mock Data**: Communities, feeds, posts predefined in handlers
- **Test Types**:
  - Component tests: React component behavior with mocked API
  - E2E tests: Playwright with real server (no MSW)

**Test Data Loading**:
- **Development**: No pre-loaded data, use Dashboard UI or API to create test data
- **Server Tests**: Mock data generated per-test (`createMockEnv()`, `createMockJWT()`)
- **Client Tests**: MSW handlers return predefined mock data
- **PDS Tests**: DevContainer setup script creates accounts (alice.test, bob.test, moderator.test)

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
