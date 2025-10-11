# Data Model: oRPC API Migration

**Feature ID**: 018-api-orpc
**Created**: 2025-01-11
**Status**: Complete

---

## Overview

This document describes the data entities involved in migrating legacy Hono routes to oRPC Router. **No new data models are introduced** - all entities already exist in AT Protocol Lexicon schemas. This document serves as a reference for understanding entity relationships and validation rules.

---

## Entity Catalog

### 1. Post (net.atrarium.group.post)

**Lexicon Schema**: `lexicons/net.atrarium.group.post.json`

**Description**: Community post content stored in user Personal Data Server (PDS).

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `$type` | string | Yes | Must be `"net.atrarium.group.post"` | Lexicon type identifier |
| `text` | string | Yes | 1-300 characters | Post content |
| `communityId` | string | Yes | 8-character hex (`[0-9a-f]{8}`) | Community identifier (rkey) |
| `createdAt` | string | Yes | ISO 8601 datetime | Post creation timestamp |

**Storage**:
- **PDS**: Permanent storage in user's PDS as `at://did:plc:xxx/net.atrarium.group.post/rkey`
- **Durable Object**: 7-day cache in CommunityFeedGenerator for fast feed rendering

**Relationships**:
- **Community** (1:N): One community has many posts
- **Author** (1:N): One user creates many posts
- **Reactions** (1:N): One post has many reactions

**Validation Rules**:
- Text cannot be empty
- Text length must be between 1 and 300 characters
- CommunityId must match pattern `^[0-9a-f]{8}$`
- User must be an active member of the community (verified via Durable Object RPC)

**State Transitions**:
```
[Created] → [Indexed in DO] → [Visible in feed]
          ↓
[Moderation: Hidden] → [Removed from feed index]
```

---

### 2. Emoji (net.atrarium.community.emoji)

**Lexicon Schema**: `lexicons/net.atrarium.community.emoji.json`

**Description**: Custom emoji metadata stored in user's PDS, requiring community owner approval before use.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `$type` | string | Yes | Must be `"net.atrarium.community.emoji"` | Lexicon type identifier |
| `shortcode` | string | Yes | 2-32 chars, alphanumeric + `_` | Emoji shortcode (e.g., `party_parrot`) |
| `imageBlob` | blob | Yes | PNG/GIF/WebP, <256KB | Emoji image data |
| `community` | string | Yes | AT-URI format | Community this emoji belongs to |
| `approved` | boolean | Yes | Default `false` | Approval status (owner-only) |
| `createdAt` | string | Yes | ISO 8601 datetime | Upload timestamp |

**Storage**:
- **PDS**: Permanent storage in user's PDS as `at://did:plc:xxx/net.atrarium.community.emoji/rkey`
- **Durable Object**: Emoji registry cache in CommunityFeedGenerator (approved emojis only)

**Relationships**:
- **Community** (N:1): Many emojis belong to one community
- **Uploader** (1:N): One user uploads many emojis
- **Reactions** (1:N): One emoji used in many reactions

**Validation Rules**:
- Shortcode must be unique within community
- Shortcode format: `^[a-zA-Z0-9_]{2,32}$`
- Image format: PNG, GIF, or WebP only
- Image size: Maximum 256KB
- Approval required before use in reactions (owner-only permission)

**State Transitions**:
```
[Uploaded] → [Pending Approval] → [Approved] → [Available for reactions]
                                ↓
                           [Rejected] (record deleted)
                                ↓
[Approved] → [Revoked] (owner action, removed from registry)
```

---

### 3. Reaction (net.atrarium.community.reaction)

**Lexicon Schema**: `lexicons/net.atrarium.community.reaction.json`

**Description**: User reaction to a post using Unicode emoji or custom community emoji.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `$type` | string | Yes | Must be `"net.atrarium.community.reaction"` | Lexicon type identifier |
| `postUri` | string | Yes | AT-URI format (`at://...`) | Post being reacted to |
| `emoji` | object | Yes | See Emoji Reference schema | Unicode or custom emoji |
| `communityId` | string | Yes | 8-character hex | Community context |
| `createdAt` | string | Yes | ISO 8601 datetime | Reaction timestamp |

**Emoji Reference Schema**:
```typescript
{
  type: "unicode" | "custom",
  value: string  // Unicode character (e.g., "👍") or custom shortcode (e.g., "party_parrot")
}
```

**Storage**:
- **PDS**: Permanent storage in user's PDS as `at://did:plc:xxx/net.atrarium.community.reaction/rkey`
- **Durable Object**: Reaction aggregates in CommunityFeedGenerator (count by emoji, reactors list)

**Relationships**:
- **Post** (N:1): Many reactions to one post
- **Reactor** (1:N): One user creates many reactions
- **Emoji** (N:1): Many reactions use one emoji (if custom)
- **Community** (N:1): Many reactions in one community

**Validation Rules**:
- Post URI must exist in PDS
- User must be active member of community
- Custom emoji must be approved in community registry
- Rate limit: 100 reactions per hour per user
- One reaction per (user, post, emoji) tuple (duplicates rejected)

**State Transitions**:
```
[Created] → [Aggregated in DO] → [Visible in post reaction bar]
          ↓
[Deleted] (user removes own reaction)
```

**Aggregate Structure** (Durable Object):
```typescript
interface ReactionAggregate {
  emoji: EmojiReference;
  count: number;
  reactors: string[];  // DIDs of users who reacted
  currentUserReacted: boolean;  // For authenticated requests
}
```

---

### 4. Moderation Action (net.atrarium.moderation.action)

**Lexicon Schema**: `lexicons/net.atrarium.moderation.action.json`

**Description**: Admin action against a post or user in a community.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `$type` | string | Yes | Must be `"net.atrarium.moderation.action"` | Lexicon type identifier |
| `action` | string | Yes | `hide_post`, `unhide_post`, `block_user`, `unblock_user` | Action type |
| `target` | object | Yes | See Target schema | Post or user being moderated |
| `community` | string | Yes | AT-URI format | Community context |
| `reason` | string | No | Enum value (see types.ts) | Moderation reason (optional) |
| `createdAt` | string | Yes | ISO 8601 datetime | Action timestamp |

**Target Schema**:
```typescript
{
  // For post actions (hide/unhide):
  uri?: string;   // Post AT-URI
  cid?: string;   // Post CID (optional)

  // For user actions (block/unblock):
  did?: string;   // User DID
}
```

**Storage**:
- **PDS**: Permanent storage in moderator's PDS as `at://did:plc:xxx/net.atrarium.moderation.action/rkey`
- **Durable Object**: Moderation index in CommunityFeedGenerator (affects feed visibility)

**Relationships**:
- **Community** (N:1): Many actions in one community
- **Moderator** (1:N): One moderator performs many actions
- **Target Post** (N:1): Many actions on one post (hide/unhide sequence)
- **Target User** (N:1): Many actions on one user (block/unblock sequence)

**Validation Rules**:
- Action must be one of: `hide_post`, `unhide_post`, `block_user`, `unblock_user`
- User performing action must have `owner` or `moderator` role
- Post actions require `target.uri`
- User actions require `target.did`
- Reason is optional but recommended (enum-based, see MODERATION_REASONS in types.ts)

**State Transitions**:
```
[Post Visible] → [hide_post action] → [Post Hidden]
                                     ↓
[Post Hidden] → [unhide_post action] → [Post Visible]

[User Active] → [block_user action] → [User Blocked (posts filtered)]
                                     ↓
[User Blocked] → [unblock_user action] → [User Active]
```

---

## Entity Relationships Diagram

```
┌─────────────────────┐
│   Community Config  │ (net.atrarium.group.config)
│   (Lexicon schema)  │
└──────────┬──────────┘
           │ 1:N
           ↓
┌──────────────────────┐
│    Membership        │ (net.atrarium.group.membership)
│  (Lexicon schema)    │
└──────────┬───────────┘
           │ 1:N
           ↓
┌──────────────────────┐         ┌─────────────────────┐
│    Post              │ 1:N ←→ │    Reaction         │
│  (group.post)        │         │ (community.reaction)│
└──────────┬───────────┘         └──────────┬──────────┘
           │                                │
           │ 1:N                            │ N:1
           ↓                                ↓
┌──────────────────────┐         ┌─────────────────────┐
│ Moderation Action    │         │   Custom Emoji      │
│ (moderation.action)  │         │ (community.emoji)   │
└──────────────────────┘         └─────────────────────┘
```

**Key Observations**:
- All entities already exist in Lexicon schemas (no new definitions needed)
- oRPC migration changes **handler implementation** only, not data structures
- PDS remains source of truth for all entities
- Durable Objects provide 7-day cache for performance optimization

---

## Migration Impact on Data Model

### What Changes
- ❌ **No schema changes**: Lexicon definitions remain unchanged
- ❌ **No storage changes**: PDS + Durable Objects architecture unchanged
- ✅ **Handler refactoring**: Legacy Hono routes → oRPC Router handlers
- ✅ **Validation location**: Manual checks → Zod schemas (same rules, different enforcement)

### What Stays the Same
- AT Protocol Lexicon schemas (`net.atrarium.*`)
- PDS storage format (AT-URI, record structure)
- Durable Objects indexing logic
- Client-side data models (API response schemas)

### Backward Compatibility
- ✅ API request/response formats identical
- ✅ PDS record structure unchanged
- ✅ Durable Object RPC methods unchanged
- ✅ Client migration is gradual (no breaking changes)

---

## Validation Summary

| Entity | Validation Type | Enforced By |
|--------|----------------|-------------|
| Post | Schema validation | Zod (`CreatePostInputSchema`) |
| Post | Membership check | Durable Object RPC (`checkMembership`) |
| Emoji | Schema validation | Zod (`UploadEmojiInputSchema`) |
| Emoji | Approval check | PDS query (`approved` field) |
| Reaction | Schema validation | Zod (`AddReactionInputSchema`) |
| Reaction | Rate limiting | Durable Object state (100/hour) |
| Moderation | Permission check | PDS membership query (`role` field) |

**Key Insight**: oRPC migration **improves validation consistency** by using Zod schemas instead of manual inline checks, but underlying validation rules remain identical.

---

## References

- **Lexicon Schemas**: `/workspaces/atrarium/lexicons/*.json`
- **Zod Schemas**: `/workspaces/atrarium/shared/contracts/src/schemas.ts`
- **Type Definitions**: `/workspaces/atrarium/server/src/types.ts`
- **PDS Service**: `/workspaces/atrarium/server/src/services/atproto.ts`
- **Durable Objects**: `/workspaces/atrarium/server/src/durable-objects/community-feed-generator.ts`

---

*This data model serves as reference documentation only. No implementation changes are required to entity schemas.*
