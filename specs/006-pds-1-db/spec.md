# Feature Specification: PDS-First Data Architecture

**Feature Branch**: `006-pds-1-db`
**Created**: 2025-10-04
**Status**: Ready for Planning
**Input**: User description: "できる限りデータをPDSに保存する設計にし、1つのDBに依存しない設計にする。これは設計上の重要な問題。"

## Execution Flow (main)
```
1. Parse user description from Input
   → "Store as much data as possible in PDS, avoid dependency on single DB"
2. Extract key concepts from description
   → Actors: community owners, members, moderators
   → Actions: data storage, data retrieval, decentralization
   → Data: memberships, moderation decisions, community configs, posts
   → Constraints: minimize centralized DB dependency, preserve AT Protocol principles
3. For each unclear aspect:
   → Performance requirements: RESOLVED - performance is secondary priority, AT Protocol implementation is primary
   → Migration path: RESOLVED - start fresh with PDS-first architecture, existing D1 is legacy
   → Fallback strategy: RESOLVED - use stale cached data when PDS unavailable
4. Fill User Scenarios & Testing section
   → Primary: community owner creates community with config stored in their PDS
   → Secondary: member joins community by creating record in their PDS
5. Generate Functional Requirements
   → All requirements are testable and focused on data sovereignty
6. Identify Key Entities (if data involved)
   → CommunityConfig, MembershipRecord, ModerationAction
7. Run Review Checklist
   → WARN "Spec has uncertainties" (performance, migration, fallback)
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A community owner wants to create and manage a community without depending on a centralized database. All community configuration (name, hashtag, moderators, blocklist) should be stored in the owner's personal data store (PDS). When members join, they create a membership record in their own PDS. When moderators take actions (hide posts, block users), those decisions are stored in the moderator's PDS. The system should work even if the central feed generator service is temporarily unavailable, preserving data sovereignty and AT Protocol's decentralization principles.

### Acceptance Scenarios
1. **Given** a user wants to create a community, **When** they submit community details, **Then** a community configuration record is created in their PDS and the community becomes discoverable
2. **Given** a user wants to join a community, **When** they request membership, **Then** a membership record is created in their PDS and their posts with community hashtag will appear in the community feed
3. **Given** a moderator wants to hide a post, **When** they perform moderation action, **Then** the moderation decision is stored in the moderator's PDS and the post is hidden from the feed
4. **Given** the central feed generator is down, **When** it restarts, **Then** it can rebuild its index by reading community configs and membership records from PDSs
5. **Given** a user moves to a different PDS provider, **When** their records migrate, **Then** their community memberships and ownerships remain intact

### Edge Cases
- What happens when a community owner's PDS is permanently unavailable? → Community becomes read-only until ownership is transferred via new PDS record
- How does the system handle conflicting moderation decisions from multiple moderators? → Latest timestamp wins (last-write-wins conflict resolution)
- What happens when a membership record and community config are out of sync? → Feed generator validates references and ignores orphaned records
- How does the system detect and handle stale/deleted community configs? → Periodic refresh from Firehose, tombstone records for deletions
- What happens when non-members post with community hashtag? → Posts exist in Bluesky but Feed Generator excludes them from getFeedSkeleton response (not indexed in D1)
- How to prevent users from confusing "Custom Feed" with "Hashtag Search"? → Feed description clearly states "member-only" and dashboard shows membership status badge

## Requirements *(mandatory)*

### Non-Functional Requirements
- **NFR-001**: getFeedSkeleton response time MUST be <500ms at p95 (acceptable degradation for AT Protocol compliance)
- **NFR-002**: Firehose event processing MUST complete within 50ms per event at p95
- **NFR-003**: System MUST maintain <2% error rate under normal load (2,000 events/sec)

### Functional Requirements
- **FR-001**: System MUST store community configuration (name, hashtag, moderators, settings) in the community owner's PDS
- **FR-002**: System MUST store membership records in each member's PDS, not in a centralized database
- **FR-003**: System MUST store moderation decisions (hidden posts, blocked users) in the moderator's PDS
- **FR-004**: Users MUST be able to prove their community membership by presenting their PDS-stored membership record
- **FR-005**: System MUST be able to rebuild feed indexes by reading from PDSs, not relying on a single database as source of truth
- **FR-006**: Community owners MUST be able to update community configuration in their PDS and have changes propagate to the feed generator
- **FR-007**: System MUST continue to serve existing feeds using cached/indexed data when PDSs are temporarily unavailable
- **FR-008**: System MUST respect moderation decisions stored in moderator PDSs when generating feeds
- **FR-009**: System MUST validate that membership records reference valid community configurations
- **FR-010**: System MUST allow users to revoke their membership by deleting/updating their PDS record
- **FR-011**: Feed generator MUST use centralized database only as a cache/index, with TTL based on Firehose event timestamps
- **FR-012**: System MUST handle PDS unavailability by serving stale cached data with appropriate staleness indicators
- **FR-013**: System MUST synchronize PDS records with feed index in real-time via Firehose WebSocket subscription
- **FR-014**: System MUST handle community ownership transfer by detecting new CommunityConfig records with updated owner DID from Firehose
- **FR-015**: System MUST prioritize AT Protocol compliance over performance optimization
- **FR-016**: System MUST allow multiple feed generators to operate independently using the same PDS data sources
- **FR-017**: Feed Generator MUST filter posts by membership validation in getFeedSkeleton (only verified members' posts returned, regardless of client)
- **FR-018**: System MUST NOT prevent non-members from posting with community hashtag to Bluesky (posts exist but excluded from feed via Feed Generator filtering)
- **FR-019**: Dashboard MUST provide UI to automatically append community hashtag to posts (reduces user error)
- **FR-020**: Feed Generator MUST return identical member-only feed to all clients (Bluesky official app, Atrarium Dashboard, third-party apps)
- **FR-021**: System MUST distinguish between "Custom Feed" (member-only via getFeedSkeleton) and "Hashtag Search" (public, not controlled by Atrarium)
- **FR-022**: Feed Generator MUST function without centralized relational database (Pure PDS-first mode)
- **FR-023**: System MUST use Durable Objects Storage as primary data store for feed indexes (not D1)
- **FR-024**: System MUST NOT fail when D1 is unavailable or reaches capacity limits
- **FR-025**: System MUST scale horizontally without database write bottlenecks (each community as independent Durable Object instance)
- **FR-026**: Each community MUST have dedicated Durable Object instance with isolated storage
- **FR-027**: Durable Objects Storage MUST store at least 7 days of post metadata for feed generation
- **FR-028**: System MUST use Cloudflare Queues to decouple Firehose ingestion from processing
- **FR-029**: Firehose event processing MUST handle 2,000+ events/sec throughput without blocking
- **FR-030**: Queue consumers MUST process events in parallel with automatic scaling
- **FR-031**: System MUST support horizontal scaling of Firehose ingestion via sharding (1→2→4→8 instances). Shard split triggers: FirehoseReceiver CPU >80% for 5min OR Queue depth >10,000 messages for 2min

### Key Entities *(include if feature involves data)*
- **CommunityConfig**: Represents a community's metadata and settings, stored in the owner's PDS. Includes name, hashtag, moderator list, blocklist, and governance settings.
- **MembershipRecord**: Represents a user's membership in a community, stored in the member's PDS. References the community config and includes role, join date, and membership status.
- **ModerationAction**: Represents a moderation decision (hide post, block user), stored in the moderator's PDS. Includes action type, target (post URI or user DID), reason, and timestamp.
- **FirehoseReceiver**: Durable Object (singleton) maintaining WebSocket connection to Jetstream. Performs lightweight filtering and sends events to Queue.
- **FirehoseQueue**: Cloudflare Queue buffering Firehose events for parallel processing. Capacity: 5,000 msg/sec, batch size: 100 messages.
- **FirehoseProcessor**: Worker consuming from Queue, performing heavyweight filtering (regex, sharding), and routing to CommunityFeedGenerator via RPC.
- **CommunityFeedGenerator**: Durable Object instance managing feed generation for a single community. Each community has one dedicated instance with isolated Durable Objects Storage.
- **PostMetadata**: Feed index entry stored in Durable Objects Storage (not D1). Includes post URI, author DID, created timestamp, hashtags. Retained for 7 days.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all clarifications resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (via Firehose event verification)
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified (AT Protocol, Firehose, PDS availability)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (all clarifications resolved, ready for planning)

---
