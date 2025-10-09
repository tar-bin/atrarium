# Data Model: Custom Emoji Reactions

**Feature**: 016-slack-mastodon-misskey
**Date**: 2025-10-09

## Entity Relationship Diagram

```
User (DID)
  ↓ creates
Reaction ───────→ Post (URI)
  ↓ references
Emoji (Unicode or CustomEmoji)

CommunityOwner (DID)
  ↓ creates
CustomEmoji ───────→ Community (ID)
  ↓ stored as
PDS Blob (image) + Lexicon Record (metadata)

ReactionAggregate (ephemeral cache)
  ↓ aggregates
Reaction × Post × Emoji
```

## Entities

### 1. Reaction

**Storage**: User's PDS using `net.atrarium.community.reaction` Lexicon schema

**Attributes**:
- `reactorDid` (string, required): DID of user who reacted
- `postUri` (string, required): AT Protocol URI of target post (`at://did:plc:xxx/app.bsky.feed.post/yyy`)
- `emoji` (object, required): Emoji identifier
  - `type` (`'unicode' | 'custom'`): Emoji type
  - `value` (string): Unicode codepoint (e.g., `U+1F44D`) or custom emoji shortcode (e.g., `:partyblob:`)
- `communityId` (string, required): Community where reaction was added
- `createdAt` (string, required): ISO 8601 timestamp

**Relationships**:
- Belongs to a User (reactor)
- References a Post (target)
- References an Emoji (Unicode or CustomEmoji)
- Scoped to a Community

**Validation Rules**:
- `reactorDid` must be valid DID format (`did:plc:` or `did:web:`)
- `postUri` must be valid AT Protocol URI
- `emoji.value` for Unicode: valid Unicode emoji codepoint
- `emoji.value` for custom: existing CustomEmoji shortcode in community
- User must be community member (verified via PDS membership records)
- Post must be visible (not hidden/deleted)
- One reaction per user per emoji per post (uniqueness constraint)

**State Transitions**:
- `Created`: User adds reaction
- `Deleted`: User removes reaction (soft delete in PDS)

**Example Lexicon Record**:
```json
{
  "$type": "net.atrarium.community.reaction",
  "reactorDid": "did:plc:abc123",
  "postUri": "at://did:plc:abc123/app.bsky.feed.post/xyz789",
  "emoji": {
    "type": "unicode",
    "value": "U+1F44D"
  },
  "communityId": "community-id-123",
  "createdAt": "2025-10-09T12:34:56.789Z"
}
```

### 2. CustomEmoji

**Storage**: Community owner's PDS using `net.atrarium.community.emoji` Lexicon schema + PDS blob storage

**Attributes**:
- `shortcode` (string, required): Emoji shortcode (e.g., `partyblob`, 2-32 chars, alphanumeric + underscore)
- `imageBlobCid` (string, required): AT Protocol blob CID reference (returned from `uploadBlob()`)
- `communityId` (string, required): Community where emoji is available
- `createdBy` (string, required): DID of user who uploaded emoji
- `createdAt` (string, required): ISO 8601 timestamp
- `approvalStatus` (`'pending' | 'approved' | 'rejected' | 'revoked'`, required): Moderation status
- `approvedBy` (string, optional): DID of owner/moderator who approved
- `approvedAt` (string, optional): ISO 8601 timestamp of approval
- `rejectionReason` (string, optional): Reason for rejection (if status = 'rejected')

**Relationships**:
- Belongs to a Community
- Created by a User
- Approved by a CommunityOwner/Moderator
- Can be used in Reactions

**Validation Rules**:
- `shortcode` must be 2-32 characters, alphanumeric + underscore only, case-insensitive unique per community
- `imageBlobCid` must be valid AT Protocol blob CID
- Image blob must satisfy: PNG/GIF/APNG/WebP, 256KB max, 64px max height, 512px max width (8:1 aspect ratio)
- `approvalStatus` transitions: `pending` → `approved`/`rejected`, `approved` → `revoked`
- Only owners/moderators can approve/reject/revoke
- Only creators can delete their own pending emojis

**State Transitions**:
1. `pending`: Initial state after upload
2. `approved`: Owner/moderator approved (emoji usable in reactions)
3. `rejected`: Owner/moderator rejected (emoji not usable)
4. `revoked`: Previously approved emoji disabled (existing reactions preserved)

**Example Lexicon Record**:
```json
{
  "$type": "net.atrarium.community.emoji",
  "shortcode": "partyblob",
  "imageBlobCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "communityId": "community-id-123",
  "createdBy": "did:plc:abc123",
  "createdAt": "2025-10-09T12:00:00.000Z",
  "approvalStatus": "approved",
  "approvedBy": "did:plc:owner789",
  "approvedAt": "2025-10-09T13:00:00.000Z"
}
```

### 3. ReactionAggregate (Ephemeral Cache)

**Storage**: Durable Objects Storage (7-day TTL, per-community isolation)

**Attributes**:
- `postUri` (string, required): AT Protocol URI of target post
- `emoji` (object, required): Emoji identifier (same structure as Reaction)
- `count` (number, required): Total number of reactions with this emoji
- `reactorDids` (string[], required): List of DIDs who reacted
- `lastUpdatedAt` (string, required): ISO 8601 timestamp of last update
- `indexedAt` (string, required): ISO 8601 timestamp when first indexed

**Relationships**:
- Aggregates multiple Reaction records
- Scoped to a Post and Emoji combination
- Cached in CommunityFeedGenerator Durable Object

**Storage Key Schema**:
- Key: `reaction:{postUri}:{emojiType}:{emojiValue}`
- Example: `reaction:at://did:plc:abc/app.bsky.feed.post/xyz:unicode:U+1F44D`

**Validation Rules**:
- `reactorDids` list must not contain duplicates
- `count` must equal `reactorDids.length`
- Automatically rebuilt from PDS records if Durable Object reset
- Auto-deleted after 7 days of no updates (scheduled cleanup)

**Cache Invalidation**:
- Add reaction: Increment `count`, append to `reactorDids`
- Remove reaction: Decrement `count`, remove from `reactorDids`
- If `count` reaches 0: Delete aggregate record

**Example Storage Record**:
```json
{
  "postUri": "at://did:plc:abc123/app.bsky.feed.post/xyz789",
  "emoji": {
    "type": "unicode",
    "value": "U+1F44D"
  },
  "count": 5,
  "reactorDids": ["did:plc:user1", "did:plc:user2", "did:plc:user3", "did:plc:user4", "did:plc:user5"],
  "lastUpdatedAt": "2025-10-09T14:00:00.000Z",
  "indexedAt": "2025-10-09T12:00:00.000Z"
}
```

### 4. RateLimitRecord (Ephemeral)

**Storage**: Durable Objects Storage (1-hour TTL)

**Attributes**:
- `userId` (string, required): DID of user
- `reactionTimestamps` (string[], required): ISO 8601 timestamps of recent reactions (within past hour)

**Storage Key Schema**:
- Key: `ratelimit:{userId}`
- Example: `ratelimit:did:plc:abc123`

**Validation Rules**:
- Sliding window: Keep only timestamps within past 1 hour
- Reject new reaction if `reactionTimestamps.length >= 100`
- Auto-cleanup old timestamps on each access

**Rate Limit Algorithm**:
```typescript
function checkRateLimit(userId: string): { allowed: boolean, retryAfter?: number } {
  const record = await storage.get(`ratelimit:${userId}`);
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  // Filter to past hour only
  const recentTimestamps = record?.reactionTimestamps.filter(ts => 
    new Date(ts).getTime() > oneHourAgo
  ) || [];
  
  if (recentTimestamps.length >= 100) {
    const oldestTimestamp = new Date(recentTimestamps[0]).getTime();
    const retryAfter = Math.ceil((oldestTimestamp + 3600000 - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Update record
  recentTimestamps.push(new Date(now).toISOString());
  await storage.put(`ratelimit:${userId}`, { reactionTimestamps: recentTimestamps });
  
  return { allowed: true };
}
```

## Data Flow

### Adding a Reaction

1. **Client Request**: `POST /api/reactions/add` with `{ postUri, emoji, communityId }`
2. **Server Validation**:
   - Check rate limit (100/hour/user) via RateLimitRecord
   - Verify user is community member (query PDS)
   - Verify post is visible (not hidden/deleted)
   - Verify custom emoji is approved (if `emoji.type === 'custom'`)
3. **PDS Write**: Write Reaction Lexicon record to user's PDS
4. **Firehose Indexing**:
   - Firehose emits `com.atproto.sync.subscribeRepos` event
   - FirehoseProcessor detects `net.atrarium.community.reaction` collection
   - Calls `CommunityFeedGenerator.handleReaction()`
5. **Durable Object Update**:
   - Load/create ReactionAggregate for `{postUri, emoji}`
   - Increment `count`, append to `reactorDids`
   - Persist to Storage API
6. **SSE Broadcast**: Send `reaction_update` event to all connected clients
7. **Client Update**: TanStack Query cache invalidated, UI updates

### Removing a Reaction

1. **Client Request**: `DELETE /api/reactions/remove` with `{ postUri, emoji }`
2. **Server Validation**: Verify user owns the reaction
3. **PDS Delete**: Delete Reaction Lexicon record from user's PDS
4. **Firehose Indexing**: Same as add, but with delete operation
5. **Durable Object Update**:
   - Decrement `count`, remove from `reactorDids`
   - If `count === 0`: Delete ReactionAggregate record
   - Persist to Storage API
6. **SSE Broadcast**: Send `reaction_update` event
7. **Client Update**: UI updates

### Uploading Custom Emoji

1. **Client Request**: `POST /api/emoji/upload` with FormData (shortcode, image file)
2. **Server Validation**:
   - Verify user is community member
   - Validate file type (PNG/GIF/APNG/WebP), size (256KB max), dimensions (64px × 512px max)
   - Verify shortcode uniqueness in community
3. **PDS Blob Upload**: Call `agent.uploadBlob(imageFile)` → returns `blob.ref.cid`
4. **PDS Metadata Write**: Write CustomEmoji Lexicon record to community owner's PDS with `approvalStatus: 'pending'`
5. **Firehose Indexing**: CustomEmoji indexed via Firehose (optional, for approval queue)
6. **Client Update**: Show "Pending approval" status in user's emoji list

### Approving Custom Emoji

1. **Client Request**: `POST /api/emoji/approve` with `{ emojiRef, status: 'approved', reason? }`
2. **Server Validation**: Verify user is community owner or moderator
3. **PDS Update**: Update CustomEmoji Lexicon record with approval status, approvedBy, approvedAt
4. **Client Update**: Emoji becomes available in EmojiPicker

## Indexing Strategy

### Durable Objects Storage Keys

```
# Reaction aggregates
reaction:{postUri}:{emojiType}:{emojiValue}

# Rate limit records
ratelimit:{userId}

# Custom emoji cache (optional, for faster lookup)
emoji:{communityId}:{shortcode}
```

### Querying Patterns

**Get reactions for post**:
```typescript
const reactions = await storage.list({ 
  prefix: `reaction:${postUri}:`,
  limit: 50  // 20 inline + 30 modal reserve
});
```

**Check user reacted**:
```typescript
const aggregate = await storage.get(`reaction:${postUri}:${emojiType}:${emojiValue}`);
const hasReacted = aggregate?.reactorDids.includes(currentUserDid);
```

**Get approved emojis for community**:
```typescript
// Query PDS for CustomEmoji records with approvalStatus === 'approved'
const emojis = await agent.app.bsky.feed.getAuthorFeed({
  actor: communityOwnerDid,
  filter: 'net.atrarium.community.emoji',
  // Filter in-memory for approvalStatus === 'approved'
});
```

## Migration Strategy

**No migrations required** - New Lexicon schemas and Durable Objects keys do not conflict with existing data.

**Backwards Compatibility**:
- Existing posts without reactions: Display empty reaction bar (no placeholder UI)
- Posts created before feature: Reactions can be added retroactively
- Custom emoji images in PDS blobs: Use standard AT Protocol blob resolution (works with any PDS)

## Performance Optimization

**Caching**:
- Reaction aggregates cached in Durable Objects (7-day TTL)
- Custom emoji metadata cached in-memory (per-community Durable Object)
- PDS blob URLs cached client-side (HTTP Cache-Control headers)

**Lazy Loading**:
- Load first 20 emoji types inline, defer modal content until user clicks "Show More"
- SSE connection established only when user views community feed (not on page load)

**Batch Operations**:
- Firehose events batched (100 messages/batch) via Cloudflare Queue
- Multiple reaction updates within 1s window debounced before SSE broadcast

## Data Retention

**PDS (Permanent)**:
- Reaction records: Permanent (user-controlled deletion)
- CustomEmoji records: Permanent (owner-controlled deletion)
- Blob images: Permanent (tied to Lexicon record lifecycle)

**Durable Objects (Ephemeral)**:
- ReactionAggregate: 7-day TTL (auto-cleanup via scheduled alarm)
- RateLimitRecord: 1-hour TTL (auto-cleanup via timestamp filtering)
- Rebuildable from PDS via Firehose replay if lost

## Security Considerations

**Access Control**:
- Only community members can add reactions (enforced server-side)
- Only reaction owners can remove their own reactions
- Only community owners/moderators can approve/reject/revoke custom emojis

**Rate Limiting**:
- 100 reactions/hour/user (sliding window)
- 429 Too Many Requests response with `Retry-After` header

**Validation**:
- Custom emoji images validated server-side (file type, size, dimensions, aspect ratio)
- Shortcode uniqueness enforced per-community
- PDS write operations require valid JWT authentication

**Abuse Prevention**:
- Custom emoji approval workflow prevents spam
- Revoked emojis preserve existing reactions but block new usage
- Deleted emojis show fallback placeholder in existing reactions
