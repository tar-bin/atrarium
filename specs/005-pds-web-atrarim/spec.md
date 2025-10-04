# Feature Specification: Web Dashboard for Atrarium with Local PDS Integration

**Feature Branch**: `005-pds-web-atrarim`
**Created**: 2025-10-04
**Status**: Draft
**Input**: User description: "ローカルPDSと連携して、Web画面でAtrarimの機能を操作できるようにする"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Web-based dashboard for Atrarium operations with local PDS
2. Extract key concepts from description
   → Actors: Community owners, moderators, members
   → Actions: Manage communities, create feeds, post to PDS, moderate content
   → Data: Communities, feeds, posts, moderation logs
   → Constraints: Local development environment, PDS integration
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Authentication method for dashboard access]
   → [NEEDS CLARIFICATION: User role permissions for each operation]
   → [NEEDS CLARIFICATION: Multi-language support requirements]
4. Fill User Scenarios & Testing section
   → Primary flow: Create community → Create feed → Post to PDS → View in feed
5. Generate Functional Requirements
   → Dashboard UI, community management, feed operations, PDS posting
6. Identify Key Entities
   → Community, Feed, Post, User Session
7. Run Review Checklist
   → WARN: Spec has uncertainties (auth method, permissions, i18n)
8. Return: SUCCESS (spec ready for planning with clarifications needed)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-04

- Q: How should users authenticate to access the dashboard? → A: Use PDS credentials directly (dashboard calls PDS login API)
- Q: Can moderators create new theme feeds, or is that restricted to owners only? → A: All members can create feeds (automatic archiving handles lifecycle)
- Q: Who can view hidden posts in the "Hidden Posts" tab? → A: Moderators and owners only
- Q: What should the dashboard do when PDS posting fails? → A: Display error message only, no automatic retry (user manually retries)
- Q: Maximum character limits for community and feed names? → A: 50 characters for both
- Q: Frontend framework preferences? → A: TanStack ecosystem (React Query + Router + Table) for Cloudflare Pages deployment
- Q: Multi-language support requirements? → A: English and Japanese support via react-i18next, browser language auto-detect, manual language toggle
- Q: UI component library preferences? → A: shadcn/ui for accessible, customizable components with Tailwind CSS
- Q: Additional frontend utilities? → A: react-hook-form + Zod (validation), lucide-react (icons), date-fns (dates), react-error-boundary (errors), oRPC (type-safe API)
- Q: Frontend testing strategy? → A: Vitest + @testing-library/react + MSW (three-layer: unit 50%, component 30%, integration 20%)
- Q: Community name uniqueness enforcement? → A: No uniqueness requirement - duplicate names allowed, only UUID collision prevention guaranteed (database-level)
- Q: Can community owners update or delete/close communities? → A: Yes, owners can update community info and close (archive) communities

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A community owner wants to manage their Atrarium community through a visual web interface instead of using API tools. They need to:
1. Create a new community with a name and description
2. Create theme feeds within the community, each receiving a unique hashtag
3. Post messages to their local Bluesky PDS that include feed hashtags
4. View all posts associated with a specific feed
5. Moderate content by hiding inappropriate posts or blocking users

### Acceptance Scenarios

0. **Given** a user opens the dashboard for the first time, **When** they enter their PDS handle and password (e.g., alice.test/test123), **Then** the system authenticates via PDS login API and grants access to dashboard features

1. **Given** a user opens the dashboard, **When** they click "Create Community" and fill in the form with valid data, **Then** the community appears in the community list and they can access its detail page

2. **Given** a community exists, **When** the owner creates a new theme feed, **Then** the system generates a unique hashtag (format: #atr_xxxxx) and displays it for the owner to share

3. **Given** a user is authenticated with their local PDS account, **When** they write a post in the feed's post creation form, **Then** the system automatically appends the feed's hashtag and posts to the local PDS

4. **Given** posts exist in a feed, **When** the user views the feed detail page, **Then** they see a list of posts showing author, text, and timestamp

5. **Given** a user has moderator role, **When** they click "Hide" on a post, **Then** the post is marked as hidden and no longer appears in the public feed view

6. **Given** a blocked user exists, **When** they attempt to post to the feed, **Then** their posts do not appear in the feed (blocked at indexing time)

### Edge Cases

- What happens when a user tries to create a community with a duplicate name?
- How does the system handle posts exceeding 300 characters?
- When the local PDS is offline during post creation, the dashboard displays an error message and the user must manually retry after PDS is back online
- How are posts from non-members displayed (should they be filtered out)?
- What happens if a feed hashtag generation fails (collision after retries)?
- How does the dashboard handle concurrent moderation actions on the same post?

## Requirements *(mandatory)*

### Functional Requirements

#### Dashboard Access & Navigation
- **FR-001**: Users MUST be able to access a web-based dashboard through a browser
- **FR-002**: Dashboard MUST display a navigation menu with links to communities, feeds, and moderation sections
- **FR-003**: System MUST authenticate users via PDS credentials (handle and password), calling the PDS login API
- **FR-004**: Dashboard MUST maintain user session state across page navigations

#### Community Management
- **FR-005**: Users MUST be able to create new communities with a name and optional description
- **FR-006**: System MUST display a list of all communities the user has access to
- **FR-007**: Users MUST be able to view community details including member count, feed list, and statistics
- **FR-008**: System MUST generate unique UUIDs for community IDs to prevent ID collisions (duplicate community names are allowed)
- **FR-009**: Community owners MUST be able to update community information (name, description) and close (archive) communities

#### Feed Management
- **FR-010**: Users MUST be able to create theme feeds within a community
- **FR-011**: System MUST generate a unique hashtag for each feed upon creation (format: #atr_xxxxx)
- **FR-012**: Dashboard MUST display the feed's hashtag prominently after creation
- **FR-013**: Users MUST be able to copy the feed hashtag to clipboard with a single click
- **FR-014**: System MUST display feed statistics including post count and active users
- **FR-015**: Users MUST be able to view a list of all feeds within a community

#### PDS Integration - Posting
- **FR-016**: Users MUST be able to authenticate with their local Bluesky PDS account from the dashboard
- **FR-017**: Dashboard MUST provide a post creation form within each feed's detail page
- **FR-018**: System MUST automatically append the feed's hashtag to post text before submission
- **FR-019**: System MUST enforce the 300-character limit for posts
- **FR-020**: System MUST display success confirmation with the post URI after successful posting to PDS
- **FR-021**: System MUST display error messages when PDS posting fails, without automatic retry (user must manually retry)

#### Post Display
- **FR-022**: Dashboard MUST display a list of posts for each feed
- **FR-023**: Each post MUST show author DID, post text, and creation timestamp
- **FR-024**: Users MUST be able to refresh the post list to fetch latest posts
- **FR-025**: System MUST display an empty state message when a feed has no posts
- **FR-026**: Posts MUST be ordered by creation time (newest first)

#### Moderation
- **FR-027**: Users with moderator role MUST be able to hide posts from public feed view
- **FR-028**: Users with moderator role MUST be able to block users from posting to a feed
- **FR-029**: System MUST display a confirmation dialog before executing moderation actions
- **FR-030**: Hidden posts MUST be viewable in a separate "Hidden Posts" tab accessible only to moderators and owners
- **FR-031**: System MUST log all moderation actions with moderator DID, action type, target, and timestamp
- **FR-032**: Dashboard MUST provide a moderation log view showing action history
- **FR-033**: Moderators MUST be able to unhide previously hidden posts
- **FR-034**: Moderators MUST be able to unblock previously blocked users

#### User Roles & Permissions
- **FR-035**: System MUST distinguish between owner, moderator, and member roles
- **FR-036**: All community members MUST be able to create theme feeds (system handles lifecycle via automatic archiving)
- **FR-037**: Only owners and moderators MUST be able to perform moderation actions (hide posts, block users)
- **FR-038**: All members MUST be able to view posts and create posts to feeds

#### Data Validation & Error Handling
- **FR-039**: System MUST validate community name is not empty and does not exceed 50 characters
- **FR-040**: System MUST validate feed name is not empty and does not exceed 50 characters
- **FR-041**: System MUST prevent duplicate feed names within the same community
- **FR-042**: System MUST display user-friendly error messages for validation failures
- **FR-043**: System MUST handle network errors gracefully when communicating with backend API or PDS

### Key Entities *(include if feature involves data)*

- **Community**: Represents a group of users organized around a common interest. Contains name (max 50 chars), description, creation date, owner DID, member count, and post count.

- **Feed**: A themed content stream within a community. Contains name (max 50 chars), description, status (active/warning/archived), system-generated hashtag, and statistics (7-day post count, active users).

- **Post**: A message created by a user and posted to the local PDS. Contains AT-URI, author DID, text content, creation timestamp, media flag, and moderation status (approved/hidden/reported).

- **User Session**: Represents an authenticated user's dashboard session. Contains user DID, display handle, authentication status, and PDS session details.

- **Moderation Action**: A log entry for moderator actions. Contains action type (hide_post/unhide_post/block_user/unblock_user), target URI or DID, feed ID, moderator DID, reason, and timestamp.

- **Membership**: Association between a user and a community. Contains user DID, community ID, role (owner/moderator/member), join date, and last activity timestamp.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (6 clarifications needed)
- [ ] Requirements are testable and unambiguous (pending clarifications)
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (local development, web dashboard)
- [ ] Dependencies and assumptions identified (needs clarification on auth, permissions)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (6 clarifications)
- [x] User scenarios defined
- [x] Requirements generated (43 functional requirements)
- [x] Entities identified (6 entities)
- [ ] Review checklist passed (WARN: 6 clarifications needed)

---

## Outstanding Clarifications

1. **Authentication Method**: How should users authenticate to access the dashboard? Options:
   - Use PDS credentials directly (alice.test/test123)
   - Separate dashboard authentication system
   - OAuth flow with PDS

2. **User Role Permissions**:
   - Can moderators create feeds, or only owners?
   - Who can view hidden posts (only moderators, or also owners)?
   - Can members invite other members?

3. **Community Name Uniqueness**: Should community names be unique globally, per user, or no restriction?

4. **String Length Limits**: What are the maximum character limits for:
   - Community name and description
   - Feed name and description
   - Moderation action reason

5. **Community Lifecycle**: Can users update or delete communities? If yes, what happens to:
   - Existing feeds within the community
   - Posts already indexed
   - Memberships

6. **Error Handling & Retry**:
   - Should the dashboard retry failed PDS posts?
   - How to handle offline PDS (queue posts, show error, disable posting)?
   - Should moderation actions be reversible indefinitely?

---

## Next Steps

1. Run `/clarify` to resolve outstanding clarifications
2. Update spec with clarification answers
3. Proceed to `/plan` for implementation planning
