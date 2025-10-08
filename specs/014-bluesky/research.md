# Research: Internal Post Management (Custom Lexicon)

**Feature**: 014-bluesky
**Date**: 2025-10-08
**Status**: Complete

## Overview

This document consolidates research findings for implementing `net.atrarium.community.post` as a custom AT Protocol Lexicon to replace `app.bsky.feed.post` for community-specific posts.

---

## Research Task 1: AT Protocol Lexicon Schema Design Patterns

**Decision**: Use `record` type Lexicon with `text` field and `communityId` reference

**Rationale**:
- AT Protocol Lexicon supports `record` types for user-generated content stored in PDSs
- Existing Atrarium Lexicons (`net.atrarium.community.config`, `net.atrarium.community.membership`) use `record` type successfully
- `record` type enables standard AT-URI addressing (`at://did:plc:xxx/net.atrarium.community.post/rkey`)
- Bluesky's `app.bsky.feed.post` is also a `record` type, providing proven pattern

**Schema Structure**:
```json
{
  "lexicon": 1,
  "id": "net.atrarium.community.post",
  "defs": {
    "main": {
      "type": "record",
      "description": "A post in an Atrarium community timeline. CommunityId is immutable and survives stage transitions (theme → community → graduated).",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["text", "communityId", "createdAt"],
        "properties": {
          "text": {
            "type": "string",
            "maxLength": 300,
            "description": "Post content (plain text)"
          },
          "communityId": {
            "type": "string",
            "pattern": "^[0-9a-f]{8}$",
            "description": "8-character hex community identifier (immutable across stage transitions)"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime",
            "description": "Post creation timestamp (ISO 8601)"
          }
        }
      }
    }
  }
}
```

**Community Lifecycle Design**:
- Posts can be created in communities at **any stage** (theme, community, graduated)
- `communityId` remains **constant** during stage transitions
- Posts automatically **carry over** when a community evolves (e.g., theme "Rust Learning" → community "Rust Learning")
- Stage information is stored in `net.atrarium.community.config`, not in individual posts
- This design supports the "maintain optimal community size" vision (ちょうどいい大きさを保つ) where communities can split/graduate while preserving post history

**Alternatives Considered**:
- **Blob type**: Rejected (not suitable for structured data)
- **Query procedure**: Rejected (posts are persistent data, not ephemeral queries)
- **Reusing app.bsky.feed.post**: Rejected (violates feature requirement to decouple from Bluesky)

---

## Research Task 2: Firehose Filtering for Custom Lexicons

**Decision**: Jetstream WebSocket supports all Lexicons; update filter to include `net.atrarium.community.post`

**Rationale**:
- AT Protocol Relay (Jetstream) broadcasts **all** Lexicon records from all PDSs, not just `app.bsky.*`
- Current Atrarium Firehose filter already handles custom Lexicons (`net.atrarium.community.config`, `net.atrarium.community.membership`)
- Jetstream `wantedCollections` parameter supports multiple NSIDs

**Current Filter (server/src/durable-objects/firehose-receiver.ts)**:
```typescript
// Existing filter (lightweight)
if (event.commit?.collection && event.commit.collection.includes('#atrarium_')) {
  // Forward to queue
}
```

**Updated Filter**:
```typescript
const ATRARIUM_COLLECTIONS = [
  'net.atrarium.community.config',
  'net.atrarium.community.membership',
  'net.atrarium.moderation.action',
  'net.atrarium.community.post', // NEW
];

if (event.commit?.collection && ATRARIUM_COLLECTIONS.includes(event.commit.collection)) {
  // Forward to queue
}
```

**Performance Impact**:
- No significant overhead (existing collections already filtered)
- Lightweight filter remains fast (<1ms per event)

**Alternatives Considered**:
- **Direct PDS polling**: Rejected (no real-time updates, scales poorly)
- **Separate Firehose connection**: Rejected (violates Principle 2: Simplicity)

---

## Research Task 3: Backward Compatibility Strategies

**Decision**: Dual indexing during transition period (coexist `app.bsky.feed.post` + `net.atrarium.community.post`)

**Rationale**:
- Existing posts using `app.bsky.feed.post` + `#atrarium_xxxxx` hashtag must remain visible
- 7-day cache in Durable Objects will naturally phase out old posts
- No migration required (posts expire organically)

**Compatibility Strategy**:
1. **Phase 1 (Transition)**: Index both `app.bsky.feed.post` (with hashtag) and `net.atrarium.community.post`
2. **Phase 2 (Migration)**: Stop creating new `app.bsky.feed.post`, only `net.atrarium.community.post`
3. **Phase 3 (Cleanup)**: Remove `app.bsky.feed.post` indexing after 7 days (cache expires)

**CommunityFeedGenerator Update** (server/src/durable-objects/community-feed-generator.ts):
```typescript
// Existing: Index app.bsky.feed.post with hashtag
if (collection === 'app.bsky.feed.post' && post.text?.includes(`#atrarium_${communityId}`)) {
  await this.indexPost(post);
}

// NEW: Also index net.atrarium.community.post
if (collection === 'net.atrarium.community.post' && post.communityId === communityId) {
  await this.indexPost(post);
}
```

**Timeline Display**:
- Merge both record types in chronological order
- No user-visible distinction (same UI rendering)

**Alternatives Considered**:
- **Immediate cutover**: Rejected (breaks existing posts, bad UX)
- **Data migration**: Rejected (unnecessary complexity, violates Principle 2)

---

## Research Task 4: PDS Write Operations for Custom Lexicons

**Decision**: Use `@atproto/api` `AtpAgent.com.atproto.repo.createRecord()` with custom Lexicon NSID

**Rationale**:
- `@atproto/api` v0.13.35 supports arbitrary Lexicon NSIDs (not limited to `app.bsky.*`)
- Existing Atrarium code already uses `createRecord()` for `net.atrarium.community.config` and `net.atrarium.community.membership`
- No new dependencies required

**Implementation** (server/src/services/atproto.ts):
```typescript
import { AtpAgent } from '@atproto/api';

export class AtProtoService {
  async createPost(did: string, text: string, communityId: string): Promise<string> {
    const agent = await this.getAuthenticatedAgent(did);

    const record = {
      $type: 'net.atrarium.community.post',
      text,
      communityId,
      createdAt: new Date().toISOString(),
    };

    const result = await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'net.atrarium.community.post',
      record,
    });

    return result.uri; // at://did:plc:xxx/net.atrarium.community.post/rkey
  }
}
```

**Validation**:
- Zod schema validates `text` (max 300 chars), `communityId` (8-char hex)
- PDS validates Lexicon schema compliance server-side

**Alternatives Considered**:
- **Direct HTTP POST to PDS**: Rejected (reinventing @atproto/api, error-prone)
- **Custom Lexicon client**: Rejected (unnecessary abstraction)

---

## Research Task 5: Durable Objects Indexing Patterns for Multiple Record Types

**Decision**: Unified post storage key schema, record type stored as metadata

**Rationale**:
- Durable Objects Storage already stores multiple entity types (config, member, post, moderation)
- Post key format: `post:<timestamp>:<rkey>` (agnostic to Lexicon type)
- Record type stored in PostMetadata for filtering/debugging

**PostMetadata Type Update** (server/src/types.ts):
```typescript
export interface PostMetadata {
  uri: string;               // at://did:plc:xxx/collection/rkey
  collection: string;        // NEW: 'app.bsky.feed.post' | 'net.atrarium.community.post'
  authorDid: string;
  text: string;
  createdAt: string;         // ISO 8601
  communityId: string;       // Extracted from hashtag or Lexicon field
  moderationStatus: ModerationStatus;
  indexedAt: string;         // ISO 8601
}
```

**Storage Key Pattern** (unchanged):
```
post:<timestamp>:<rkey>  → PostMetadata
```

**Retrieval**:
```typescript
// List posts (supports both types)
const posts = await storage.list({ prefix: 'post:', reverse: true, limit: 50 });

// Filter by type (optional)
const customPosts = posts.filter(p => p.value.collection === 'net.atrarium.community.post');
```

**Performance**:
- No impact (key schema unchanged, metadata adds <10 bytes)
- Listing remains efficient (same prefix-based query)

**Alternatives Considered**:
- **Separate key namespaces**: Rejected (complicates chronological sorting)
- **Migration to new key schema**: Rejected (unnecessary, violates Principle 2)

---

## Research Task 6: Feed Generator API Compatibility

**Decision**: Deprecate AT Protocol Feed Generator API (`getFeedSkeleton`), serve timelines via Dashboard API only

**Rationale**:
- Feed Generator API returns post URIs to Bluesky AppView for rendering
- Bluesky AppView only understands `app.bsky.*` Lexicons (does not render custom Lexicons)
- `net.atrarium.community.post` records are invisible to Bluesky AppView
- Feed Generator would return valid URIs, but AppView would fail to fetch/render post content

**Current Feed Generator Flow** (broken for custom Lexicon):
```
1. Client requests getFeedSkeleton(feed: "at://did/app.bsky.feed.generator/xxx")
2. CommunityFeedGenerator returns: { feed: [{ post: "at://did/net.atrarium.community.post/yyy" }] }
3. Bluesky AppView attempts to fetch "at://did/net.atrarium.community.post/yyy"
4. AppView fails: Unknown Lexicon "net.atrarium.community.post" ❌
```

**New Dashboard API Flow**:
```
1. Dashboard requests GET /api/communities/{id}/posts
2. CommunityFeedGenerator queries Durable Objects Storage
3. Server fetches author profiles (app.bsky.actor.profile)
4. Server returns complete post data (text + profile + metadata)
5. Dashboard renders posts directly ✅
```

**Migration Strategy**:
1. Keep Feed Generator API endpoints (backward compatibility for legacy posts)
2. Add deprecation warning in API responses
3. Update documentation to recommend Dashboard API
4. Remove Feed Generator API in Phase 2 (after all communities migrate)

**Impact**:
- `server/src/routes/feed-generator.ts`: Mark as deprecated, add migration notice
- Dashboard relies solely on `GET /api/communities/{id}/posts` (already implemented)
- Bluesky official apps cannot display Atrarium posts (expected, matches feature requirement FR-012)

**Alternatives Considered**:
- **Custom Bluesky AppView**: Rejected (violates Principle 2: Simplicity, massive operational burden)
- **Proxy posts via app.bsky.feed.post**: Rejected (defeats purpose of custom Lexicon)

---

## Summary of Decisions

| Area | Decision | Impact |
|------|----------|--------|
| **Lexicon Schema** | `record` type with `text`, `communityId`, `createdAt` | New file: `lexicons/net.atrarium.community.post.json` |
| **Firehose Filtering** | Add `net.atrarium.community.post` to collection filter | Update `FirehoseReceiver` + `FirehoseProcessor` |
| **Backward Compatibility** | Dual indexing during 7-day transition | Update `CommunityFeedGenerator.indexPost()` |
| **PDS Write** | `AtpAgent.createRecord()` with custom NSID | New method: `AtProtoService.createPost()` |
| **Durable Objects** | Add `collection` field to `PostMetadata` | Update `PostMetadata` type, no storage migration |
| **Feed Generator API** | Deprecate `getFeedSkeleton`, use Dashboard API | Mark `feed-generator.ts` as deprecated, migration notice |

**Constitution Compliance**: All decisions comply with Principles 1-9 (no new databases, PDS-first, AT Protocol only).

**Next Phase**: Phase 1 (Design & Contracts) - Generate data-model.md, contracts/*, quickstart.md
