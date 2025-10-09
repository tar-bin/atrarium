# Atrarium

**Community Management System on AT Protocol**

> ⚠️ **Status**: Under active development. Not ready for production use.

📖 **Documentation**: Component-specific docs are located in respective directories:
- [Lexicons](/lexicons/README.md) - AT Protocol Lexicon schemas
- [Server](/server/README.md) - Backend server documentation
- [Client](/client/README.md) - Web dashboard documentation
- [Project Concept](/CONCEPT.md) - System design and architecture

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![AT Protocol](https://img.shields.io/badge/AT%20Protocol-Compatible-blue)](https://atproto.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Atrarium enables small & open communities (10-200 people) to operate sustainably on AT Protocol using serverless infrastructure and membership-based feed filtering.

**Problem**: Small community servers (Fediverse/Mastodon) face high operational costs and maintenance burden, leading many instances to close within 1-2 years.

**Solution**: Serverless architecture on AT Protocol eliminates server management while maintaining decentralized identity and data ownership.

📖 See [CONCEPT.md](/CONCEPT.md) for detailed analysis and cost comparisons.

## Core Features

- 🔌 **AT Protocol Lexicon Schemas**: Community semantics defined in `net.atrarium.*` schemas
- 🔓 **Decentralized Identity**: User data stored in Personal Data Servers (PDS)
- 🎯 **Membership-Based Feeds**: Community-specific feeds with role-based access control
- 😄 **Custom Emoji Reactions**: Slack/Mastodon/Misskey-style reactions with Unicode & custom emojis ([quickstart](specs/016-slack-mastodon-misskey/quickstart.md))
- 📱 **AT Protocol Compatible**: Works with any AT Protocol-compatible client (e.g., Bluesky apps)

## Unique Positioning

| Platform | Openness | Ops Burden | Membership Filtering |
|----------|----------|------------|----------------------|
| **Fediverse** | ✅ Open | ❌ High | ✅ Instance-level |
| **Discord** | ❌ Closed | ✅ Low | ✅ Server-level |
| **Bluesky** | ✅ Open | ✅ Low | ❌ No filtering |
| **Atrarium** | ✅ Open | ✅ Low | ✅ Feed-level |

## Architecture

Atrarium's value lies in AT Protocol Lexicon schemas (`net.atrarium.*`), not the implementation. Feed Generator and AppView are independent components that can be replaced as long as they conform to the Lexicon contracts.

**Design Philosophy**:
- **Protocol-First**: Community semantics defined in Lexicon schemas, implementations are replaceable
- **Component Independence**: Feed Generator and AppView operate independently via Lexicon contracts
- **No Vendor Lock-In**: Any AT Protocol-compatible server can implement these schemas

📖 See [CONCEPT.md](/CONCEPT.md) and [server/ARCHITECTURE.md](/server/ARCHITECTURE.md) for technical details.

## Project Structure

This project is a monorepo containing multiple components:

- **[lexicons/](lexicons/README.md)** - AT Protocol Lexicon schemas (`net.atrarium.*`)
- **[server/](server/README.md)** - Cloudflare Workers backend (Feed Generator API, Durable Objects)
- **[client/](client/README.md)** - React web dashboard (community management UI)

For detailed setup and usage instructions, see the respective README files in each directory.