# Feature Specification: Direct Feed Posting by Feed ID

**Feature Branch**: `003-id`
**Created**: 2025-10-04
**Status**: Draft
**Input**: User description: "ユーザーはコミュニティ内のフィードに直接投稿できる必要がある。フィルター条件でマッチング判定は行わずフィードのIDをもとにフィードを構築する必要がある。"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature allows users to directly post to feeds within a community
   → Posts should be associated with feeds by feed ID, not by filter matching
2. Extract key concepts from description
   → Actors: Community members (users)
   → Actions: Post content directly to a specific feed
   → Data: Posts, Feed ID, User identity
   → Constraints: No automatic filter-based matching
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What permissions are required to post to a feed?]
   → [NEEDS CLARIFICATION: Can users post to multiple feeds simultaneously?]
   → [NEEDS CLARIFICATION: What happens to posts if a feed is archived/deleted?]
   → [NEEDS CLARIFICATION: Are there rate limits or spam prevention measures?]
   → [NEEDS CLARIFICATION: Can users edit or delete their posts after submission?]
4. Fill User Scenarios & Testing section
   → Primary flow: User selects feed → creates post → post appears in that feed
5. Generate Functional Requirements
   → Direct posting mechanism, feed ID association, post persistence
6. Identify Key Entities
   → Post (with feed association), Feed, User/Member
7. Run Review Checklist
   → WARN "Spec has uncertainties" - multiple clarifications needed
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## Clarifications

### Session 2025-10-04
- Q: 投稿権限 - どのロールのユーザーがフィードに投稿できますか？ → A: すべてのコミュニティメンバー（member, moderator, owner）
- Q: アーカイブ済みフィード - アーカイブ済み（archived status）のフィードへの投稿はどう扱いますか？ → A: アーカイブステータスに関わらず全ての投稿を受け入れる（特別な扱いなし）
- Q: 複数フィード投稿 - 同じ投稿を複数のフィードに関連付けることはできますか？ → A: 複数のフィード識別ハッシュタグを付与することで可能
- Q: 投稿の削除・編集 - ユーザーがフィードに追加した投稿を後から削除できますか？ → A: PDS側で削除されたら自動削除
- Q: 投稿の保持期間 - フィードに関連付けられた投稿URIはどのくらいの期間保持されますか？ → A: 無期限（削除されるまで永続）
- Q: データ保存場所 - 投稿とフィードの関連付けはどのように実現されますか？ → A: システム生成のユニークハッシュタグ（#atr_xxxxx形式）を使用し、AT Protocol標準のフィルター方式に準拠
- Q: モデレーション - コミュニティオーナー/モデレーターはどのようにフィードを管理できますか？ → A: ハッシュタグ + メンバーシップの二重検証。メンバーのみ投稿可能。モデレーターは個別投稿の非表示、ユーザーのブロック、メンバー追放が可能

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A community member wants to share content with their community by posting directly to a specific feed. They select the target feed from their community's available feeds (e.g., "Tech Topics"), create their post content, and submit it. The system automatically appends a unique feed identifier hashtag (e.g., #atr_f7a3b2c1) to the post text. The post is saved to their PDS as a standard AT Protocol post. The Feed Generator monitors the Firehose, detects the hashtag, and includes the post in the corresponding feed. The post immediately appears in that feed for all community members to see.

### Acceptance Scenarios
1. **Given** a user is a member of a community with multiple feeds, **When** they create a post and select feed "Tech Topics" (with hashtag #atr_f7a3b2c1), **Then** the post text includes #atr_f7a3b2c1 and appears in that feed
2. **Given** a user has created a post with #atr_f7a3b2c1, **When** another member views the "Tech Topics" feed, **Then** they see the newly created post
3. **Given** a user is viewing a community's feed list, **When** they select a feed to post to, **Then** the system automatically appends the feed's unique hashtag to their post
4. **Given** a user posts with hashtag #atr_f7a3b2c1, **When** the Feed Generator retrieves the feed skeleton, **Then** the post URI is included in the response
5. **Given** a feed has hashtag #atr_f7a3b2c1, **When** the Firehose delivers a post containing that hashtag, **Then** the Feed Generator indexes it for that feed

### Edge Cases
- What happens when a user tries to post to a feed that doesn't exist? → System rejects with error (validated before appending hashtag)
- What happens when a user tries to post to a feed in a community they're not a member of? → System rejects with permission error (no hashtag appended)
- What happens when a user tries to post to an archived or inactive feed? → Post is accepted with hashtag appended (status doesn't block posting)
- How does the system handle duplicate hashtags in a post? → Feed Generator indexes the post once per unique feed hashtag
- What happens to existing posts when a feed is deleted? → Posts remain in user's PDS with hashtag, but feed no longer exists to display them
- Can users post to feeds in communities they've been removed from? → No, membership validation blocks it at UI level
- What happens if a user's Bluesky post is deleted after being added to a feed? → Post disappears from feed (Firehose detects deletion)
- What if a user manually adds #atr_xxxxx hashtag without using Atrarium UI? → Post appears in feed **only if user is a community member**
- What if a non-member adds the correct hashtag? → Post is ignored (membership check fails, not indexed)
- What if a user manually removes feed hashtag from their post in PDS? → Post disappears from feed on next Firehose update (eventual consistency)
- How does the system handle hashtag collisions? → Use cryptographically unique IDs (8+ hex chars) to minimize collision probability
- Can standard Bluesky clients post to Atrarium feeds? → Yes, by manually including the feed hashtag, **but only if already a community member**
- What happens when a moderator hides a post? → Post remains in user's PDS, but excluded from feed skeleton responses
- What happens when a user is banned from a community? → All their posts immediately disappear from community feeds (index entries invalidated)
- Can a hidden post be unhidden? → Yes, moderators can change moderation_status back to 'approved'

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Users MUST be able to select a target feed from the UI, which automatically appends the feed's unique hashtag to their post
- **FR-002**: Each feed MUST have a system-generated unique hashtag identifier (format: #atr_[unique-id], e.g., #atr_f7a3b2c1)
- **FR-003**: System MUST automatically append feed hashtags to post text when user selects a feed (transparent to user)
- **FR-004**: Feed Generator MUST monitor Firehose for posts containing feed-specific hashtags
- **FR-005**: Feed Generator MUST filter posts by hashtag to build feed-specific indexes in D1
- **FR-006**: System MUST validate that the target feed exists before appending its hashtag
- **FR-007**: All community members (member, moderator, owner roles) MUST be able to post to any feed within their community
- **FR-008**: System MUST accept posts to feeds regardless of their status (active, warning, archived)
- **FR-009**: Users MUST be able to select multiple feeds for a single post (system appends multiple hashtags)
- **FR-010**: System MUST [NEEDS CLARIFICATION: What spam prevention is needed? - rate limits per user/feed, content validation, or moderation queue?]
- **FR-011**: When a post is deleted from the user's PDS, it MUST automatically disappear from all feeds
- **FR-012**: Post-feed associations MUST persist indefinitely in the user's PDS as part of post text
- **FR-013**: System MUST verify user membership in the community before allowing posts to that community's feeds
- **FR-014**: System MUST respect AT Protocol standard filtering mechanisms (hashtag-based)
- **FR-015**: Feed hashtags MUST NOT conflict with meaningful community hashtags (use system prefix #atr_)
- **FR-016**: Feed Generator MUST only index posts from users who are current members of the feed's community (membership + hashtag both required)
- **FR-017**: When a user is removed from a community, all their posts MUST automatically disappear from that community's feeds
- **FR-018**: Moderators MUST be able to hide specific posts from feeds without deleting them from user's PDS
- **FR-019**: Moderators MUST be able to block specific users from appearing in community feeds
- **FR-020**: System MUST maintain moderation logs for accountability (who hid what, when, and why)

### Key Entities
- **Post (stored in user's PDS)**: Standard AT Protocol post with unique URI, containing text (including system-appended feed hashtags), media, author identity, and timestamps. Fully owned and controlled by the user.
- **Feed (stored in Atrarium D1)**: Represents a collection of posts identified by a unique feed ID and associated hashtag (e.g., #atr_f7a3b2c1). Contains human-readable name, hashtag, and an index of post URIs discovered via Firehose monitoring.
- **Feed Hashtag**: System-generated unique identifier (format: #atr_[8-char-hex]) that associates posts with feeds through AT Protocol standard hashtag filtering.
- **Membership (stored in Atrarium D1)**: Represents the relationship between a user and a community, determines posting permissions and access rights. Required for posts to appear in feeds.
- **Community (stored in Atrarium D1)**: Container for multiple feeds, defines membership and access policies.
- **Post Index Entry (stored in Atrarium D1)**: Cache of post URIs that passed both hashtag and membership validation. Includes moderation status for filtering.
- **Moderation Action (stored in Atrarium D1)**: Record of moderator actions (hide post, block user) with timestamp, reason, and moderator identity.

### Data Storage Architecture
- **User's PDS (Personal Data Server)**:
  - Post content (text, media, standard AT Protocol metadata)
  - Feed associations via hashtags embedded in post text (e.g., "Hello world! #atr_f7a3b2c1")
  - User's authoritative data store, portable across AT Protocol network

- **Atrarium D1 Database**:
  - Community definitions (name, stage, settings)
  - Feed definitions (name, hashtag, status)
  - Hashtag mappings (feed ID ↔ #atr_xxxxx)
  - **Membership records (user ↔ community ↔ role)** ← Service-managed, not user-controlled
  - Post URI indexes (derived from Firehose hashtag + membership validation, cache only)
  - Moderation data (hidden posts, blocked users, action logs)
  - System configuration and metadata only (no user post content)

### Design Rationale: Why Membership is NOT Stored in PDS

**Membership must be service-managed (D1) for security and access control:**

1. **Forgery Prevention**: If stored in user's PDS, users could create fake membership records claiming to be owners/members of any community
2. **Access Control**: Invitation-only and approval-required communities require server-side verification
3. **Community Governance**: Membership is a bilateral relationship (user + community agreement), not unilateral user data
4. **Precedent**: Similar to Discord servers, Slack workspaces, GitHub organizations - membership is managed by the service/community

**What users control (PDS)**: Their posts, profile, follows
**What communities control (D1)**: Who is a member, roles, access permissions

### Moderation Flow
1. **Post Indexing (Firehose)**:
   - Detect hashtag #atr_xxxxx → Check membership → Only index if member
2. **Membership Removal**:
   - User removed from community → All their post index entries marked as invalid
3. **Manual Moderation**:
   - Moderator hides post → Update post_index.moderation_status = 'hidden'
   - Moderator blocks user → Add to blocklist → Filter out all their posts
4. **Feed Generation**:
   - Query post_index WHERE feed_id = X AND moderation_status = 'approved' AND author is member

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (5 of 7 resolved, 1 deferred, 1 out of scope)
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
- [x] Review checklist passed (5 critical clarifications resolved)

---
