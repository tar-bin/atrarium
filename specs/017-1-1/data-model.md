# Data Model: Hierarchical Group System

**Feature**: 017-1-1
**Date**: 2025-10-11
**Status**: Complete

## Overview

This document defines the data model for hierarchical group relationships. All entities reuse existing `net.atrarium.*` Lexicon schemas without modifications. Durable Objects Storage extends existing cache schema with parent-child relationship keys.

---

## Entities

### 1. Group (Group)

**Lexicon Schema**: `net.atrarium.group.config`
**Storage**: PDS (permanent) + Durable Objects Storage (7-day cache)

**Attributes**:
| Field | Type | Description | Validation | Immutable |
|-------|------|-------------|------------|-----------|
| `name` | string | Group display name | maxLength: 200, maxGraphemes: 100 | No |
| `description` | string? | Purpose statement | maxLength: 2000, maxGraphemes: 1000 | No |
| `hashtag` | string | System-generated feed ID | format: `#atrarium_[0-9a-f]{8}` | Yes |
| `stage` | enum | Maturity level | `theme \| group \| graduated` | No (upgradable/downgradable) |
| `parentGroup` | AT-URI? | Parent group reference | Valid AT-URI pointing to Graduated-stage group | **Yes** |
| `moderators` | DID[] | Moderator DIDs | maxLength: 50, format: did | No |
| `blocklist` | DID[] | Blocked user DIDs | maxLength: 1000, format: did | No |
| `feedMix` | object | Content mixing ratios | own + parent + global = 100 | No |
| `createdAt` | datetime | Creation timestamp | ISO 8601 | Yes |
| `updatedAt` | datetime | Last update timestamp | ISO 8601 | No |

**Validation Rules**:
```typescript
// Stage progression (Dunbar numbers)
if (stage === 'theme' && memberCount >= 15) {
  canUpgradeTo('community');
}
if (stage === 'community' && memberCount >= 50) {
  canUpgradeTo('graduated');
}

// Parent-child rules
if (parentGroup !== undefined) {
  assert(stage === 'theme', 'Only Theme groups can have parents');
  assert(parentGroup.stage === 'graduated', 'Parent must be Graduated');
}
if (stage === 'graduated') {
  canCreateChildren(); // Child groups created as Theme
}
if (stage === 'community') {
  cannotHaveParent();
  cannotCreateChildren();
}

// Deletion blocking
if (hasChildren()) {
  throw ConflictError('Cannot delete parent with active children');
}
```

**Relationships**:
- **Parent**: Theme group MAY reference ONE Graduated group (via `parentGroup` AT-URI)
- **Children**: Graduated group MAY have MULTIPLE Theme children (inverse relationship)

**Lifecycle Transitions**:
```
Created → Theme (initial state)
  ↓ (memberCount >= ~15)
Theme → Group (upgrade)
  ↓ (memberCount >= ~50)
Group → Graduated (upgrade)
  ↓ (bidirectional)
Graduated → Community → Theme (downgrade allowed)
```

**Durable Objects Storage Keys**:
```
config:<groupId>        → GroupConfig (existing)
parent:<groupId>        → AT-URI | undefined (NEW)
children:<parentId>         → string[] (child IDs) (NEW)
```

---

### 2. Group Membership

**Lexicon Schema**: `net.atrarium.group.membership`
**Storage**: PDS (permanent) + Durable Objects Storage (7-day cache)

**Attributes**:
| Field | Type | Description | Validation | Immutable |
|-------|------|-------------|------------|-----------|
| `group` | AT-URI | Group reference | Valid AT-URI | Yes |
| `role` | enum | User role | `owner \| moderator \| member` | No |
| `status` | enum | Membership status | `active \| pending` | No |
| `joinedAt` | datetime | Join timestamp | ISO 8601 | Yes |
| `active` | boolean | Currently active | default: true | No |
| `invitedBy` | DID? | Inviter DID | format: did | Yes |
| `customTitle` | string? | Custom role title | maxLength: 100, maxGraphemes: 50 | No |

**Validation Rules**:
```typescript
// No automatic membership inheritance
// User must join each group independently
assert(
  !parentMembership.implies(childMembership),
  'Membership is independent per group'
);

// Member count for stage progression
function getMemberCount(groupId: string): number {
  return query(`SELECT COUNT(*) FROM membership WHERE group = ? AND active = true`, groupId);
}
```

**Relationships**:
- **Group**: References one group (no multi-group memberships per record)
- **User**: References one user DID

**No Inheritance**: Membership in parent does NOT grant membership in children (independent per group)

**Durable Objects Storage Keys**:
```
member:<did>  → MembershipRecord (existing, unchanged)
```

---

### 3. Group Stage

**Type**: Enumeration (not stored separately, part of Group entity)

**Values**:
| Value | Description | Member Target | Parent Allowed? | Children Allowed? | Moderation |
|-------|-------------|---------------|-----------------|-------------------|------------|
| `theme` | Initial state, focused topic | ~15 | Yes (Graduated only) | No | Inherited from parent |
| `group` | Transitional, maturing | ~50 | No | No | Independent |
| `graduated` | Fully independent | 50+ | No | Yes (Theme only) | Independent |

**Validation Rules**:
```typescript
type Stage = 'theme' | 'group' | 'graduated';

const STAGE_RULES = {
  theme: {
    memberTarget: 15,
    canHaveParent: true,
    parentMustBe: 'graduated',
    canCreateChildren: false,
    moderationMode: 'inherited', // Uses parent's moderators
  },
  group: {
    memberTarget: 50,
    canHaveParent: false,
    parentMustBe: null,
    canCreateChildren: false,
    moderationMode: 'independent',
  },
  graduated: {
    memberTarget: 50,
    canHaveParent: false,
    parentMustBe: null,
    canCreateChildren: true,
    childrenMustBe: 'theme',
    moderationMode: 'independent',
  },
};
```

---

## Hierarchy Constraints

### 1. Maximum Depth: 1 Level

```
Graduated → Theme (ALLOWED)
Graduated → Theme → Theme (FORBIDDEN - no grandchildren)
```

**Validation**: Firehose indexing rejects records where `parent.parent !== undefined`

### 2. Stage Combination Matrix

| Parent Stage | Child Stage | Valid? |
|--------------|-------------|--------|
| graduated    | theme       | ✅ Yes |
| graduated    | group   | ❌ No  |
| graduated    | graduated   | ❌ No  |
| group    | any         | ❌ No  |
| theme        | any         | ❌ No  |

### 3. Circular Reference Prevention

**Validation Logic**:
```typescript
function validateParent(childId: string, parentId: string): void {
  if (childId === parentId) {
    throw ValidationError('Group cannot be its own parent');
  }

  const parent = getGroup(parentId);
  if (parent.parentGroup !== undefined) {
    throw ValidationError('Parent cannot have a parent (max depth 1)');
  }

  // Check for circular reference (should never happen with 1-level constraint)
  if (parent.parentGroup === childId) {
    throw ValidationError('Circular reference detected');
  }
}
```

---

## Data Operations

### Create Child Theme (Graduated Parent)

**PDS Write**:
```typescript
// 1. Validate parent is Graduated
assert(parent.stage === 'graduated', 'Parent must be Graduated');

// 2. Create child group record in PDS
await agent.com.atproto.repo.createRecord({
  repo: did,
  collection: 'net.atrarium.group.config',
  record: {
    name: 'UI Patterns',
    stage: 'theme', // Always created as Theme
    parentGroup: parentAtUri, // Immutable parent reference
    hashtag: generateHashtag(),
    createdAt: new Date().toISOString(),
  },
});

// 3. Firehose indexes → Durable Objects updates parent: + children: keys
```

**Durable Objects Cache Update** (via Firehose):
```typescript
// In child's Durable Object
await storage.put(`parent:${childId}`, parentAtUri);

// In parent's Durable Object
const children = await storage.get<string[]>(`children:${parentId}`) || [];
children.push(childId);
await storage.put(`children:${parentId}`, children);
```

### Stage Upgrade (Theme → Group)

**PDS Write**:
```typescript
// 1. Validate member count threshold
const memberCount = await getMemberCount(groupId);
assert(memberCount >= 15, 'Need ~15 members to upgrade to Group');

// 2. Update stage in PDS
await agent.com.atproto.repo.putRecord({
  repo: did,
  collection: 'net.atrarium.group.config',
  rkey: recordKey,
  record: {
    ...existingRecord,
    stage: 'group', // Theme → Group
    updatedAt: new Date().toISOString(),
  },
});

// 3. Parent reference remains (immutable)
// 4. Moderation switches from inherited → independent
```

### Delete Parent (Blocked if Children Exist)

**Validation**:
```typescript
// 1. Query children from Durable Objects
const children = await storage.get<string[]>(`children:${parentId}`);

// 2. Block deletion if children exist
if (children && children.length > 0) {
  throw ConflictError(
    `Cannot delete parent with ${children.length} active children. Delete children first.`
  );
}

// 3. Proceed with deletion if no children
await agent.com.atproto.repo.deleteRecord({
  repo: did,
  collection: 'net.atrarium.group.config',
  rkey: recordKey,
});
```

---

## Query Patterns

### List Children of Parent

**Durable Objects Query**:
```typescript
const childIds = await storage.get<string[]>(`children:${parentId}`) || [];
const children = await Promise.all(
  childIds.map(id => storage.get<GroupConfig>(`config:${id}`))
);
return children.filter(Boolean); // Filter out expired cache entries
```

### Get Parent of Child

**Durable Objects Query**:
```typescript
const parentUri = await storage.get<string>(`parent:${childId}`);
if (!parentUri) return null;

const parentId = extractIdFromAtUri(parentUri);
return storage.get<GroupConfig>(`config:${parentId}`);
```

### Aggregate Child Posts in Parent Feed

**Durable Objects Query**:
```typescript
// Get parent + children IDs
const parentId = groupId;
const childIds = await storage.get<string[]>(`children:${parentId}`) || [];
const allIds = [parentId, ...childIds];

// Query posts from all groups
const posts: PostMetadata[] = [];
for (const id of allIds) {
  const groupPosts = await storage.list<PostMetadata>({
    prefix: `post:`,
    reverse: true, // Newest first
    limit: 50,
  });
  posts.push(...groupPosts.values());
}

// Sort by timestamp, return newest
return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
```

---

## Summary

**Entities**: 3 (Group, Membership, Stage enum)
**Storage Layers**: PDS (permanent) + Durable Objects (7-day cache)
**New Schema Fields**: None (reuses existing `parentGroup` in `net.atrarium.group.config`)
**New Durable Objects Keys**: `parent:<id>`, `children:<id>`
**Hierarchy Depth**: 1 level (Graduated → Theme only)
**Stage Transitions**: Bidirectional (upgrade/downgrade allowed)
**Deletion**: Blocked if children exist
**Membership**: Independent per group (no inheritance)
**Moderation**: Theme inherits from parent, Group/Graduated independent
