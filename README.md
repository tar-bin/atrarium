# Atrarium

**Small ecosystems on AT Protocol**

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
| **High operational costs** | $2,000-10,000/month + 5 hours/week |
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
│  Cloudflare Workers     │ ← Feed Generator API
│  - Custom Feeds         │
│  - Filtering            │
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼──┐    ┌────▼─────┐
│ D1   │    │ Bluesky  │
│ Meta │    │ Firehose │
└──────┘    └──────────┘
```

### Tech Stack

- **Cloudflare Workers**: Serverless edge computing ($5/month)
- **D1 Database**: Serverless SQLite (free tier sufficient)
- **Durable Objects**: Firehose connection maintenance
- **React + Vite**: Management dashboard
- **Cloudflare Pages**: Dashboard hosting (free)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account (Workers Paid plan - $5/month)
- Bluesky account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/atrarium.git
cd atrarium

# Install dependencies
npm install

# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create atrarium-db

# Create KV namespace
wrangler kv:namespace create POST_CACHE

# Apply database schema
wrangler d1 execute atrarium-db --file=./schema.sql

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Deploy to Cloudflare Workers
npm run deploy
```

### Quick Start

```bash
# Run locally
npm run dev

# Deploy to production
npm run deploy

# View logs
wrangler tail
```

---

## 📖 Documentation

- [Project Overview & Design Philosophy](./docs/01-overview.md)
- [System Design](./docs/02-system-design.md)
- [Implementation Guide](./docs/03-implementation.md)
- [API Reference](./docs/api-reference.md)
- [Market Research](./docs/market-research.md)

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

## 🌟 Key Features

### 1. Custom Feed Generator
- Display community member posts
- Filter by hashtags/keywords
- AT Protocol standard Feed Generator API

### 2. Community Management
- Membership management (join/leave)
- Moderator permissions
- Post statistics and activity analysis

### 3. Automation
- Automatic detection and archiving of inactive communities
- Theme feed promotion suggestions
- Automatic handling when moderators are absent

### 4. Flexible Growth Model
- Theme Feeds (lightweight, trial)
- Sub-Communities (independent operation)
- Dynamic parent-child relationships

---

## 🗺️ Roadmap

### Phase 0: MVP (Weeks 1-16)
- [x] Project planning
- [x] Market research
- [ ] Basic Custom Feed implementation
- [ ] Simple dashboard
- [ ] First community migration

### Phase 1: Core Features (Months 3-10)
- [ ] Firehose integration
- [ ] Membership management
- [ ] Moderator functions
- [ ] Community directory

### Phase 2: Discovery (Months 11-18)
- [ ] Custom Feeds optimization
- [ ] Starter Packs strategy
- [ ] Dynamic mixing (80-15-5%)
- [ ] Analytics dashboard

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

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

---

## 📊 Project Status

- **Current Phase**: Phase 0 (MVP Development)
- **Status**: Active Development
- **First Release Target**: Q1 2026

---

## 💬 Community

- **Discussions**: [GitHub Discussions](https://github.com/yourusername/atrarium/discussions)
- **Issues**: [GitHub Issues](https://github.com/yourusername/atrarium/issues)
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

- [atproto](https://github.com/bluesky-social/atproto) - AT Protocol implementation
- [feed-generator](https://github.com/bluesky-social/feed-generator) - Feed Generator starter kit
- [indigo](https://github.com/bluesky-social/indigo) - Go implementation of atproto

---

**Atrarium** - *Small ecosystems on AT Protocol*

Made with ❤️ for small community managers everywhere