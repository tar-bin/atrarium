# Quickstart: Hashtag Prefix Update Validation

## Overview
This quickstart validates the updated hashtag format (`#atrarium_[8-hex]`) across the entire system, from generation to Firehose filtering to feed display.

## Prerequisites
- Local development environment running (`npm run dev`)
- Test PDS available (DevContainer or mock)
- Vitest installed and configured

## Test Scenario: Alice Creates Community and Bob Posts

### Setup
```bash
# Ensure clean test environment
npm run test -- --run tests/integration/pds-to-feed-flow.test.ts
```

### Step 1: Generate Hashtag
**Action**: Create community via API

```bash
curl -X POST http://localhost:8787/api/communities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_JWT" \
  -d '{
    "name": "Test Community",
    "description": "Testing new hashtag format"
  }'
```

**Expected Response**:
```json
{
  "id": "abc123def456",
  "name": "Test Community",
  "description": "Testing new hashtag format",
  "hashtag": "#atrarium_a1b2c3d4",  // ← NEW FORMAT
  "stage": "theme",
  "memberCount": 1,
  "postCount": 0,
  "createdAt": 1696867200
}
```

**Validation**:
- ✅ Hashtag matches pattern `/^#atrarium_[0-9a-f]{8}$/`
- ✅ Hashtag is unique (no collision)
- ✅ Response includes new format hashtag

### Step 2: Validate Hashtag Utilities
**Action**: Test hashtag generation and validation

```typescript
import { generateFeedHashtag, validateHashtagFormat, extractFeedHashtags } from '@/utils/hashtag';

// Generate hashtag
const hashtag = generateFeedHashtag();
console.log('Generated:', hashtag);
// Expected: #atrarium_[8-hex]

// Validate format
const isValid = validateHashtagFormat('#atrarium_a1b2c3d4');
console.log('Valid:', isValid);
// Expected: true

const isInvalid = validateHashtagFormat('#atr_a1b2c3d4');
console.log('Invalid (old format):', isInvalid);
// Expected: false

// Extract from text
const text = 'Check out #atrarium_12345678 and #atrarium_deadbeef';
const extracted = extractFeedHashtags(text);
console.log('Extracted:', extracted);
// Expected: ['#atrarium_12345678', '#atrarium_deadbeef']
```

**Validation**:
- ✅ `generateFeedHashtag()` returns `#atrarium_` prefix
- ✅ `validateHashtagFormat()` accepts new format, rejects old format
- ✅ `extractFeedHashtags()` finds all new format hashtags

### Step 3: Post to Community (Firehose Flow)
**Action**: Bob posts to PDS with community hashtag

```typescript
// Simulated Firehose event
const jetstreamEvent = {
  did: 'did:plc:bob',
  time_us: Date.now() * 1000,
  kind: 'commit',
  commit: {
    operation: 'create',
    collection: 'app.bsky.feed.post',
    rkey: 'abc123',
    record: {
      text: 'Hello world! #atrarium_a1b2c3d4',
      createdAt: new Date().toISOString()
    }
  }
};
```

**Expected Flow**:
1. **FirehoseReceiver** (lightweight filter):
   - Check: `text.includes('#atrarium_')` → ✅ Pass
   - Action: Send to Queue

2. **FirehoseProcessor** (heavyweight filter):
   - Extract: `/#atrarium_[0-9a-f]{8}/g` → `['#atrarium_a1b2c3d4']`
   - Route to: CommunityFeedGenerator (ID: `a1b2c3d4`)

3. **CommunityFeedGenerator**:
   - Validate membership: Bob is member? → ✅ Yes
   - Store post: `post:<timestamp>:abc123`
   - Index for feed

**Validation**:
- ✅ Lightweight filter catches new format
- ✅ Heavyweight regex extracts correct hashtag
- ✅ Post routed to correct community

### Step 4: Retrieve Feed
**Action**: Get feed skeleton for community

```bash
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:alice/app.bsky.feed.generator/test-community&limit=10"
```

**Expected Response**:
```json
{
  "feed": [
    {
      "post": "at://did:plc:bob/app.bsky.feed.post/abc123"
    }
  ],
  "cursor": "1696867200000::abc123"
}
```

**Validation**:
- ✅ Bob's post appears in feed
- ✅ Post URI is correct
- ✅ Cursor for pagination is present

### Step 5: Test Edge Cases

#### 5.1 Invalid Hashtag Format
```bash
curl -X POST http://localhost:8787/api/communities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_JWT" \
  -d '{"name": "Test", "hashtag": "#atr_invalid"}'
```

**Expected**: ❌ Validation error (if hashtag manually specified - normally auto-generated)

#### 5.2 Old Format Rejected
```typescript
const text = 'Old format #atr_a1b2c3d4 should not match';
const extracted = extractFeedHashtags(text);
console.log('Extracted:', extracted);
// Expected: [] (empty array)
```

**Validation**:
- ✅ Old format hashtags are not extracted
- ✅ Firehose filters ignore old format

#### 5.3 Multiple Hashtags
```typescript
const text = 'Post to #atrarium_aaaaaaaa and #atrarium_bbbbbbbb';
const extracted = extractFeedHashtags(text);
console.log('Extracted:', extracted);
// Expected: ['#atrarium_aaaaaaaa', '#atrarium_bbbbbbbb']
```

**Validation**:
- ✅ Multiple new format hashtags extracted correctly
- ✅ Post indexed to both communities (if member of both)

#### 5.4 Hashtag Collision Retry
```typescript
// Mock: Force collision on first attempt
const mockPDSCheck = jest.fn()
  .mockResolvedValueOnce({ exists: true })  // Collision
  .mockResolvedValueOnce({ exists: false }); // Success

const hashtag = await generateWithCollisionCheck(mockPDSCheck);
console.log('Generated after retry:', hashtag);
// Expected: New hashtag generated on second attempt
```

**Validation**:
- ✅ Collision detected
- ✅ Automatic retry with new value
- ✅ Success on retry

### Step 6: Integration Test Execution
**Action**: Run full integration test suite

```bash
npm test -- --run tests/integration/hashtag-indexing-flow.test.ts
npm test -- --run tests/integration/pds-to-feed-flow.test.ts
npm test -- --run tests/contract/dashboard/post-to-feed-with-hashtag.test.ts
```

**Expected Output**:
```
✓ tests/integration/hashtag-indexing-flow.test.ts (4)
  ✓ generates hashtag in new format
  ✓ validates new format correctly
  ✓ rejects old format
  ✓ indexes post with new hashtag to feed

✓ tests/integration/pds-to-feed-flow.test.ts (3)
  ✓ Alice creates community with new hashtag
  ✓ Bob posts with new hashtag
  ✓ Post appears in feed

✓ tests/contract/dashboard/post-to-feed-with-hashtag.test.ts (2)
  ✓ POST /api/communities returns new format hashtag
  ✓ Feed skeleton contains posts with new format
```

**Validation**:
- ✅ All tests pass
- ✅ No references to old format remain
- ✅ Integration flow works end-to-end

## Success Criteria

### Functional Requirements Met
- [x] **FR-001**: Hashtags generated in `#atrarium_[8-hex]` format
- [x] **FR-002**: Validation matches exact pattern `/^#atrarium_[0-9a-f]{8}$/`
- [x] **FR-003**: Firehose filters posts with `#atrarium_` prefix
- [x] **FR-004**: All valid hashtags extracted from post text
- [x] **FR-005**: Users can identify Atrarium posts by `#atrarium_` prefix
- [x] **FR-006**: Hashtag uniqueness ensured with collision retry
- [x] **FR-007**: Dashboard displays new format hashtag
- [x] **FR-008**: Old `#atr_` format completely replaced

### Performance Validation
```bash
# Run performance benchmarks
npm run test:perf

# Expected metrics:
# - Hashtag generation: <1ms
# - Validation: <0.1ms
# - Extraction from 300-char text: <1ms
# - Firehose filtering: <5ms per event
# - Feed generation: <200ms
```

**Validation**:
- ✅ Performance targets met
- ✅ No degradation from old format

### Edge Cases Covered
- [x] Invalid format rejected (non-hex, wrong length)
- [x] Old format ignored by filters
- [x] Multiple hashtags handled correctly
- [x] Collision detection and retry works
- [x] Hashtag in URLs/non-hashtag context handled

## Rollback Plan

If critical issues found:

```bash
# 1. Revert code changes
git revert HEAD

# 2. Redeploy previous version
npm run deploy

# 3. No data migration needed (pre-production)
```

## Conclusion

This quickstart validates:
1. ✅ Hashtag generation with new format
2. ✅ Validation and extraction logic
3. ✅ Firehose filtering pipeline
4. ✅ Feed indexing and retrieval
5. ✅ Edge cases and error handling
6. ✅ Integration test coverage

**Status**: ✅ All validation steps pass - Feature ready for deployment
