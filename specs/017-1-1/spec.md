# Feature Specification: Hierarchical Group System

**Feature Branch**: `017-1-1`
**Created**: 2025-10-11
**Status**: Draft
**Input**: User description: "ユーザーの集団のことをグループと定義する。グループは1つの投稿用タイムラインを持つ。グループはほかのグループを親として持つことができる。"

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-11

- Q: What are the valid parent-child stage combinations? → A: Only Graduated-stage groups can have children. All groups are created as Theme. Theme can have Graduated as parent. When Theme upgrades to Community/Graduated, parent reference is retained (immutable).
- Q: What are the upgrade criteria for Theme → Community and Community → Graduated? → A: Dunbar number-based member count thresholds: Theme → Community at ~15 members, Community → Graduated at ~50 members.
- Q: Can groups be downgraded (e.g., Community → Theme)? → A: Yes, stage transitions are bidirectional (downgrades allowed).
- Q: What happens when a parent group is deleted and children exist? → A: Deletion is blocked if children exist (cannot delete parent with active children).
- Q: Do parent group moderators/owners automatically have moderation rights in child groups? → A: Theme groups cannot have independent moderation (moderated by parent Graduated group's owner/moderators). Community/Graduated groups have independent moderation rights.

---

## User Scenarios & Testing

### Primary User Story

**Group Organizer Journey**:
Alice wants to create a graduated group with multiple specialized thematic discussion groups.

1. Alice creates a **Theme group** for "Design Patterns" with a focused discussion topic (no parent)
2. As membership grows to ~15 members, the system allows her to upgrade it to **Community stage**
3. When membership reaches ~50 members, she upgrades it to **Graduated stage**
4. Now as a Graduated group, Alice can create child theme groups ("UI Patterns", "API Patterns", "Database Patterns") - each starts as Theme with "Design Patterns" as parent
5. Users can browse the hierarchical structure and discover all theme groups under the parent Graduated group
6. Theme groups are moderated by the parent Graduated group's owner/moderators (no independent moderation)

**Key Value**:
- **Theme stage**: Single focused topic with one timeline (created as initial state, may have Graduated parent). ~15 member target.
- **Community stage**: Transitional stage (50+ members). Cannot have children until Graduated.
- **Graduated stage**: Fully independent (50+ members). Can create child Theme groups. Child themes inherit parent's moderation.

### Acceptance Scenarios

1. **Given** Alice has a theme group with 15+ members, **When** she upgrades it to community stage, **Then** the group transitions to community stage but cannot create children yet
2. **Given** Alice has a graduated group, **When** she creates a new child theme group, **Then** the child is created as Theme with the graduated group as immutable parent
3. **Given** Bob creates a new theme group under a graduated parent, **When** he views the theme, **Then** it appears as a child of the parent in hierarchical views
4. **Given** Charlie views a graduated group's timeline, **When** he scrolls, **Then** he sees posts from the graduated group itself and its child themes mixed according to feed mix ratios
5. **Given** a user is a member of a theme group, **When** the theme is upgraded to community stage, **Then** their membership remains valid and active
6. **Given** a graduated group owner wants to moderate content in a child theme, **When** they view the child theme timeline, **Then** they can moderate posts (theme groups have no independent moderation)
7. **Given** a new user discovers a graduated group, **When** they browse its structure, **Then** they can see all child themes in a hierarchical view and navigate between parent and children
8. **Given** a graduated group has child themes, **When** owner tries to delete the parent, **Then** deletion is blocked until all children are removed

### Edge Cases

- **Multiple parent levels**: Maximum hierarchy depth is 1 level (Graduated parent → Theme child only). No multi-level hierarchies allowed.
- **Orphaned children**: Prevented by deletion blocking - graduated groups with children cannot be deleted.
- **Stage downgrade with children**: If a Graduated group with children is downgraded to Community/Theme, parent reference remains (immutable) but children cannot be created anymore at lower stages.
- **Circular references (malicious creation)**: Normal flow (only Graduated can have children, children are Theme) prevents circular references. System validates parent ancestry at Firehose indexing time and rejects invalid records.
- **Parent deletion**: Deletion is blocked if children exist. Parent must remove/delete all children first.
- **Feed mix propagation**: Child theme feedMix settings are independent (no inheritance from parent). Each group controls its own feed mixing.
- **Parent stage constraints**: Only Graduated-stage groups can be parents. Only Theme-stage groups can have parents. Community-stage groups cannot have or be parents (transitional state).
- **Permission inheritance**: Theme groups have no independent moderation - moderated by parent Graduated group's owner/moderators. Community/Graduated groups have independent moderation rights.
- **Downgrade impact**: Groups can be downgraded (Community → Theme, Graduated → Community/Theme). Downgrades are bidirectional, membership is retained.

---

## Requirements

### Functional Requirements

#### Group Lifecycle (Stage Progression)
- **FR-001**: System MUST support three group stages: `theme`, `community`, `graduated` (existing stage names)
- **FR-001a**: All groups MUST be created as Theme stage initially (no direct creation of Community/Graduated)
- **FR-002**: Each group MUST have exactly one timeline for posts (regardless of stage)
- **FR-003**: System MUST allow upgrading a theme to community stage when member count reaches ~15 members (Dunbar number threshold)
- **FR-004**: System MUST allow upgrading a group to graduated stage when member count reaches ~50 members (Dunbar number threshold)
- **FR-005**: System MUST allow stage downgrades (bidirectional transitions: Community → Theme, Graduated → Community/Theme)
- **FR-005a**: When a Graduated group with children is downgraded, parent reference remains immutable but new children cannot be created until re-upgraded to Graduated

#### Hierarchical Relationships
- **FR-006**: Groups MUST be able to reference another group as their parent using AT-URI at creation time (only when created as Theme with Graduated parent)
- **FR-007**: Parent reference MUST be immutable after group creation (cannot be changed later)
- **FR-008**: Parent-child relationships MUST follow stage rules: Only Graduated-stage groups can be parents, only Theme-stage groups can have parents, Community-stage groups cannot have or be parents
- **FR-008a**: Maximum hierarchy depth is 1 level (Graduated → Theme only, no grandchildren)
- **FR-009**: System MUST validate parent ancestry chain at Firehose indexing time to detect circular references (normal flow prevents this, but malicious AppView could create invalid references)
- **FR-010**: System MUST reject records with circular parent references during indexing (exclude from Durable Object Storage)
- **FR-011**: System MUST enforce single-parent relationships (one group can have only one parent)
- **FR-011a**: System MUST block deletion of Graduated groups that have active children (deletion allowed only when all children removed)

#### Timeline and Content Aggregation
- **FR-012**: Each group MUST have its own dedicated timeline
- **FR-013**: Timeline MUST display posts from:
  - The group itself (own posts)
  - Child groups (if Graduated stage, 1 level only - no recursive grandchildren)
  - Parent groups (based on feedMix ratios)
  - Global Bluesky feed (based on feedMix ratios)
- **FR-014**: Feed mix ratios MUST control content distribution from own/parent/global sources (existing `feedMix` field)
- **FR-015**: Feed mix settings are independent per group (no inheritance from parent - each group controls its own mixing)

#### Membership and Permissions
- **FR-016**: Users MUST be able to join groups at any stage (theme/community/graduated)
- **FR-017**: Membership is independent per group (no automatic membership inheritance from parent to child or vice versa)
- **FR-018**: Users with `owner` or `moderator` roles MUST be able to moderate content within Community/Graduated groups (existing functionality)
- **FR-019**: Theme groups MUST NOT have independent moderation - moderation is performed by parent Graduated group's owner/moderators
- **FR-019a**: Community and Graduated groups MUST have independent moderation rights (separate from parent/children)

#### Discovery and Navigation
- **FR-020**: System MUST allow users to browse the hierarchical structure (parent-child relationships)
- **FR-021**: System MUST display parent-child relationships in group metadata views
- **FR-022**: System MUST allow users to navigate from child to parent and parent to children

#### Data Storage Constraints (Constitution Principle 8)
- **FR-023**: All group configuration (including stage and parent reference) MUST be stored in PDS using `net.atrarium.group.config` Lexicon schema (existing schema with `parentGroup` field)
- **FR-024**: Parent reference in `parentGroup` field MUST be immutable (set at creation, never updated)
- **FR-025**: No separate database MAY be introduced for storing hierarchical relationships [ARCHITECTURE CONSTRAINT: Must use AT-URI references in existing Lexicon schema]
- **FR-026**: Hierarchical queries (e.g., "find all children of group X") MUST be implementable using PDS queries and Firehose indexing

### Key Entities

- **Group**: Represents a collection of users with a shared timeline (uses existing `net.atrarium.group.config`)
  - Attributes: name, description, stage (theme/community/graduated), hashtag, parent reference (AT-URI, immutable), feed mix ratios, creation timestamp, member count
  - Relationships: Theme groups MAY have one Graduated parent (AT-URI reference), Graduated groups MAY have multiple Theme children (1 level max)
  - Lifecycle: Always created as Theme. May upgrade to Community (~15 members) then Graduated (~50 members). Downgrades allowed (bidirectional).
  - Moderation: Theme groups moderated by parent Graduated group's owner/moderators. Community/Graduated have independent moderation.

- **Group Membership**: Represents a user's participation in a group (uses existing `net.atrarium.group.membership`)
  - Attributes: user DID, group AT-URI, role (owner/moderator/member), join timestamp, status (active/pending)
  - Relationships: References one group, references one user
  - Note: Membership is independent per group (no automatic inheritance between parent and child)

- **Group Stage**: Enumeration representing group maturity (existing `stage` field in Lexicon)
  - Values:
    - `theme` (initial state, ~15 member target, may have Graduated parent, no independent moderation)
    - `community` (transitional, ~50 member target, cannot have/be parent, independent moderation)
    - `graduated` (~50+ members, can create Theme children, independent moderation)
  - Thresholds: Theme→Community at ~15 members (Dunbar), Community→Graduated at ~50 members (Dunbar)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 11 ambiguities resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (Dunbar number thresholds: ~15, ~50 members)
- [x] Scope is clearly bounded (1-level hierarchy, Graduated→Theme only, Dunbar-based stage progression)
- [x] Dependencies identified (AT Protocol Lexicon constraints, reuses existing `parentGroup` field)

**Resolved Ambiguities** (Session 2025-10-11):
1. ✅ Maximum hierarchy depth: 1 level (Graduated → Theme only)
2. ✅ Orphaned children: Prevented by deletion blocking
3. ✅ Stage downgrade: Allowed (bidirectional transitions)
4. ✅ Parent deletion: Blocked if children exist
5. ✅ Feed mix inheritance: No inheritance (independent per group)
6. ✅ Valid parent-child stage combinations: Only Graduated can be parent, only Theme can have parent
7. ✅ Permission cascade: Theme has no independent moderation (uses parent's), Community/Graduated independent
8. ✅ Theme → Community upgrade: ~15 members (Dunbar threshold)
9. ✅ Community → Graduated upgrade: ~50 members (Dunbar threshold)
10. ✅ Recursive child inclusion: No recursion (1 level max, no grandchildren)
11. ✅ Membership inheritance: No inheritance (independent per group)
12. ✅ Circular reference detection: Validated at Firehose indexing time (FR-009, FR-010)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (1-level hierarchy, Graduated→Theme only, Dunbar-based progression, immutable parent)
- [x] Ambiguities resolved (12 clarification points resolved via /clarify session 2025-10-11)
- [x] User scenarios updated (reflects Graduated-only parent constraint, moderation inheritance)
- [x] Requirements finalized (30 functional requirements with Dunbar thresholds, deletion blocking, bidirectional stages)
- [x] Entities identified (Group, Group Membership, Group Stage - all reuse existing Lexicon schemas)
- [x] Edge cases documented (downgrade with children, deletion blocking, stage constraints)
- [x] Review checklist passed (all ambiguities resolved, requirements testable and measurable)

---

## Constitutional Compliance Check

### Principle 1: Protocol-First Architecture
- ✅ **Compliant**: Group hierarchy stored in `net.atrarium.group.config` Lexicon schema using AT-URI references for parent-child relationships (existing `parentGroup` field)

### Principle 2: Simplicity and Minimal Complexity
- ✅ **Compliant**: Reuses existing `parentGroup` field and `stage` enum, no new Lexicon schemas required, no new services needed
- ⚠️ **Note**: Hierarchical queries add some complexity to feed generation logic but leverages existing Firehose indexing

### Principle 3: Economic Efficiency
- ✅ **Compliant**: No new infrastructure required, hierarchy managed through PDS records and existing Durable Objects cache

### Principle 4: Decentralized Identity and Data Ownership
- ✅ **Compliant**: All group data stored in owner's PDS, parent-child relationships use AT-URI references

### Principle 5: PDS-First Architecture
- ✅ **Compliant**: Group configuration (including stage and parent) stored in PDS, indexed via Firehose (existing architecture)

### Principle 6: Operational Burden Reduction
- ✅ **Compliant**: No additional operational overhead, hierarchy management through existing Dashboard UI

### Principle 7: Code Quality and Pre-Commit Validation
- ✅ **Compliant**: Standard quality gates apply

### Principle 8: AT Protocol + PDS + Lexicon Constraints
- ✅ **Compliant**: Feature fully implementable using existing `net.atrarium.group.config` schema (no schema changes required)
- ✅ **Note**: Hierarchical queries implementable via PDS queries or Firehose indexing, no separate graph database needed

### Principle 9: Git Workflow and Commit Integrity
- ✅ **Compliant**: Standard git workflow applies

### Principle 10: Complete Implementation Over MVP Excuses
- ⚠️ **Risk**: Complex hierarchical features (permission cascading, recursive feed mixing) may tempt "Phase 1/Phase 2" scope splitting
- ✅ **Mitigation**: Specification must resolve all [NEEDS CLARIFICATION] markers before planning phase to ensure complete scope definition

**Overall Assessment**: Feature is constitutionally compliant and architecturally sound. Reuses existing Lexicon schemas without modifications. Parent reference immutability simplifies implementation and prevents complex update scenarios. All 12 ambiguities resolved via clarification session. Dunbar number-based thresholds align with project's "maintain optimal group size" philosophy. 1-level hierarchy constraint prevents complexity explosion. Ready for planning phase. No architectural violations identified.

---

**Next Steps**: All clarifications complete. Proceed to `/plan` for implementation design.
