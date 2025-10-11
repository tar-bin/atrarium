# Feature Specification: Complete Communities API Implementation

**Feature Branch**: `019-communities-api-api`
**Created**: 2025-10-11
**Status**: Draft
**Input**: User description: "Communities APIを含む未実装のAPIを実装する"

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: Complete implementation of 6 missing oRPC API endpoints
2. Extract key concepts from description
   → Actors: Community owners, moderators, members
   → Actions: Create child communities, upgrade/downgrade stages, list children, get parent, delete communities
   → Data: Community hierarchy, stage transitions, parent-child relationships
   → Constraints: Stage-based permissions, hierarchy validation, deletion safety checks
3. For each unclear aspect:
   → [RESOLVED] All requirements clear from existing contract definitions
4. Fill User Scenarios & Testing section
   → Complete scenarios defined
5. Generate Functional Requirements
   → All requirements testable and derived from oRPC contracts
6. Identify Key Entities (if data involved)
   → Community hierarchy, stage lifecycle
7. Run Review Checklist
   → No [NEEDS CLARIFICATION] markers
   → All implementation details removed
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Community owners can manage the full lifecycle of their communities, from initial theme creation through growth and eventual graduation into mature communities with child sub-groups. They can organize related themes under graduated communities, adjust community stages based on member count and activity, and safely delete unused communities when needed.

### Acceptance Scenarios

#### 1. Create Child Community
1. **Given** a graduated community with an active owner
   **When** the owner creates a child theme under that community
   **Then** the system creates a new theme-stage community with parent relationship established
   **And** the child inherits optional feed mix configuration from parent

2. **Given** a theme or community-stage group (not graduated)
   **When** an owner attempts to create a child
   **Then** the system rejects the request (only graduated communities can have children)

#### 2. Upgrade Community Stage
1. **Given** a theme-stage community with 10+ active members
   **When** the owner upgrades to community stage
   **Then** the system transitions the stage and enables full community features

2. **Given** a community-stage group with 50+ active members
   **When** the owner upgrades to graduated stage
   **Then** the system enables child community creation capability

3. **Given** a theme with insufficient members
   **When** an owner attempts premature upgrade
   **Then** the system rejects the request with clear eligibility criteria

#### 3. Downgrade Community Stage
1. **Given** a community-stage group that lost members below threshold
   **When** the owner downgrades to theme stage
   **Then** the system reduces capabilities but preserves data

2. **Given** a graduated community with existing children
   **When** an owner attempts to downgrade
   **Then** the system rejects the request (must resolve children first)

#### 4. List Child Communities
1. **Given** a graduated community with 3 child themes
   **When** a member requests the children list
   **Then** the system returns all child communities with their metadata

2. **Given** pagination is needed for many children
   **When** a member requests children with limit=2
   **Then** the system returns 2 children and a cursor for the next page

#### 5. Get Parent Community
1. **Given** a child theme with an established parent
   **When** a member requests the parent
   **Then** the system returns the graduated parent community metadata

2. **Given** a top-level community with no parent
   **When** a member requests the parent
   **Then** the system returns null (no parent exists)

#### 6. Delete Community
1. **Given** an empty theme-stage community with no posts or members (except owner)
   **When** the owner deletes the community
   **Then** the system marks the community as deleted and prevents further access

2. **Given** a community with active members or child groups
   **When** an owner attempts deletion
   **Then** the system rejects the request (must be empty first)

### Edge Cases
- What happens when a graduated community owner tries to delete without removing children first? → System rejects with clear error message
- How does the system handle circular parent-child relationships? → System validates no circular references during creation
- What happens when downgrading a graduated community with children? → System rejects until children are removed or reassigned
- How does the system handle stage transitions for communities at member thresholds? → Owner-initiated only (no automatic transitions)
- What happens when deleting a community that is referenced as a parent? → System validates no children exist before allowing deletion

## Requirements

### Functional Requirements

#### Child Community Creation (FR-001 to FR-006)
- **FR-001**: System MUST allow graduated community owners to create child themes under their communities
- **FR-002**: System MUST reject child creation attempts from theme-stage or community-stage groups (only graduated communities can have children)
- **FR-003**: System MUST establish bidirectional parent-child relationships when creating children
- **FR-004**: System MUST allow owners to optionally specify feed mix ratios (own/parent/global percentages) when creating children
- **FR-005**: System MUST validate that only the owner of the parent community can create children
- **FR-006**: Child communities MUST start at theme stage regardless of parent stage

#### Stage Upgrade (FR-007 to FR-012)
- **FR-007**: System MUST allow community owners to upgrade their communities to higher stages (theme → community → graduated)
- **FR-008**: System MUST validate eligibility criteria before allowing stage upgrades (member count thresholds, activity requirements)
- **FR-009**: System MUST reject upgrade attempts that skip stages (theme → graduated requires intermediate community stage)
- **FR-010**: System MUST validate that only community owners can initiate stage upgrades
- **FR-011**: System MUST update community metadata to reflect new stage after successful upgrade
- **FR-012**: System MUST enable stage-specific features upon upgrade (e.g., child creation for graduated stage)

#### Stage Downgrade (FR-013 to FR-017)
- **FR-013**: System MUST allow community owners to downgrade their communities to lower stages (graduated → community → theme)
- **FR-014**: System MUST reject downgrade attempts from graduated stage if active children exist
- **FR-015**: System MUST validate that only community owners can initiate stage downgrades
- **FR-016**: System MUST preserve all community data (posts, members, moderation history) during downgrade
- **FR-017**: System MUST disable stage-specific features after downgrade (e.g., no new children creation after downgrading from graduated)

#### Child Listing (FR-018 to FR-021)
- **FR-018**: System MUST allow any member to list child communities of a graduated community
- **FR-019**: System MUST support pagination for child community lists (cursor-based, limit 1-100 per page)
- **FR-020**: System MUST return child metadata including name, description, stage, member count, and creation date
- **FR-021**: Child lists MUST be sorted by creation date (newest first)

#### Parent Retrieval (FR-022 to FR-024)
- **FR-022**: System MUST allow any member to retrieve the parent community of a child group
- **FR-023**: System MUST return null for top-level communities without parents
- **FR-024**: System MUST return full parent metadata including name, stage, member count, and creation date

#### Community Deletion (FR-025 to FR-029)
- **FR-025**: System MUST allow community owners to delete their communities
- **FR-026**: System MUST reject deletion attempts for communities with active members (excluding the owner)
- **FR-027**: System MUST reject deletion attempts for graduated communities with active children
- **FR-028**: System MUST reject deletion attempts for communities with posts (even if only owner remains)
- **FR-029**: System MUST prevent access to deleted communities and return appropriate errors for subsequent requests

### Key Entities

- **Community Hierarchy**: Represents parent-child relationships between graduated communities and their child themes/communities. Parent communities must be at graduated stage, children start at theme stage.

- **Community Stage Lifecycle**: Represents the maturity progression of communities (theme → community → graduated). Each stage has specific capabilities:
  - **Theme**: Initial stage, limited features, no child creation
  - **Community**: Full features, moderation, but no child creation
  - **Graduated**: Full features + child community creation capability

- **Feed Mix Configuration**: Defines content mixing ratios (own/parent/global percentages) for child communities, controlling what content appears in their feeds from different sources.

- **Stage Transition**: Represents a change in community maturity level, triggered by owner action with validation of eligibility criteria (member count, activity, existing children).

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Constitution Check (v1.5.0)

### Principle 1: Protocol-First Architecture ✅
- All community hierarchy data stored in `net.atrarium.group.config` Lexicon records (parentGroup field)
- Parent-child relationships represented via AT-URI references
- Stage transitions update existing Lexicon records, no proprietary formats introduced

### Principle 2: Simplicity and Minimal Complexity ✅
- Extends existing Communities API without new services or databases
- Reuses existing oRPC contract patterns
- No new dependencies required

### Principle 3: Economic Efficiency ✅
- No cost impact (pure API implementation, no new infrastructure)
- Durable Objects already provision per-community without additional cost

### Principle 4: Decentralized Identity and Data Ownership ✅
- All hierarchy data stored in owner's PDS using AT Protocol records
- Parent-child relationships portable across AT Protocol services

### Principle 5: PDS-First Architecture ✅
- All stage transitions and hierarchy updates write to PDS first
- Durable Objects cache updated via Firehose (7-day TTL)
- No state exists outside PDS except ephemeral indexes

### Principle 6: Operational Burden Reduction ✅
- No manual operations required for hierarchy management
- Stage transitions fully automated via API calls
- No monitoring or maintenance overhead

### Principle 7: Code Quality and Pre-Commit Validation ✅
- All implementation code will pass Biome linting and TypeScript strict type checks
- Test code will use appropriate type assertions where necessary

### Principle 8: AT Protocol + PDS + Lexicon Constraints ✅
- No separate databases required
- All persistent state in PDS using `net.atrarium.group.config` Lexicon
- Durable Objects used only for 7-day feed cache

### Principle 9: Git Workflow and Commit Integrity ✅
- All changes will be fully committed before merge
- Pre-commit hooks will not be bypassed
- Complete implementation units per commit

### Principle 10: Complete Implementation Over MVP Excuses ✅
- All 6 missing API endpoints will be fully implemented
- No "Phase 1" or deferred work labels
- All error handling, validation, and edge cases covered
- Feature marked complete only when all endpoints functional and tested

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none identified)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
- [x] Constitution compliance verified
