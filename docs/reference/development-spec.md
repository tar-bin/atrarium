# Atrarium Development Specification
**Version**: 1.0
**Date**: 2025-10-02
**For**: Development Reference

---

## 📋 Project Overview

### Project Name
**Atrarium** - AT Protocol Community System

### Description
Community management system for small communities (10-200 people) on AT Protocol. Reduces operational burden by 95% from Mastodon/Misskey servers, achieving stable operation at $5/month.

### Goals
- Phase 0 (Week 1-16): Basic Custom Feed implementation and first community migration
- Reduce operational burden for existing Mastodon/Misskey server administrators
- Integration with Bluesky ecosystem

---

## 🏗️ System Architecture

### Tech Stack

```yaml
Backend:
  - Platform: Cloudflare Workers
  - Language: TypeScript
  - Database: Cloudflare D1 (SQLite)
  - Cache: Cloudflare KV
  - Realtime: Durable Objects

Frontend:
  - Framework: React 18
  - Build Tool: Vite
  - Styling: Tailwind CSS
  - Hosting: Cloudflare Pages

External:
  - AT Protocol: @atproto/api
  - Bluesky Firehose: WebSocket
```

### Architecture Diagram

```
┌─────────────────────────────────────┐
│  Client (React Dashboard)           │
│  - Cloudflare Pages                 │
└─────────────┬───────────────────────┘
              │ HTTPS
              ↓
┌─────────────────────────────────────┐
│  Cloudflare Workers                 │
│  - Feed Generator API               │
│  - Community Management API         │
│  - Authentication                   │
└─────┬───────────────┬───────────────┘
      │               │
      ↓               ↓
┌──────────┐    ┌─────────────────────┐
│ D1       │    │ Durable Objects     │
│ Database │    │ - Firehose Consumer │
└──────────┘    └──────────┬──────────┘
                           │ WebSocket
                           ↓
                    ┌──────────────────┐
                    │ Bluesky Firehose │
                    │ bsky.network     │
                    └──────────────────┘
```

---

## 📊 Database Design

### Table List

#### 1. `communities`
Community basic information

```sql
CREATE TABLE communities (
  id TEXT PRIMARY KEY,              -- Community ID
  name TEXT NOT NULL,               -- Name
  description TEXT,                 -- Description
  stage TEXT NOT NULL,              -- 'theme' | 'community' | 'graduated'
  parent_id TEXT,                   -- Parent community ID
  relationship TEXT,                -- 'child' | 'independent'
  feed_mix TEXT,                    -- JSON: Feed composition ratio
  member_count INTEGER DEFAULT 0,   -- Member count
  post_count INTEGER DEFAULT 0,     -- Post count
  created_at INTEGER NOT NULL,      -- Created timestamp
  graduated_at INTEGER              -- Graduated timestamp
);
```

#### 2. `theme_feeds`
Theme feed information

```sql
CREATE TABLE theme_feeds (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',     -- 'active' | 'warning' | 'archived'
  filter_config TEXT,               -- JSON: Filter settings
  health_metrics TEXT,              -- JSON: Health metrics
  created_at INTEGER NOT NULL,
  archived_at INTEGER,
  archived_reason TEXT
);
```

#### 3. `memberships`
Membership information

```sql
CREATE TABLE memberships (
  community_id TEXT,
  user_did TEXT,                    -- AT Protocol DID
  role TEXT DEFAULT 'member',       -- 'member' | 'moderator' | 'owner'
  joined_at INTEGER NOT NULL,
  last_activity_at INTEGER,
  PRIMARY KEY (community_id, user_did)
);
```

#### 4. `post_index`
Post index

```sql
CREATE TABLE post_index (
  uri TEXT PRIMARY KEY,             -- AT Protocol URI
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN DEFAULT 0
);
```

---

## 🔌 API Design

### Feed Generator API (AT Protocol Standard)

#### `GET /.well-known/did.json`
Get DID document

**Response:**
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.net",
  "service": [
    {
      "id": "#bsky_fg",
      "type": "BskyFeedGenerator",
      "serviceEndpoint": "https://atrarium.net"
    }
  ]
}
```

#### `GET /xrpc/app.bsky.feed.getFeedSkeleton`
Get feed skeleton

**Parameters:**
- `feed`: string - Feed URI (e.g., `at://did:plc:xxx/app.bsky.feed.generator/feed-id`)
- `cursor`: string (optional) - For pagination
- `limit`: integer (optional, default: 50) - Number of items

**Response:**
```json
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" },
    { "post": "at://did:plc:zzz/app.bsky.feed.post/www" }
  ],
  "cursor": "1696291200"
}
```

### Community Management API

#### `POST /api/communities`
Create community

**Request:**
```json
{
  "name": "Web Development Community",
  "description": "React/Vue/Angular etc.",
  "stage": "community",
  "parent_id": "prog-general"
}
```

**Response:**
```json
{
  "id": "web-dev-comm",
  "name": "Web Development Community",
  "stage": "community",
  "created_at": 1696291200
}
```

#### `GET /api/communities/:id`
Get community

**Response:**
```json
{
  "id": "web-dev-comm",
  "name": "Web Development Community",
  "stage": "community",
  "member_count": 45,
  "post_count": 230
}
```

#### `POST /api/communities/:id/join`
Join community

**Headers:**
- `Authorization`: Bearer {JWT}

**Response:**
```json
{
  "success": true,
  "membership": {
    "community_id": "web-dev-comm",
    "user_did": "did:plc:xxx",
    "role": "member",
    "joined_at": 1696291200
  }
}
```

#### `POST /api/theme-feeds`
Create theme feed

**Request:**
```json
{
  "community_id": "web-dev-comm",
  "name": "React Related",
  "filter_config": {
    "hashtags": ["#React", "#ReactJS"],
    "keywords": ["React", "hooks"]
  }
}
```

---

## 🔐 Authentication & Authorization

### JWT Authentication

**Flow:**
1. User logs in with Bluesky account
2. Verify AT Protocol DID
3. Issue JWT token
4. Use token for subsequent requests

**JWT Payload:**
```json
{
  "did": "did:plc:xxx",
  "handle": "user.bsky.social",
  "iat": 1696291200,
  "exp": 1696377600
}
```

### Role Management

| Role | Permissions |
|--------|------|
| **owner** | Full control (community deletion, owner transfer) |
| **moderator** | Moderation, member management |
| **member** | View posts, leave community |

---

## 🎨 Frontend Design

### Page Structure

```
/                     # Home (community list)
/community/:id        # Community detail
/community/:id/feed   # Feed display
/community/:id/settings  # Settings (owner/moderator only)
/theme-feeds          # Theme feed list
/theme-feeds/new      # Create theme feed
/settings             # User settings
```

### Main Components

#### `CommunityList.tsx`
Display community list

**Props:**
```typescript
interface CommunityListProps {
  communities: Community[];
  onSelect: (id: string) => void;
}
```

#### `ThemeFeedForm.tsx`
Theme feed creation form

**Props:**
```typescript
interface ThemeFeedFormProps {
  communityId: string;
  onSubmit: (data: ThemeFeedData) => Promise<void>;
}
```

#### `FeedViewer.tsx`
Feed display

**Props:**
```typescript
interface FeedViewerProps {
  feedId: string;
  showControls?: boolean;
}
```

---

## 🔄 Data Flow

### Post Processing Flow

```
1. Bluesky Firehose
   ↓ WebSocket
2. Durable Object (FirehoseConsumer)
   ↓ Filtering
3. Identify matching feeds
   ↓
4. Save post index to D1
   ├─ post_index table
   └─ Update statistics
   ↓
5. Cache post content to KV (7 days)
   └─ key: post URI
       value: post data
```

### Feed Retrieval Flow

```
1. Client → Workers
   GET /xrpc/app.bsky.feed.getFeedSkeleton
   ↓
2. Get URI list from D1
   SELECT uri FROM post_index
   WHERE feed_id = ? ORDER BY created_at DESC
   ↓
3. Return URI list
   ↓
4. Client → Bluesky AppView
   Fetch actual post content
```

---

## 🎯 Phase 0 Implementation Scope

### Required Features (Week 1-16)

#### Week 1-4: Foundation
- [x] Project setup
- [ ] Create D1 database
- [ ] Basic Workers implementation
- [ ] DID document generation

#### Week 5-8: Feed Generator Implementation
- [ ] Implement `getFeedSkeleton` API
- [ ] Basic filtering (hashtags)
- [ ] Save index to D1
- [ ] Local testing

#### Week 9-12: Firehose Integration
- [ ] Implement Durable Objects
- [ ] WebSocket connection management
- [ ] Post filtering
- [ ] Batch save to D1

#### Week 13-16: Dashboard
- [ ] React basic structure
- [ ] Community list
- [ ] Theme feed creation form
- [ ] Deploy and test

### Not Implementing in Phase 0
- ❌ Membership management (Phase 1)
- ❌ Achievement system (Phase 1)
- ❌ Auto-archiving (Phase 1)
- ❌ Membrane model (Phase 2)
- ❌ Cell division feature (Phase 2)

---

## 📝 Type Definitions

### TypeScript Main Types

```typescript
// Community
interface Community {
  id: string;
  name: string;
  description: string | null;
  stage: 'theme' | 'community' | 'graduated';
  parent_id: string | null;
  relationship: 'child' | 'independent' | null;
  feed_mix: FeedMix;
  member_count: number;
  post_count: number;
  created_at: number;
  graduated_at: number | null;
}

// Feed Mix
interface FeedMix {
  own: number;     // Own community (0.8)
  parent: number;  // Parent community (0.15)
  global: number;  // Bluesky global (0.05)
}

// Theme Feed
interface ThemeFeed {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'warning' | 'archived';
  filter_config: FilterConfig;
  health_metrics: HealthMetrics;
  created_at: number;
  archived_at: number | null;
  archived_reason: string | null;
}

// Filter Config
interface FilterConfig {
  hashtags?: string[];
  keywords?: string[];
  authors?: string[];  // DIDs
}

// Health Metrics
interface HealthMetrics {
  last_post_at: number;
  posts_last_7days: number;
  dau: number;  // Daily Active Users
  mau: number;  // Monthly Active Users
}

// Membership
interface Membership {
  community_id: string;
  user_did: string;
  role: 'member' | 'moderator' | 'owner';
  joined_at: number;
  last_activity_at: number | null;
}

// Post Index
interface PostIndex {
  uri: string;              // at://did:plc:xxx/app.bsky.feed.post/yyy
  feed_id: string;
  author_did: string;
  created_at: number;
  has_media: boolean;
}

// AT Protocol Post
interface ATProtoPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
    langs?: string[];
    facets?: any[];
    reply?: any;
    embed?: any;
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Filtering logic
- Feed composition calculation
- JWT generation/verification

### Integration Tests
- Feed Generator API
- D1 database operations
- Firehose connection

### E2E Tests (Phase 1 and later)
- Community creation flow
- Member join flow
- Feed display

---

## 🚀 Deployment Procedures

### Development Environment
```bash
# Local development
npm run dev

# Insert test data
wrangler d1 execute atrarium-db --file=./seeds/test-data.sql
```

### Production Environment
```bash
# Production deploy
npm run deploy

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD

# Check logs
wrangler tail
```

---

## 📊 Monitoring

### Metrics to Monitor
- Workers execution time
- D1 query time
- Firehose connection status
- Error rate
- Feed generation latency

### Cloudflare Analytics
- Request count
- Error rate
- CPU time
- KV operations count

---

## 🔒 Security Considerations

### Must Implement
- JWT signature verification
- DID verification
- Rate Limiting (100req/hour/user)
- CORS settings
- Input validation

### Phase 1 and Later
- CSRF token
- XSS protection
- SQL Injection protection (use prepared statements)

---

## 📈 Performance Targets

| Metric | Target |
|------|------|
| Feed generation time | < 200ms |
| API response time | < 100ms (p95) |
| Workers uptime | > 99.9% |
| D1 query time | < 50ms |
| KV access time | < 10ms |

---

## 🎯 Success Criteria (Phase 0)

### Technical Success
- ✅ System runs stably for 2 weeks
- ✅ Feed Generator API works properly
- ✅ Firehose connection is stable

### User Adoption
- ✅ Own community (8-15 people) migrated
- ✅ Continued use for 2 weeks

### Personal Satisfaction
- ✅ Development process is interesting
- ✅ Learning goals achieved

---

## 📚 References

- [AT Protocol Documentation](https://atproto.com/docs)
- [Bluesky Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)

---

**This specification is a complete design document for development in cooperation with Claude Code**
