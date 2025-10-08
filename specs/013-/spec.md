# Feature Specification: Client Use Case Implementation for General Users and Community Administrators

**Feature Branch**: `013-`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "一般ユーザーのユースケースとコミュニティ管理者のユースケースをクライアントで動作するようにする"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature request: Enable general user and community administrator use cases in client
2. Extract key concepts from description
   → Actors: General users, Community administrators
   → Actions: Browse feeds, join communities, manage memberships, moderate content
   → Data: Communities, feeds, posts, memberships, moderation actions
   → Constraints: Role-based access, PDS integration
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Which specific general user workflows should be prioritized?]
   → [NEEDS CLARIFICATION: Which administrator workflows are most critical?]
   → [NEEDS CLARIFICATION: Should this support offline/cached browsing?]
4. Fill User Scenarios & Testing section
   → User flow: Browse → Discover → Join → Participate → (Admin: Manage)
5. Generate Functional Requirements
   → Community browsing, feed viewing, membership management, moderation tools
6. Identify Key Entities
   → User session, Community membership, Feed subscription, Moderation action
7. Run Review Checklist
   → WARN "Spec has uncertainties - marked with [NEEDS CLARIFICATION]"
8. Return: SUCCESS (spec ready for planning with clarifications needed)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-07

- Q: コミュニティへの参加方法について、アクセス制御の方針を教えてください → A: Support both open and invite-only communities (admin approval required)
- Q: オーナー権限によるモデレーションについて教えてください → A: Each community has exactly one owner (creator or delegated), others are moderators
- Q: フィードのページネーションについて、1ページあたりの投稿数を教えてください → A: 20 posts per page
- Q: メンバーリストや統計情報の更新方式について教えてください → A: Periodic polling (auto-update every 10-30 seconds)
- Q: コミュニティ統計情報として表示する重要な指標を教えてください → A: Within PDS-feasible scope
- Q: 同時モデレーション競合解決戦略について教えてください（複数の管理者が同時にモデレーション操作を行った場合） → A: Last-Write-Wins (LWW) - timestamp-based conflict resolution
- Q: コミュニティリストのロード時間目標を教えてください → A: 3秒以内
- Q: キャッシュ戦略について教えてください（TanStack Queryを使用） → A: Static data (name, description) 5 minutes, dynamic data (members, stats) 10-30 second polling
- Q: Join Request の保存場所と Lexicon schema 構造について教えてください → A: 既存の `net.atrarium.community.membership` に `status: 'pending'` フィールドを追加して対応（新規 schema 不要）
- Q: Community statistics（FR-025）の PDS からの集計方法について教えてください → A: `net.atrarium.community.membership` レコード数をカウント（総メンバー数のみ、アクティビティ指標なし）

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**General User Journey**:
A user wants to discover and participate in communities on Atrarium. They browse available communities, view community feeds, and join communities of interest. For open communities, they gain immediate access. For invite-only communities, they must wait for administrator approval before accessing the community feed. Users can read posts from community members and leave communities when they lose interest.

**Community Administrator Journey**:
A community has exactly one owner (the creator or someone delegated by the previous owner) who has full administrative control. The owner can appoint moderators to help manage the community. Both owners and moderators can manage membership and moderate content. For invite-only communities, they review and approve/reject join requests. They moderate posts to maintain community standards. Only the owner can promote members to moderator, demote moderators, or transfer ownership. Both owners and moderators can remove regular members who violate community guidelines. They monitor community health through membership statistics and activity metrics.

### Acceptance Scenarios

**General User Scenarios**:

1. **Given** user has authenticated with their PDS, **When** they navigate to the communities page, **Then** they see a list of available communities with names, descriptions, and member counts

2. **Given** user is viewing an open community, **When** they click to join, **Then** their membership is recorded in their PDS and they gain immediate access to the community feed

2a. **Given** user is viewing an invite-only community, **When** they request to join, **Then** their join request is sent to community administrators and they must wait for approval

2b. **Given** administrator receives a join request for their invite-only community, **When** they approve the request, **Then** the user's membership is activated and they gain access to the community feed

3. **Given** user is a member of a community, **When** they view the community feed, **Then** they see posts from other community members in reverse chronological order

4. **Given** user is a member of a community, **When** they choose to leave, **Then** their membership is deactivated and they no longer see that community's posts

5. **Given** user is not authenticated, **When** they try to access community features, **Then** they are prompted to log in with their PDS credentials

**Community Administrator Scenarios**:

1. **Given** user is a community owner or moderator, **When** they view the community management page, **Then** they see options to manage members and moderate content

2. **Given** owner is viewing the member list, **When** they select a member, **Then** they can view member details and promote to moderator or remove from community

2a. **Given** owner is viewing the member list, **When** they select a moderator, **Then** they can demote to member or remove from community

2b. **Given** moderator is viewing the member list, **When** they select a regular member, **Then** they can view member details and remove from community (but cannot change roles)

3. **Given** administrator is viewing community posts, **When** they identify a policy-violating post, **Then** they can hide the post with a reason, making it invisible to general members

4. **Given** administrator has hidden a post, **When** they review moderation history, **Then** they can unhide the post if the decision was incorrect

5. **Given** administrator needs to remove a disruptive user, **When** they block the user, **Then** all of that user's posts are hidden and they cannot post new content to the community

6. **Given** administrator wants to understand community health, **When** they view community statistics, **Then** they see total member count (active memberships) and pending join request count derived from PDS membership records

### Edge Cases

- What happens when a user tries to join a community they're already a member of?
- How does the system handle viewing a community feed when the user loses membership (removed by admin)?
- What happens when an administrator tries to moderate content from another administrator or owner?
- How does the system display posts from blocked users in the feed?
- What happens when network connectivity is lost while browsing communities?
- How are conflicts handled when a user's PDS is unavailable during join/leave operations?
- What happens when a community is deleted while a user is viewing it?
- How does pagination work for large community feeds (1000+ posts)?
- What happens when moderation actions fail to sync with the PDS?

## Requirements *(mandatory)*

### Functional Requirements

**General User Requirements**:

- **FR-001**: System MUST allow authenticated users to browse all available communities
- **FR-002**: System MUST display community information including name, description, member count, stage (theme/community/graduated), and access type (open/invite-only)
- **FR-003**: Users MUST be able to join open communities immediately without approval (membership record created with `status: 'active'`)
- **FR-003a**: Users MUST be able to request to join invite-only communities (membership record created with `status: 'pending'`, awaiting administrator approval)
- **FR-003b**: Administrators MUST be able to approve (change `status: 'pending'` → `'active'`) or reject (delete membership record) join requests for invite-only communities
- **FR-004**: Users MUST be able to view feed posts from communities they are members of
- **FR-005**: Users MUST be able to leave communities they have joined
- **FR-006**: System MUST show only posts from active community members (not blocked or removed users)
- **FR-007**: System MUST persist user memberships in their PDS using `net.atrarium.community.membership` records
- **FR-008**: System MUST support pagination for community feeds with 20 posts per page
- **FR-009**: Users MUST be able to view their own membership status and role in each community
- **FR-010**: System MUST display community feeds in reverse chronological order
- **FR-011**: System MUST require PDS authentication before allowing any community interactions

**Community Administrator Requirements**:

- **FR-012**: System MUST provide a community management interface for users with moderator or owner roles
- **FR-013**: Administrators MUST be able to view a list of all community members with their roles and join dates
- **FR-013a**: System MUST enforce that each community has exactly one owner at all times
- **FR-013b**: System MUST allow owner to transfer ownership to another member (owner role delegation)
- **FR-014**: Owners MUST be able to promote members to moderator role (owners only, not moderators)
- **FR-015**: Owners MUST be able to demote moderators to member role (owners only, not moderators)
- **FR-016**: Owners MUST be able to remove any member (including moderators) from the community
- **FR-016a**: Moderators MUST be able to remove regular members (but not other moderators or the owner) from the community
- **FR-017**: Administrators MUST be able to hide posts with a reason, making them invisible to non-admin users
- **FR-018**: Administrators MUST be able to unhide previously hidden posts
- **FR-019**: Administrators MUST be able to block users, automatically hiding all their posts in the community
- **FR-020**: Administrators MUST be able to unblock previously blocked users
- **FR-021**: System MUST persist moderation actions in the moderator's PDS using `net.atrarium.moderation.action` records
- **FR-022**: Administrators MUST be able to view moderation history with timestamps, actions, targets, and reasons
- **FR-023**: System MUST prevent non-administrators from accessing moderation features
- **FR-024**: System MUST allow owner to moderate any content (including moderator posts), and moderators to moderate regular member posts only
- **FR-025**: System MUST display community statistics derived from PDS data only: total member count (count of `net.atrarium.community.membership` records with `status: 'active'`), pending join requests (count with `status: 'pending'`). Activity metrics (post volume, active members) are explicitly out of scope for PDS-first architecture compliance.
- **FR-026**: System MUST update member lists and statistics automatically via periodic polling every 10 seconds (with optional backoff to 30 seconds for inactive tabs)

**Error Handling & Validation**:

- **FR-027**: System MUST display clear error messages when PDS operations fail (network errors, permission denied, etc.)
- **FR-028**: System MUST validate user permissions before allowing moderation actions
- **FR-029**: System MUST handle community deletion gracefully, notifying users and removing cached data
- **FR-030**: System MUST prevent users from joining the same community multiple times
- **FR-031**: System MUST handle concurrent moderation actions using Last-Write-Wins (LWW) conflict resolution based on PDS record timestamps

**Performance & User Experience**:

- **FR-032**: System MUST load community lists within 3 seconds
- **FR-033**: System MUST provide loading indicators during PDS operations
- **FR-034**: System MUST cache static community data (name, description, stage) for 5 minutes, and dynamic data (members, statistics) with 10-second polling intervals (with optional backoff to 30 seconds for inactive tabs to reduce API calls) using TanStack Query
- **FR-035**: System MUST support both English and Japanese languages for all user-facing text
- **FR-036**: System MUST be responsive and work on desktop and mobile browsers

### Key Entities

- **User Session**: Represents an authenticated user with their PDS credentials, DID, and handle. Tracks current authentication state and available permissions across communities.

- **Community Membership**: Represents a user's relationship with a community, including their role (owner/moderator/member), join date, active status, and membership status (active/pending). For invite-only communities, pending membership requests are represented by `status: 'pending'` in the membership record. Stored in user's PDS using `net.atrarium.community.membership` Lexicon schema and synchronized with community feed generator.

- **Feed Subscription**: Represents a user's subscription to a community feed, determining which posts appear in their timeline. Linked to membership status (only active memberships receive feed updates).

- **Moderation Action**: Represents administrative actions taken on posts or users, including the action type (hide/unhide/block/unblock), target (post URI or user DID), reason, timestamp, and moderator identity. Stored in moderator's PDS.

- **Community Metadata**: Information about a community including name, description, hashtag, stage, member count, access type (open/invite-only), and owner/moderator list. Used for discovery and display purposes.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain *(5 critical clarifications resolved)*
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes for Planning Phase

**Dependencies**:
- PDS authentication must be working in client
- Backend API endpoints for communities, memberships, and moderation must be available
- AT Protocol Lexicon schemas (`net.atrarium.*`) must be deployed

**Assumptions**:
- User has a Bluesky PDS account
- User's PDS is reachable and operational
- Backend feed generator is running and processing Firehose events
- oRPC API contracts are already defined in `@atrarium/contracts`

**Out of Scope** (for this feature):
- Creating new communities (already implemented in Phase 0)
- Posting to community feeds (separate feature)
- Achievement system
- Community graduation/splitting
- Feed mixing algorithms
- Mobile native apps
- Activity metrics (post volume, active members by recent activity) - not feasible with PDS-only storage (Principle 8 compliance)

**Resolved Clarifications** (see Clarifications section above):
1. ✅ Community access control: Both open and invite-only communities supported
2. ✅ Owner permissions: Each community has exactly one owner, others are moderators
3. ✅ Feed pagination: 20 posts per page
4. ✅ Update mechanism: Periodic polling every 10-30 seconds
5. ✅ Community statistics: Within PDS-feasible scope

**Deferred to Planning Phase** (low impact on functional requirements):
- Feed filtering/sorting options (UI/UX detail)
- Offline browsing support (technical implementation detail)
- Specific community list load time target (performance optimization)
- Cache invalidation strategy (technical implementation detail)
- Concurrent moderation conflict resolution (edge case handling)
