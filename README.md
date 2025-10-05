# Atrarium

**Small ecosystems on AT Protocol**

> ⚠️ **Status**: Under active development. Not ready for production use.

📖 **[Documentation](https://docs.atrarium.net)** | [日本語](https://docs.atrarium.net/ja/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Atrarium enables small & open communities (10-200 people) to operate sustainably on Bluesky using serverless infrastructure and membership-based feed filtering.

**Problem**: Operating a Fediverse instance (Mastodon/Misskey) costs $30-150/month and requires 5 hours/week maintenance, leading to 50-70% of small instances closing within 1-2 years.

**Solution**: Leverage AT Protocol's decentralized identity and Cloudflare's serverless infrastructure to reduce costs by **95%** ($0.40-5/month) and time by **80%** (1 hour/week).

## Key Features

- 🌱 **Zero Server Management**: Cloudflare Workers + Durable Objects
- 💰 **95% Cost Reduction**: $30-150/month → $0.40-5/month
- 🔓 **Decentralized Identity**: Users own data via DIDs (portable across services)
- 🎯 **Membership Filtering**: Community-specific feeds with role-based access
- 📱 **Bluesky Compatible**: Works with official Bluesky apps (iOS, Android, web)

## Unique Positioning

| Platform | Openness | Ops Burden | Membership Filtering |
|----------|----------|------------|----------------------|
| **Fediverse** | ✅ Open | ❌ High | ✅ Instance-level |
| **Discord** | ❌ Closed | ✅ Low | ✅ Server-level |
| **Bluesky** | ✅ Open | ✅ Low | ❌ No filtering |
| **Atrarium** | ✅ Open | ✅ Low | ✅ Feed-level |

## Architecture

PDS-First architecture: All community data stored in user Personal Data Servers, indexed in Durable Objects for 7-day feeds.

```
PDS (Source of Truth) → Firehose → Queue → CommunityFeedGenerator (DO) → Feed API
```

**Tech Stack**: Cloudflare Workers, Durable Objects, AT Protocol, React 19, TanStack Router/Query, shadcn/ui

See [Architecture Docs](https://docs.atrarium.net/architecture/) for details.

## Getting Started

```bash
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
npm install
npm run dev          # Start Workers locally
npm test             # Run tests
```

📖 [Full Getting Started Guide](https://docs.atrarium.net/guide/getting-started.html)

## Documentation

- **[Documentation Site](https://docs.atrarium.net)** - Complete guides (EN/JA)
- [Architecture](https://docs.atrarium.net/architecture/)
- [API Reference](https://docs.atrarium.net/reference/api.html)
- [Contributing Guide](https://docs.atrarium.net/guide/contributing.html)

## Roadmap

- ✅ **Phase 1**: PDS-First Architecture (Complete)
- 🚧 **Phase 2**: Production Deployment (In Progress)
- 📅 **Phase 3**: Ecosystem & Scale (Q2 2025)

[Full Roadmap](https://docs.atrarium.net/guide/roadmap.html)

## License

MIT License - see [LICENSE](LICENSE)

---

Built with [AT Protocol](https://atproto.com/) • Powered by [Cloudflare Workers](https://workers.cloudflare.com/)