# Atrarium

**Small ecosystems on AT Protocol**

English | [日本語](./README.ja.md)

Atrarium is a community management system built on the AT Protocol, designed to help small community managers (10-200 people) run sustainable, thriving communities without the operational burden of traditional federated servers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 🎯 What is Atrarium?

Atrarium liberates small community managers from the heavy operational costs and technical complexity of running Mastodon/Misskey servers, while preserving community independence.

### Key Features

- 🌱 **Zero Server Management**: Built on Cloudflare's serverless infrastructure
- 💰 **95% Cost Reduction**: From $30-150/month to just $5/month
- ⏱️ **80% Time Savings**: From 5 hours/week to 1 hour/week
- 🔓 **True Data Ownership**: Users own their data via DIDs
- 🌐 **Natural Discovery**: Connect with Bluesky's 30M+ users
- 🤖 **Automated Growth**: Smart community lifecycle management

---

## 🚨 The Problem We Solve

### Fediverse Small Server Crisis

Small Mastodon/Misskey servers (10-200 people) face critical challenges:

| Challenge | Impact |
|-----------|--------|
| **High operational costs** | $30-150/month + 5 hours/week |
| **Isolation and decline** | 50-70% close within 1-2 years |
| **Federation risks** | Can be cut off by large servers anytime |
| **Technical complexity** | DB corruption, SSL, updates, etc. |
| **Legal liability** | Individual operators bear all responsibility |

**Market Size**: 450-800 small instances in Japanese-speaking Fediverse, with 75,000-200,000 users

---

## 💡 How Atrarium Solves This

### Built on AT Protocol

Atrarium leverages AT Protocol's design to fundamentally solve these problems:

1. **Shared Infrastructure**: Cloudflare's stable platform eliminates server management
2. **Decentralized Identity (DID)**: Accounts are independent from servers, zero migration cost
3. **Custom Feeds**: Flexible community design without heavy implementation
4. **Bluesky Network**: Connect with 30M+ users for natural discovery

### Cost Comparison

| | Fediverse | Atrarium | Savings |
|---|-----------|----------|---------|
| **Monthly** | $30-150 | **$0.40-5** | **92-99%** |
| **Annually** | $360-1,800 | **$5-60** | **92-99%** |
| **Weekly Time** | 5 hours | **1 hour** | **80%** |

*Note: $0.40/month for 1000 communities (Durable Objects + Queues only), $5/month includes Workers Paid plan*

---

## 🏗️ Architecture (PDS-First)

```
PDS (Source of Truth)
  ↓ Firehose: Jetstream WebSocket
FirehoseReceiver (Durable Object)
  ↓ Lightweight filter: includes('#atr_')
Cloudflare Queue
  ↓ Batched: 100 msg/batch
FirehoseProcessor (Queue Consumer Worker)
  ↓ Heavyweight filter: regex /#atr_[0-9a-f]{8}/
CommunityFeedGenerator (Durable Object per community)
  ↓ Storage: config:, member:, post:, moderation:
Feed Generator API (getFeedSkeleton)
  ↓
Client (Bluesky AppView fetches post content)
```

**Key Principles**:
- **PDS as Source of Truth**: All community data stored in user PDSs via AT Protocol Lexicon
- **Durable Objects Storage**: Per-community feed index with 7-day retention
- **Queue-Based Processing**: Two-stage filtering for efficient Firehose ingestion
- **Zero Database Costs**: No D1/KV, only Durable Objects Storage (~$0.40/month for 1000 communities)

### Tech Stack

**Backend (Implemented)**:
- **Cloudflare Workers**: Serverless edge computing with Hono framework
- **oRPC**: Type-safe RPC with automatic OpenAPI generation (`@orpc/server`, `@orpc/openapi`)
- **Durable Objects**: Per-community feed generators with persistent Storage API
- **Cloudflare Queues**: Firehose event processing (5000 msg/sec capacity)
- **AT Protocol**: `@atproto/api` (AtpAgent), `@atproto/identity`
- **TypeScript 5.7**: Strict type safety with Zod validation
- **Vitest**: Testing with `@cloudflare/vitest-pool-workers`

**Frontend (Implemented)**:
- **React 19 + TypeScript**: Management dashboard with modern React
- **oRPC Client**: Type-safe API client with React Query integration (`@orpc/client`, `@orpc/react`)
- **TanStack Router**: File-based routing with type-safe params
- **TanStack Query**: Server state management with caching
- **shadcn/ui**: Accessible UI components (Radix UI + Tailwind CSS)
- **Vite**: Fast build tooling and HMR
- **Cloudflare Pages**: Dashboard hosting (free)

**External Services**:
- **AT Protocol**: `@atproto/api` (AtpAgent), `@atproto/identity`
- **Bluesky Firehose**: Jetstream WebSocket (real-time event streaming)
- **Local PDS**: DevContainer integration for testing

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account (Workers Paid plan - $5/month)
- Bluesky account

### Installation

```bash
# Clone the repository
git clone https://github.com/tar-bin/atrarium.git
cd atrarium

# Install dependencies
npm install

# Install Wrangler CLI (if not already installed)
npm install -g wrangler
wrangler login

# Create Cloudflare Queues (for Firehose processing)
wrangler queues create firehose-events
wrangler queues create firehose-dlq  # Dead letter queue

# Durable Objects are automatically provisioned on first deploy
# No database setup required (PDS-first architecture)

# Set secrets (for production deployment)
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE         # For PDS write operations
wrangler secret put BLUESKY_APP_PASSWORD   # For PDS write operations
```

### Development

```bash
# Run Workers locally (with Miniflare)
npm run dev

# Access API documentation (Swagger UI)
# Open http://localhost:8787/api/docs in your browser

# View OpenAPI specification
# http://localhost:8787/api/openapi.json

# Type checking
npm run typecheck

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Code quality
npm run lint
npm run format
```

### Deployment

```bash
# Deploy to Cloudflare Workers (includes Durable Objects + Queues)
npm run deploy

# View production logs
wrangler tail --format pretty

# Monitor Durable Objects
wrangler tail --format json | grep "CommunityFeedGenerator"

# Monitor Queue processing
wrangler tail --format json | grep "FirehoseProcessor"
```

### Dashboard Setup

The Atrarium Dashboard provides a web interface for managing communities, feeds, and moderation.

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env.development

# Edit .env.development with your configuration
# VITE_API_URL=http://localhost:8787
# VITE_PDS_URL=http://localhost:3000

# Start dashboard dev server
npm run dev
# Visit http://localhost:5173
```

**Dashboard Features:**
- 🏘️ Community management (create, view, settings)
- 📡 Feed management with unique hashtags
- ✍️ Post to feeds via local Bluesky PDS
- 🛡️ Content moderation (hide posts, block users)
- 📊 Moderation log and statistics
- 🌐 i18n support (English/Japanese)

For detailed dashboard documentation, see [dashboard/README.md](./dashboard/README.md).

### Testing with Local PDS

Atrarium uses a DevContainer with a local Bluesky PDS for testing:

```bash
# Open project in VS Code DevContainer
# PDS automatically starts at http://localhost:3000

# Setup test accounts
.devcontainer/setup-pds.sh

# Run PDS integration tests
npx vitest run tests/integration/pds-posting.test.ts
npx vitest run tests/integration/pds-to-feed-flow.test.ts
```

**Test data** is created dynamically via PDS write operations (no SQL seeds needed).

---

## 📖 Documentation

**[Documentation Site](https://docs.atrarium.net)** - Complete documentation (EN/JA)

### API Endpoints

**AT Protocol Feed Generator** (public):
- `GET /.well-known/did.json` - DID document (`did:web:atrarium.net`)
- `GET /xrpc/app.bsky.feed.describeFeedGenerator` - Feed generator metadata
- `GET /xrpc/app.bsky.feed.getFeedSkeleton` - Feed skeleton (post URIs, proxies to Durable Object)

**Dashboard API** (JWT authentication required):
- `POST /api/auth/login` - Login with Bluesky DID
- `GET /api/communities` - List communities (from Durable Objects)
- `POST /api/communities` - Create community (writes to PDS + creates Durable Object)
- `POST /api/communities/:id/memberships` - Join community (writes to PDS)
- `POST /api/moderation/hide` - Hide post (writes to PDS)
- `POST /api/moderation/block` - Block user (writes to PDS)

---

## 🎯 Use Cases

### Case 1: Migrating from Misskey

**Before:**
- 20-person programming community
- $45/month server costs
- 5 hours/week maintenance
- Fear of decline

**After:**
- $0.40-5/month stable operation (scale-dependent)
- < 1 hour/week management
- Discovery via Bluesky users
- Flexible DID-based migration

**Savings:** $475-1,740/year + 208 hours/year

### Case 2: Starting a New Community

**Traditional Challenges:**
- Technical barriers (Mastodon/Misskey setup)
- Difficulty acquiring initial members
- Operational cost concerns

**With Atrarium:**
- Zero technical barriers (Custom Feed creation only)
- Natural inflow from Bluesky
- Start with $0.40/month (scales to $5/month with Workers Paid)
- Gradual feature expansion as you grow

### Case 3: Small Community Ecosystem

**Value:**
- Multiple small communities interconnect
- Share moderation knowledge
- Distribute infrastructure costs
- Independent yet not isolated

---

## 🌟 Implemented Features

### 1. PDS-First Data Architecture ✅
- **AT Protocol Lexicon Schemas**: `net.atrarium.community.config`, `net.atrarium.community.membership`, `net.atrarium.moderation.action`
- **PDS as Source of Truth**: All community data stored in user PDSs
- **Durable Objects Storage**: Per-community feed index (7-day retention)
- **AtpAgent Integration**: PDS read/write operations via `@atproto/api`

### 2. Feed Generator & Firehose Processing ✅
- **AT Protocol Feed Generator**: DID document, getFeedSkeleton, describeFeedGenerator
- **FirehoseReceiver DO**: Jetstream WebSocket → Cloudflare Queue (lightweight filter)
- **FirehoseProcessor Worker**: Queue consumer with heavyweight regex filter
- **CommunityFeedGenerator DO**: Per-community feed index with RPC interface
- **Two-Stage Filtering**: `includes('#atr_')` → `regex /#atr_[0-9a-f]{8}/`

### 3. Community & Membership Management ✅
- **Hashtag System**: System-generated unique hashtags (`#atr_[0-9a-f]{8}`)
- **Role-Based Access**: Owner/Moderator/Member roles stored in PDS
- **Community Lifecycle**: Theme → Community → Graduated stages
- **Membership Records**: PDS-stored membership with Durable Object caching

### 4. Moderation System ✅
- **Hide/Unhide Posts**: Moderation actions stored in PDS
- **User Blocking**: Feed-level blocklist with moderation logs
- **Role Enforcement**: Only moderators/owners can moderate
- **Moderation History**: All actions tracked in `net.atrarium.moderation.action`

### 5. Security & Authentication ✅
- **JWT Authentication**: DID-based authentication for dashboard
- **Role-based Access Control**: Owner/Moderator/Member permissions
- **CORS Configuration**: Secure cross-origin requests
- **Lexicon Validation**: Zod schemas for all AT Protocol records

### 6. Testing & Documentation ✅
- **Contract Tests**: Durable Objects, Queue consumers, PDS operations
- **Integration Tests**: Queue-to-feed flow, PDS-to-feed flow
- **Local PDS Integration**: DevContainer with Bluesky PDS for testing
- **VitePress Documentation**: 20 pages (EN/JA) deployed to Cloudflare Pages

---

## 🗺️ Roadmap

### Phase 0: MVP ✅ (Completed)
- [x] AT Protocol Feed Generator API (DID, getFeedSkeleton, describeFeedGenerator)
- [x] AT Protocol Lexicon schemas (`net.atrarium.*`)
- [x] PDS read/write service (AtpAgent integration)
- [x] Hashtag-based community system (`#atr_[0-9a-f]{8}`)
- [x] Moderation system (hide posts, block users)
- [x] JWT authentication with DID verification
- [x] Comprehensive test suite (contract + integration + PDS tests)
- [x] VitePress documentation (20 pages, EN/JA)
- [x] React dashboard (Phase 0-1: community/feed/moderation UI)

### Phase 1: PDS-First Architecture ✅ (Completed - Feature 006-pds-1-db)
- [x] **Durable Objects Storage**: Per-community feed generators
- [x] **Cloudflare Queues**: Firehose event processing (5000 msg/sec)
- [x] **FirehoseReceiver DO**: Jetstream WebSocket → Queue
- [x] **FirehoseProcessor Worker**: Queue consumer with two-stage filtering
- [x] **CommunityFeedGenerator DO**: Per-community feed index with Storage API
- [x] **PDS Integration**: All writes go to PDS first, then indexed via Firehose
- [x] **Cost Optimization**: $0.40/month for 1000 communities (vs $5/month D1)

### Phase 2: Production Deployment (Next)
- [ ] **Firehose Connection Monitoring**: Auto-reconnect and health checks
- [ ] **Dashboard API Integration**: Update dashboard to use PDS-first endpoints
- [ ] **Production Deployment**: Deploy Durable Objects + Queues to Cloudflare
- [ ] **Feed Generator Registration**: Register in Bluesky AppView
- [ ] **Monitoring & Alerts**: Durable Objects + Queue metrics
- [ ] **Performance Optimization**: Feed generation < 200ms target

### Phase 3: Ecosystem & Scale (Future)
- [ ] **Achievement System**: User achievements stored in PDS
- [ ] **Dynamic Feed Mixing**: 80% own / 15% parent / 5% global
- [ ] **Starter Packs Integration**: Community onboarding
- [ ] **Analytics Dashboard**: Activity trends from Durable Objects data
- [ ] **Community Graduation**: Auto-promotion from theme to community
- [ ] **Advanced Moderation**: Reporting workflows, appeal system

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- **Code Style**: Follow existing TypeScript patterns (see [CLAUDE.md](./CLAUDE.md))
- **Testing**: Write tests for all new features using Vitest
  - Contract tests for Durable Objects, Queue consumers, API endpoints
  - Integration tests for PDS workflows
  - Use `@cloudflare/vitest-pool-workers` for Workers environment
- **Architecture**: PDS-first design (write to PDS, index via Firehose)
- **Types**: Define types in [src/types.ts](src/types.ts) and [src/schemas/lexicon.ts](src/schemas/lexicon.ts)
- **Documentation**: Update README, CLAUDE.md, and VitePress docs for major changes
- **Commits**: Atomic commits with clear messages

### Project Structure

```
src/
├── index.ts                # Main entry point (Hono router + DO/Queue bindings)
├── routes/                 # API route handlers (write to PDS, proxy to DOs)
├── durable-objects/        # Durable Objects (CommunityFeedGenerator, FirehoseReceiver)
├── workers/                # Queue Consumer Workers (FirehoseProcessor)
├── services/               # Business logic (AT Protocol client, auth)
├── schemas/                # Zod validation (Lexicon + API)
└── types.ts                # TypeScript type definitions

tests/
├── contract/               # API contract tests (DOs, Queues, endpoints)
├── integration/            # End-to-end workflow tests (PDS integration)
├── unit/                   # Unit tests (utilities, validators)
└── helpers/                # Test utilities and setup
```

---

## 📊 Project Status

- **Current Phase**: Phase 1 Complete (PDS-First Architecture) → Phase 2 (Production Deployment)
- **Backend**: ✅ Fully implemented (Durable Objects + Queues + AT Protocol integration)
- **Frontend**: ✅ Dashboard complete (React 19 + TanStack + shadcn/ui)
- **Architecture**: ✅ PDS-first with Durable Objects Storage (no D1/KV)
- **Tests**: ✅ Contract + Integration + Unit + PDS tests passing
- **Documentation**: ✅ [VitePress site](https://docs.atrarium.net) (20 pages, EN/JA)
- **Domain**: ✅ atrarium.net acquired and configured
- **Next Milestone**: Production deployment + Firehose connection
- **First Release Target**: Q2 2025

---

## 📚 Documentation

- **[Documentation Site](https://docs.atrarium.net)** - Complete documentation (EN/JA)
- **[CLAUDE.md](./CLAUDE.md)** - Development guide for Claude Code
- **[Project Overview](./docs/01-overview.md)** - Vision and design philosophy
- **[System Design](./docs/02-system-design.md)** - Architecture and database
- **[Implementation Plan](./docs/03-implementation.md)** - Week-by-week roadmap

---

## 💬 Community

- **GitHub**: [tar-bin/atrarium](https://github.com/tar-bin/atrarium)
- **Discussions**: [GitHub Discussions](https://github.com/tar-bin/atrarium/discussions)
- **Issues**: [GitHub Issues](https://github.com/tar-bin/atrarium/issues)
- **Bluesky**: [@atrarium.community](https://bsky.app/profile/atrarium.community)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built on [AT Protocol](https://atproto.com/) by Bluesky
- Powered by [Cloudflare Workers](https://workers.cloudflare.com/)
- Inspired by the challenges faced by Fediverse small server operators

---

## 📚 Related Projects

- [atproto](https://github.com/bluesky-social/atproto) - AT Protocol TypeScript implementation (used in this project)
- [feed-generator](https://github.com/bluesky-social/feed-generator) - Official Feed Generator starter kit
- [Hono](https://hono.dev/) - Ultrafast web framework for Cloudflare Workers

---

**Atrarium** - *Small ecosystems on AT Protocol*

Made with ❤️ for small community managers everywhere