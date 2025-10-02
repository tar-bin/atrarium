# Atrarium Implementation Guide

**Last Updated**: 2025-10-02
**Version**: 2.0

---

## Table of Contents

1. [Implementation Roadmap](#implementation-roadmap)
2. [Phase 0: MVP Implementation](#phase-0-mvp-implementation)
3. [Phase 1: Feature Expansion](#phase-1-feature-expansion)
4. [Phase 2: Ecosystem](#phase-2-ecosystem)
5. [Technical Stack Details](#technical-stack-details)
6. [Cost Estimation](#cost-estimation)
7. [Learning Resources](#learning-resources)

---

## 🗺️ Implementation Roadmap

### Overall Timeline

```
Phase 0: MVP Implementation (Week 1-16)
  → Basic Feed Generator, database setup

Phase 1: Feature Expansion (Month 3-10)
  → Membership management, moderation tools

Phase 2: Ecosystem (Month 11-18)
  → Community discovery, analytics
```

### Success Criteria

| Phase | Technical Success | User Adoption |
|-------|------------------|---------------|
| **Phase 0** | Uptime > 95% | System stable for 2 weeks |
| **Phase 1** | Stable operation | Active communities 3-5 |
| **Phase 2** | Scale handling | Communities 10+ |

---

## 🚀 Phase 0: MVP Implementation

**Duration**: Week 1-16
**Goal**: Minimal system with basic Custom Feed implementation

### Week 1-4: Learning and Setup

#### Learning Tasks (25 hours)

**AT Protocol (12 hours)**
- [ ] Official documentation review (5 hours)
  - https://atproto.com/docs
  - Protocol overview, DID, Lexicon
- [ ] Feed Generator Starter Kit analysis (5 hours)
  - https://github.com/bluesky-social/feed-generator
  - Code reading, local execution
- [ ] Firehose mechanism understanding (2 hours)
  - WebSocket connection, CAR format

**Cloudflare (13 hours)**
- [ ] Workers basics (4 hours)
  - https://developers.cloudflare.com/workers/
  - Hello World, deployment
- [ ] D1 Database (3 hours)
  - https://developers.cloudflare.com/d1/
  - Schema creation, query execution
- [ ] Durable Objects (4 hours)
  - https://developers.cloudflare.com/durable-objects/
  - WebSocket examples
- [ ] KV (1 hour)
  - https://developers.cloudflare.com/kv/
- [ ] Practical tutorial (1 hour)

#### Setup Tasks (5 hours)

- [ ] Create Cloudflare account (10 min)
- [ ] Register Workers Paid ($5/month) (5 min)
- [ ] Install Wrangler CLI (5 min)
  ```bash
  npm install -g wrangler
  wrangler login
  ```
- [ ] Create D1 Database (30 min)
  ```bash
  wrangler d1 create atrarium-db
  ```
- [ ] Create KV Namespace (10 min)
  ```bash
  wrangler kv:namespace create POST_CACHE
  ```
- [ ] Domain setup (1 hour)
- [ ] GitHub repository creation (10 min)
- [ ] Development environment setup (2 hours)

---

### Week 5-8: Foundation Building

#### Task List (30 hours)

**Apply D1 Schema (2 hours)**
- [ ] communities table
- [ ] theme_feeds table
- [ ] memberships table
- [ ] post_index table

```bash
wrangler d1 execute atrarium-db --file=./schema.sql
```

**Feed Generator Implementation (10 hours)**
- [ ] Create Workers script
- [ ] Implement getFeedSkeleton API
- [ ] Implement D1 queries
- [ ] Implement JWT authentication
- [ ] Implement Rate Limiting

**Basic Filtering (8 hours)**
- [ ] Hashtag filter
- [ ] Keyword filter
- [ ] Membership check

**Testing and Debugging (10 hours)**
- [ ] Local testing (Miniflare)
- [ ] Production deployment
- [ ] Bluesky app verification

---

### Week 9-12: Firehose Integration

#### Task List (35 hours)

**Durable Objects Implementation (15 hours)**
- [ ] Create FirehoseConsumer class
- [ ] WebSocket connection management
- [ ] Reconnection logic (exponential backoff)
- [ ] Error handling

```javascript
export class FirehoseConsumer {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.buffer = [];
  }

  async fetch(request) {
    // Establish WebSocket connection
    const firehose = new WebSocket(
      'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos'
    );

    firehose.onmessage = async (event) => {
      await this.handlePost(event.data);
    };

    return new Response(null, { status: 101 });
  }
}
```

**Post Filtering (10 hours)**
- [ ] CAR format parsing
- [ ] Filter condition checking
- [ ] Matching determination

**Batch Processing to D1 (10 hours)**
- [ ] Buffering (100 items)
- [ ] Save to KV (7-day TTL)
- [ ] Update D1 index
- [ ] Update statistics (batch)

---

### Week 13-16: Dashboard and Testing

#### Task List (30 hours)

**React Dashboard (20 hours)**
- [ ] Vite + React setup
- [ ] Tailwind CSS configuration
- [ ] Community list page
- [ ] Theme feed creation form
- [ ] Statistics display
- [ ] Moderation screen

**Cloudflare Pages Deployment (2 hours)**
```bash
wrangler pages project create
wrangler pages deploy ./dist
```

**Production Testing and Debugging (8 hours)**
- [ ] Migration test
- [ ] Test with actual posts
- [ ] Performance measurement
- [ ] Bug fixes

---

## 🔧 Phase 1: Feature Expansion

**Duration**: Month 3-10
**Goal**: Community management feature implementation

### Implementation Features

#### Membership Management (Week 1-4)

- [ ] Join/leave API
- [ ] Member-only feeds
- [ ] Member list page
- [ ] Invitation feature

#### Achievement System (Week 5-8)

- [ ] Achievement definitions (achievements table)
- [ ] Unlock condition checking
- [ ] Notification system
- [ ] Badge display UI
- [ ] Profile page

#### Long-term Inactivity Handling (Week 9-12)

- [ ] 90/105/120 day warnings
- [ ] Last activity recording
- [ ] Auto-transfer processing
- [ ] Vacation mode (optional)

#### Moderation Tools (Week 13-16)

- [ ] Moderator addition/removal
- [ ] Activity logging
- [ ] Report handling
- [ ] Ban management

---

## 🌐 Phase 2: Ecosystem

**Duration**: Month 11-18
**Goal**: Community discovery and growth

### Implementation Features (Optional)

#### Community Discovery (Month 11-12)

- [ ] Recommended communities feed
- [ ] Category-based listing
- [ ] Search functionality
- [ ] Trending display

#### Lineage Tree Display (Month 13-14)

- [ ] Parent-child relationship visualization
- [ ] Lineage graph with D3.js
- [ ] Inter-community links

#### Analytics Dashboard (Month 15-16)

- [ ] DAU/MAU trend graphs
- [ ] Post count trends
- [ ] User growth rate
- [ ] Engagement metrics

#### Enhanced Moderation Tools (Month 17-18)

- [ ] Auto spam detection
- [ ] Report management
- [ ] Ban list sharing
- [ ] Moderation logs

---

## 💻 Technical Stack Details

### Cloudflare Workers Configuration

#### wrangler.toml

```toml
name = "atrarium"
main = "src/index.js"
compatibility_date = "2024-10-01"

# Durable Objects
[durable_objects]
bindings = [
  { name = "FIREHOSE_CONSUMER", class_name = "FirehoseConsumer" }
]

[[migrations]]
tag = "v1"
new_classes = ["FirehoseConsumer"]

# KV Namespace
[[kv_namespaces]]
binding = "POST_CACHE"
id = "your-kv-namespace-id"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "atrarium-db"
database_id = "your-d1-database-id"

# Environment Variables
[vars]
JWT_SECRET = "your-jwt-secret"
```

### Project Structure

```
atrarium/
├── src/
│   ├── index.js              # Workers entry point
│   ├── firehose.js           # Durable Objects
│   ├── feed-generator.js     # Feed API
│   ├── filters.js            # Filtering logic
│   ├── auth.js               # JWT authentication
│   └── utils.js              # Utilities
├── dashboard/                # React dashboard
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
├── schema.sql                # D1 schema
├── wrangler.toml             # Cloudflare config
├── package.json
└── README.md
```

---

## 💰 Cost Estimation

### Annual Cost (Confirmed)

| Year | Phase | DAU | Workers | D1 | KV | Domain | Annual |
|------|-------|-----|---------|----|----|--------|--------|
| **Year 1** | 0 | ~100 | $60 | $0 | $0 | $3 | **$63** |
| **Year 2** | 1 | ~500 | $60 | $0 | $4 | $3 | **$67** |
| **Year 3** | 2 | ~2,000 | $60 | $0 | $27 | $3 | **$90** |

**3-year total: $220 (~$33,000)**

### Comparison with Traditional Cloud

| Item | Traditional Cloud | Cloudflare | Reduction |
|------|------------------|------------|-----------|
| Year 1 | $252 | **$63** | **75%** |
| Year 2 | $504 | **$67** | **87%** |
| Year 3 | $756 | **$90** | **88%** |
| **3-year** | **$1,512** | **$220** | **85.5%** |

---

## 📚 Learning Resources

### AT Protocol

#### Official Documentation
- [AT Protocol Docs](https://atproto.com/docs) - Protocol overview
- [Lexicon Documentation](https://atproto.com/specs/lexicon) - Schema definition
- [Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds) - Custom feed creation

#### Community
- [ATProto Discord](https://discord.gg/atproto) - Developer community
- [Bluesky GitHub](https://github.com/bluesky-social) - Official repositories

#### Libraries
- [@atproto/api](https://www.npmjs.com/package/@atproto/api) - TypeScript SDK
- [feed-generator](https://github.com/bluesky-social/feed-generator) - Starter Kit

---

### Cloudflare

#### Official Documentation
- [Workers](https://developers.cloudflare.com/workers/) - Serverless functions
- [D1](https://developers.cloudflare.com/d1/) - SQLite database
- [KV](https://developers.cloudflare.com/kv/) - Key-Value Store
- [Durable Objects](https://developers.cloudflare.com/durable-objects/) - Stateful processing
- [Pages](https://developers.cloudflare.com/pages/) - Static sites

#### Tutorials
- [Build a Blog](https://developers.cloudflare.com/workers/tutorials/build-a-blog/) - Workers + D1
- [WebSocket Chat](https://developers.cloudflare.com/durable-objects/examples/websocket-chat/) - Durable Objects

---

### React/Frontend

#### Frameworks
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide React](https://lucide.dev/) - Icons

#### Libraries
- [Recharts](https://recharts.org/) - Charts
- [React Router](https://reactrouter.com/) - Routing

---

## ✅ Checklist

### Pre-Start Preparation

- [ ] Create Cloudflare account
- [ ] Register Workers Paid ($5/month)
- [ ] Prepare domain (existing or new purchase)
- [ ] Install Node.js 18+
- [ ] Git/GitHub account
- [ ] 10-15 hours/week availability

---

### Phase 0 Completion

- [ ] Workers deployment successful
- [ ] D1 database operational
- [ ] Firehose connection stable
- [ ] Feed Generator functional
- [ ] Dashboard accessible
- [ ] System stable for 2 weeks
- [ ] GitHub repository public

---

### Phase 1 Transition Decision

- [ ] Phase 0 success (all above cleared)
- [ ] Time availability (10+ hours/week)
- [ ] External interest (GitHub stars 5+)

---

## 🚀 Next Actions

### This Week

1. **Create Cloudflare Account** (10 min)
   - https://dash.cloudflare.com/

2. **Register Workers Paid** (5 min)
   - $5/month payment setup

3. **Install Wrangler CLI** (5 min)
   ```bash
   npm install -g wrangler
   wrangler login
   ```

4. **Workers Basic Tutorial** (1 hour)
   - https://developers.cloudflare.com/workers/get-started/guide/

5. **D1 Tutorial** (1 hour)
   - https://developers.cloudflare.com/d1/get-started/

6. **Start AT Protocol Documentation** (2 hours)
   - https://atproto.com/docs

---

### Next Week

- Feed Generator Starter Kit code reading
- D1 database creation and schema application
- Start minimal Workers implementation

---

**Document Complete**
