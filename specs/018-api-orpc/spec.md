# Feature Specification: Complete oRPC API Implementation

**Feature Branch**: `018-api-orpc`
**Created**: 2025-01-11
**Status**: Draft
**Input**: User description: "APIをoRPCとして完全に実装する"

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: Migrate all legacy Hono routes to oRPC router implementation
2. Extract key concepts from description
   → Actors: API developers, client developers
   → Actions: Migrate Posts/Emoji/Reactions routes, fix Moderation.list
   → Data: Posts, Emojis, Reactions, Moderation actions
   → Constraints: Must maintain API contract compatibility, preserve PDS-first architecture
3. For each unclear aspect:
   → All aspects are clear from codebase analysis
4. Fill User Scenarios & Testing section
   → Developer workflow: migrate routes, test compatibility, deprecate legacy
5. Generate Functional Requirements
   → Each requirement is testable via contract tests
6. Identify Key Entities (if data involved)
   → Posts, Emojis, Reactions, Moderation Actions (already defined in Lexicon schemas)
7. Run Review Checklist
   → No implementation details (focuses on API contract, not specific tech)
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As an **API client developer**, I want to use a **type-safe, unified oRPC interface** for all Atrarium API endpoints, so that I can **benefit from compile-time type checking, automatic code completion, and consistent error handling** across all API operations (communities, memberships, posts, emoji, reactions, moderation).

### Acceptance Scenarios

1. **Given** an API client uses the oRPC contract for Posts API, **When** they call `posts.create()`, **Then** they receive compile-time type safety for inputs/outputs and the post is created in the user's PDS.

2. **Given** an API client uses the oRPC contract for Emoji API, **When** they call `emoji.upload()`, **Then** TypeScript validates the emoji format at compile time and the emoji record is stored in the user's PDS.

3. **Given** an API client uses the oRPC contract for Reactions API, **When** they call `reactions.add()`, **Then** the reaction is recorded in PDS and aggregated in the Durable Object without type mismatches.

4. **Given** an API client uses the oRPC contract for Moderation API, **When** they call `moderation.list()` with a community URI, **Then** they receive all moderation actions for that community (not an empty array).

5. **Given** existing API clients use legacy Hono routes, **When** routes are migrated to oRPC, **Then** API behavior remains identical (backward compatibility guaranteed).

### Edge Cases

- What happens when a client tries to call a legacy route after migration?
  → Legacy routes should be deprecated with clear migration path, but temporarily maintained for backward compatibility during transition period.

- How does the system handle validation errors in oRPC vs legacy routes?
  → Both should return identical error structures (status codes, error messages) to maintain compatibility.

- What happens if oRPC middleware fails to extract user context?
  → Authenticated endpoints should return 401 Unauthorized, public endpoints should proceed without user context.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Posts API (oRPC Migration)
- **FR-001**: API MUST provide oRPC endpoints for creating posts in community feeds via PDS records.
- **FR-002**: API MUST provide oRPC endpoints for listing posts in a community feed with pagination.
- **FR-003**: API MUST provide oRPC endpoints for retrieving individual post details by URI.
- **FR-004**: Posts API MUST enforce membership validation (only community members can post).
- **FR-005**: Posts API MUST support custom Lexicon schema (`net.atrarium.community.post`) storage in user PDS.

#### Emoji API (oRPC Migration)
- **FR-006**: API MUST provide oRPC endpoints for uploading custom emojis to user PDS.
- **FR-007**: API MUST provide oRPC endpoints for listing user's uploaded emojis.
- **FR-008**: API MUST provide oRPC endpoints for submitting emojis to community registry (approval required).
- **FR-009**: API MUST provide oRPC endpoints for listing pending emoji submissions (admin-only).
- **FR-010**: API MUST provide oRPC endpoints for approving emoji submissions (owner-only).
- **FR-011**: API MUST provide oRPC endpoints for revoking approved emojis (owner-only).
- **FR-012**: API MUST provide oRPC endpoints for retrieving community emoji registry (public).

#### Reactions API (oRPC Migration)
- **FR-013**: API MUST provide oRPC endpoints for adding reactions to posts (Unicode or custom emoji).
- **FR-014**: API MUST provide oRPC endpoints for removing user's own reactions.
- **FR-015**: API MUST provide oRPC endpoints for listing reaction aggregates for a post.
- **FR-016**: Reactions API MUST enforce rate limiting (100 reactions/hour/user).
- **FR-017**: Reactions API MUST support real-time reaction updates via Server-Sent Events (SSE).

#### Moderation API (Fix)
- **FR-018**: Moderation list endpoint MUST accept `communityUri` parameter to filter actions by community.
- **FR-019**: Moderation list endpoint MUST return all moderation actions for communities where user has admin permissions.

#### Type Safety & Developer Experience
- **FR-020**: API MUST provide end-to-end type safety from server to client via oRPC contract.
- **FR-021**: API MUST generate OpenAPI specification from oRPC contract for documentation.
- **FR-022**: API MUST validate inputs/outputs against Zod schemas at runtime.
- **FR-023**: API MUST return consistent error structures across all endpoints (oRPC standard errors).

#### Backward Compatibility
- **FR-024**: API MUST maintain identical response formats during migration (no breaking changes).
- **FR-025**: API MUST support legacy routes during transition period with deprecation warnings.
- **FR-026**: API MUST document migration path from legacy routes to oRPC in API documentation.

### Key Entities *(include if feature involves data)*

- **Post**: Community post content stored in user PDS via `net.atrarium.community.post` Lexicon. Attributes: text, communityId, createdAt.
- **Emoji**: Custom emoji image/metadata stored in user PDS. Attributes: shortcode, imageUrl, creator, approved (community-level).
- **Reaction**: User reaction to a post (emoji reference + post URI). Stored in PDS as `net.atrarium.community.reaction`. Aggregated in Durable Object for performance.
- **Moderation Action**: Admin action against post/user. Stored in moderator's PDS as `net.atrarium.moderation.action`. Attributes: action type, target, reason, timestamp.

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
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes

### Scope Boundaries
- **In scope**: Migrating Posts, Emoji, Reactions routes to oRPC; fixing Moderation.list
- **Out of scope**: Changing API contract definitions (already defined in `shared/contracts/src/router.ts`)
- **Out of scope**: Modifying Lexicon schemas (already stable)

### Dependencies
- Existing oRPC contract definitions in `@atrarium/contracts`
- Existing PDS service methods in `server/src/services/atproto.ts`
- Existing Durable Object implementations for Posts/Emoji/Reactions

### Assumptions
- Current API contract in `shared/contracts/src/router.ts` is correct and complete
- Legacy Hono routes have identical behavior to what oRPC should implement
- Client migration can happen incrementally (legacy routes maintained temporarily)

### Success Metrics
- All contract endpoints have working handlers in `server/src/router.ts`
- Contract tests pass for all migrated endpoints
- OpenAPI spec includes all endpoints
- No regressions in existing API behavior (integration tests pass)
