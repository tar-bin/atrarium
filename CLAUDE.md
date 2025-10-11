# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atrarium is a community management system built on AT Protocol (Bluesky), designed for small & open communities (10-200 people). It replaces expensive Mastodon/Misskey servers with a serverless architecture on Cloudflare Workers, reducing costs by 95% ($30-150/month → $0.40-5/month) and operational time by 80% (5 hours/week → 1 hour/week).

### Project Constitution

**All features MUST comply with the Project Constitution.**

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

### Language Policy

- **Code & Documentation**: Write all code, comments, commit messages, and documentation in English
- **Communication**: Respond to Japanese users in Japanese, others in their language
- **Identifiers**: Use English for all variable names, function names, and class names

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
- `lexicons/` - AT Protocol Lexicon schemas (protocol definition, implementation-agnostic)
- `shared/contracts/` - oRPC API contracts (@atrarium/contracts - type-safe RPC)
- `server/` - Cloudflare Workers backend (@atrarium/server)
- `client/` - React web dashboard (TanStack Router + Query + Table)

**Key Components**:
- **Lexicons** ([lexicons/README.md](lexicons/README.md)): `net.atrarium.*` schemas (community.config, community.membership, community.reaction, moderation.action)
- **Server** ([server/](server/)): Durable Objects (CommunityFeedGenerator, FirehoseReceiver), Queue consumers (FirehoseProcessor), oRPC router, AT Protocol client
- **Client** ([client/README.md](client/README.md)): React components, TanStack Router routes, i18next (EN/JA), PDS integration

**Documentation**:
- [README.md](README.md) - Project summary (English, source of truth)
- [CONCEPT.md](CONCEPT.md) - System design and architecture
- [QUICKSTART.md](QUICKSTART.md) - Getting started guide
- Component-specific docs in respective directories

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

## Quick Start Commands

**Most Common Tasks**:
```bash
# Development (start both server + client)
./start-dev.sh all              # Start PDS + Server + Client
./start-dev.sh                  # Start Client only (default)

# Testing
pnpm -r test                    # Run all tests
pnpm --filter server test       # Server tests only
pnpm --filter client test       # Client tests only

# Code Quality (runs automatically on pre-commit)
pnpm lint:fix                   # Auto-fix linting + formatting
pnpm -r typecheck               # Type check all workspaces

# Load test data (requires PDS + Server running)
./scripts/load-test-data.sh     # Creates alice.test, bob.test, moderator.test accounts
```

**Workspace Commands**:
```bash
pnpm --filter server <command>  # Run server command
pnpm --filter client <command>  # Run client command
pnpm -r <command>               # Run command in all workspaces
```

## Development Setup

### Initial Setup
```bash
pnpm install                     # Install all workspace dependencies
pnpm add -g wrangler            # Install Wrangler CLI (if needed)
wrangler login                  # Login to Cloudflare

# Create Cloudflare Queues (production only)
wrangler queues create firehose-events
wrangler queues create firehose-dlq
```

### Local Development with DevContainer
```bash
# Open in VS Code DevContainer (auto-starts local PDS)
# Services: PDS (localhost:3000), Server (localhost:8787), Client (localhost:5173)

./start-dev.sh all              # Start all services
./scripts/load-test-data.sh     # Load test accounts and data

# Test accounts: alice.test, bob.test, moderator.test (password: test123)
# Dashboard: http://localhost:5173
```

### Testing
```bash
pnpm -r test                    # All tests
pnpm --filter server test       # Server tests (Miniflare + Vitest)
pnpm --filter server test:pds   # PDS integration tests
pnpm --filter client test       # Client tests (MSW + Testing Library)
pnpm --filter client test:e2e   # E2E tests (Playwright)
```

### Code Quality (Pre-commit Hooks)
**Automated validation** (runs on `git commit`):
- Biome linting/formatting (auto-fix via lint-staged)
- TypeScript type checking (all workspaces)
- Bypassing hooks (`--no-verify`) prohibited per Constitution Principle 9

**Manual validation**:
```bash
pnpm lint:fix                   # Auto-fix linting + formatting
pnpm -r typecheck               # Type check all workspaces
```

### Deployment
```bash
# Server (Cloudflare Workers)
pnpm --filter server deploy
wrangler secret put JWT_SECRET

# Client (Cloudflare Pages via GitHub integration)
# Build command: cd client && pnpm install && pnpm run build
# Build output: client/dist
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

**Current Phase**: Phase 1 (PDS-First Architecture) - Ready for production deployment

**Completed Features**:
- Feed Generator API, AT Protocol Lexicon schemas (`net.atrarium.*`)
- PDS-First Architecture (Durable Objects + Queues, 7-day cache)
- oRPC type-safe API (Posts, Reactions, Emoji, Moderation)
- Custom emoji reactions (Slack/Mastodon/Misskey-style)
- Communities hierarchy API (stage transitions, parent/child relationships)
- React dashboard with PDS integration
- Local PDS testing environment (DevContainer)
- Comprehensive test suite (contract + integration + unit)

**Pending**:
- Production deployment (Cloudflare Workers + Durable Objects + Queues)
- Firehose connection monitoring and auto-reconnect
- Feed Generator registration in Bluesky AppView

**Future Phases**:
- Phase 1: Achievement system, automated feed archiving
- Phase 2: Dynamic feed mixing, community graduation/splitting

## Common Development Patterns

### Architecture Components
- **oRPC Router** ([server/src/router.ts](server/src/router.ts)): Type-safe API handlers (Posts, Reactions, Moderation, Emoji)
- **Durable Objects**: Per-community isolation (CommunityFeedGenerator, FirehoseReceiver)
- **Queue Processing**: FirehoseProcessor consumes batched events (100 msg/batch, 5s timeout)
- **AT Protocol Service** ([server/src/services/atproto.ts](server/src/services/atproto.ts)): PDS read/write operations
- **Validation**: Zod schemas in `shared/contracts/` and `server/src/schemas/`

### Authentication & Authorization
JWT-based authentication with DID verification:
- **Roles**: `owner` (full control), `moderator` (moderation), `member` (view only)
- **Middleware**: `authMiddleware()` in protected routes
- **Token format**: `{ iss, sub, aud, handle, iat, exp, jti }`

### Durable Objects Storage
- **Key prefixes**: `config:`, `member:`, `post:`, `moderation:`, `reaction:`
- **Post keys**: `post:<timestamp>:<rkey>` (chronological ordering)
- **Listing**: `storage.list({ prefix: 'post:', reverse: true })` (newest-first)
- **Cleanup**: Scheduled alarm (every 12 hours) deletes posts older than 7 days
- **Timestamps**: ISO 8601 strings (AT Protocol compatibility)

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

**Server Tests** (@cloudflare/vitest-pool-workers):
- **Environment**: Real Miniflare with Durable Objects and Queue bindings
- **Test Types**: Contract tests (API validation), Integration tests (end-to-end flows), Unit tests (isolated logic), PDS tests (real Bluesky PDS)
- **Mock Data**: Generated per-test in [server/tests/helpers/](server/tests/helpers/)

**Client Tests** (MSW + Testing Library):
- **Environment**: MSW mocks API responses, Testing Library for component tests
- **Test Types**: Component tests (React behavior), E2E tests (Playwright with real server)
- **Mock Data**: Predefined in [client/tests/mocks/handlers.ts](client/tests/mocks/handlers.ts)

**Test Data Loading**:
- **Development**: `./scripts/load-test-data.sh` creates test accounts and sample data
- **Tests**: Mock data generated per-test (server) or predefined in MSW handlers (client)

### Production Monitoring
```bash
wrangler tail --format pretty           # View live logs
wrangler tail --format json | grep "CommunityFeedGenerator"  # Monitor Durable Objects
```

### Cost Estimation
**Expected monthly cost for 1000 communities**: ~$0.40 (~95% reduction vs VPS)
- Workers Paid: $5/month (10M requests/month)
- Durable Objects: Included (400k requests/month free)
- Queues: ~$0.22/month (2.6M events/month)
- Storage: ~$0.18/month (10MB avg per community)
