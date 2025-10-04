# Data Model: Dashboard Frontend

**Feature**: 005-pds-web-atrarim
**Date**: 2025-10-04

## Overview

This document defines frontend-specific data models (TypeScript interfaces) used in the React dashboard. These models map to existing backend API responses and local state.

---

## Entity Definitions

### 1. UserSession (Local State)

Represents an authenticated user's PDS session stored in browser memory/localStorage.

**Attributes**:
- `agent`: BskyAgent | null - @atproto/api client instance
- `did`: string | null - User's decentralized identifier (e.g., `did:plc:xxx`)
- `handle`: string | null - User's handle (e.g., `alice.test`)
- `isAuthenticated`: boolean - Whether user is logged in

**Lifecycle**:
- Created: When user successfully logs in via PDSLoginForm
- Updated: On page refresh (restore from localStorage if session valid)
- Destroyed: On logout or session expiration

**Validation**:
- `did` must match `did:plc:*` or `did:web:*` format
- `handle` must not be empty if `isAuthenticated` is true

**Storage**:
- Session token stored in localStorage as `pds_session`
- Cleared on logout

---

### 2. Community (API Response)

Maps to backend `GET /api/communities` and `GET /api/communities/:id` responses.

**Attributes**:
- `id`: string - UUID v4
- `name`: string - Community name (max 50 chars)
- `description`: string | null - Optional description
- `stage`: 'theme' | 'community' | 'graduated' - Community lifecycle stage
- `parentId`: string | null - Parent community ID (if applicable)
- `ownerDid`: string - DID of community owner
- `memberCount`: number - Total members
- `postCount`: number - Total posts across all feeds
- `createdAt`: number - Unix epoch timestamp

**Relationships**:
- Has many: `Feed[]` (theme feeds)
- Has many: `Membership[]` (members)

**Frontend-Specific Computed**:
- `isOwner`: boolean - Whether current user is owner (compare `ownerDid` with session DID)
- `isModerator`: boolean - Whether current user has moderator role

**Validation Rules**:
- `name` must be 1-50 characters
- `stage` must be one of: theme, community, graduated
- `memberCount` >= 1 (at least the owner)

---

### 3. Feed (API Response)

Maps to backend `GET /api/communities/:id/feeds` response.

**Attributes**:
- `id`: string - UUID v4
- `communityId`: string - Parent community ID
- `name`: string - Feed name (max 50 chars)
- `description`: string | null - Optional description
- `status`: 'active' | 'warning' | 'archived' - Feed status
- `hashtag`: string - System-generated hashtag (format: `#atr_xxxxx`)
- `posts7d`: number - Post count in last 7 days
- `activeUsers7d`: number - Active user count in last 7 days
- `lastPostAt`: number | null - Unix epoch of most recent post
- `createdAt`: number - Unix epoch timestamp

**Relationships**:
- Belongs to: `Community`
- Has many: `Post[]`

**Frontend-Specific Computed**:
- `isActive`: boolean - `status === 'active'`
- `hashtagForCopy`: string - Hashtag without `#` prefix (for clipboard)

**Validation Rules**:
- `name` must be 1-50 characters
- `hashtag` must match `/^#atr_[a-f0-9]{8}$/`
- `posts7d` >= 0
- `activeUsers7d` >= 0

---

### 4. Post (API Response)

Maps to backend `GET /api/posts?feedId=xxx` response.

**Attributes**:
- `id`: number - Auto-increment ID (for local sorting)
- `uri`: string - AT-URI format `at://did:plc:xxx/app.bsky.feed.post/yyy`
- `feedId`: string - Parent feed ID
- `authorDid`: string - Post author's DID
- `text`: string - Post content (max 300 chars)
- `createdAt`: number - Unix epoch timestamp
- `hasMedia`: boolean - Whether post includes images/video
- `langs`: string[] | null - BCP-47 language codes
- `moderationStatus`: 'approved' | 'hidden' | 'reported' - Moderation state
- `indexedAt`: number - Unix epoch when indexed by Atrarium

**Relationships**:
- Belongs to: `Feed`
- Belongs to: `User` (author, via DID)

**Frontend-Specific Computed**:
- `isHidden`: boolean - `moderationStatus === 'hidden'`
- `authorHandle`: string | null - Resolved handle (requires additional API call or cache)
- `formattedTime`: string - Human-readable time (e.g., "2 hours ago")

**Validation Rules**:
- `uri` must match AT-URI format
- `text` must not exceed 300 characters
- `moderationStatus` must be one of: approved, hidden, reported

---

### 5. ModerationAction (API Response)

Maps to backend `GET /api/moderation/logs` response.

**Attributes**:
- `id`: number - Auto-increment ID
- `action`: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user' | 'remove_member'
- `targetUri`: string - Post URI or user DID
- `feedId`: string | null - Affected feed ID
- `communityId`: string | null - Affected community ID
- `moderatorDid`: string - DID of moderator who performed action
- `reason`: string | null - Optional reason for action
- `performedAt`: number - Unix epoch timestamp

**Relationships**:
- Belongs to: `Feed` (if `feedId` not null)
- Belongs to: `Community` (if `communityId` not null)
- Belongs to: `User` (moderator)

**Frontend-Specific Computed**:
- `actionLabel`: string - Human-readable action (e.g., "Hide Post", "Block User")
- `formattedTime`: string - Human-readable time

**Validation Rules**:
- `action` must be one of the enum values
- `targetUri` must be valid AT-URI or DID
- At least one of `feedId` or `communityId` must be set

---

### 6. Membership (API Response)

Maps to backend `GET /api/communities/:id/memberships` response.

**Attributes**:
- `userDid`: string - Member's DID
- `communityId`: string - Community ID
- `role`: 'owner' | 'moderator' | 'member' - User role
- `joinedAt`: number - Unix epoch timestamp
- `lastActivityAt`: number - Unix epoch of last action

**Relationships**:
- Belongs to: `Community`
- Belongs to: `User` (via DID)

**Frontend-Specific Computed**:
- `isModerator`: boolean - `role === 'moderator' || role === 'owner'`
- `canModerate`: boolean - `role === 'moderator' || role === 'owner'`
- `canCreateFeeds`: boolean - Always `true` (all members can create feeds per clarification)

**Validation Rules**:
- `role` must be one of: owner, moderator, member
- Composite key: `(userDid, communityId)` must be unique

---

## State Management

### Local State (React Context)

**PDSContext**:
- `agent`: BskyAgent | null
- `login(handle: string, password: string): Promise<void>`
- `logout(): void`

**APIContext** (optional, can use Hono client directly):
- `client`: Hono RPC client instance
- Provides type-safe API calls

### Component-Level State

**CommunityList**:
- `communities`: Community[]
- `loading`: boolean
- `error`: string | null

**FeedDetail**:
- `feed`: Feed | null
- `posts`: Post[]
- `loading`: boolean
- `error`: string | null

**ModerationLog**:
- `actions`: ModerationAction[]
- `loading`: boolean
- `error`: string | null

---

## Type Definitions (TypeScript)

**File**: `dashboard/src/types/index.ts`

```typescript
// PDS Session
export interface UserSession {
  agent: BskyAgent | null;
  did: string | null;
  handle: string | null;
  isAuthenticated: boolean;
}

// API Response Types
export type CommunityStage = 'theme' | 'community' | 'graduated';
export type FeedStatus = 'active' | 'warning' | 'archived';
export type MembershipRole = 'owner' | 'moderator' | 'member';
export type ModerationStatus = 'approved' | 'hidden' | 'reported';
export type ModerationActionType = 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user' | 'remove_member';

export interface Community {
  id: string;
  name: string;
  description: string | null;
  stage: CommunityStage;
  parentId: string | null;
  ownerDid: string;
  memberCount: number;
  postCount: number;
  createdAt: number;
}

export interface Feed {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  status: FeedStatus;
  hashtag: string;
  posts7d: number;
  activeUsers7d: number;
  lastPostAt: number | null;
  createdAt: number;
}

export interface Post {
  id: number;
  uri: string;
  feedId: string;
  authorDid: string;
  text: string;
  createdAt: number;
  hasMedia: boolean;
  langs: string[] | null;
  moderationStatus: ModerationStatus;
  indexedAt: number;
}

export interface ModerationAction {
  id: number;
  action: ModerationActionType;
  targetUri: string;
  feedId: string | null;
  communityId: string | null;
  moderatorDid: string;
  reason: string | null;
  performedAt: number;
}

export interface Membership {
  userDid: string;
  communityId: string;
  role: MembershipRole;
  joinedAt: number;
  lastActivityAt: number;
}
```

---

## Data Flow

### 1. Community List Page

```
User → CommunityList component
  ↓
  Fetch: GET /api/communities
  ↓
  API returns: Community[]
  ↓
  Render: CommunityCard for each community
```

### 2. Feed Creation Flow

```
User → CreateFeedModal
  ↓
  Input: name, description
  ↓
  POST /api/communities/:id/feeds
  ↓
  API returns: Feed (with generated hashtag)
  ↓
  Display: Success + copy hashtag button
```

### 3. Post Creation Flow

```
User → CreatePostForm
  ↓
  Input: text
  ↓
  Client: Append feed.hashtag to text
  ↓
  PDS: agent.post({ text: textWithHashtag })
  ↓
  Success: Display post URI
```

### 4. Moderation Flow

```
User → PostCard → Hide button
  ↓
  Confirmation dialog
  ↓
  POST /api/moderation/posts/:uri/hide
  ↓
  Success: Remove from public view, add to "Hidden Posts" tab
```

---

## Summary

All frontend data models mapped to existing backend API responses. No backend schema changes required. Type definitions ensure end-to-end type safety with Hono RPC client.

**Ready for Phase 1: Contracts generation**
