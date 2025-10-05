# Atrarium

**Small ecosystems on AT Protocol**

📖 **[Documentation](https://docs.atrarium.net)** | [日本語ドキュメント](https://docs.atrarium.net/ja/)

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

### Quick Start

```bash
# Clone and install
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
npm install

# Development
npm run dev          # Start Workers locally
npm test             # Run tests
npm run typecheck    # Type checking
```

For detailed setup instructions, see the [**Getting Started Guide**](https://docs.atrarium.net/guide/getting-started.html).

---

## 📖 Documentation

**[📚 Documentation Site](https://docs.atrarium.net)** - Complete guides and API reference (EN/JA)

- [Getting Started](https://docs.atrarium.net/guide/getting-started.html)
- [Architecture Overview](https://docs.atrarium.net/architecture/)
- [API Reference](https://docs.atrarium.net/reference/api.html)
- [Development Guide](https://docs.atrarium.net/guide/development.html)

---

## 🎯 Use Cases

Atrarium helps small communities (10-200 people) reduce costs by **92-99%** while maintaining independence.

- **Migration from Fediverse**: Move from Mastodon/Misskey without data loss or user friction
- **New Communities**: Start with $0.40/month, scale to $5/month with growth
- **Community Networks**: Connect multiple small communities with shared infrastructure

See [Use Cases](https://docs.atrarium.net/guide/use-cases.html) for detailed examples.

---

## 🌟 Features

### Core Functionality ✅
- **PDS-First Architecture**: All data stored in user Personal Data Servers
- **Feed Generator**: AT Protocol-compliant custom feeds
- **Firehose Processing**: Real-time post indexing via Cloudflare Queues
- **Community Management**: Hashtag-based communities with role-based access
- **Moderation**: Hide posts, block users, moderation logs
- **Dashboard**: React web UI for community/feed/moderation management

See [Architecture](https://docs.atrarium.net/architecture/) for technical details.

---

## 🗺️ Roadmap

- **Phase 0-1** ✅ MVP & PDS-First Architecture (Completed)
- **Phase 2** 🚧 Production Deployment (In Progress)
- **Phase 3** 📅 Ecosystem & Scale (Planned)

See the [Roadmap](https://docs.atrarium.net/guide/roadmap.html) for details.

---

## 🤝 Contributing

Contributions are welcome! See the [Contributing Guide](https://docs.atrarium.net/guide/contributing.html) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

---

## 📊 Project Status

- **Phase**: Phase 1 Complete → Phase 2 (Production Deployment)
- **Release Target**: Q2 2025
- **Tech Stack**: Cloudflare Workers + Durable Objects + AT Protocol

See [Project Status](https://docs.atrarium.net/guide/project-status.html) for details.

---

## 💬 Community & Support

- **GitHub**: [tar-bin/atrarium](https://github.com/tar-bin/atrarium)
- **Discussions**: [GitHub Discussions](https://github.com/tar-bin/atrarium/discussions)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Atrarium** - *Small ecosystems on AT Protocol*

Built with [AT Protocol](https://atproto.com/) • Powered by [Cloudflare Workers](https://workers.cloudflare.com/)