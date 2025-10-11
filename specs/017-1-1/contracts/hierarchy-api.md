# API Contract: Hierarchical Group System

**Feature**: 017-1-1
**Date**: 2025-10-11
**Protocol**: oRPC (type-safe RPC over HTTP)
**Base Path**: Extends existing `shared/contracts/src/router.ts`

---

## Endpoints

### 1. Create Child Theme

**Route**: `groups.createChild`
**Method**: POST (via oRPC)
**Auth**: Required (JWT with DID verification)

**Input Schema** (`CreateChildInput`):
```typescript
{
  parentId: string;          // Parent group ID (must be Graduated stage)
  name: string;              // Child theme name (maxLength: 200)
  description?: string;      // Optional description (maxLength: 2000)
  feedMix?: FeedMixConfig;   // Optional feed mix ratios (defaults to parent's)
}
```

**Validation**:
```typescript
const CreateChildInputSchema = z.object({
  parentId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  feedMix: FeedMixConfigSchema.optional(),
});

// Business logic validation (in handler)
- assert(parent.stage === 'graduated', 'Parent must be Graduated stage');
- assert(user.role === 'owner', 'Only parent owner can create children');
- assert(parentGroup field set to parent AT-URI);
- assert(child.stage === 'theme', 'Children always created as Theme');
```

**Response Schema** (`GroupResponse`):
```typescript
{
  id: string;                  // Child group ID
  name: string;
  stage: 'theme';              // Always theme for new children
  parentGroup: string;     // Parent AT-URI
  hashtag: string;             // System-generated #atrarium_XXXXXXXX
  memberCount: number;         // 0 (newly created)
  createdAt: string;           // ISO 8601
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (parent not found, name too long)
- `403 Forbidden`: User is not owner of parent group
- `409 Conflict`: Parent is not Graduated stage

---

### 2. Upgrade Stage

**Route**: `groups.upgradeStage`
**Method**: POST (via oRPC)
**Auth**: Required (JWT, owner only)

**Input Schema** (`UpgradeStageInput`):
```typescript
{
  groupId: string;       // Group to upgrade
  targetStage: 'community' | 'graduated';  // Desired stage
}
```

**Validation**:
```typescript
const UpgradeStageInputSchema = z.object({
  groupId: z.string().min(1),
  targetStage: z.enum(['community', 'graduated']),
});

// Business logic validation
- assert(user.role === 'owner', 'Only owner can upgrade stage');
- if (targetStage === 'community') {
    assert(currentStage === 'theme', 'Can only upgrade from Theme');
    assert(memberCount >= 15, 'Need ~15 members for Group');
  }
- if (targetStage === 'graduated') {
    assert(currentStage === 'community', 'Can only upgrade from Community');
    assert(memberCount >= 50, 'Need ~50 members for Graduated');
  }
```

**Response Schema** (`GroupResponse`):
```typescript
{
  id: string;
  name: string;
  stage: 'community' | 'graduated';  // Updated stage
  parentGroup?: string;          // Retained (immutable)
  memberCount: number;
  updatedAt: string;                 // ISO 8601
}
```

**Error Responses**:
- `400 Bad Request`: Invalid stage transition
- `403 Forbidden`: User is not owner
- `409 Conflict`: Member count threshold not met

---

### 3. Downgrade Stage

**Route**: `groups.downgradeStage`
**Method**: POST (via oRPC)
**Auth**: Required (JWT, owner only)

**Input Schema** (`DowngradeStageInput`):
```typescript
{
  groupId: string;
  targetStage: 'theme' | 'community';  // Desired lower stage
}
```

**Validation**:
```typescript
const DowngradeStageInputSchema = z.object({
  groupId: z.string().min(1),
  targetStage: z.enum(['theme', 'community']),
});

// Business logic validation
- assert(user.role === 'owner', 'Only owner can downgrade stage');
- if (targetStage === 'community') {
    assert(currentStage === 'graduated', 'Can only downgrade from Graduated');
    warn('Children cannot be created at Group stage');
  }
- if (targetStage === 'theme') {
    assert(currentStage === 'community', 'Can only downgrade from Community');
    warn('Moderation switches to inherited mode (requires parent)');
  }
```

**Response Schema** (`GroupResponse`):
```typescript
{
  id: string;
  name: string;
  stage: 'theme' | 'community';  // Downgraded stage
  parentGroup?: string;       // Retained (immutable)
  memberCount: number;
  updatedAt: string;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid stage transition
- `403 Forbidden`: User is not owner

---

### 4. List Children

**Route**: `groups.listChildren`
**Method**: GET (via oRPC)
**Auth**: Optional (public endpoint)

**Input Schema** (`ListChildrenInput`):
```typescript
{
  parentId: string;          // Parent group ID
  limit?: number;            // Max results (default: 50, max: 100)
  cursor?: string;           // Pagination cursor (child ID)
}
```

**Validation**:
```typescript
const ListChildrenInputSchema = z.object({
  parentId: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

// Business logic validation
- assert(parent.stage === 'graduated', 'Only Graduated groups have children');
```

**Response Schema** (`ListChildrenResponse`):
```typescript
{
  children: GroupResponse[];  // Array of child groups
  cursor?: string;                // Next page cursor (if more results)
}
```

**Error Responses**:
- `404 Not Found`: Parent group not found

---

### 5. Get Parent

**Route**: `groups.getParent`
**Method**: GET (via oRPC)
**Auth**: Optional (public endpoint)

**Input Schema** (`GetParentInput`):
```typescript
{
  childId: string;  // Child group ID
}
```

**Validation**:
```typescript
const GetParentInputSchema = z.object({
  childId: z.string().min(1),
});

// Business logic validation
- if (child.parentGroup === undefined) {
    return null; // No parent
  }
```

**Response Schema** (`GroupResponse | null`):
```typescript
{
  id: string;
  name: string;
  stage: 'graduated';      // Parent is always Graduated
  hashtag: string;
  memberCount: number;
} | null
```

**Error Responses**:
- `404 Not Found`: Child group not found

---

### 6. Delete Group (Extended)

**Route**: `groups.delete` (existing endpoint, add validation)
**Method**: DELETE (via oRPC)
**Auth**: Required (JWT, owner only)

**Input Schema** (`DeleteCommunityInput`):
```typescript
{
  groupId: string;
}
```

**Validation** (NEW):
```typescript
const DeleteCommunityInputSchema = z.object({
  groupId: z.string().min(1),
});

// NEW: Business logic validation for hierarchy
- const children = await listChildren(groupId);
- if (children.length > 0) {
    throw ConflictError(
      `Cannot delete group with ${children.length} active children. ` +
      `Delete children first: ${children.map(c => c.name).join(', ')}`
    );
  }
```

**Response Schema** (`DeleteResponse`):
```typescript
{
  success: boolean;
  deletedId: string;
}
```

**Error Responses** (NEW):
- `409 Conflict`: Group has active children (includes child list in error message)

---

## Shared Schemas

### FeedMixConfig

```typescript
const FeedMixConfigSchema = z.object({
  own: z.number().int().min(0).max(100),       // Percentage from own group
  parent: z.number().int().min(0).max(100),    // Percentage from parent
  global: z.number().int().min(0).max(100),    // Percentage from global Bluesky
}).refine(
  (data) => data.own + data.parent + data.global === 100,
  'Feed mix ratios must sum to 100'
);
```

### GroupResponse (Extended)

```typescript
const GroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  stage: z.enum(['theme', 'community', 'graduated']),
  hashtag: z.string(),
  parentGroup: z.string().optional(),      // NEW: AT-URI of parent
  children: z.array(z.string()).optional(),    // NEW: Array of child IDs
  memberCount: z.number().int().min(0),
  feedMix: FeedMixConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
```

---

## Contract Implementation (oRPC Router)

**File**: `shared/contracts/src/router.ts`

```typescript
import { contract } from '@orpc/server';
import { z } from 'zod';

export const communitiesRouter = {
  // ... existing endpoints ...

  // NEW: Hierarchy endpoints
  createChild: contract
    .input(CreateChildInputSchema)
    .output(GroupResponseSchema)
    .handler(async ({ input, context }) => {
      // Implementation in server/src/routes/groups.ts
    }),

  upgradeStage: contract
    .input(UpgradeStageInputSchema)
    .output(GroupResponseSchema)
    .handler(async ({ input, context }) => {
      // Implementation in server/src/routes/groups.ts
    }),

  downgradeStage: contract
    .input(DowngradeStageInputSchema)
    .output(GroupResponseSchema)
    .handler(async ({ input, context }) => {
      // Implementation in server/src/routes/groups.ts
    }),

  listChildren: contract
    .input(ListChildrenInputSchema)
    .output(ListChildrenResponseSchema)
    .handler(async ({ input, context }) => {
      // Implementation in server/src/routes/groups.ts
    }),

  getParent: contract
    .input(GetParentInputSchema)
    .output(z.union([GroupResponseSchema, z.null()]))
    .handler(async ({ input, context }) => {
      // Implementation in server/src/routes/groups.ts
    }),

  delete: contract
    .input(DeleteCommunityInputSchema)
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      // Extended validation for children blocking
    }),
};
```

---

## Client Usage (Type-Safe)

**File**: `client/src/lib/api.ts`

```typescript
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ClientRouter } from '@atrarium/contracts';

const apiClient: ClientRouter = createORPCClient(new RPCLink({ url: baseURL }));

// Create child theme (type-safe)
const child = await apiClient.groups.createChild({
  parentId: 'abc123',
  name: 'UI Patterns',
  description: 'Design patterns for UI components',
});
// child.stage === 'theme' (TypeScript knows this)
// child.parentGroup === 'at://did:plc:xxx/net.atrarium.group.config/abc123'

// List children (type-safe)
const { children, cursor } = await apiClient.groups.listChildren({
  parentId: 'abc123',
  limit: 20,
});
// children[0].stage === 'theme' (all children are Theme)

// Upgrade stage (type-safe)
const upgraded = await apiClient.groups.upgradeStage({
  groupId: 'def456',
  targetStage: 'community',
});
// upgraded.stage === 'community' (TypeScript knows this)
```

---

## Testing Requirements

### Contract Tests (server/tests/contract/hierarchy.test.ts)

**Test Scenarios**:
1. ✅ Create child from Graduated parent → success (child is Theme with parent AT-URI)
2. ❌ Create child from Group parent → 409 Conflict
3. ❌ Create child as non-owner → 403 Forbidden
4. ✅ Upgrade Theme → Group (memberCount >= 15) → success
5. ❌ Upgrade Theme → Group (memberCount < 15) → 409 Conflict
6. ✅ Downgrade Graduated → Group → success (moderation remains independent)
7. ✅ List children of Graduated parent → returns child array
8. ✅ Get parent of Theme child → returns Graduated parent
9. ✅ Delete Graduated with children → 409 Conflict (includes child names)
10. ✅ Delete Graduated without children → success

**Example Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { apiClient } from './helpers/test-client';

describe('Hierarchy API', () => {
  it('creates child theme from graduated parent', async () => {
    const parent = await createGraduatedCommunity('Design Patterns', 50);
    const child = await apiClient.groups.createChild({
      parentId: parent.id,
      name: 'UI Patterns',
    });

    expect(child.stage).toBe('theme');
    expect(child.parentGroup).toBe(parent.atUri);
    expect(child.memberCount).toBe(0);
  });

  it('blocks deletion of parent with children', async () => {
    const parent = await createGraduatedCommunity('Parent', 50);
    const child = await apiClient.groups.createChild({ parentId: parent.id, name: 'Child' });

    await expect(
      apiClient.groups.delete({ groupId: parent.id })
    ).rejects.toThrow('Cannot delete group with 1 active children');
  });
});
```

---

## Summary

**New Endpoints**: 5 (`createChild`, `upgradeStage`, `downgradeStage`, `listChildren`, `getParent`)
**Extended Endpoints**: 1 (`delete` with children validation)
**Protocol**: oRPC (type-safe RPC with Zod validation)
**Auth**: JWT with DID verification (owner-only for mutations)
**Validation**: Stage rules, Dunbar thresholds, parent-child constraints
**Error Handling**: 400 (invalid input), 403 (forbidden), 404 (not found), 409 (conflict)
**Type Safety**: Full end-to-end (TypeScript infers types from Zod schemas)
