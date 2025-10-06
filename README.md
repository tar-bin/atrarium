# Atrarium

**Small ecosystems on AT Protocol**

> ⚠️ **Status**: Under active development. Not ready for production use.

📖 **[Documentation](https://docs.atrarium.net)** | [日本語](https://docs.atrarium.net/ja/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Atrarium enables small & open communities (10-200 people) to operate sustainably on AT Protocol using serverless infrastructure and membership-based feed filtering.

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

**Core Value**: AT Protocol Lexicon schemas define community data structures. All implementations (client/server) are reference implementations and fully replaceable.

PDS-First architecture: All community data stored in user Personal Data Servers, indexed in Durable Objects for 7-day feeds.

```
PDS (Source of Truth) → Firehose → Queue → CommunityFeedGenerator (DO) → Feed API
```

**Tech Stack**: Cloudflare Workers (chosen for economic efficiency, not lock-in), Durable Objects, AT Protocol, React 19, TanStack Router/Query, shadcn/ui

### Design Philosophy

1. **Protocol-First**: Community semantics defined in AT Protocol Lexicon (`net.atrarium.*` schemas)
2. **Implementation Agnostic**: Current Cloudflare Workers stack is a reference implementation - can be replaced with any AT Protocol-compatible server
3. **No Vendor Lock-In**: Lexicon schemas are the API contract; infrastructure is interchangeable
4. **Economic Rationality**: Cloudflare chosen for 95% cost reduction, not architectural necessity

See [Architecture Docs](https://docs.atrarium.net/architecture/) for details.

## Getting Started

```bash
git clone https://github.com/tar-bin/atrarium.git
cd atrarium
npm install          # Install all workspace dependencies (server, client, docs)
npm run dev          # Start server (Cloudflare Workers)
npm test             # Run all workspace tests
npm run build        # Build all workspaces
```

**Workspace structure**:
- `server/` - Cloudflare Workers backend
- `client/dashboard/` - React web dashboard
- `docs/` - VitePress documentation site
- `lexicons/` - AT Protocol Lexicon schemas

📖 [Full Getting Started Guide](https://docs.atrarium.net/guide/getting-started.html)

### Lexicon Schemas

Atrarium publishes AT Protocol Lexicon schemas at public HTTP endpoints:

```bash
# Fetch community config schema
curl https://atrarium.net/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config

# Available schemas:
# - net.atrarium.community.config (community metadata)
# - net.atrarium.community.membership (user memberships)
# - net.atrarium.moderation.action (moderation actions)
```

See [lexicons/README.md](lexicons/README.md) for schema documentation and versioning policy.

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