# Atrarium Server

Cloudflare Workers backend for Atrarium - AT Protocol Feed Generator with Durable Objects and Queue-based Firehose processing.

## Overview

The Atrarium server provides:
- **AT Protocol Feed Generator API** (getFeedSkeleton, describeFeedGenerator, DID document)
- **Community Management API** (create, list, manage communities via PDS)
- **Membership Management API** (join, leave, role management via PDS)
- **Moderation API** (hide posts, block users via PDS)
- **Lexicon Publication API** (serve AT Protocol schemas with ETag caching)
- **Firehose Processing** (Jetstream WebSocket → Queue → Durable Objects)

**Architecture**: PDS-first with Durable Objects Storage (7-day feed cache)

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript 5.7, Node.js via nodejs_compat)
- **Routing**: Hono ^4.6.14 (HTTP framework)
- **Validation**: Zod ^4.1.11 (schema validation)
- **RPC**: oRPC ^1.9.3 (type-safe API contracts)
- **Storage**: Durable Objects Storage (per-community isolation)
- **Queue**: Cloudflare Queues (Firehose event processing, 5000 msg/sec)
- **AT Protocol**: @atproto/api ^0.13.35 (AtpAgent), @atproto/identity ^0.4.3
- **Testing**: Vitest ^2.1.8 with @cloudflare/vitest-pool-workers

## Architecture

### Data Flow (PDS-First)

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

### Key Components

**Durable Objects**:
- `CommunityFeedGenerator` - Per-community feed index (isolated storage)
- `FirehoseReceiver` - Jetstream WebSocket connection + lightweight filtering

**Queue Consumer Workers**:
- `FirehoseProcessor` - Heavyweight regex filtering + feed indexing

**API Routes**:
- `/xrpc/app.bsky.feed.getFeedSkeleton` - Feed Generator API
- `/xrpc/app.bsky.feed.describeFeedGenerator` - Feed metadata
- `/.well-known/did.json` - DID document
- `/xrpc/net.atrarium.lexicon.get` - Lexicon publication endpoint
- `/api/*` - Community, membership, moderation APIs

## Project Structure

```
server/
├── src/
│   ├── index.ts              # Main entry point (Hono router, bindings)
│   ├── router.ts             # oRPC route handlers
│   ├── routes/               # API route handlers
│   │   ├── feed-generator.ts # AT Protocol Feed Generator API
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── communities.ts    # Community management
│   │   ├── memberships.ts    # Membership management
│   │   ├── moderation.ts     # Moderation API
│   │   └── lexicon.ts        # Lexicon publication endpoints
│   ├── durable-objects/      # Durable Objects
│   │   ├── community-feed-generator.ts  # Per-community feed index
│   │   └── firehose-receiver.ts         # Firehose WebSocket → Queue
│   ├── workers/              # Queue Consumer Workers
│   │   └── firehose-processor.ts        # Queue → CommunityFeedGenerator
│   ├── services/             # Business logic
│   │   ├── atproto.ts        # AT Protocol client (PDS read/write)
│   │   └── auth.ts           # JWT authentication
│   ├── schemas/              # Validation schemas
│   │   ├── generated/        # Auto-generated TypeScript from lexicons/
│   │   ├── validation.ts     # Zod schemas
│   │   └── lexicon.ts        # AT Protocol Lexicon validation
│   ├── utils/                # Utilities
│   │   ├── did.ts            # DID resolution
│   │   └── hashtag.ts        # Feed hashtag generation
│   └── types.ts              # TypeScript type definitions
├── tests/                    # Test suite
│   ├── contract/             # API contract tests
│   ├── integration/          # Integration tests
│   ├── unit/                 # Unit tests
│   └── helpers/              # Test utilities
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Vitest configuration (main)
└── vitest.pds.config.ts      # Vitest configuration (PDS integration)
```

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account with Workers enabled
- Wrangler CLI (`pnpm add -g wrangler`)

### Installation

```bash
# Install dependencies (from root)
pnpm install

# Login to Cloudflare
wrangler login
```

### Create Cloudflare Resources

```bash
# Create Cloudflare Queues
wrangler queues create firehose-events
wrangler queues create firehose-dlq  # Dead letter queue

# Durable Objects are automatically provisioned on first deploy
```

### Environment Variables

Set secrets via Wrangler CLI:

```bash
# JWT secret for authentication
wrangler secret put JWT_SECRET

# Optional: Bluesky credentials for testing
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD
```

## Development

### Start Development Server

```bash
# From root directory
pnpm --filter server dev

# Or from server directory
cd server
pnpm dev
```

Starts Miniflare local server at `http://localhost:8787`

**Local Development Features**:
- In-memory Durable Objects simulation
- In-memory Queue simulation
- CORS enabled for dashboard development
- Hot reload on file changes

**Note**: Firehose WebSocket connection requires production deployment. Use PDS integration tests for local development.

### Run Tests

```bash
# Run all tests
pnpm --filter server test

# Run tests in watch mode
pnpm --filter server test:watch

# Run PDS integration tests (requires DevContainer)
pnpm --filter server test:pds

# Run specific test file
pnpm --filter server exec vitest run tests/contract/feed-generator/get-feed-skeleton.test.ts
```

### Type Checking

```bash
pnpm --filter server typecheck
```

### Generate TypeScript from Lexicons

```bash
pnpm --filter server codegen
```

Generates TypeScript types from `lexicons/*.json` to `src/schemas/generated/`

## Deployment

### Deploy to Production

```bash
# Dry-run (build only, no deploy)
pnpm --filter server build

# Deploy to Cloudflare Workers
pnpm --filter server deploy
```

### Set Production Secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD
```

### Monitor Production

```bash
# View live logs
wrangler tail

# View logs with formatting
wrangler tail --format pretty

# Filter by Durable Object
wrangler tail --format json | grep "CommunityFeedGenerator"

# Filter by Queue Consumer
wrangler tail --format json | grep "FirehoseProcessor"
```

## Testing Strategy

**Test Suite** (Vitest + @cloudflare/vitest-pool-workers):
- **Contract Tests**: API endpoint validation ([tests/contract/](tests/contract/))
- **Integration Tests**: End-to-end workflows ([tests/integration/](tests/integration/))
- **Unit Tests**: Isolated logic validation ([tests/unit/](tests/unit/))
- **PDS Integration**: Real Bluesky PDS testing in DevContainer ([vitest.pds.config.ts](vitest.pds.config.ts))

**Test Environment**:
- Durable Objects auto-provisioned on first use
- Queue bindings configured in [wrangler.toml](wrangler.toml)
- No schema migrations needed (schema-less storage)

## API Documentation

### AT Protocol Feed Generator

**`GET /.well-known/did.json`**
Returns DID document identifying this feed generator.

**`GET /xrpc/app.bsky.feed.getFeedSkeleton`**
Returns feed skeleton (post URIs only).
- Params: `feed` (feed URI), `cursor` (optional), `limit` (optional, default 50)
- Returns: `{ feed: [{ post: "at://..." }], cursor?: "..." }`

**`GET /xrpc/app.bsky.feed.describeFeedGenerator`**
Returns feed metadata.

### Lexicon Publication

**`GET /xrpc/net.atrarium.lexicon.get`**
Returns AT Protocol Lexicon schemas.
- Params: `nsid` (Lexicon NSID, e.g., `net.atrarium.community.config`)
- Returns: Lexicon JSON schema
- Headers: `ETag` (SHA-256 content hash), `Cache-Control: public, max-age=3600` (beta period)

### Community Management

**`POST /api/communities`**
Create community (writes to PDS + creates Durable Object).

**`GET /api/communities`**
List communities.

**`GET /api/communities/:id`**
Get community details.

### Membership Management

**`POST /api/communities/:id/join`**
Join community (writes to PDS).

**`POST /api/communities/:id/leave`**
Leave community (writes to PDS).

### Moderation

**`POST /api/moderation/hide`**
Hide post (writes to PDS + updates Durable Object).

**`POST /api/moderation/block`**
Block user (writes to PDS).

## Configuration

### wrangler.toml

Key configuration in [wrangler.toml](wrangler.toml):

```toml
# Durable Objects
[[durable_objects.bindings]]
name = "COMMUNITY_FEED"
class_name = "CommunityFeedGenerator"

[[durable_objects.bindings]]
name = "FIREHOSE_RECEIVER"
class_name = "FirehoseReceiver"

# Cloudflare Queues
[[queues.producers]]
binding = "FIREHOSE_EVENTS"
queue = "firehose-events"

[[queues.consumers]]
queue = "firehose-events"
max_batch_size = 100
max_batch_timeout = 5
max_retries = 3
dead_letter_queue = "firehose-dlq"

# Scheduled cleanup (7-day retention)
[triggers]
crons = ["0 */12 * * *"]  # Every 12 hours
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Feed generation | < 200ms |
| API response (p95) | < 100ms |
| Workers uptime | > 99.9% |
| Durable Object read | < 10ms |
| Queue throughput | 5000 msg/sec |
| Post indexing latency | < 5s (Firehose → queryable) |

## Cost Estimation

**Expected monthly cost for 1000 communities**: ~$0.40

Breakdown:
- **Workers Paid**: $5/month (includes 10M requests/month)
- **Durable Objects**: Included in Workers Paid (400k requests/month free, then $0.15/million)
- **Queues**: ~$0.22/month (2000 events/sec × 2.6M events/month at $0.40/million writes)
- **Storage**: ~$0.18/month (1000 communities × 10MB avg × $0.20/GB/month)

## Troubleshooting

### Durable Objects not responding

Check Durable Object logs:
```bash
wrangler tail --format pretty | grep "CommunityFeedGenerator"
```

### Queue processing delays

Check Queue consumer logs:
```bash
wrangler tail --format pretty | grep "FirehoseProcessor"
```

Monitor dead letter queue:
```bash
wrangler queues consumer add firehose-dlq
```

### PDS connection fails

Verify PDS URL and credentials:
```bash
echo $PDS_URL
wrangler secret list
```

### Tests fail with binding errors

Ensure `wrangler.toml` has correct Durable Object and Queue bindings.

## Links

**Project Documentation**:
- [Main README](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Development guidelines

**Component READMEs**:
- [lexicons/](../lexicons/README.md) - AT Protocol Lexicon schemas
- [client/](../client/README.md) - React web dashboard

**AT Protocol**:
- [AT Protocol Documentation](https://atproto.com/docs)
- [AT Protocol Lexicon Schemas](https://atproto.com/specs/lexicon)
- [Bluesky Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds)

**Cloudflare**:
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Queues Documentation](https://developers.cloudflare.com/queues/)

## Contributing

See [CLAUDE.md](../CLAUDE.md) for development guidelines and project conventions.

## License

Same as main project (see root LICENSE).
