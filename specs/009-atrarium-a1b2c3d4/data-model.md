# Data Model: Hashtag Prefix Update

## Overview
This feature updates the hashtag format but does not introduce new entities or storage schemas. All changes are to existing string patterns and validation rules.

## Modified Entities

### Community Hashtag (String Pattern)
**Format Change**: `#atr_[0-9a-f]{8}` → `#atrarium_[0-9a-f]{8}`

**Properties**:
- **Prefix**: `#atrarium_` (fixed, 10 characters)
- **ID**: 8 hexadecimal characters `[0-9a-f]{8}` (lowercase)
- **Total Length**: 18 characters (including `#`)

**Validation Rules**:
```typescript
// Exact match pattern
const HASHTAG_PATTERN = /^#atrarium_[0-9a-f]{8}$/;

// Extraction pattern (global)
const HASHTAG_EXTRACTION = /#atrarium_[0-9a-f]{8}/g;

// Lightweight filter pattern (substring)
const LIGHTWEIGHT_FILTER = '#atrarium_';
```

**Uniqueness Constraints**:
- Globally unique across all Atrarium communities
- Generated using `crypto.randomUUID()` (cryptographically secure)
- Collision probability: 0.000012% for 1,000 communities
- Retry mechanism: Max 3 attempts on collision detection

**Examples**:
- Valid: `#atrarium_a1b2c3d4`, `#atrarium_12345678`, `#atrarium_deadbeef`
- Invalid: `#atr_a1b2c3d4` (old format), `#atrarium_xyz` (non-hex), `#atrarium_a1b2c3d` (7 chars)

## Storage Schema Impact

### No Schema Changes Required
This feature modifies **data values only**, not storage structure.

**PDS (AT Protocol Records)**:
```typescript
// net.atrarium.community.config
{
  $type: 'net.atrarium.community.config',
  hashtag: '#atrarium_a1b2c3d4',  // ← Value change only
  // ... other fields unchanged
}
```

**Durable Objects Storage**:
```typescript
// Key prefix unchanged: 'config:', 'member:', 'post:', 'moderation:'
// Community config value updated:
{
  hashtag: '#atrarium_a1b2c3d4',  // ← Value change only
  // ... other fields unchanged
}
```

**Queue Messages**:
```typescript
// JetstreamEvent format unchanged
// Hashtag extracted from post text using new pattern
```

## State Transitions

### Community Creation Flow
**Updated Step 3: Hashtag Generation with Collision Check**

```
1. User submits CreateCommunityRequest
2. Validate request (name, description)
3. Generate unique hashtag:
   ├─ Attempt 1: Generate #atrarium_[8-hex]
   ├─ Check PDS for existing community.config with same hashtag
   ├─ If exists → Attempt 2: Regenerate
   ├─ If exists → Attempt 3: Regenerate
   └─ If still exists → ERROR "Failed to generate unique hashtag"
4. Create community.config record in PDS
5. Initialize Durable Object with config
6. Add creator as owner member
7. Return CommunityResponse
```

**New Validation Rule**:
- Before PDS write: Query existing `net.atrarium.community.config` records
- Filter by `hashtag` field
- If match found → regenerate and retry

### Hashtag Filtering Flow (No Changes)
**Firehose Event Processing** (values updated only):

```
1. Jetstream → FirehoseReceiver
   ├─ Lightweight filter: text.includes('#atrarium_')  ← Updated string
   └─ If match → send to Queue

2. Queue → FirehoseProcessor
   ├─ Heavyweight filter: /#atrarium_[0-9a-f]{8}/g  ← Updated regex
   ├─ Extract all matching hashtags
   └─ For each hashtag → route to CommunityFeedGenerator

3. CommunityFeedGenerator
   ├─ Validate membership
   ├─ Store post in Durable Object Storage
   └─ Index for feed retrieval
```

## Validation Rules

### Generation Validation
```typescript
// Function: generateFeedHashtag()
// Input: void
// Output: string (format: #atrarium_[8-hex])
// Algorithm:
//   1. uuid = crypto.randomUUID().replace(/-/g, '')
//   2. shortId = uuid.slice(0, 8).toLowerCase()
//   3. return `#atrarium_${shortId}`
```

### Format Validation
```typescript
// Function: validateHashtagFormat(hashtag: string): boolean
// Pattern: /^#atrarium_[0-9a-f]{8}$/
// Returns: true if exact match, false otherwise
```

### Extraction Validation
```typescript
// Function: extractFeedHashtags(text: string): string[]
// Pattern: /#atrarium_[0-9a-f]{8}/g
// Returns: Array of unique matched hashtags
```

## Relationships (Unchanged)

### Community → Hashtag (1:1)
- Each community has exactly one unique hashtag
- Hashtag is immutable after creation
- Community ID (rkey) is independent of hashtag value

### Post → Hashtag (N:M)
- One post can contain multiple Atrarium hashtags
- Each hashtag routes to corresponding community feed
- Hashtag in post text must match community's hashtag exactly

### User → Community (via Membership)
- Membership validation unchanged
- Hashtag used for feed association only
- Role-based access (owner, moderator, member) unchanged

## Migration Notes

### No Data Migration Required
- System is pre-production (no live communities)
- All test data uses old format → update fixtures
- No runtime dual-format support needed

### Test Data Updates
```typescript
// OLD fixtures
const hashtag = '#atr_a1b2c3d4';

// NEW fixtures
const hashtag = '#atrarium_a1b2c3d4';
```

## Summary

**Data Model Changes**: Minimal
- ✅ No new entities
- ✅ No schema changes
- ✅ No storage migrations
- ✅ Only validation patterns and string values updated

**Key Modifications**:
1. Hashtag pattern regex: `#atr_` → `#atrarium_`
2. Collision check added to community creation
3. Filter patterns updated in Firehose pipeline

**Status**: ✅ Data Model Complete - No storage schema impact
