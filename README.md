# Atrarium

**Small ecosystems on AT Protocol**

> ⚠️ **Status**: Under active development. Not ready for production use.

📖 **[Documentation](https://docs.atrarium.net)** | [日本語](https://docs.atrarium.net/ja/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Atrarium enables small & open communities (10-200 people) to operate sustainably on AT Protocol using serverless infrastructure and membership-based feed filtering.

**Problem**: Operating a Fediverse instance (Mastodon/Misskey) costs $30-150/month and requires 5 hours/week maintenance, leading to 50-70% of small instances closing within 1-2 years.

**Solution**: Leverage AT Protocol's decentralized identity and Cloudflare's serverless infrastructure to reduce costs by **95%** ($0.40-5/month) and time by **80%** (1 hour/week).

## Key Features

- 🌱 **Serverless Architecture**: Built on Cloudflare Workers + Durable Objects
- 🔓 **Decentralized Identity**: User data stored in Personal Data Servers (PDS) via AT Protocol
- 🎯 **Membership-Based Feeds**: Community-specific feeds with role-based access control
- 📱 **Bluesky Compatible**: Works with official Bluesky apps (iOS, Android, web)
- 🔌 **Protocol-First Design**: Community semantics defined in AT Protocol Lexicon schemas

## Unique Positioning

| Platform | Openness | Ops Burden | Membership Filtering |
|----------|----------|------------|----------------------|
| **Fediverse** | ✅ Open | ❌ High | ✅ Instance-level |
| **Discord** | ❌ Closed | ✅ Low | ✅ Server-level |
| **Bluesky** | ✅ Open | ✅ Low | ❌ No filtering |
| **Atrarium** | ✅ Open | ✅ Low | ✅ Feed-level |

## Architecture

AT Protocol Lexicon schemas define community data structures - implementations are reference only and fully replaceable.

**Design Philosophy**:
- **Protocol-First**: Community semantics defined in `net.atrarium.*` schemas
- **No Vendor Lock-In**: Lexicon schemas are the API contract; infrastructure is interchangeable
- **Economic Rationality**: Cloudflare chosen for 95% cost reduction, not architectural necessity

📖 See [Architecture Documentation](https://docs.atrarium.net/en/architecture/system-design.html) for technical details.

## Getting Started

```bash
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
pnpm install     # Install dependencies
pnpm -r dev      # Start development servers
pnpm -r test     # Run tests
```

📖 See [Setup Guide](https://docs.atrarium.net/en/guide/setup.html) for detailed instructions.

## Documentation

- 📖 **[Documentation Site](https://docs.atrarium.net)** - Complete guides (EN/JA)
- 🏗️ [Architecture](https://docs.atrarium.net/en/architecture/system-design.html) - System design and data flow
- 📋 [Lexicon Schemas](lexicons/README.md) - AT Protocol schema definitions
- 🔌 [API Reference](https://docs.atrarium.net/en/reference/api-reference.html) - Endpoints and usage
- 🤝 [Contributing](CONTRIBUTING.md) - Development guide