# Data Model: Client Use Case Implementation

**Feature**: `013-` | **Date**: 2025-10-07
**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

## Overview

This document defines the data entities and their relationships for implementing general user and community administrator use cases in the Atrarium client. All persistent data is stored in user Personal Data Servers (PDS) using AT Protocol Lexicon schemas (`net.atrarium.*`), adhering to Constitution Principle 8 (PDS-only storage).

**Clarification from /clarify session**:
- Join requests use `status: 'pending'` field in existing `net.atrarium.community.membership` schema (no new Lexicon schema needed)
- Community statistics limited to PDS-feasible metrics: member count only (no activity metrics)

## Entities

### 1. Community Membership

**Lexicon Schema**: `net.atrarium.community.membership` (EXISTING, EXTENDED)

**Storage Location**: User's PDS (requester/member's PDS)

**Fields**:
```typescript
{
  did: string;                    // User DID (member/requester)
  community: string;              // Community ID
  role: 'owner' | 'moderator' | 'member';
  status: 'active' | 'pending';   // NEW FIELD: 'pending' for join requests, 'active' for approved members
  joinedAt: string;               // ISO 8601 timestamp (request time for pending, approval time for active)
  active: boolean;                // false if user left or was removed
}
```

**Constraints**:
- Each community MUST have exactly one `role: 'owner'` with `status: 'active'`
- `status: 'pending'` is valid only for `role: 'member'` (join requests)
- `status: 'active'` required for owner and moderator roles
- `active: false` implies user left or was removed (membership deactivated)

**State Transitions**:
```
[No Record] --join open community--> [status: 'active', role: 'member', active: true]
[No Record] --request join invite-only--> [status: 'pending', role: 'member', active: false]
[status: 'pending'] --admin approve--> [status: 'active', active: true]
[status: 'pending'] --admin reject--> [DELETED]
[status: 'active'] --user leaves--> [active: false]
[status: 'active'] --admin removes--> [active: false]
[role: 'member'] --owner promotes--> [role: 'moderator']
[role: 'moderator'] --owner demotes--> [role: 'member']
[role: 'member'] --owner transfers ownership--> [old owner: role: 'member', new owner: role: 'owner']
```

**Validation Rules**:
- FR-030: Prevent duplicate join (query existing membership before creating)
- FR-013a: Enforce exactly one owner per community
- FR-003a: `status: 'pending'` only for invite-only communities

### 2. Community Config

**Lexicon Schema**: `net.atrarium.community.config` (EXISTING, EXTENDED)

**Storage Location**: Community owner's PDS

**Fields**:
```typescript
{
  name: string;
  hashtag: string;                // Format: #atrarium_[0-9a-f]{8}
  stage: 'theme' | 'community' | 'graduated';
  accessType: 'open' | 'invite-only';  // NEW FIELD (per /clarify session)
  createdAt: string;              // ISO 8601 timestamp
  moderators?: string[];          // Array of moderator DIDs (optional)
  feedMix?: object;               // Feed configuration (optional)
}
```

**Constraints**:
- `accessType` determines join workflow (immediate vs approval-required)
- `moderators` array updated when owner promotes/demotes members

**Validation Rules**:
- FR-002: Display `accessType` in community browser
- FR-003/FR-003a: Use `accessType` to determine join button behavior

### 3. Moderation Action

**Lexicon Schema**: `net.atrarium.moderation.action` (EXISTING)

**Storage Location**: Moderator's PDS

**Fields**:
```typescript
{
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: string;                 // Post URI (at://...) or User DID
  community: string;              // Community ID
  reason: string;                 // Moderation reason (required for hide/block)
  moderator: string;              // Moderator DID
  timestamp: string;              // ISO 8601 timestamp
}
```

**Constraints**:
- Last-Write-Wins (LWW) conflict resolution based on `timestamp` (FR-031)
- Only administrators (owner + moderators) can create moderation actions (FR-023)
- Owner can moderate any content, moderators can moderate regular member posts only (FR-024)

**Validation Rules**:
- FR-028: Validate moderator permissions before creating action
- FR-031: Use `timestamp` for LWW conflict resolution

### 4. User Session

**Storage**: Client-side (React Context)

**Not persisted in PDS** (ephemeral state)

**Fields**:
```typescript
{
  did: string;                    // User DID
  handle: string;                 // User handle (e.g., alice.bsky.social)
  pdsUrl: string;                 // PDS endpoint URL
  accessJwt: string;              // Access token
  refreshJwt: string;             // Refresh token
  authenticated: boolean;         // Session state
}
```

**Source**: `client/src/contexts/PDSContext.tsx` (EXISTING)

### 5. Community Metadata (Derived)

**Storage**: Durable Objects (7-day ephemeral cache)

**Not in PDS** (computed from membership + config records)

**Fields**:
```typescript
{
  communityId: string;
  name: string;                   // From CommunityConfig
  description: string;            // From CommunityConfig
  hashtag: string;                // From CommunityConfig
  stage: string;                  // From CommunityConfig
  accessType: string;             // From CommunityConfig
  memberCount: number;            // COUNT(membership WHERE status='active' AND active=true)
  pendingRequestCount: number;    // COUNT(membership WHERE status='pending') - NEW per /clarify
  owner: string;                  // DID of owner (role='owner')
  moderators: string[];           // DIDs of moderators
  createdAt: string;
}
```

**Computation** (per /clarify session on Community Statistics):
- `memberCount`: Count `net.atrarium.community.membership` records with `status: 'active'` AND `active: true`
- `pendingRequestCount`: Count `net.atrarium.community.membership` records with `status: 'pending'`
- **Activity metrics (post volume, active members) are OUT OF SCOPE** per Principle 8 (PDS-only storage compliance)

**Update Strategy**:
- Static data (name, description, stage, accessType): TanStack Query 5-minute cache (FR-034)
- Dynamic data (memberCount, pendingRequestCount): TanStack Query 10-30 second polling (FR-034)

## Relationships

```
User (DID)
  ├──> Community Membership (1:N)
  │     ├── community: string (FK to CommunityConfig)
  │     ├── role: owner | moderator | member
  │     ├── status: active | pending
  │     └── active: boolean
  │
  ├──> Moderation Action (1:N) [as moderator]
  │     ├── community: string (FK to CommunityConfig)
  │     ├── target: Post URI or User DID
  │     └── action: hide_post | unhide_post | block_user | unblock_user
  │
  └──> User Session (1:1) [ephemeral, client-side]
        ├── accessJwt
        └── refreshJwt

Community (CommunityConfig)
  ├──> Community Membership (1:N)
  │     └── Constraints: exactly 1 owner, 0+ moderators, 0+ members
  │
  ├──> Moderation Action (1:N)
  │     └── Scoped to this community
  │
  └──> Community Metadata (1:1) [derived, cached in Durable Objects]
        ├── memberCount (computed from memberships)
        └── pendingRequestCount (computed from memberships with status='pending')
```

## Indexing Strategy

**PDS Queries** (via @atproto/api):
- List user memberships: `listRecords('net.atrarium.community.membership', { repo: userDid })`
- List community members: `listRecords('net.atrarium.community.membership', { collection: 'net.atrarium.community.membership' })` → filter by `community` + `status='active'` + `active=true`
- List pending join requests: Filter memberships by `community` + `status='pending'`
- List moderation history: `listRecords('net.atrarium.moderation.action', { repo: moderatorDid })` → filter by `community`

**Durable Objects Cache**:
- Key schema: `member:<did>`, `post:<timestamp>:<rkey>`, `moderation:<uri>`
- 7-day TTL with scheduled cleanup (existing architecture)

## Validation Summary

| Requirement | Enforced By | Validation Method |
|-------------|-------------|-------------------|
| FR-007 (PDS persistence) | PDS write operations | `createRecord()` calls in `server/src/services/atproto.ts` |
| FR-013a (one owner) | Server validation | Query existing memberships before promoting/transferring ownership |
| FR-021 (moderation persistence) | PDS write operations | `createRecord()` for moderation actions |
| FR-025 (PDS-feasible stats) | Server aggregation | COUNT queries on membership records (no activity metrics) |
| FR-028 (permission validation) | Server middleware | Check user role before moderation actions |
| FR-030 (no duplicate join) | Server validation | Query existing membership before creating new record |
| FR-031 (LWW conflict resolution) | Client/server logic | Compare `timestamp` fields, keep latest |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User tries to join already-joined community | FR-030: Server returns 409 Conflict, client shows "Already a member" |
| User loses membership while viewing feed | Client polls membership status (10-30s), shows "Membership revoked" message |
| Administrator moderates another admin's post | FR-024: Owner can moderate moderator posts, moderators cannot |
| Blocked user's posts in feed | FR-006: Server filters out posts from blocked users in feed response |
| PDS unavailable during join | FR-027: Display error message, retry with exponential backoff |
| Community deleted while user viewing | FR-029: Show "Community no longer exists" message, redirect to communities list |
| Concurrent moderation actions | FR-031: Last-Write-Wins based on `timestamp`, UI shows latest state after polling |

## Schema Extensions

**Required Lexicon Schema Updates**:

1. **`net.atrarium.community.membership`**:
   - Add `status` field: `'active' | 'pending'`
   - Update validation to allow `status: 'pending'` for join requests

2. **`net.atrarium.community.config`**:
   - Add `accessType` field: `'open' | 'invite-only'`
   - Update validation to enforce `accessType` presence

**No New Lexicon Schemas Required** (per /clarify session):
- Join requests use `status: 'pending'` in existing `membership` schema
- No `net.atrarium.community.joinRequest` schema needed

## References

- [spec.md](./spec.md) - Functional requirements (FR-001 ~ FR-036)
- [plan.md](./plan.md) - Architecture decisions
- Existing Lexicon schemas: `lexicons/net.atrarium.*.json`
- AT Protocol Lexicon docs: https://atproto.com/specs/lexicon
