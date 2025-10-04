# Research: Direct Feed Posting by Feed ID

**Feature**: 003-id | **Date**: 2025-10-04
**Research Phase**: Phase 0 - Technical decisions and patterns

## 1. Hashtag Generation Algorithm

### Decision
Use `crypto.randomUUID()` with truncation to 8 hex characters, prefixed with `atr_`.

**Format**: `#atr_[8-hex-chars]`
**Example**: `#atr_f7a3b2c1`

### Implementation
```typescript
function generateFeedHashtag(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  const shortId = uuid.slice(0, 8);
  return `#atr_${shortId}`;
}
```

### Rationale
- **Uniqueness**: 8 hex chars = 4,294,967,296 possible combinations
- **Collision Probability**: With 10,000 feeds, probability < 0.001% (Birthday paradox: √(2 × 4.3B × ln(1/0.00001)) ≈ 95,000 feeds before 0.001% collision risk)
- **Cryptographic Quality**: crypto.randomUUID() uses CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
- **Performance**: O(1) generation, no database lookup required during generation
- **Readability**: Short enough to be manually typed if needed

### Alternatives Considered
1. **Timestamp-based (rejected)**:
   - Sequential IDs leak information (feed creation order, feed count)
   - Collision risk with concurrent creations

2. **Full UUID (rejected)**:
   - 36 chars too long for hashtag (#atr_550e8400-e29b-41d4-a716-446655440000)
   - Poor UX for manual entry

3. **Incremental counter (rejected)**:
   - Requires database transaction for uniqueness
   - Not suitable for distributed Workers environment

### Collision Handling
- On theme_feed creation, attempt INSERT with UNIQUE constraint on hashtag column
- If collision (SQLITE_CONSTRAINT), retry with new hashtag (max 3 attempts)
- Log collision events for monitoring

### Validation Regex
```typescript
const FEED_HASHTAG_PATTERN = /^#atr_[0-9a-f]{8}$/;
```

---

## 2. Firehose Integration Patterns

### Decision
Use **Cloudflare Durable Objects** with persistent WebSocket connection to Bluesky Firehose.

**Architecture**:
```
Bluesky Firehose (wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos)
    ↓ WebSocket
Durable Object (FirehoseSubscription)
    ↓ Parse CAR files
Filter by hashtags (#atr_*)
    ↓ Membership check
Write to D1 (post_index)
```

### Rationale
- **Durable Objects Lifecycle**: Single instance per Firehose connection, automatic failover
- **Persistent Connection**: WebSocket maintained across requests, reconnects automatically
- **State Management**: Durable Objects storage tracks last cursor position for resume-after-crash

### Implementation Pattern
```typescript
// durable-objects/firehose-subscription.ts
export class FirehoseSubscription extends DurableObject {
  private ws?: WebSocket;
  private cursor: string;

  async fetch(request: Request) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    return new Response('Firehose active');
  }

  private async connect() {
    const url = `wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos?cursor=${this.cursor}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener('message', async (event) => {
      const { commit, ops } = await parseCAR(event.data);
      for (const op of ops) {
        if (op.action === 'create' && op.path.includes('app.bsky.feed.post')) {
          await this.processPost(op.record, op.uri);
        } else if (op.action === 'delete') {
          await this.deletePost(op.uri);
        }
      }
      this.cursor = commit.rev; // Persist cursor
      await this.ctx.storage.put('cursor', this.cursor);
    });
  }

  private async processPost(record: any, uri: string) {
    const text = record.text || '';
    const hashtags = text.match(/#atr_[0-9a-f]{8}/g) || [];

    for (const hashtag of hashtags) {
      const feed = await this.env.DB.prepare(
        'SELECT id, community_id FROM theme_feeds WHERE hashtag = ?'
      ).bind(hashtag).first();

      if (!feed) continue;

      // Membership check
      const isMember = await this.env.DB.prepare(
        'SELECT 1 FROM memberships WHERE community_id = ? AND user_did = ?'
      ).bind(feed.community_id, record.author).first();

      if (isMember) {
        await this.env.DB.prepare(
          'INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(uri, feed.id, record.author, new Date(record.createdAt).getTime() / 1000, Date.now() / 1000, 'approved').run();
      }
    }
  }
}
```

### Backpressure Handling
- **Buffering**: Queue posts in Durable Object storage if D1 writes slow down
- **Rate Limiting**: Limit D1 writes to 100/second per Durable Object
- **Monitoring**: Track queue depth, alert if > 1000 pending posts

### WebSocket Reconnection Strategy
1. **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s, max 60s
2. **Cursor Resume**: Always include last processed cursor in reconnect
3. **Health Check**: Ping every 30s, reconnect if no pong in 60s

### CAR File Parsing
Use `@atproto/repo` library:
```typescript
import { readCar } from '@atproto/repo';

async function parseCAR(data: ArrayBuffer) {
  const car = await readCar(new Uint8Array(data));
  // Extract commit, ops from CAR blocks
  return { commit, ops };
}
```

---

## 3. Membership + Hashtag Dual Validation

### Decision
Validate membership **at indexing time** (Firehose processing) and **at query time** (feed skeleton generation).

**Two-Layer Validation**:
1. **Indexing (write path)**: Only index posts from current members
2. **Querying (read path)**: Re-validate membership (handles membership revocation)

### Query Optimization

**Naive Query (slow)**:
```sql
SELECT uri FROM post_index
WHERE feed_id = ?
  AND moderation_status = 'approved'
  AND author_did IN (
    SELECT user_did FROM memberships WHERE community_id = ?
  )
ORDER BY created_at DESC
LIMIT 50;
```

**Optimized Query (with JOIN)**:
```sql
SELECT p.uri
FROM post_index p
INNER JOIN memberships m
  ON p.author_did = m.user_did
  AND m.community_id = ?
WHERE p.feed_id = ?
  AND p.moderation_status = 'approved'
ORDER BY p.created_at DESC
LIMIT 50;
```

### Index Strategy
**Existing Indexes** (from schema.sql):
- `idx_post_index_feed_created (feed_id, created_at DESC)` ✓
- `idx_memberships_user (user_did)` ✓

**New Indexes Required**:
```sql
-- For moderation filtering
CREATE INDEX idx_post_index_moderation
  ON post_index(feed_id, moderation_status, created_at DESC);

-- For membership JOIN optimization
CREATE INDEX idx_memberships_community_user
  ON memberships(community_id, user_did);
```

### Cache Invalidation Strategy

**Scenario**: User removed from community → all their posts must disappear

**Approach 1: Lazy Deletion (Chosen)**:
- Do NOT delete post_index rows immediately
- Re-validate membership at query time
- Pros: Instant effect, simple implementation
- Cons: Orphaned rows in post_index (cleaned by scheduled job)

**Approach 2: Eager Deletion (Rejected)**:
- DELETE FROM post_index WHERE author_did = ? AND feed_id IN (SELECT id FROM theme_feeds WHERE community_id = ?)
- Pros: Clean database
- Cons: Slow for users with many posts, transaction overhead

**Cleanup Job** (scheduled):
```sql
-- Run daily: delete orphaned post_index entries
DELETE FROM post_index
WHERE author_did NOT IN (
  SELECT user_did FROM memberships
  WHERE community_id = (
    SELECT community_id FROM theme_feeds WHERE id = post_index.feed_id
  )
);
```

---

## 4. Moderation State Management

### Decision
Use **moderation_status column** with eventual consistency model.

**States**:
- `approved` (default): visible in feeds
- `hidden`: moderator-hidden, excluded from feeds
- `reported`: user-reported, awaiting moderator review

### Eventual Consistency Timeline

**User Banned from Community**:
```
T+0ms:   DELETE FROM memberships WHERE user_did = 'X' AND community_id = 'Y'
T+0ms:   INSERT INTO moderation_logs (action='remove_member', ...)
T+50ms:  Next feed skeleton query excludes user's posts (JOIN fails)
T+daily: Scheduled cleanup deletes orphaned post_index rows
```

**Post Hidden by Moderator**:
```
T+0ms:   UPDATE post_index SET moderation_status = 'hidden' WHERE uri = 'X'
T+0ms:   INSERT INTO moderation_logs (action='hide_post', ...)
T+0ms:   Next feed skeleton query excludes post (WHERE moderation_status = 'approved')
```

### Bulk Invalidation Pattern

**Scenario**: User removed → invalidate all posts in all community feeds

**Implementation**:
```typescript
// services/moderation.ts
async function removeMemberAndInvalidatePosts(
  communityId: string,
  userDid: string,
  moderatorDid: string,
  reason: string
) {
  const db = env.DB;

  // 1. Remove membership
  await db.prepare('DELETE FROM memberships WHERE community_id = ? AND user_did = ?')
    .bind(communityId, userDid).run();

  // 2. Log action
  await db.prepare(`
    INSERT INTO moderation_logs (action, target_uri, moderator_did, reason, performed_at)
    VALUES ('remove_member', ?, ?, ?, ?)
  `).bind(userDid, moderatorDid, reason, Date.now() / 1000).run();

  // 3. Count affected posts (for UI feedback)
  const count = await db.prepare(`
    SELECT COUNT(*) as count FROM post_index p
    INNER JOIN theme_feeds f ON p.feed_id = f.id
    WHERE f.community_id = ? AND p.author_did = ?
  `).bind(communityId, userDid).first();

  return { affectedPosts: count.count };
}
```

### Audit Log Retention Policy

**Decision**: Retain moderation logs **indefinitely** for accountability.

**Rationale**:
- Governance requirement: prove moderator actions were justified
- Disk space: ~100 bytes/action, 10k actions/month = 1MB/month (negligible)
- Query performance: Index on performed_at for recent logs, archive older than 1 year to separate table if needed

**Schema**:
```sql
CREATE TABLE moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL, -- 'hide_post', 'unhide_post', 'block_user', 'unblock_user', 'remove_member'
  target_uri TEXT NOT NULL, -- post URI or user DID
  feed_id TEXT, -- NULL for community-wide actions
  moderator_did TEXT NOT NULL,
  reason TEXT,
  performed_at INTEGER NOT NULL
);

CREATE INDEX idx_moderation_logs_time ON moderation_logs(performed_at DESC);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_uri);
```

---

## Summary of Decisions

| Research Area | Decision | Key Tradeoff |
|--------------|----------|--------------|
| **Hashtag Generation** | crypto.randomUUID().slice(0,8) | Simplicity vs theoretical collision risk (acceptable at scale) |
| **Firehose Integration** | Durable Objects + WebSocket | Complexity vs real-time indexing |
| **Membership Validation** | Dual validation (write + read) | Redundancy vs consistency guarantee |
| **Moderation State** | Eventual consistency + lazy deletion | Performance vs immediate deletion |
| **Audit Logs** | Indefinite retention | Storage cost vs accountability |

---

**Phase 0 Complete** | Next: Phase 1 (Design & Contracts)
