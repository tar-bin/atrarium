# Research: Hierarchical Group System

**Feature**: 017-1-1
**Date**: 2025-10-11
**Status**: Complete

## Research Overview

This document consolidates technical decisions and best practices for implementing the hierarchical group system. All technical context items were pre-determined by existing project architecture - no NEEDS CLARIFICATION items required research.

---

## 1. Hierarchy Implementation Patterns

### Decision: AT-URI References with PDS-First Architecture

**Rationale**:
- Reuses existing `net.atrarium.group.config` Lexicon schema
- `parentGroup` field stores AT-URI reference (immutable after creation)
- Firehose indexing validates parent-child relationships at ingestion time
- Durable Objects Storage caches hierarchy for fast queries (7-day TTL)

**Alternatives Considered**:
- **Graph Database** (e.g., Neo4j): Rejected - violates Constitution Principle 8 (no separate databases)
- **Adjacency List in D1**: Rejected - D1 deprecated in favor of Durable Objects Storage (006-pds-1-db)
- **Materialized Path**: Rejected - unnecessary complexity for 1-level hierarchy

**Best Practices Applied**:
- Parent validation at Firehose indexing (rejects circular references, invalid stage combinations)
- Durable Objects RPC for child queries (`listChildren(parentId)`)
- PDS query for orphan checks before parent deletion

---

## 2. Stage Progression with Dunbar Numbers

### Decision: Member Count-Based Thresholds (~15, ~50)

**Rationale**:
- Aligns with project philosophy: "maintain optimal group size" (ちょうどいい大きさを保つ)
- Dunbar number tiers: Theme (~15), Group (~50), Graduated (50+)
- Automatic upgrade prompts when thresholds reached (manual owner approval required)

**Alternatives Considered**:
- **Time-Based Progression** (e.g., 30 days → Group): Rejected - ignores actual group activity
- **Activity-Based** (posts per day): Rejected - adds complexity, member count more straightforward
- **Fixed Thresholds** (e.g., exactly 15/50): Rejected - used ~15/~50 for flexibility

**Best Practices Applied**:
- `getMemberCount(groupId)` PDS query (counts active memberships)
- UI displays upgrade button when threshold reached
- Bidirectional transitions allowed (downgrade supported)

---

## 3. Moderation Inheritance Model

### Decision: Theme Groups Inherit Parent's Moderation

**Rationale**:
- Theme groups are lightweight sub-discussions under parent Graduated groups
- Simplifies UX - no separate moderator assignment for themes
- Parent Graduated group's owner/moderators can moderate all child themes
- Community/Graduated groups have independent moderation (separate owner/moderators)

**Alternatives Considered**:
- **Full Cascade** (all permissions inherit down): Rejected - Group/Graduated need independence
- **No Inheritance** (all groups independent): Rejected - adds burden for simple theme groups
- **Configurable Per-Group**: Rejected - adds complexity for marginal benefit

**Best Practices Applied**:
- Moderation API checks: if Theme, verify moderator belongs to parent Graduated group
- Durable Objects stores `parentGroupId` for quick parent lookup
- UI hides moderator assignment for Theme-stage groups

---

## 4. Deletion Blocking Strategy

### Decision: Block Parent Deletion if Children Exist

**Rationale**:
- Prevents orphaned children (no invalid `parentGroup` references)
- Forces explicit cleanup workflow (delete children first, then parent)
- Aligns with `parentGroup` immutability (no re-parenting possible)

**Alternatives Considered**:
- **Cascade Delete**: Rejected - dangerous, could delete active child groups unintentionally
- **Orphan Children** (allow invalid refs): Rejected - creates data inconsistency
- **Auto-Reparent**: Rejected - requires mutable `parentGroup` field (violates design)

**Best Practices Applied**:
- PDS query `listChildren(parentId)` before deletion
- API returns 409 Conflict if children exist
- UI displays warning + child list when deletion blocked

---

## 5. Feed Aggregation with Hierarchy

### Decision: Graduated Groups Display Own + Child Posts

**Rationale**:
- Graduated group timeline shows posts from: self + all child themes (1 level only)
- Respects existing `feedMix` ratios (own/parent/global percentages)
- Child theme posts tagged with child's hashtag, but appear in parent feed

**Alternatives Considered**:
- **Recursive Aggregation** (include grandchildren): Rejected - 1-level hierarchy constraint
- **Separate Child Feed Section**: Rejected - adds UI complexity
- **Mixed Feed Only** (no isolation): Rejected - users want to filter by child theme

**Best Practices Applied**:
- Durable Objects `getFeedSkeleton()` queries `post:*` for parent + children
- Firehose indexing tags posts with `groupId` + `parentGroupId` for fast filtering
- Dashboard provides filter toggle: "All" (parent + children) vs "This Group Only"

---

## 6. oRPC Contract Design

### Decision: Extend Existing `groups` Router

**Rationale**:
- Add endpoints to existing `shared/contracts/src/router.ts`
- New methods: `groups.createChild`, `groups.upgradeStage`, `groups.downgradeStage`
- Leverage existing Zod schemas, extend with hierarchy validation

**Alternatives Considered**:
- **Separate `hierarchy` Router**: Rejected - hierarchy is intrinsic to groups, not separate concern
- **GraphQL Nested Queries**: Rejected - project uses Hono + oRPC (REST-like)

**Best Practices Applied**:
- `createChild` input schema validates `parentId` references Graduated-stage group
- `upgradeStage`/`downgradeStage` input includes `fromStage` + `toStage` for explicit transitions
- Response includes `children: Group[]` for parent groups

---

## 7. Durable Objects Storage Schema

### Decision: Add `parent:` and `children:` Prefixes

**Rationale**:
- Existing keys: `config:`, `member:`, `post:`, `moderation:`
- Add: `parent:<groupId>` (stores parent AT-URI for child lookup)
- Add: `children:<parentId>` (stores child IDs list for fast iteration)

**Alternatives Considered**:
- **Single `config:` Extension**: Rejected - separating parent/children improves query performance
- **No Caching** (PDS queries only): Rejected - defeats Durable Objects caching purpose

**Best Practices Applied**:
- `parent:` key: single AT-URI string (immutable)
- `children:` key: JSON array of child group IDs (updated on child create/delete)
- 7-day TTL applies (rebuilt from PDS + Firehose if cache lost)

---

## 8. UI Component Architecture

### Decision: React Components with TanStack Query

**Rationale**:
- Reuse existing component patterns (shadcn/ui, React 19, TanStack Router)
- New components: `GroupHierarchy`, `StageUpgradeButton`, `CreateChildTheme`
- TanStack Query for data fetching + caching

**Alternatives Considered**:
- **Zustand State Management**: Rejected - TanStack Query sufficient for server state
- **Separate Hierarchy Page**: Rejected - integrated into existing group detail page

**Best Practices Applied**:
- `useQuery(['group', id, 'children'])` for child list
- Optimistic updates on stage progression (`useMutation` with `onSuccess` invalidation)
- Tree view component uses Radix UI Accordion for collapsible hierarchy

---

## 9. Testing Strategy

### Decision: Contract + Integration + Unit Tests

**Rationale**:
- **Contract Tests**: Validate hierarchy API endpoints (request/response schemas, stage rules)
- **Integration Tests**: End-to-end flows (Graduated creates child, Theme moderation inheritance)
- **Unit Tests**: Stage validation logic (Dunbar thresholds, parent-child rules)

**Best Practices Applied**:
- Vitest + @cloudflare/vitest-pool-workers (server)
- MSW for API mocking (client component tests)
- Playwright for E2E (real Durable Objects + PDS)

---

## 10. Migration Strategy

### Decision: No Schema Migration Required

**Rationale**:
- `parentGroup` field already exists in `net.atrarium.group.config`
- Existing groups have `parentGroup: undefined` (no parent)
- New child groups set `parentGroup: <parent-AT-URI>` at creation

**Alternatives Considered**:
- **Backfill Existing Communities**: Not applicable - no historical parent relationships to migrate

**Best Practices Applied**:
- Durable Objects re-index from Firehose cursor 0 if needed (rebuilds `parent:` + `children:` keys)
- PDS queries handle `parentGroup: undefined` gracefully (treated as parentless)

---

## Summary

All technical decisions align with existing project architecture:
- ✅ Reuses `net.atrarium.group.config` Lexicon schema
- ✅ PDS-first architecture (writes → PDS, reads → Durable Objects cache)
- ✅ Dunbar number thresholds (~15, ~50) for stage progression
- ✅ 1-level hierarchy (Graduated→Theme only, no grandchildren)
- ✅ Moderation inheritance (Theme uses parent's, Group/Graduated independent)
- ✅ Deletion blocking (cannot delete parent with children)
- ✅ oRPC contracts for type-safe API
- ✅ TanStack Query + React components for Dashboard UI

**No NEEDS CLARIFICATION items - all decisions made based on spec.md + existing codebase patterns.**
