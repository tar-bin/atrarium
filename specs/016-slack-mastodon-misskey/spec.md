# Feature Specification: Custom Emoji Reactions

**Feature Branch**: `016-slack-mastodon-misskey`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "投稿に対してSlack, Mastodon, Misskeyのようなカスタム絵文字でのリアクションができるようにする"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-09
- Q: Custom emoji image storage location (PDS blob storage, Cloudflare R2, or external CDN)? → A: PDS blob storage (aligns with post emoji specification, maintains data ownership)
- Q: Can users react with multiple different emojis to the same post? → A: Yes - multiple different emoji reactions per post allowed (Slack/Mastodon/Misskey behavior)
- Q: Are animated custom emojis (GIF/APNG/WebP) supported? → A: Yes - animated GIF/APNG/WebP supported (Misskey feature parity)
- Q: Custom emoji file size limit (256KB / 512KB / 1MB)? → A: 256KB (balances quality with PDS storage efficiency)
- Q: Custom emoji image dimensions (32x32 / 64x64 / 128x128 / multiple sizes)? → A: 64x64px (standard size, balanced quality and performance)
- Q: Should custom emojis support arbitrary widths (non-square aspect ratios)? → A: Yes - variable width supported (width constrained by height: max 64px tall, width proportional)
- Q: Maximum number of different emoji types per post? → A: 20 types maximum (Slack-equivalent balance), with "Show More" button to view additional reactions in modal dialog when exceeded
- Q: Are there rate limits on reactions? → A: 100 reactions per hour per user (Slack-equivalent, balances normal usage with spam prevention)
- Q: Real-time update mechanism for reaction counts? → A: Server-Sent Events (SSE) - near real-time updates, lighter weight than WebSocket, simpler than polling
- Q: Is per-post reaction control required (disable reactions on specific posts)? → A: Not required - community-wide moderation (individual inappropriate reaction removal) is sufficient
- Q: Maximum width constraint for custom emojis? → A: 512px maximum width (8:1 aspect ratio max) - supports very wide text-style emojis while preventing extreme layout issues

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Community members need to express quick emotional responses or acknowledgments to posts without writing full text replies. Custom emoji reactions (similar to Slack, Mastodon, and Misskey) allow users to react with specific emojis, providing lightweight engagement and visual feedback to post authors.

### Acceptance Scenarios
1. **Given** a community member is viewing a post in their feed, **When** they click the reaction button and select an emoji, **Then** the emoji appears as a reaction count below the post
2. **Given** a post already has reactions, **When** a user clicks on an existing reaction emoji, **Then** the system adds their reaction to that emoji's count
3. **Given** a user has already reacted to a post with a specific emoji, **When** they click the same emoji again, **Then** the system removes their reaction (toggle behavior)
4. **Given** a post has multiple reactions, **When** any user views the post, **Then** all reaction emojis are displayed with their counts and reactors' identities are viewable
5. **Given** a community member wants to react with a custom emoji, **When** they open the emoji picker, **Then** they see both standard Unicode emojis and community-specific custom emojis
6. **Given** a community owner or moderator, **When** they manage community settings, **Then** they can upload and configure custom emojis for their community

### Edge Cases
- What happens when a user tries to react to a post they don't have permission to view?
- How does the system handle reactions to deleted or hidden posts?
- What happens when a custom emoji is deleted but existing reactions use that emoji?
- How are reaction counts displayed when the count exceeds a certain threshold (e.g., 1000+ reactions)?
- Users can add multiple different emoji reactions to the same post (one reaction per emoji type)
- Custom emoji images are constrained to 64px height (width proportional to aspect ratio) and limited to 256KB file size
- Custom emojis with aspect ratio exceeding 8:1 (width > 512px at 64px height) are rejected during upload validation
- Posts with more than 20 unique emoji reaction types display first 20 with "Show More" button for modal view
- Users are limited to 100 reactions per hour to prevent spam (rate limit resets hourly)

## Requirements *(mandatory)*

### Functional Requirements

**Core Reaction Functionality**:
- **FR-001**: System MUST allow community members to add emoji reactions to posts within their community
- **FR-002**: System MUST allow users to remove their own reactions (toggle behavior)
- **FR-003**: System MUST display reaction counts for each unique emoji on a post
- **FR-004**: System MUST show which users reacted with each emoji (when viewing reaction details)
- **FR-005**: System MUST support both Unicode emojis and custom community-specific emojis
- **FR-006**: System MUST prevent non-members from reacting to community posts
- **FR-007**: System MUST persist all reactions in user PDSs using AT Protocol Lexicon schemas
- **FR-031**: Users MUST be able to add multiple different emoji reactions to the same post (one reaction per emoji type)

**Custom Emoji Management**:
- **FR-008**: Community owners MUST be able to upload custom emoji images for their community
- **FR-009**: Community owners and moderators MUST be able to name and configure custom emojis
- **FR-010**: Community owners MUST be able to delete custom emojis from their community
- **FR-011**: System MUST display custom emojis in the emoji picker alongside standard Unicode emojis
- **FR-012**: Custom emoji images MUST be stored in PDS blob storage as AT Protocol blobs
- **FR-013**: Custom emoji metadata (name, image reference, community) MUST be stored in PDS using Lexicon schemas

**Reaction Display & UX**:
- **FR-014**: System MUST display reactions below or adjacent to each post
- **FR-015**: System MUST show a visual indicator when the current user has reacted with a specific emoji
- **FR-016**: System MUST provide an emoji picker interface for selecting reactions
- **FR-017**: System MUST update reaction counts using Server-Sent Events (SSE) for near real-time updates
- **FR-035**: System MUST provide SSE endpoint for streaming reaction count updates to connected clients
- **FR-018**: System MUST display custom emojis with their associated images

**Moderation & Permissions**:
- **FR-019**: System MUST allow moderators to remove inappropriate reactions
- **FR-021**: System MUST respect post visibility settings (hidden/deleted posts should not accept new reactions)

**Data Constraints (AT Protocol + PDS + Lexicon)**:
- **FR-022**: All reaction records MUST be stored in user PDSs as AT Protocol records (no separate database)
- **FR-023**: Custom emoji metadata MUST be stored in community owner's PDS
- **FR-024**: Reaction aggregation counts MAY be cached in Durable Objects (7-day TTL) for performance
- **FR-025**: System MUST be able to rebuild reaction counts from PDS records if cache is lost

**Custom Emoji Format & Size**:
- **FR-026**: System MUST support custom emoji formats: PNG (static), GIF (animated), APNG (animated), WebP (static and animated)
- **FR-027**: System MUST limit custom emoji file size to 256KB maximum
- **FR-028**: Custom emoji images MUST be constrained to 64px maximum height, with width proportional to original aspect ratio (supports non-square emojis like wide text-style emojis)
- **FR-032**: System MUST limit custom emoji maximum width to 512px (8:1 aspect ratio at 64px height) to prevent UI layout issues
- **FR-036**: System MUST reject custom emoji uploads that exceed 512px width or 8:1 aspect ratio during validation

**Scalability & Rate Limits**:
- **FR-029**: System MUST display up to 20 unique emoji reaction types inline below each post, with additional reactions accessible via "Show More" button
- **FR-033**: System MUST provide a modal dialog interface for viewing all reactions when post has more than 20 unique emoji types
- **FR-030**: System MUST enforce rate limit of 100 reactions per hour per user (sliding window or fixed hourly reset)
- **FR-034**: System MUST return clear error message when user exceeds rate limit, with time remaining until limit resets

### Key Entities *(include if feature involves data)*

- **Reaction**: Represents a user's emoji reaction to a post
  - Attributes: reactor DID, post URI, emoji (Unicode codepoint or custom emoji identifier), created timestamp
  - Relationships: belongs to a post, created by a user
  - Storage: User's PDS using `net.atrarium.community.reaction` Lexicon schema

- **CustomEmoji**: Represents a community-specific custom emoji
  - Attributes: emoji name, image blob CID (AT Protocol blob reference), community ID, created timestamp, created by (DID)
  - Relationships: belongs to a community, can be used in reactions
  - Storage: Community owner's PDS using `net.atrarium.community.emoji` Lexicon schema (metadata) + PDS blob storage (image)

- **ReactionAggregate**: Cached reaction counts for performance (ephemeral)
  - Attributes: post URI, emoji identifier, count, reactor DIDs list
  - Relationships: aggregates reactions for a specific post-emoji combination
  - Storage: Durable Objects Storage (7-day TTL, rebuildable from PDS)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

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

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted (reactions, custom emojis, storage, UX)
- [x] Ambiguities marked (8 clarification points)
- [x] Ambiguities resolved via /clarify (5 clarifications)
- [x] User scenarios defined (6 acceptance scenarios, 5+ edge cases)
- [x] Requirements generated (36 functional requirements)
- [x] Entities identified (Reaction, CustomEmoji, ReactionAggregate)
- [x] Review checklist passed

---

## Notes

**Design Philosophy Alignment**:
- Reactions are stored in user PDSs as AT Protocol records, maintaining data ownership
- Custom emoji metadata is stored in community owner's PDS, consistent with community config pattern
- Reaction counts are cached in Durable Objects for performance, but rebuildable from PDS
- No separate database required (complies with Constitution Principle 8)

**Slack/Mastodon/Misskey Feature Parity**:
- **Slack**: Custom emoji upload, reaction toggle, reactor list
- **Mastodon**: Unicode + custom emojis, reaction counts
- **Misskey**: Custom emoji picker, animated emoji support

**Key Open Questions for /clarify**:
1. Maximum unique emoji types per post (scalability)
2. Multiple different emoji reactions per user per post (UX behavior)
3. Rate limiting strategy (abuse prevention)
4. Custom emoji storage location (architecture decision)
5. Real-time update mechanism (performance vs complexity)
6. Per-post reaction control (moderation scope)
7. Custom emoji file size and format constraints (performance)
8. Animated emoji support (feature scope)
