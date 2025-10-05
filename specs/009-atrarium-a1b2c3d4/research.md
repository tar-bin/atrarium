# Research: Hashtag Prefix Update

## Overview
This document captures technical decisions and research findings for updating the Atrarium hashtag prefix from `#atr_` to `#atrarium_`.

## Technical Decisions

### 1. Hashtag Format
**Decision**: `#atrarium_[0-9a-f]{8}` (8 hexadecimal characters)

**Rationale**:
- Improved brand recognition: "atrarium" is immediately identifiable vs ambiguous "atr"
- Maintains collision resistance: 8 hex chars = 4.3B combinations, sufficient for target scale
- Preserves existing architecture: Same pattern structure, only prefix changes

**Alternatives Considered**:
- `#atr_com_[8-hex]`: Rejected due to excessive length (16 chars vs 17 chars)
- `#atrarium-[8-hex]`: Rejected to maintain underscore convention consistency
- Variable-length IDs: Rejected to keep validation simple and predictable

### 2. Collision Handling Strategy
**Decision**: Check-then-create with retry (max 3 attempts)

**Implementation Approach**:
1. Generate hashtag using `crypto.randomUUID().slice(0,8)`
2. Query PDS for existing `net.atrarium.community.config` with same hashtag
3. If exists → regenerate and retry (max 3 times)
4. If unique → create community record

**Rationale**:
- Collision probability is negligible (0.000012% for 1,000 communities)
- Retry overhead is minimal (only on collision, which is ~1 in 840,000)
- Provides deterministic behavior vs eventual consistency approaches
- User-transparent: automatic resolution without manual intervention

**Alternatives Considered**:
- No collision check: Rejected due to poor UX if collision occurs (broken community)
- Server-side collision detection only: Rejected as AT Protocol doesn't enforce uniqueness on custom fields
- UUID-based (16+ chars): Rejected due to excessive hashtag length

### 3. Migration Strategy
**Decision**: No backward compatibility - complete replacement

**Rationale**:
- System is pre-production with no live communities
- Simpler implementation without dual-format support
- Cleaner codebase without legacy format handling

**Impact**:
- All existing test fixtures updated to new format
- No runtime format detection needed
- Documentation updated in single pass

### 4. Two-Stage Filtering Updates
**Decision**: Update both filter stages to new prefix

**Lightweight Filter (FirehoseReceiver)**:
```typescript
// OLD: text.includes('#atr_')
// NEW: text.includes('#atrarium_')
```

**Heavyweight Filter (FirehoseProcessor)**:
```typescript
// OLD: /#atr_[0-9a-f]{8}/g
// NEW: /#atrarium_[0-9a-f]{8}/g
```

**Rationale**:
- Maintains performance characteristics (same filter architecture)
- Lightweight filter still uses fast string search
- Heavyweight regex remains exact pattern match

### 5. Test Coverage Requirements
**Decision**: Update all existing hashtag tests to new format

**Test Categories**:
- Unit tests: `feed-hashtag-generator.test.ts` - generation logic
- Contract tests: API endpoints using hashtag validation
- Integration tests: End-to-end Firehose → Feed flow
- PDS integration: Real Bluesky PDS posting with new format

**Rationale**:
- Existing test structure already comprehensive
- No new test categories needed
- Update fixtures and assertions only

## Implementation Checklist

### Core Changes
- [ ] Update `src/utils/hashtag.ts`: `generateFeedHashtag()` → `#atrarium_`
- [ ] Update `src/utils/hashtag.ts`: `validateHashtagFormat()` → new regex
- [ ] Update `src/utils/hashtag.ts`: `extractFeedHashtags()` → new regex
- [ ] Update `src/durable-objects/firehose-receiver.ts`: lightweight filter
- [ ] Update `src/workers/firehose-processor.ts`: heavyweight filter regex
- [ ] Update `src/routes/communities.ts`: Add collision check before PDS write

### Test Updates
- [ ] Update all test fixtures from `#atr_` to `#atrarium_`
- [ ] Update regex assertions in unit tests
- [ ] Verify Firehose filtering integration tests pass
- [ ] Verify PDS posting integration test passes

### Documentation Updates
- [ ] Update CLAUDE.md: hashtag format references
- [ ] Update docs/: API documentation examples
- [ ] Update README.md: hashtag format description

## Performance Impact Analysis

**Expected Changes**: None significant
- Hashtag generation: Same UUID-based approach
- Lightweight filter: String search length +5 chars (negligible)
- Heavyweight filter: Regex pattern +5 chars (negligible)
- Storage: Hashtag field +5 bytes per community (negligible)

**Validation**:
- Run performance benchmarks after implementation
- Verify Firehose processing maintains <5s indexing latency
- Confirm feed generation stays <200ms

## Security Considerations

**Collision Resistance**:
- `crypto.randomUUID()` provides cryptographic randomness
- 32-bit space sufficient for target scale (1K-10K communities)
- Birthday paradox threshold at ~100K communities (well beyond scale)

**Hashtag Hijacking Prevention**:
- Same uniqueness guarantees as current implementation
- PDS-based ownership model unchanged
- No new attack vectors introduced

## Deployment Notes

**Breaking Changes**: Yes (hashtag format)
- Impact: Pre-production only, no live users
- Rollback: Revert code changes (no data migration needed)

**Deployment Order**:
1. Deploy backend changes (Workers + Durable Objects)
2. Restart FirehoseReceiver Durable Object to apply new filter
3. Deploy dashboard updates (hashtag display)
4. Update documentation site

**Monitoring**:
- Watch for hashtag collision errors in logs
- Verify Firehose event processing rate unchanged
- Confirm community creation success rate

## Conclusion

All technical decisions are finalized with no remaining unknowns. Implementation is straightforward string replacement across well-defined components. No new dependencies, services, or architectural patterns required.

**Status**: ✅ Research Complete - Ready for Phase 1 Design
