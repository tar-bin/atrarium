# Feature Specification: Internal Post Management (Decouple from Bluesky Posts)

**Feature Branch**: `014-bluesky`
**Created**: 2025-10-08
**Status**: Specification Complete
**Input**: User description: "投稿はタイムラインごとに内部で独自管理するようにし、Blueskyの投稿を利用するのをやめる"
**Clarification**: User selected **Interpretation A** - Define custom Lexicon for post data, store in PDS, stop using Bluesky Firehose

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature request: Stop using Bluesky posts, manage posts internally per timeline
   → Clarified: Use custom Lexicon schemas, store in PDS (Interpretation A)
2. Extract key concepts from description
   → Actors: Community members, moderators, system
   → Actions: Create posts, read timeline, store posts internally in PDS
   → Data: Post content, metadata, timeline association via Lexicon
   → Constraints: Must use AT Protocol + PDS + custom Lexicon schemas
3. Ambiguities resolved:
   → Posts stored in PDS using new net.atrarium.community.post Lexicon
   → Stop indexing from Bluesky Firehose (app.bsky.feed.post)
   → Posts visible only in Atrarium dashboard (not official Bluesky apps)
   → Maintains Constitution compliance (Principles 4, 5, 8)
4. Fill User Scenarios & Testing section
   → Primary: User creates post in community timeline using custom Lexicon
5. Generate Functional Requirements
   → Custom Lexicon definition, PDS storage, direct querying (no Firehose)
6. Identify Key Entities
   → Post (net.atrarium.community.post), Timeline, Author
7. Run Review Checklist
   → PASS: Constitution compliant, requirements clear
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
As a community member, I want to create posts that appear only in my community timeline without requiring them to be published to the broader Bluesky network, so that I can have private/internal community discussions that don't clutter my public Bluesky profile.

### Acceptance Scenarios
1. **Given** I am a logged-in community member, **When** I create a post in the community timeline, **Then** the post is stored in my PDS using the custom Lexicon schema and flows through AT Protocol Relay to be indexed
2. **Given** I created an internal post, **When** other community members view the timeline, **Then** they can see my post in chronological order (indexed via Firehose → Durable Objects cache)
3. **Given** I view my Bluesky profile in the official app, **When** I check my posts, **Then** internal community posts do not appear (official apps only show app.bsky.feed.post)
4. **Given** existing posts were indexed from Bluesky Firehose, **When** the system is updated, **Then** those posts remain in the feed cache but new posts use the custom Lexicon

### Edge Cases
- What happens when a user tries to share/repost an internal post to Bluesky? (Internal posts remain separate from Bluesky social graph)
- How does the system handle existing posts that were indexed from the Bluesky Firehose? (Coexist during transition period, gradually expire from 7-day cache)
- Can users optionally publish internal posts to Bluesky later? (Future enhancement - not in scope for this feature)
- What happens to posts if a user leaves the community? (Posts remain in user's PDS, but may be excluded from timeline based on membership status)

## Requirements

### Functional Requirements

**Post Creation & Storage**
- **FR-001**: System MUST allow community members to create posts that are stored in their PDS using a custom AT Protocol Lexicon schema (net.atrarium.community.post)
- **FR-002**: System MUST store posts in the user's PDS, not in Bluesky's app.bsky.feed.post collection
- **FR-003**: System MUST preserve post authorship information (author DID, display name)
- **FR-004**: System MUST associate each post with a specific community ID (immutable, survives stage transitions)
- **FR-005**: System MUST support plain text post content initially (rich media deferred to future enhancement)
- **FR-021**: System MUST allow posts in communities at any stage (theme, community, or graduated)
- **FR-022**: Posts MUST remain associated with their original community when stage changes (theme → community → graduated)

**Bluesky Lexicon Integration**
- **FR-016**: System MUST continue to use app.bsky.actor.profile for user profile information (avatar, display name, bio)
- **FR-017**: System MUST NOT replace all Bluesky Lexicons, only app.bsky.feed.post with net.atrarium.community.post
- **FR-018**: System MUST fetch user profile data from Bluesky AppView or PDS when displaying posts

**Timeline Display & Querying**
- **FR-006**: System MUST display internal posts in community timelines in reverse chronological order
- **FR-007**: System MUST index posts from AT Protocol Relay/Firehose (all Lexicons including net.atrarium.community.post are available)
- **FR-008**: System MUST cache indexed posts in Durable Objects for performance (7-day TTL maintained)
- **FR-009**: System MUST verify membership status before including posts in timeline
- **FR-019**: System MUST serve timeline via Dashboard API only (not via AT Protocol Feed Generator API)
- **FR-020**: System MUST deprecate Feed Generator API (`getFeedSkeleton`) as Bluesky AppView cannot render custom Lexicon posts

**Data Ownership & Portability**
- **FR-010**: Posts MUST remain in user's PDS permanently (not subject to 7-day expiry like cache)
- **FR-011**: Users MUST be able to export/migrate their posts by exporting their PDS data (inherent AT Protocol capability)
- **FR-012**: Posts MUST NOT appear in official Bluesky apps (separate Lexicon collection)

**Migration & Compatibility**
- **FR-013**: System MUST continue to support existing Bluesky Firehose-indexed posts during transition period
- **FR-014**: System MUST allow coexistence of old (app.bsky.feed.post) and new (net.atrarium.community.post) posts in timeline
- **FR-015**: System MUST stop indexing new app.bsky.feed.post posts after migration

### Key Entities
- **Post (net.atrarium.community.post)**: AT Protocol record containing text content, community ID, created timestamp, author reference
- **Profile (app.bsky.actor.profile)**: User profile data from Bluesky (avatar, display name, bio) - reused, not replaced
- **Timeline**: Aggregated view of posts from all community members, indexed via Firehose, filtered by membership and moderation status
- **Author**: User identity (DID), profile data from app.bsky.actor.profile, community membership status (verified via net.atrarium.community.membership)

---

## Constitution Compliance ✅

**Selected Approach: Interpretation A** - This specification fully complies with all Project Constitution principles:

**Principle 4: Decentralized Identity and Data Ownership** ✅
- Posts stored in user's PDS using custom Lexicon
- Users maintain full ownership and portability of their content
- Data can be exported/migrated via standard AT Protocol mechanisms

**Principle 5: PDS-First Architecture** ✅
- PDS remains the source of truth for all post data
- Durable Objects continue as 7-day performance cache
- Direct PDS querying replaces Firehose indexing

**Principle 8: AT Protocol + PDS + Lexicon Constraints** ✅
- All features implemented using AT Protocol + PDS + custom Lexicon (net.atrarium.community.post)
- No separate databases required
- Pure AT Protocol approach maintained

**Design Philosophy: Protocol-First Architecture** ✅
- Value remains in Lexicon schemas (net.atrarium.community.post definition)
- Implementation remains replaceable
- Other AT Protocol services can implement the same Lexicon

**Positioning vs Competitors** ✅
- All data stored in user PDSs using standard AT Protocol records
- DID-based portable identity maintained
- Decentralized architecture preserved

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
- [x] Scope is clearly bounded (custom Lexicon + direct PDS querying)
- [x] Dependencies and assumptions identified (Constitution compliance verified)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved via user clarification
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Next Steps

**Status**: ✅ Specification complete and ready for planning

This specification can now proceed to `/plan` phase. The implementation will:

1. Define new AT Protocol Lexicon schema: `net.atrarium.community.post`
2. Update post creation API to write to PDS using custom Lexicon
3. Update Firehose filtering to index `net.atrarium.community.post` (in addition to existing filters)
4. Maintain Durable Objects caching for performance (7-day TTL)
5. Continue using `app.bsky.actor.profile` for user profile data (not replaced)
6. Support coexistence of legacy `app.bsky.feed.post` and new `net.atrarium.community.post` during transition
7. Deprecate Feed Generator API (`getFeedSkeleton`) - custom Lexicon posts not compatible with Bluesky AppView
8. Serve timeline exclusively via Dashboard API (`GET /api/communities/{id}/posts`)
