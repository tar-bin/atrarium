# Phase 1: Data Model

**Feature**: Complete Communities API Implementation (019-communities-api-api)
**Date**: 2025-10-11

## Entity Overview

This feature extends the existing `net.atrarium.group.config` Lexicon schema with hierarchy and stage lifecycle management. No new entities are introduced - all data is stored in existing PDS records.

## Entity: Community Hierarchy

**Storage**: PDS (`net.atrarium.group.config` record)

**Key Fields**:
- `parentGroup` (string, AT-URI): Parent community reference
- `stage` (enum): 'theme' | 'community' | 'graduated'
- `feedMix` (object): Content mixing ratios (own/parent/global percentages)

**Relationships**:
- **Parent → Children**: One graduated community can have many child themes
- **Child → Parent**: Child themes reference exactly one parent (optional)
- **Constraint**: Only graduated-stage communities can have children
- **Constraint**: Children always start at theme stage

**State Transitions** (stage lifecycle):
```
theme (initial) → community (10+ members) → graduated (50+ members)
        ↓                    ↓                       ↓
    (downgrade)          (downgrade)         (only if no children)
```

**Validation Rules**:
1. **Circular Reference Prevention**: Child cannot reference ancestor as parent
2. **Stage Constraint**: Only graduated communities can create children
3. **Deletion Safety**: Cannot delete if active members or children exist
4. **Stage Downgrade**: Cannot downgrade graduated community with children
5. **Feed Mix Constraint**: own + parent + global must equal 100

## Entity: Community Stage Lifecycle

**Purpose**: Represents maturity progression of communities

**Stages**:

### Theme Stage
- **Characteristics**: Initial stage, small group (<10 members)
- **Capabilities**: Basic posting, membership
- **Restrictions**: Cannot create children, limited moderation
- **Upgrade Criteria**: 10+ active members

### Community Stage
- **Characteristics**: Active group (10-49 members)
- **Capabilities**: Full features, moderation, custom emoji
- **Restrictions**: Cannot create children
- **Upgrade Criteria**: 50+ active members
- **Downgrade Criteria**: Falls below 10 members (owner-initiated)

### Graduated Stage
- **Characteristics**: Mature group (50+ members)
- **Capabilities**: All community features + child theme creation
- **Special**: Can organize sub-themes under parent umbrella
- **Downgrade Constraint**: Cannot downgrade if children exist

**State Diagram**:
```
┌────────────────┐   10+ members   ┌──────────────────┐   50+ members   ┌───────────────────┐
│  Theme         │ ───────────────> │  Community       │ ───────────────> │  Graduated        │
│  (<10 members) │                  │  (10-49 members) │                  │  (50+ members)    │
└────────────────┘ <─────────────── └──────────────────┘ <─────────────── └───────────────────┘
                    owner-initiated                       owner-initiated
                                                          (only if no children)
```

## Entity: Feed Mix Configuration

**Storage**: PDS (`net.atrarium.group.config.feedMix` field)

**Fields**:
- `own` (integer, 0-100): Percentage of posts from own community
- `parent` (integer, 0-100): Percentage of posts from parent community
- `global` (integer, 0-100): Percentage of posts from global Bluesky

**Validation**: `own + parent + global === 100`

**Use Cases**:
- **Child Theme**: 50% own + 30% parent + 20% global (shared context)
- **Standalone Theme**: 80% own + 0% parent + 20% global (independent)
- **Global-Heavy**: 30% own + 0% parent + 70% global (discovery mode)

**Inheritance**: Optional, can be specified when creating child theme

## Data Flow: Create Child Community

1. **Input Validation**:
   - Parent must exist
   - Parent must be graduated stage
   - User must be parent owner
   - Feed mix ratios must sum to 100 (if provided)

2. **PDS Write**:
   - Create new `net.atrarium.group.config` record
   - Set `parentGroup` = parent AT-URI
   - Set `stage` = 'theme'
   - Set `feedMix` = provided or default (80/0/20)

3. **Durable Object Update**:
   - Initialize CommunityFeedGenerator for child
   - Update parent DO with child reference
   - Cache hierarchy relationship

4. **Response**:
   - Return child community metadata
   - Include parent reference
   - Include feed mix configuration

## Data Flow: Stage Upgrade/Downgrade

1. **Validation**:
   - User must be owner
   - Target stage must be adjacent (no skipping)
   - Member count must meet threshold (upgrade only)
   - No children exist (downgrade from graduated only)

2. **PDS Update**:
   - Update `stage` field in `net.atrarium.group.config`
   - Set `updatedAt` timestamp

3. **Durable Object Cache Invalidation**:
   - Update CommunityFeedGenerator stage cache
   - Trigger capability re-evaluation

4. **Response**:
   - Return updated community metadata
   - Reflect new stage and capabilities

## Data Flow: List Children / Get Parent

**List Children**:
1. Query PDS for all `net.atrarium.group.config` records where `parentGroup` = parent AT-URI
2. Cache results in parent's Durable Object
3. Support pagination (cursor-based, limit 1-100)
4. Return children sorted by creation date (newest first)

**Get Parent**:
1. Read `parentGroup` field from child's PDS record
2. Fetch parent `net.atrarium.group.config` record
3. Cache in Durable Object for fast subsequent access
4. Return null if no parent exists

## Data Flow: Delete Community

1. **Safety Checks**:
   - User must be owner
   - No active members (except owner)
   - No child communities
   - No posts (even if only owner remains)

2. **PDS Deletion**:
   - Delete `net.atrarium.group.config` record
   - Trigger Firehose event for cache cleanup

3. **Durable Object Cleanup**:
   - Mark DO as deleted
   - Remove from parent's children list (if applicable)
   - Reject future requests with NOT_FOUND

4. **Response**:
   - Return success confirmation
   - Include deleted community ID

## Caching Strategy (Durable Objects)

**What to cache**:
- Parent-child relationships (fast hierarchy lookup)
- Member counts per community (stage validation)
- Current stage per community (feed generation)

**Cache invalidation**:
- On PDS write (via Firehose event)
- 7-day TTL (Constitution Principle 5)
- Rebuild from PDS if DO lost

**Cache keys** (Durable Object Storage):
- `config:<communityId>` → CommunityConfig (includes parentGroup, stage, feedMix)
- `children:<parentId>` → Array of child IDs
- `hierarchy_validated:<timestamp>` → Last circular reference check

## Error States & Handling

| Scenario | Error Code | Error Message |
|----------|------------|---------------|
| Non-owner tries to create child | `FORBIDDEN` | "Only parent owner can create children" |
| Create child from non-graduated | `BAD_REQUEST` | "Only graduated communities can have children" |
| Circular parent reference | `BAD_REQUEST` | "Circular parent-child relationship detected" |
| Upgrade with insufficient members | `BAD_REQUEST` | "Community has X members, requires Y for {stage}" |
| Downgrade graduated with children | `CONFLICT` | "Cannot downgrade community with active children" |
| Delete non-empty community | `CONFLICT` | "Community has active members, cannot delete" |
| Delete community with children | `CONFLICT` | "Community has children, remove them first" |
| Delete community with posts | `CONFLICT` | "Community has posts, cannot delete" |
| Parent community not found | `NOT_FOUND` | "Parent community not found" |
| Community not found | `NOT_FOUND` | "Community not found" |

## Performance Targets

| Operation | Target Latency (p95) | Optimization |
|-----------|---------------------|--------------|
| Create child | <200ms | Batch PDS write + DO init |
| Upgrade/downgrade | <150ms | Single PDS update + cache invalidation |
| List children | <100ms | Durable Object cached list |
| Get parent | <50ms | Single DO read (cached) |
| Delete community | <150ms | PDS delete + DO cleanup |

**Monitoring**:
- Track p95 latency per endpoint
- Alert if >200ms for any operation
- Count validation failures by type

## Testing Checklist

**Contract Tests** (per endpoint):
- [ ] Valid inputs → success response
- [ ] Permission denied → FORBIDDEN
- [ ] Validation failure → BAD_REQUEST
- [ ] Conflict scenarios → CONFLICT
- [ ] Not found → NOT_FOUND

**Integration Tests** (workflows):
- [ ] Complete hierarchy: create parent → upgrade → create child → list
- [ ] Stage transitions: theme → community → graduated
- [ ] Deletion safety: delete fails with members/children/posts
- [ ] Feed mix: child inherits or overrides parent mix
- [ ] Circular reference: detection prevents invalid hierarchy

**Edge Cases**:
- [ ] Deep hierarchy (3+ levels, not recommended but should work)
- [ ] Many children (100+ child themes under one parent)
- [ ] Rapid stage changes (upgrade immediately after downgrade)
- [ ] Concurrent child creation (two users create children simultaneously)
