# Communities Hierarchy API Contract

**Feature**: 019-communities-api-api
**Protocol**: oRPC (type-safe RPC over HTTP)
**Base Path**: `/api/communities`

## Endpoint 1: Create Child Community

**Contract Reference**: `contract.communities.createChild`
**Method**: POST
**Path**: `/api/communities/:id/children`
**Auth**: Required (owner of parent community)

### Request

**Path Parameters**:
- `id` (string): Parent community ID (rkey or AT-URI)

**Body** (`CreateChildInputSchema`):
```typescript
{
  parentId: string;           // Parent group ID (must be Graduated stage)
  name: string;               // Child theme name (1-200 chars)
  description?: string;       // Optional description (max 2000 chars)
  feedMix?: {                 // Optional feed mix ratios
    own: number;              // 0-100, percentage from own group
    parent: number;           // 0-100, percentage from parent
    global: number;           // 0-100, percentage from global Bluesky
  };                          // Must sum to 100
}
```

### Response

**Success (200)** (`GroupResponseSchema`):
```typescript
{
  id: string;                 // Child community ID (rkey)
  name: string;
  description: string | null;
  stage: 'theme';             // Always 'theme' for new children
  hashtag: string;            // #atrarium_[8-hex]
  parentGroup: string;        // AT-URI of parent group
  memberCount: number;        // 1 (owner)
  postCount: number;          // 0
  feedMix?: {
    own: number;
    parent: number;
    global: number;
  };
  createdAt: number;          // Unix timestamp (seconds)
}
```

**Errors**:
- `FORBIDDEN`: User is not owner of parent community
- `BAD_REQUEST`: Parent is not graduated stage, or feed mix ratios invalid
- `NOT_FOUND`: Parent community not found
- `INTERNAL_SERVER_ERROR`: PDS or DO operation failed

### Business Rules

1. Only owners can create children under their communities
2. Only graduated-stage communities can have children
3. Children always start at theme stage (never community or graduated)
4. Feed mix ratios must sum to 100 if provided
5. Default feed mix (if not provided): 80% own, 0% parent, 20% global

### Example Request

```json
POST /api/communities/abc12345/children
Authorization: Bearer <jwt>

{
  "parentId": "abc12345",
  "name": "Design Theme",
  "description": "UI/UX design discussions",
  "feedMix": {
    "own": 50,
    "parent": 30,
    "global": 20
  }
}
```

### Example Response

```json
{
  "id": "def67890",
  "name": "Design Theme",
  "description": "UI/UX design discussions",
  "stage": "theme",
  "hashtag": "#atrarium_def67890",
  "parentGroup": "at://did:plc:xxx/net.atrarium.group.config/abc12345",
  "memberCount": 1,
  "postCount": 0,
  "feedMix": {
    "own": 50,
    "parent": 30,
    "global": 20
  },
  "createdAt": 1704931200
}
```

---

## Endpoint 2: Upgrade Community Stage

**Contract Reference**: `contract.communities.upgradeStage`
**Method**: POST
**Path**: `/api/communities/:id/upgrade`
**Auth**: Required (owner of community)

### Request

**Path Parameters**:
- `id` (string): Community ID to upgrade

**Body** (`UpgradeStageInputSchema`):
```typescript
{
  groupId: string;            // Community to upgrade
  targetStage: 'community' | 'graduated';  // Desired stage
}
```

### Response

**Success (200)** (`GroupResponseSchema`):
```typescript
{
  id: string;
  name: string;
  description: string | null;
  stage: 'community' | 'graduated';  // Updated stage
  hashtag: string;
  parentGroup?: string;       // AT-URI of parent (if child)
  memberCount: number;
  postCount: number;
  feedMix?: { own: number; parent: number; global: number; };
  createdAt: number;
  updatedAt: number;          // Timestamp of stage change
}
```

**Errors**:
- `FORBIDDEN`: User is not owner of community
- `BAD_REQUEST`: Invalid stage transition (skipping stages, insufficient members)
- `NOT_FOUND`: Community not found

### Business Rules

1. Only owners can upgrade their communities
2. Cannot skip stages (theme → graduated requires intermediate community stage)
3. Member count thresholds:
   - theme → community: 10+ active members
   - community → graduated: 50+ active members
4. Active members = memberships with `status='active'` and `active=true`

### Example Request

```json
POST /api/communities/abc12345/upgrade
Authorization: Bearer <jwt>

{
  "groupId": "abc12345",
  "targetStage": "community"
}
```

### Example Response

```json
{
  "id": "abc12345",
  "name": "Tech Community",
  "description": "Technology discussions",
  "stage": "community",
  "hashtag": "#atrarium_abc12345",
  "memberCount": 15,
  "postCount": 42,
  "createdAt": 1704931200,
  "updatedAt": 1705017600
}
```

---

## Endpoint 3: Downgrade Community Stage

**Contract Reference**: `contract.communities.downgradeStage`
**Method**: POST
**Path**: `/api/communities/:id/downgrade`
**Auth**: Required (owner of community)

### Request

**Path Parameters**:
- `id` (string): Community ID to downgrade

**Body** (`DowngradeStageInputSchema`):
```typescript
{
  groupId: string;            // Community to downgrade
  targetStage: 'theme' | 'community';  // Desired lower stage
}
```

### Response

**Success (200)** (`GroupResponseSchema`):
```typescript
{
  id: string;
  name: string;
  description: string | null;
  stage: 'theme' | 'community';  // Downgraded stage
  hashtag: string;
  parentGroup?: string;
  memberCount: number;
  postCount: number;
  feedMix?: { own: number; parent: number; global: number; };
  createdAt: number;
  updatedAt: number;
}
```

**Errors**:
- `FORBIDDEN`: User is not owner of community
- `BAD_REQUEST`: Invalid stage transition (skipping stages)
- `CONFLICT`: Graduated community has active children (must remove first)
- `NOT_FOUND`: Community not found

### Business Rules

1. Only owners can downgrade their communities
2. Cannot skip stages (graduated → theme requires intermediate community stage)
3. Cannot downgrade graduated community if active children exist
4. All data (posts, members, moderation) is preserved during downgrade
5. Stage-specific features are disabled (e.g., cannot create new children after downgrade from graduated)

### Example Request

```json
POST /api/communities/abc12345/downgrade
Authorization: Bearer <jwt>

{
  "groupId": "abc12345",
  "targetStage": "theme"
}
```

### Example Response

```json
{
  "id": "abc12345",
  "name": "Small Group",
  "description": "Back to basics",
  "stage": "theme",
  "hashtag": "#atrarium_abc12345",
  "memberCount": 5,
  "postCount": 100,
  "createdAt": 1704931200,
  "updatedAt": 1705104000
}
```

---

## Endpoint 4: List Child Communities

**Contract Reference**: `contract.communities.listChildren`
**Method**: GET
**Path**: `/api/communities/:id/children`
**Auth**: Not required (public endpoint)

### Request

**Path Parameters**:
- `id` (string): Parent community ID

**Query Parameters** (`ListChildrenInputSchema`):
- `parentId` (string): Parent group ID (same as path param)
- `limit` (number, optional): Max results (1-100, default 50)
- `cursor` (string, optional): Pagination cursor

### Response

**Success (200)** (`ListChildrenResponseSchema`):
```typescript
{
  children: Array<{
    id: string;
    name: string;
    description: string | null;
    stage: 'theme' | 'community' | 'graduated';
    hashtag: string;
    parentGroup: string;      // AT-URI of parent
    memberCount: number;
    postCount: number;
    feedMix?: { own: number; parent: number; global: number; };
    createdAt: number;
    updatedAt?: number;
  }>;
  cursor?: string;            // Next page cursor (if more results)
}
```

**Errors**:
- `NOT_FOUND`: Parent community not found

### Business Rules

1. Public endpoint (no authentication required)
2. Returns only direct children (not grandchildren)
3. Sorted by creation date (newest first)
4. Pagination via cursor (opaque string, treat as black box)
5. Empty array if no children

### Example Request

```
GET /api/communities/abc12345/children?limit=2
```

### Example Response

```json
{
  "children": [
    {
      "id": "def67890",
      "name": "Design Theme",
      "description": "UI/UX design",
      "stage": "theme",
      "hashtag": "#atrarium_def67890",
      "parentGroup": "at://did:plc:xxx/net.atrarium.group.config/abc12345",
      "memberCount": 5,
      "postCount": 12,
      "feedMix": { "own": 50, "parent": 30, "global": 20 },
      "createdAt": 1705017600
    },
    {
      "id": "ghi11111",
      "name": "Code Theme",
      "description": "Programming topics",
      "stage": "theme",
      "hashtag": "#atrarium_ghi11111",
      "parentGroup": "at://did:plc:xxx/net.atrarium.group.config/abc12345",
      "memberCount": 8,
      "postCount": 25,
      "createdAt": 1704931200
    }
  ],
  "cursor": "1704931200:ghi11111"
}
```

---

## Endpoint 5: Get Parent Community

**Contract Reference**: `contract.communities.getParent`
**Method**: GET
**Path**: `/api/communities/:id/parent`
**Auth**: Not required (public endpoint)

### Request

**Path Parameters**:
- `id` (string): Child community ID

**Query Parameters** (`GetParentInputSchema`):
- `childId` (string): Child group ID (same as path param)

### Response

**Success (200)** (`GroupResponseSchema | null`):
```typescript
{
  id: string;
  name: string;
  description: string | null;
  stage: 'graduated';         // Parent must be graduated
  hashtag: string;
  memberCount: number;
  postCount: number;
  children?: string[];        // Array of child IDs
  createdAt: number;
  updatedAt?: number;
} | null                      // null if no parent (top-level community)
```

**Errors**:
- `NOT_FOUND`: Child community not found

### Business Rules

1. Public endpoint (no authentication required)
2. Returns null for top-level communities (no parent)
3. Parent must be graduated stage (enforced at creation)
4. Cached in Durable Object for fast access

### Example Request

```
GET /api/communities/def67890/parent
```

### Example Response (with parent)

```json
{
  "id": "abc12345",
  "name": "Tech Community",
  "description": "Technology discussions",
  "stage": "graduated",
  "hashtag": "#atrarium_abc12345",
  "memberCount": 50,
  "postCount": 200,
  "children": ["def67890", "ghi11111"],
  "createdAt": 1704931200,
  "updatedAt": 1705017600
}
```

### Example Response (no parent)

```json
null
```

---

## Endpoint 6: Delete Community

**Contract Reference**: `contract.communities.delete`
**Method**: DELETE
**Path**: `/api/communities/:id`
**Auth**: Required (owner of community)

### Request

**Path Parameters** (`GetCommunityInputSchema`):
- `id` (string): Community ID to delete

### Response

**Success (200)** (`DeleteResponseSchema`):
```typescript
{
  success: true;
  deletedId: string;          // Deleted community ID
}
```

**Errors**:
- `FORBIDDEN`: User is not owner of community
- `CONFLICT`: Community has active members (excluding owner), children, or posts
- `NOT_FOUND`: Community not found

### Business Rules

1. Only owners can delete their communities
2. Multi-layered safety checks:
   - No active members (excluding the owner)
   - No child communities (graduated communities only)
   - No posts (even if only owner remains)
3. Deletion is permanent (PDS record deleted, cannot be recovered)
4. Durable Object marked as deleted, future requests return NOT_FOUND

### Example Request

```
DELETE /api/communities/abc12345
Authorization: Bearer <jwt>
```

### Example Response

```json
{
  "success": true,
  "deletedId": "abc12345"
}
```

### Example Error (non-empty community)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Community has 5 active members, cannot delete"
  }
}
```

---

## Common Error Responses

All endpoints use oRPC error format:

```typescript
{
  error: {
    code: 'FORBIDDEN' | 'BAD_REQUEST' | 'CONFLICT' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';
    message: string;        // Human-readable error description
  }
}
```

### Error Code Meanings

- `FORBIDDEN` (403): User lacks permission (not owner/moderator)
- `BAD_REQUEST` (400): Invalid input, validation failure, or business rule violation
- `CONFLICT` (409): Operation conflicts with current state (e.g., cannot delete non-empty community)
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error (PDS or DO operation failed)

---

## Testing Strategy

Each endpoint requires:

1. **Contract Test** (validates request/response schemas):
   - Valid inputs → success response matching schema
   - Invalid inputs → error response with correct code

2. **Permission Test**:
   - Authenticated user with permission → success
   - Authenticated user without permission → FORBIDDEN
   - Unauthenticated user (where applicable) → UNAUTHORIZED

3. **Business Logic Test**:
   - Valid state transitions → success
   - Invalid state transitions → error with clear message

4. **Edge Case Test**:
   - Circular references, concurrent operations, deep hierarchies
   - Performance validation (p95 latency <200ms)

---

## Implementation Notes

**Server-side** ([server/src/router.ts](../../../server/src/router.ts)):
- All handlers follow oRPC pattern: `contract.{resource}.{action}.handler(async ({ input, context }) => { ... })`
- Use `ATProtoService` for PDS read/write operations
- Use Durable Object RPC for cached hierarchy lookups
- Throw `ORPCError` with semantic error codes

**Client-side** ([client/src/lib/api.ts](../../../client/src/lib/api.ts)):
- Type-safe API client via `@atrarium/contracts`
- Error handling with typed `ORPCError` responses
- Automatic request/response validation via Zod schemas

**Contract Reference**: [shared/contracts/src/router.ts](../../../shared/contracts/src/router.ts) (lines 119-167)
**Schema Reference**: [shared/contracts/src/schemas.ts](../../../shared/contracts/src/schemas.ts) (lines 456-513)
