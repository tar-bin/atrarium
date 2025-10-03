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
| **Monthly** | $30-150 | **$5** | **85-95%** |
| **Annually** | $360-1,800 | **$60** | **85-95%** |
| **Weekly Time** | 5 hours | **1 hour** | **80%** |

---

## 🏗️ Architecture

```
┌─────────────────────────┐
│  Cloudflare Workers     │ ← Feed Generator API (Hono)
│  - AT Protocol Endpoints│    • /.well-known/did.json
│  - Dashboard API        │    • /xrpc/app.bsky.feed.*
│  - Scheduled Jobs       │    • /api/* (Dashboard)
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼──┐    ┌────▼─────┐
│ D1   │    │ KV Cache │
│ DB   │    │ (7 days) │
└──────┘    └──────────┘
```

### Tech Stack

**Backend (Implemented)**:
- **Cloudflare Workers**: Serverless edge computing with Hono framework
- **D1 Database**: SQLite database (6 tables with indexes)
- **KV Namespace**: Post metadata cache (7-day TTL)
- **TypeScript 5.7**: Strict type safety with Zod validation
- **Vitest**: Testing with `@cloudflare/vitest-pool-workers`

**Frontend (Pending)**:
- **React + Vite**: Management dashboard (not yet implemented)
- **Cloudflare Pages**: Dashboard hosting (free)

**External Services**:
- **AT Protocol**: `@atproto/api`, `@atproto/xrpc-server`, `@atproto/identity`
- **Bluesky Firehose**: WebSocket (Durable Objects integration pending)

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

# Create Cloudflare resources
wrangler d1 create atrarium-db
wrangler kv:namespace create POST_CACHE

# Update wrangler.toml with generated IDs
# Uncomment [[d1_databases]] and [[kv_namespaces]] sections
# Add database_id and namespace id from above commands

# Apply database schema
wrangler d1 execute atrarium-db --file=./schema.sql

# Set secrets (for production deployment)
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE      # Optional
wrangler secret put BLUESKY_APP_PASSWORD # Optional
```

### Development

```bash
# Run Workers locally (with Miniflare)
npm run dev

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
# Deploy to Cloudflare Workers
npm run deploy

# View production logs
wrangler tail

# Query production database
wrangler d1 execute atrarium-db --command "SELECT * FROM communities LIMIT 5"
```

---

## 📖 Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guide for Claude Code
- [Project Overview & Design Philosophy](./docs/01-overview.md)
- [System Design](./docs/02-system-design.md)
- [Implementation Guide](./docs/03-implementation.md)
- [API Reference](./docs/api-reference.md)
- [Market Research](./docs/market-research.md)

### API Endpoints

**AT Protocol Feed Generator**:
- `GET /.well-known/did.json` - DID document
- `GET /xrpc/app.bsky.feed.describeFeedGenerator` - Feed generator description
- `GET /xrpc/app.bsky.feed.getFeedSkeleton` - Feed skeleton (post URIs)

**Dashboard API** (requires JWT authentication):
- `POST /api/auth/login` - Login with Bluesky DID
- `GET /api/communities` - List communities
- `POST /api/communities` - Create community
- `GET /api/communities/:id/theme-feeds` - List theme feeds
- `POST /api/communities/:id/theme-feeds` - Create theme feed
- `POST /api/posts` - Submit post to index
- `POST /api/communities/:id/memberships` - Join community

---

## 🎯 Use Cases

### Case 1: Migrating from Misskey

**Before:**
- 20-person programming community
- $45/month server costs
- 5 hours/week maintenance
- Fear of decline

**After:**
- $5/month stable operation
- < 1 hour/week management
- Discovery via Bluesky users
- Flexible DID-based migration

**Savings:** $480/year + 208 hours/year

### Case 2: Starting a New Community

**Traditional Challenges:**
- Technical barriers (Mastodon/Misskey setup)
- Difficulty acquiring initial members
- Operational cost concerns

**With Atrarium:**
- Zero technical barriers (Custom Feed creation only)
- Natural inflow from Bluesky
- Start with $5/month
- Gradual feature expansion as you grow

### Case 3: Small Community Ecosystem

**Value:**
- Multiple small communities interconnect
- Share moderation knowledge
- Distribute infrastructure costs
- Independent yet not isolated

---

## 🌟 Implemented Features

### 1. AT Protocol Feed Generator ✅
- **DID Document**: `did:web` based identification
- **Feed Skeleton API**: Returns post URIs for custom feeds
- **Feed Description**: Metadata for feed discovery
- Fully compliant with AT Protocol Feed Generator specification

### 2. Community Management ✅
- **Create Communities**: Theme → Community → Graduated stages
- **Membership System**: Owner/Moderator/Member roles
- **Theme Feeds**: Multiple feeds per community
- **Health Metrics**: 7-day post count and active user tracking
- **Parent-Child Relationships**: Hierarchical community structure

### 3. Post Indexing ✅
- **Submit Posts**: Index AT-URIs to feeds
- **KV Cache**: 7-day TTL for post metadata
- **Multi-language Support**: BCP-47 language codes
- **Media Detection**: Track posts with media attachments

### 4. Automation (Scheduled Jobs) ✅
- **Post Deletion Sync**: Remove deleted posts from Bluesky (every 12 hours)
- **Feed Health Check**: Update activity metrics and status
- **Inactivity Detection**: Auto-archive inactive feeds (active → warning → archived)

### 5. Security & Authentication ✅
- **JWT Authentication**: DID-based authentication for dashboard
- **Role-based Access Control**: Owner/Moderator/Member permissions
- **CORS Configuration**: Secure cross-origin requests
- **Prepared Statements**: SQL injection prevention

### 6. Testing ✅
- **Contract Tests**: API endpoint validation (Dashboard + Feed Generator)
- **Integration Tests**: End-to-end workflows
- **Cloudflare Workers Environment**: Testing with `@cloudflare/vitest-pool-workers`

---

## 🗺️ Roadmap

### Phase 0: MVP ✅ (Completed)
- [x] Project planning and market research
- [x] D1 database schema (6 tables with indexes)
- [x] AT Protocol Feed Generator API
- [x] Community and theme feed management
- [x] Membership system with role-based access
- [x] Post indexing with KV cache
- [x] JWT authentication with DID verification
- [x] Scheduled jobs (post sync, health checks)
- [x] Comprehensive test suite (contract + integration)

### Phase 1: Production Ready (Next)
- [ ] **React Dashboard**: UI for community/feed management
- [ ] **Firehose Integration**: Real-time post indexing via Durable Objects
- [ ] **Production Deployment**: Cloudflare Workers + Pages deployment
- [ ] **Monitoring & Alerts**: Error tracking and performance monitoring
- [ ] **Achievement System**: User achievements and gamification
- [ ] **Community Directory**: Discover and browse communities

### Phase 2: Ecosystem & Scale (Future)
- [ ] **Dynamic Feed Mixing**: 80% own / 15% parent / 5% global
- [ ] **Starter Packs Integration**: Community onboarding
- [ ] **Analytics Dashboard**: Activity trends and insights
- [ ] **Community Graduation**: Auto-promotion from theme to community
- [ ] **Moderation Tools**: Advanced moderation workflows

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
  - Contract tests for API endpoints
  - Integration tests for workflows
- **Database**: Always use prepared statements for D1 queries
- **Types**: Define types in [src/types.ts](src/types.ts) (Entity + Row + API)
- **Documentation**: Update README and CLAUDE.md for major changes
- **Commits**: Atomic commits with clear messages

### Project Structure

```
src/
├── index.ts           # Main entry point (Hono router + scheduled jobs)
├── routes/            # API route handlers
├── models/            # Database models (D1 queries)
├── services/          # Business logic (AT Protocol, auth, cache)
├── schemas/           # Zod validation schemas
└── types.ts           # TypeScript type definitions

tests/
├── contract/          # API contract tests
├── integration/       # End-to-end workflow tests
└── helpers/           # Test utilities and setup
```

---

## 📊 Project Status

- **Current Phase**: Phase 0 → Phase 1 Transition
- **Backend**: ✅ Implemented and tested (all core APIs working)
- **Frontend**: 🚧 Dashboard pending implementation
- **Database**: ✅ Schema complete (6 tables, all migrations done)
- **Tests**: ✅ 11 test files passing (contract + integration)
- **Deployment**: 🚧 Production configuration pending
- **Documentation**: ✅ [VitePress documentation site](https://atrarium-docs.pages.dev) (English + Japanese)
- **First Release Target**: Q2 2025

---

## 📚 Documentation

- **[Documentation Site](https://atrarium-docs.pages.dev)** - Complete documentation (EN/JA)
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