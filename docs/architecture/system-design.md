# Atrarium System Design

**Last Updated**: 2025-10-02
**Version**: 2.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Design](#database-design)
4. [API Design](#api-design)
5. [Lifecycle Specifications](#lifecycle-specifications)
6. [Achievement System](#achievement-system)
7. [Owner Absence Handling](#owner-absence-handling)
8. [Security & Authentication](#security--authentication)

---

## 🏗️ Architecture Overview

### Overall Structure

```
┌──────────────────────────────────────────┐
│  Cloudflare Workers                      │
│  - Feed Generator API                    │
│  - Filtering Logic                       │
│  - Authentication & Authorization        │
└──────────────┬───────────────────────────┘
               │
        ┌──────┴────────┐
        │               │
┌───────▼──────┐  ┌────▼─────────────┐
│ Cloudflare   │  │  Bluesky          │
│ Workers KV   │  │  Firehose         │
│ - Post cache │  │  - Post stream    │
│               │  │  - Free           │
│ Cloudflare   │  └───────────────────┘
│ D1 Database  │           │
│ - Metadata   │           ↓
│ - Settings   │  ┌───────────────────────┐
└──────────────┘  │  User's PDS           │
       ↑          │  - Post data          │
       │          │  - Media blobs        │
┌──────┴──────┐  │  - True data owner    │
│  Durable    │  └───────────────────────┘
│  Objects    │
│ - Firehose  │
│   connection│
└─────────────┘
```

### Design Principles

#### 1. Complete PDS Dependency
- No media storage needed (no R2)
- Don't save post content
- Only save URIs (references)

#### 2. Respect for Data Ownership
```
Data owner = User
This system = Index provider

→ If PDS disappears, data also disappears
→ This is a "specification", not a "bug"
```

#### 3. Minimal Storage
- Cache for 7 days only
- Auto-delete expired items
- Zero storage cost

---

## 💻 Technology Stack

### Cloudflare Stack

#### Cloudflare Workers
- Serverless functions running at the edge
- **Required**: Workers Paid ($5/month)
- Reason: Required for Durable Objects

#### Cloudflare D1
- SQLite-based serverless database
- Free tier: 5GB, 5M reads/day, 100k writes/day
- Purpose: Metadata, settings, statistics

#### Cloudflare Workers KV
- Key-Value Store
- Used in Phase 2 onwards
- Purpose: Post cache (7 days)

#### Durable Objects
- WebSocket connection maintenance (for Firehose)
- CPU time 30 seconds (included in Workers Paid)

#### Cloudflare Pages
- Static site hosting
- Free tier: Unlimited requests
- Purpose: React dashboard

---

## 💾 Database Design

### D1 Schema

#### Communities Table

```sql
CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Stage
  stage TEXT NOT NULL CHECK(stage IN ('theme', 'community', 'graduated')),

  -- Relationships
  parent_id TEXT,
  relationship TEXT CHECK(relationship IN ('child', 'independent')),

  -- Feed configuration (JSON)
  feed_mix TEXT DEFAULT '{"own":0.8,"parent":0.15,"global":0.05}',

  -- Statistics
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at INTEGER NOT NULL,
  graduated_at INTEGER,

  FOREIGN KEY (parent_id) REFERENCES communities(id)
);

CREATE INDEX idx_communities_parent ON communities(parent_id);
CREATE INDEX idx_communities_stage ON communities(stage);
```

#### Theme Feeds Table

```sql
CREATE TABLE theme_feeds (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'warning', 'archived')),

  -- Filter settings (JSON)
  filter_config TEXT,
  -- Example: {"hashtags":["#webdev"],"keywords":["React","Vue"]}

  -- Health metrics (JSON)
  health_metrics TEXT,
  -- Example: {"last_post_at":1696291200,"posts_last_7days":45,"dau":8,"mau":50}

  -- Timestamps
  created_at INTEGER NOT NULL,
  archived_at INTEGER,
  archived_reason TEXT,

  FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE INDEX idx_feeds_community ON theme_feeds(community_id);
CREATE INDEX idx_feeds_status ON theme_feeds(status);
```

#### Memberships Table

```sql
CREATE TABLE memberships (
  community_id TEXT,
  user_did TEXT,
  role TEXT DEFAULT 'member' CHECK(role IN ('member', 'moderator', 'owner')),

  -- Timestamps
  joined_at INTEGER NOT NULL,
  last_activity_at INTEGER,

  PRIMARY KEY (community_id, user_did),
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE INDEX idx_memberships_user ON memberships(user_did);
CREATE INDEX idx_memberships_role ON memberships(community_id, role);
```

#### Moderators Table

```sql
CREATE TABLE moderators (
  community_id TEXT,
  did TEXT,
  role TEXT CHECK(role IN ('owner', 'moderator', 'helper')),

  -- Vacation mode
  vacation_mode BOOLEAN DEFAULT FALSE,
  vacation_start INTEGER,
  vacation_end INTEGER,
  temporary_deputy TEXT,
  temporary_owner BOOLEAN DEFAULT FALSE,
  original_role TEXT,

  -- Activity
  last_activity_at INTEGER,
  actions_last_7days INTEGER DEFAULT 0,
  actions_last_30days INTEGER DEFAULT 0,
  inactivity_warning_sent_at INTEGER,

  -- Timestamps
  added_at INTEGER NOT NULL,
  added_by TEXT,

  PRIMARY KEY (community_id, did),
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE INDEX idx_moderators_activity ON moderators(last_activity_at);
```

#### Post Index Table

```sql
-- D1: Index for time-series ordering
CREATE TABLE post_index (
  uri TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  author_did TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  has_media BOOLEAN DEFAULT 0,

  FOREIGN KEY (feed_id) REFERENCES theme_feeds(id)
);

CREATE INDEX idx_post_feed_time ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_post_author ON post_index(author_did);
```

#### Achievements Table

```sql
CREATE TABLE achievements (
  user_did TEXT,
  achievement_id TEXT,

  -- Metadata
  community_id TEXT,
  unlocked_at INTEGER NOT NULL,

  PRIMARY KEY (user_did, achievement_id)
);

CREATE INDEX idx_achievements_user ON achievements(user_did);
```

#### Owner Transition Log

```sql
CREATE TABLE owner_transitions (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  old_owner_did TEXT,
  new_owner_did TEXT,
  reason TEXT NOT NULL,
  -- 'deleted', 'inactive_120d', 'vacation', 'manual_transfer'
  transitioned_at INTEGER NOT NULL,

  FOREIGN KEY (community_id) REFERENCES communities(id)
);
```

### KV Namespace: POST_CACHE

```javascript
// Key: post URI
// Value: JSON
{
  uri: "at://did:plc:xxx/app.bsky.feed.post/yyy",
  cid: "bafyreiabc...",
  author: "did:plc:xxx",
  createdAt: 1696291200,
  feeds: ["feed1", "feed2"],
  hasMedia: true,
  mediaCids: ["bafyreiabc...", "bafyreicde..."]
}

// TTL: 7 days (auto-delete)
```

---

## 🔌 API Design

### Feed Generator API (AT Protocol Standard)

#### getFeedSkeleton

```
GET /xrpc/app.bsky.feed.getFeedSkeleton

Query Parameters:
- feed: at://did:plc:xxx/app.bsky.feed.generator/{feed_id}
- cursor: (optional) timestamp
- limit: (optional, default: 50) number of items

Response:
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" },
    { "post": "at://did:plc:zzz/app.bsky.feed.post/www" }
  ],
  "cursor": "1696291200"
}
```

### Community Management API

#### Create Community

```
POST /api/communities

Body:
{
  "name": "Web Development Community",
  "description": "React/Vue/Angular etc.",
  "stage": "community",
  "parent_id": "prog-general" // optional
}

Response:
{
  "id": "web-dev-comm",
  "name": "Web Development Community",
  "stage": "community",
  "created_at": 1696291200
}
```

#### Get Community

```
GET /api/communities/:id

Response:
{
  "id": "web-dev-comm",
  "name": "Web Development Community",
  "stage": "community",
  "parent_id": "prog-general",
  "relationship": "child",
  "member_count": 45,
  "post_count": 230,
  "feed_mix": {
    "own": 0.8,
    "parent": 0.15,
    "global": 0.05
  }
}
```

#### Graduate (Leave Parent)

```
POST /api/communities/:id/graduate

Response:
{
  "success": true,
  "achievement": {
    "id": "first_split",
    "name": "🏆 First Split",
    "rarity": "rare"
  }
}
```

#### Return to Parent

```
POST /api/communities/:id/return-to-parent

Body:
{
  "parent_id": "prog-general"
}

Response:
{
  "success": true,
  "achievement": {
    "id": "reintegration",
    "name": "🔄 Reintegration",
    "rarity": "uncommon"
  }
}
```

### Theme Feed Management API

#### Create Theme Feed

```
POST /api/communities/:id/theme-feeds

Body:
{
  "name": "Machine Learning Topics",
  "filter_config": {
    "hashtags": ["#ML", "#AI"],
    "keywords": ["PyTorch", "TensorFlow"]
  }
}

Response:
{
  "id": "ml-theme",
  "name": "Machine Learning Topics",
  "status": "active"
}
```

#### Promote Theme Feed

```
POST /api/theme-feeds/:id/promote

Response:
{
  "success": true,
  "new_community_id": "ml-community"
}
```

### Membership API

#### Join

```
POST /api/communities/:id/join

Response:
{
  "success": true,
  "achievement": {
    "id": "first_join",
    "name": "👋 First Join",
    "rarity": "common"
  }
}
```

#### Leave

```
POST /api/communities/:id/leave

Response:
{
  "success": true
}
```

### Moderation API

#### Add Moderator

```
POST /api/communities/:id/moderators

Body:
{
  "did": "did:plc:newmod",
  "role": "moderator"
}

Response:
{
  "success": true
}
```

#### Remove Moderator

```
DELETE /api/communities/:id/moderators/:did

Response:
{
  "success": true
}
```

#### Set Vacation Mode

```
POST /api/communities/:id/vacation-mode

Body:
{
  "enabled": true,
  "end_date": "2025-11-01",
  "deputy_did": "did:plc:deputy"
}

Response:
{
  "success": true
}
```

---

## 🔄 Lifecycle Specifications

### 3-Stage Growth Model

```
Stage 1: Theme Feed (Trial)
    ↓ Becomes active

Stage 2: Community (Independent)
    ↓ Further growth or different direction

Stage 3: Graduation (New horizons)
```

### Stage 1: Theme Feed

#### Characteristics
- Just a filter view within parent community
- Anyone can create easily
- No membership (everyone can view/post)
- Lightest implementation

#### Auto-Promotion Suggestion

**Criteria** (auto-detected, not enforced)
- Interested members: 15+
- Duration: 14+ days
- Posts: 30+ posts

**UI Suggestion**
```
💡 This theme is thriving!
Would you like to make it an independent community?

[Make Independent] [Continue As-Is]
```

#### Auto-Archiving

**Warning Conditions (active → warning)**
- No posts for 7 days
- OR activity rate ≤ 20%

**Archive Conditions (warning → archived)**
- No posts for 14 days
- OR low activity for 21 days (activity rate ≤ 10%)

**Revival Conditions (archived → active)**
- 5+ posts in 1 week
- AND 3+ active users

### Stage 2: Community

#### Characteristics
- Independent community ID
- Membership occurs (opt-in)
- Has own moderators
- Maintains loose connection with parent (default 80-15-5%)

#### Feed Mix Adjustment

```javascript
feed_mix: {
  own: 0.8,      // Own community 80%
  parent: 0.15,  // Parent community 15%
  global: 0.05   // Bluesky global 5%
}

// User customizable
// Example: Fully closed
feed_mix: {
  own: 1.0,
  parent: 0.0,
  global: 0.0
}
```

### Stage 3: Graduation

#### Characteristics
- Minimal connection with parent (default 100-0-0%)
- Independent growth path
- Optional mutual links remain

#### Graduation Patterns

**1. Friendly Graduation**
```javascript
{
  relationship: "independent",
  feed_mix: { own: 1.0, parent: 0.0, global: 0.0 },
  parent_reference: "prog-general" // Keep as lineage
}
```

**2. Return to Parent**
```javascript
{
  relationship: "child",
  feed_mix: { own: 0.8, parent: 0.15, global: 0.05 },
  parent_id: "prog-general"
}
```

### Decision Points

#### Community Too Large

```
DAU 1,500+:
"⚠️ Community is getting too large.
Would you like to split by themes?"

DAU 2,000+:
"🚨 Urgent: Splitting strongly recommended"
```

#### Direction Changed

```
Operator decides:
"This community wants to go in a different direction"
→ Choose graduation
```

#### Became Deserted

```
Options:
1. Return to parent (reintegration)
2. Transfer ownership
3. Close (archive)
```

---

## 🏆 Achievement System

### Achievement List

#### Common (Anyone can get)

| ID | Name | Condition | Message |
|----|------|-----------|---------|
| first_join | 👋 First Join | First join | Welcome! |
| first_post | ✍️ First Post | First post | First step |
| theme_creator | 🌱 Theme Creator | Create theme | You've planted a new seed |

#### Uncommon (30%)

| ID | Name | Condition | Message |
|----|------|-----------|---------|
| active_member | 🔥 Active Member | 30 days consecutive active | Consistency is key |
| reintegration | 🔄 Reintegration | Return to parent | A wise choice |

#### Rare (10%)

| ID | Name | Condition | Message |
|----|------|-----------|---------|
| first_split | 🏆 First Split | First independence | Congratulations on independence |
| moderator | 🛡️ Moderator | Become moderator | Responsible position |

#### Epic (5%)

| ID | Name | Condition | Message |
|----|------|-----------|---------|
| mentor | 🎓 Mentor | Nurture derivative | You've nurtured the next generation |
| succession | 🎁 Succession | Transfer ownership | You've passed the baton |

#### Legendary (1%)

| ID | Name | Condition | Message |
|----|------|-----------|---------|
| founder | 👑 Founder | 3-generation lineage | Great founder |
| phoenix | 🔥 Phoenix | Revival from archive | Like a phoenix |

### Badge Display

```
User Profile:

@username
─────────────────
👋 🌱 🏆 🎓 👑
Common: 5/10
Rare: 2/5
Legendary: 1/2

Achievement Progress: 45%
```

---

## 🚨 Owner Absence Handling

### Pattern 1: Account Deletion (Immediate Response)

```javascript
// Daily check
async function checkOwnerDeleted(communityId) {
  const owner = await getOwner(communityId);

  if (await isDIDInvalid(owner.did)) {
    // Select next owner
    const nextOwner = await selectNextOwner(communityId);

    if (nextOwner) {
      await transferOwnership(communityId, nextOwner.did);
      await notifyNewOwner(nextOwner.did);
    } else {
      await autoCloseCommunity(communityId, 'owner_deleted_no_mods');
    }
  }
}
```

### Pattern 2: Long-term Inactivity (Gradual Warning)

```
Day 90: First warning
"⚠️ No activity for 90 days. Auto-transfer in 120 days"

Day 105: Final warning
"🚨 If no activity within 15 days, ownership will transfer"

Day 120: Auto-transfer
"Ownership has been transferred"

Day 150: Auto-close (only if transfer fails)
```

### Pattern 3: Vacation Mode (Self-Declared)

```javascript
// Owner sets
{
  vacation_mode: true,
  vacation_start: "2025-10-10",
  vacation_end: "2025-11-01",
  temporary_deputy: "did:plc:deputy"
}

// Temporary owner privileges to deputy
// Auto-restore privileges on return
```

---

## 🔒 Security & Authentication

### JWT Authentication

```javascript
// When getting member-only feed
const token = request.headers.get('Authorization');
const decoded = jwt.verify(token, env.JWT_SECRET);

// DID verification
if (!await verifyDID(decoded.did)) {
  return new Response('Unauthorized', { status: 401 });
}

// Membership check
const isMember = await checkMembership(communityId, decoded.did);
if (!isMember) {
  return new Response('Forbidden', { status: 403 });
}
```

### DID Verification

```javascript
async function verifyDID(did) {
  try {
    // AT Protocol DID resolution
    const doc = await resolveDID(did);
    return doc !== null;
  } catch (err) {
    return false;
  }
}
```

### Rate Limiting

```javascript
// Rate limit with Cloudflare Workers KV
async function checkRateLimit(did, action) {
  const key = `ratelimit:${did}:${action}`;
  const count = await env.KV.get(key) || 0;

  if (count > RATE_LIMITS[action]) {
    return false;
  }

  await env.KV.put(key, count + 1, { expirationTtl: 3600 });
  return true;
}

const RATE_LIMITS = {
  'create_theme': 10,      // 10/hour
  'create_community': 5,   // 5/hour
  'join': 20,              // 20/hour
  'post': 100              // 100/hour
};
```

---

## 📊 Data Flow

### Post Storage and Retrieval

#### 1. Firehose → Durable Object → KV/D1

```javascript
// Durable Object (Firehose Consumer)
firehose.onmessage = async (event) => {
  const post = parseCAR(event.data);

  // Filtering
  const matchingFeeds = await checkFilters(post);

  if (matchingFeeds.length > 0) {
    // Save to KV (7-day TTL)
    await env.POST_CACHE.put(
      post.uri,
      JSON.stringify({ ...post, feeds: matchingFeeds }),
      { expirationTtl: 604800 }
    );

    // Save index to D1
    await env.DB.prepare(
      'INSERT INTO post_index (uri, feed_id, author_did, created_at) VALUES (?, ?, ?, ?)'
    ).bind(post.uri, matchingFeeds[0], post.author, post.createdAt).run();
  }
};
```

#### 2. Client → Workers → KV → PDS

```javascript
// Workers (Feed Generator)
export default {
  async fetch(request, env) {
    const { feed, cursor, limit } = parseQuery(request);

    // Get URI list from D1
    const rows = await env.DB.prepare(`
      SELECT uri, created_at
      FROM post_index
      WHERE feed_id = ? AND created_at < ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(feed, cursor || Date.now(), limit).all();

    return new Response(JSON.stringify({
      feed: rows.results.map(r => ({ post: r.uri })),
      cursor: rows.results[rows.results.length - 1]?.created_at
    }));
  }
};
```

---

## 📝 Summary

### Technical Features

- **Cloudflare Stack**: Workers + D1 + KV + Durable Objects
- **Complete PDS Dependency**: No media storage needed
- **Minimal Data Storage**: URIs only, 7-day cache
- **Scalable**: Edge computing

### Data Design Principles

- **Respect Data Ownership**: Users own their data
- **Simplicity**: 5 main tables
- **Extensibility**: Flexible settings with JSON columns

### Security

- **JWT Authentication**: Membership management
- **DID Verification**: AT Protocol standard
- **Rate Limiting**: Abuse prevention

---

**Next Document: [Implementation Guide](/reference/implementation)**
