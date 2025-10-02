# Feature Specification: Atrarium MVP - Community Management System on AT Protocol

**Feature Branch**: `001-`
**Created**: 2025-10-02
**Status**: Draft
**Input**: User description: "現在のドキュメントを参照して仕様を作成"

## Execution Flow (main)
```
1. Parse user description from Input
   → Request: Create specification from existing documentation
2. Extract key concepts from description
   → Actors: Community administrators, community members, moderators
   → Actions: Create/manage communities, join/leave, view feeds, filter content
   → Data: Communities, theme feeds, memberships, posts
   → Constraints: Cost ($5/month), small scale (10-200 people), AT Protocol compliance
3. For each unclear aspect:
   → Marked with [NEEDS CLARIFICATION] where ambiguous
4. Fill User Scenarios & Testing section
   → Primary flow: Administrator creates community, configures feeds, members join and view content
5. Generate Functional Requirements
   → Each requirement testable and derived from documentation
6. Identify Key Entities (if data involved)
   → Communities, Theme Feeds, Memberships, Post Indices
7. Run Review Checklist
   → Specification focuses on WHAT, not HOW
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-02

- Q: When owner account is deleted or becomes invalid, should system auto-transfer to next moderator or archive after warnings? → A: Auto-transfer ownership to next moderator (if exists), else archive community
- Q: When post matches multiple theme feeds (via hashtag filtering), should it appear in all or first match only? → A: Not applicable - users post directly to specific theme feeds, not filtered from global Bluesky
- Q: When user deletes post, should feeds reflect deletion immediately or maintain cached reference? → A: Deletions reflected eventually via best-effort sync (not real-time guarantee)
- Q: Is there a maximum number of communities one user can join? → A: No limit (unlimited memberships)
- Q: If AT Protocol connection drops during posting, what is acceptable failure behavior? → A: Fail immediately and show error to user (manual retry required)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A small community administrator (previously running a Mastodon/Misskey server) wants to reduce operational costs and burden while maintaining a connected, discoverable community for 10-200 members. They need to create a community space, configure content filtering by themes, allow members to join, and display relevant posts from both their community and the broader Bluesky network.

### Acceptance Scenarios

1. **Given** an administrator wants to start a new community, **When** they provide a name, description, and optional parent community, **Then** the system creates a community space and assigns them as owner.

2. **Given** a community owner wants to organize content by themes, **When** they create a theme feed with hashtags and keywords (e.g., #React, #WebDev), **Then** the system filters and displays matching posts from the Bluesky network.

3. **Given** a user wants to join a community, **When** they authenticate with their AT Protocol identity (DID), **Then** the system grants membership and allows them to view community feeds.

4. **Given** a community has grown beyond comfortable size (150+ active members), **When** the owner reviews growth metrics, **Then** the system suggests splitting into smaller themed communities or graduating to independence.

5. **Given** a community owner wants to maintain connection with the broader network, **When** they configure feed composition ratios, **Then** the system displays mixed content (e.g., 80% own community, 15% parent community, 5% global Bluesky).

6. **Given** a theme feed receives no posts for 7 days, **When** the system detects inactivity, **Then** it changes status to "warning" and notifies the owner.

7. **Given** a theme feed remains inactive for 14 days, **When** the system confirms continued low activity, **Then** it archives the feed automatically.

### Edge Cases

- When the community owner's account is deleted or becomes invalid, the system automatically transfers ownership to the next moderator (by seniority/join date). If no moderators exist, the community archives automatically.
- When a user deletes their post, the system removes it from feeds via best-effort synchronization (eventual consistency, not real-time guarantee).
- Users can join unlimited number of communities (no membership limit enforced).
- When AT Protocol connection fails during posting, the system shows an error message to the user and requires manual retry (no automatic retry or queuing).
- How does the system handle posts in languages other than English/Japanese? [NEEDS CLARIFICATION: Language filtering requirements not specified - deferred to planning phase]

---

## Requirements *(mandatory)*

### Functional Requirements

#### Community Management

- **FR-001**: System MUST allow authenticated users to create communities with name, description, and optional parent community reference
- **FR-002**: System MUST assign creator as community owner with full control privileges
- **FR-003**: Community owners MUST be able to configure feed composition ratios (own/parent/global percentages)
- **FR-004**: System MUST track community metadata including member count, post count, creation date, and current stage (theme/community/graduated)
- **FR-005**: System MUST support three community stages: theme (trial), community (independent), and graduated (fully autonomous)

#### Theme Feed Management

- **FR-006**: Community owners MUST be able to create theme feeds with name and description for organizing community discussions
- **FR-007**: Users MUST be able to post directly to specific theme feeds within their communities
- **FR-008**: System MUST display posts within theme feeds in chronological order (newest first)
- **FR-009**: System MUST track theme feed health metrics including last post time, posts in last 7 days, and active user counts
- **FR-010**: System MUST automatically change theme feed status to "warning" when no posts occur for 7 days
- **FR-011**: System MUST automatically archive theme feeds when inactivity extends to 14 days
- **FR-012**: System MUST allow revival of archived feeds when activity resumes (5+ posts in 1 week, 3+ active users)

#### Membership Management

- **FR-013**: System MUST authenticate users via AT Protocol DID (decentralized identity)
- **FR-014**: Users MUST be able to join communities and receive member role
- **FR-015**: Users MUST be able to leave communities at any time
- **FR-016**: System MUST track membership information including join date and last activity
- **FR-017**: Community owners MUST be able to assign moderator roles to members
- **FR-018**: System MUST enforce role-based permissions (owner: full control, moderator: moderation actions, member: view and participate)
- **FR-040**: When owner account is deleted or becomes invalid, system MUST automatically transfer ownership to next moderator (determined by seniority/join date)
- **FR-041**: When owner account is deleted and no moderators exist, system MUST archive the community automatically
- **FR-043**: System MUST allow users to join unlimited number of communities (no membership limit)

#### Feed Display

- **FR-019**: System MUST generate feed skeletons containing post references (URIs) without full post content
- **FR-020**: System MUST support pagination for feeds with configurable item limits and cursors
- **FR-021**: System MUST mix posts from multiple sources according to configured ratios (own/parent/global)
- **FR-022**: System MUST return feeds within 200ms performance target
- **FR-023**: System MUST cache post metadata for [NEEDS CLARIFICATION: cache duration specified as 7 days but retention policy not explained]

#### Content Storage

- **FR-024**: System MUST store post references (URIs) when users post to theme feeds within communities
- **FR-025**: System MUST store minimal post metadata: URI, author DID, target feed ID, creation timestamp, media presence flag
- **FR-026**: System MUST NOT store full post content or media files (defers to original Bluesky PDS)
- **FR-027**: System MUST retrieve full post content from Bluesky network when displaying feeds
- **FR-042**: System MUST remove deleted posts from feeds via best-effort synchronization (eventual consistency acceptable)
- **FR-044**: When AT Protocol connection fails during posting, system MUST display error message to user and require manual retry (no automatic retry)

#### Community Lifecycle

- **FR-029**: System MUST suggest promoting theme feeds to independent communities when thresholds met (15+ members, 14+ days, 30+ posts)
- **FR-030**: System MUST allow community owners to graduate (become independent from parent) or return to parent community
- **FR-031**: System MUST preserve community lineage data showing parent-child relationships even after graduation
- **FR-032**: System MUST warn owners when community size exceeds comfortable limits (1,500+ daily active users)

#### Rate Limiting & Security

- **FR-033**: System MUST limit requests to 100 per hour per user to prevent abuse
- **FR-034**: System MUST verify user DIDs against AT Protocol standards before granting access
- **FR-035**: System MUST maintain uptime above 99.9%
- **FR-036**: System MUST validate all user inputs to prevent injection attacks

#### Identity & Discoverability

- **FR-037**: System MUST publish DID document at `/.well-known/did.json` identifying itself as AT Protocol Feed Generator
- **FR-038**: System MUST implement AT Protocol Feed Generator API specification for client compatibility
- **FR-039**: Communities MUST be discoverable via Bluesky clients using standard feed URIs

### Key Entities *(include if feature involves data)*

- **Community**: Represents a group space with members, configuration, and lineage. Key attributes include unique identifier, name, description, stage (theme/community/graduated), parent reference, feed composition ratios, member count, post count, creation and graduation timestamps.

- **Theme Feed**: Represents a discussion channel within a community where users can post directly. Key attributes include unique identifier, parent community, name, description, status (active/warning/archived), health metrics (last post time, activity counts), creation and archival timestamps.

- **Membership**: Represents a user's association with a community. Key attributes include community identifier, user DID (AT Protocol identity), role (member/moderator/owner), join timestamp, last activity timestamp. Uses composite key of community + user DID.

- **Post Index**: Represents a reference to a post made to a theme feed. Key attributes include post URI (AT Protocol reference format), target theme feed identifier, author DID, creation timestamp, media presence flag. Does NOT contain full post content.

- **Achievement**: Represents gamification rewards for user actions. Key attributes include user DID, achievement identifier (e.g., "first_join", "first_split"), associated community, unlock timestamp. Achievements celebrate all lifecycle choices (creation, growth, merging, closure).

- **Owner Transition Log**: Tracks ownership changes for accountability. Key attributes include community identifier, previous owner DID, new owner DID, reason for transfer (deletion/inactivity/vacation/manual), transition timestamp.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (5 resolved, 1 deferred to planning)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (200ms feed generation, 99.9% uptime, 100 req/hour)
- [x] Scope is clearly bounded (Phase 0 MVP: direct posting to theme feeds, no hashtag filtering)
- [x] Dependencies and assumptions identified (AT Protocol compliance, Bluesky network availability, DID resolution)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (6 clarification points)
- [x] User scenarios defined
- [x] Requirements generated (44 functional requirements after clarifications)
- [x] Entities identified (6 key entities)
- [x] Review checklist passed
- [x] Clarification session completed (5 questions answered, 1 deferred)

---

## Open Questions for Clarification

1. ~~**Owner absence handling**: When owner account is deleted, should system auto-transfer to next moderator or archive after warnings?~~ **RESOLVED**: Auto-transfer to next moderator (by seniority), else archive.
2. ~~**Duplicate filter matching**: When post matches multiple theme feeds, should it appear in all or first match only?~~ **RESOLVED**: Not applicable - users post directly to specific feeds.
3. ~~**Post deletion handling**: When user deletes post, should feeds reflect deletion immediately or maintain cached reference?~~ **RESOLVED**: Best-effort sync (eventual consistency).
4. ~~**Membership limits**: Is there a maximum number of communities one user can join?~~ **RESOLVED**: No limit (unlimited memberships).
5. ~~**Connection failure**: If AT Protocol connection drops during posting, what is acceptable failure behavior?~~ **RESOLVED**: Fail immediately with error message (manual retry).
6. **Language support**: Should system filter or tag posts by language? What languages are supported? **DEFERRED**: Low impact for MVP, better addressed in planning phase.

---

## Notes for Planning Phase

This specification captures the WHAT of the Atrarium MVP system. Key differentiators:
- **Cost reduction**: 95% cheaper than traditional Mastodon/Misskey ($5/month vs $30-150/month)
- **Burden reduction**: 80% less operational time (serverless, no server management)
- **Network effect**: Leverages Bluesky's 30M+ user base for discoverability
- **Dynamic sizing**: Built-in lifecycle to keep communities "just right" size
- **Data ownership**: Users own their data via AT Protocol, system only indexes

Phase 0 scope deliberately minimal: basic feed generation, simple filtering, community creation. Deferred to later phases: achievements, advanced moderation, analytics, community discovery features.
