# Phase 0: Research & Technical Decisions

**Feature**: Complete Communities API Implementation (019-communities-api-api)
**Date**: 2025-10-11

## Technical Context Resolution

All technical decisions have been resolved through analysis of existing codebase and contract definitions. No research was required as all unknowns were already addressed in the existing implementation.

## Decision: Implementation Approach

**What was chosen**: Extend existing oRPC router implementation in `server/src/router.ts` with 6 new handlers

**Rationale**:
- All oRPC contracts already defined in `shared/contracts/src/router.ts` (lines 119-167)
- All Zod schemas already defined in `shared/contracts/src/schemas.ts` (lines 456-513)
- Lexicon schema already supports hierarchy via `parentGroup` field in `net.atrarium.group.config`
- Follows established pattern from Posts, Emoji, and Reactions API implementations (018-api-orpc)
- Zero new dependencies or infrastructure required

**Alternatives considered**:
- REST API with Hono routes: Rejected (project migrating to oRPC for type safety)
- Separate hierarchy service: Rejected (violates Principle 2: Simplicity)
- GraphQL API: Rejected (no GraphQL infrastructure exists, would add complexity)

## Decision: Durable Object Integration

**What was chosen**: Extend CommunityFeedGenerator DO with hierarchy RPC endpoints

**Rationale**:
- CommunityFeedGenerator already manages per-community state
- Parent-child relationships need fast lookup during feed generation
- Hierarchy validation (circular reference checks) requires cached state
- Consistent with existing Durable Object usage patterns

**Alternatives considered**:
- PDS-only queries for hierarchy: Rejected (too slow for feed generation)
- Separate HierarchyManager DO: Rejected (violates Principle 2, unnecessary complexity)
- Store hierarchy in KV: Rejected (Principle 8 prohibits new databases)

## Decision: Stage Transition Validation

**What was chosen**: Member count thresholds (theme → community: 10+, community → graduated: 50+)

**Rationale**:
- Aligns with project goal of "optimal community size" (10-200 members)
- Theme stage for small groups (<10) validates initial interest
- Community stage for active groups (10-49) enables full features
- Graduated stage for mature groups (50+) enables child creation
- Owner-initiated only (no automatic transitions) for deliberate growth

**Alternatives considered**:
- Automatic stage transitions: Rejected (could surprise owners, violates user control)
- Activity-based criteria (posts/day): Rejected (member count is simpler, more predictable)
- No stage validation: Rejected (could lead to premature hierarchy complexity)

## Decision: Deletion Safety Checks

**What was chosen**: Multi-layered validation (active members, children, posts)

**Rationale**:
- Prevents accidental data loss for active communities
- Forces deliberate cleanup process before deletion
- Aligns with PDS-first architecture (deletion is permanent, PDS records deleted)
- Protects parent-child integrity

**Alternatives considered**:
- Soft delete: Rejected (PDS records cannot be "soft deleted", violates AT Protocol)
- No validation: Rejected (too dangerous, could orphan children)
- Admin override: Rejected (unnecessary, owner can clean up manually)

## Decision: Feed Mix Configuration

**What was chosen**: Optional FeedMixConfig (own/parent/global percentages, must sum to 100)

**Rationale**:
- Enables "shared context" for child themes (see parent community posts)
- Flexible content mixing (e.g., 50% own + 30% parent + 20% global)
- Already defined in Lexicon schema (`net.atrarium.group.config.feedMix`)
- Zod validation ensures sum=100 constraint

**Alternatives considered**:
- Fixed ratios (e.g., always 70/20/10): Rejected (too inflexible)
- No feed mixing: Rejected (misses key hierarchy benefit)
- Algorithmic mixing: Rejected (adds complexity, percentages are simpler)

## Decision: Error Handling Patterns

**What was chosen**: ORPCError with semantic error codes

**Rationale**:
- Consistent with existing oRPC error handling (018-api-orpc)
- Semantic codes (FORBIDDEN, BAD_REQUEST, CONFLICT, NOT_FOUND)
- Client receives typed errors with clear messages

**Error code mapping**:
- `FORBIDDEN`: Permission denied (not owner/moderator)
- `BAD_REQUEST`: Invalid stage transition, circular reference, validation failure
- `CONFLICT`: Duplicate child, cannot delete non-empty community
- `NOT_FOUND`: Community or parent not found
- `INTERNAL_SERVER_ERROR`: Durable Object or PDS operation failure

**Alternatives considered**:
- HTTP status codes only: Rejected (oRPC abstracts HTTP, semantic codes better)
- Custom error types: Rejected (ORPCError is sufficient, simpler)

## Performance Considerations

**Expected Latency**:
- `createChild`: <200ms (PDS write + DO initialization)
- `upgradeStage`/`downgradeStage`: <150ms (PDS update + DO cache invalidation)
- `listChildren`: <100ms (DO query, cached)
- `getParent`: <50ms (DO query, single record)
- `delete`: <150ms (PDS delete + DO cleanup)

**Validation**:
- All operations p95 latency target: <200ms (Constitution Principle 3)
- Durable Object read: <10ms (Constitution performance target)
- No N+1 queries (batch PDS operations where possible)

## Testing Strategy

**Contract Tests** (TDD approach):
- Test each endpoint with valid inputs → success
- Test permission checks → FORBIDDEN errors
- Test validation failures → BAD_REQUEST errors
- Test edge cases (circular references, non-empty deletion) → CONFLICT errors

**Integration Tests**:
- Complete hierarchy workflow (create parent → upgrade → create child → list)
- Stage transition validation (insufficient members → upgrade fails)
- Deletion safety (non-empty community → delete fails)
- Feed mix inheritance (child inherits parent mix)

**Unit Tests**:
- Circular reference detection algorithm
- Member count aggregation (PDS query)
- Stage eligibility validation logic

## Constitution Compliance

All decisions validated against Constitution v1.5.0:

- ✅ **Principle 1**: Lexicon schemas define all hierarchy structures
- ✅ **Principle 2**: No new projects/databases/services
- ✅ **Principle 3**: Zero cost impact (pure API implementation)
- ✅ **Principle 5**: PDS-first (all writes to PDS, DO is cache)
- ✅ **Principle 7**: Full type safety with TypeScript strict mode
- ✅ **Principle 8**: No databases beyond PDS + Durable Objects cache
- ✅ **Principle 10**: Complete implementation (all 6 endpoints, no "Phase 2" deferrals)

## Implementation Readiness

✅ All technical unknowns resolved
✅ All design decisions documented
✅ All alternatives evaluated
✅ Constitution compliance validated
✅ Ready for Phase 1 (Design & Contracts)
