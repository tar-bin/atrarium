# Implementation Plan: Client Use Case Implementation for General Users and Community Administrators

**Branch**: `013-` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/013-/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Web application (frontend React + backend Cloudflare Workers)
   → Structure Decision: Monorepo with client/ and server/
3. Fill Constitution Check section
   → ✅ Evaluating against Constitution v1.2.0 (8 principles)
4. Evaluate Constitution Check section
   → ✅ PASS - Feature complies with all constitution principles
5. Execute Phase 0 → research.md
   → ✅ Generated
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✅ Generated (updated after /clarify session)
7. Re-evaluate Constitution Check section
   → ✅ PASS - No new violations introduced
8. Plan Phase 2 → Describe task generation approach
   → ✅ Ready for /tasks command
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature enables general users and community administrators to interact with Atrarium communities through a web dashboard. General users can browse, join, and participate in communities, while administrators can manage memberships, moderate content, and monitor community health. The implementation extends the existing React client with new UI components and API integrations, leveraging the existing PDS-first architecture and oRPC type-safe contracts.

**Primary Requirement**: Implement client-side UI/UX for:
- **General Users**: Community discovery, joining (open/invite-only), feed viewing, membership management
- **Administrators**: Member management (role changes, removals), content moderation (hide/block), join request approval, statistics viewing

**Technical Approach**:
- Extend existing React 19 + TanStack Router + TanStack Query client application
- Add new oRPC contract definitions for memberships and moderation endpoints
- Implement UI components using shadcn/ui (Radix + Tailwind CSS)
- Integrate with existing PDS authentication context
- Use periodic polling (10-30s) for real-time updates
- Support EN/JA localization via i18next

**Key Clarifications** (from `/clarify` session 2025-10-07):
- **Join Request Storage**: Use `status: 'pending'` field in existing `net.atrarium.community.membership` schema (no new `joinRequest` Lexicon needed)
- **Community Statistics**: Limited to PDS-feasible metrics only (member count, pending request count). Activity metrics (post volume, active members) explicitly out of scope per Principle 8.

**Out of Scope** (explicitly excluded from this feature):
- Offline browsing with cached data (deferred to future phase - requires service worker + IndexedDB, conflicts with Principle 2 simplicity)
- Creating new communities (already implemented in Phase 0)
- Posting to community feeds (separate feature)
- Achievement system
- Community graduation/splitting
- Feed mixing algorithms
- Mobile native apps
- Activity metrics (post volume, active members by recent activity) - not feasible with PDS-only storage

## Technical Context

**Language/Version**: TypeScript 5.7 (React 19, Node.js via nodejs_compat on server)
**Primary Dependencies**:
- Frontend: React 19, TanStack Router v1, TanStack Query v5, TanStack Table v8, shadcn/ui, i18next
- Backend: Hono ^4.6.14, @atproto/api ^0.13.35, oRPC ^1.9.3
**Storage**: PDS (AT Protocol Personal Data Servers) for persistent state, Durable Objects (7-day ephemeral cache)
**Testing**: Vitest (unit/integration), Playwright (E2E), @cloudflare/vitest-pool-workers (server tests)
**Target Platform**: Web browsers (desktop + mobile responsive), Cloudflare Workers (serverless backend)
**Project Type**: Web (frontend: client/, backend: server/, shared contracts: shared/contracts/)
**Performance Goals**:
- Community list load: <3 seconds (FR-032, clarified in /clarify session)
- Feed pagination: 20 posts/page
- Polling interval: 10-30 seconds for member/stats updates
**Constraints**:
- PDS-only storage (no separate databases)
- Economic efficiency: <$5/month total infrastructure cost
- Mobile-responsive UI
- EN/JA bilingual support
**Scale/Scope**:
- Target: 10-200 member communities
- Expected: <1000 total communities in initial deployment
- UI components: ~15-20 new components + ~10 page routes

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (extends existing client/ and server/ workspaces)
- ✅ No new databases (uses existing PDS + Durable Objects cache)
- ✅ No new services (extends existing Cloudflare Workers backend)
- ✅ Minimal dependencies (reuses React 19, TanStack, shadcn/ui, oRPC stack)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (all data via `net.atrarium.*` Lexicon schemas)
- ✅ Economic efficiency preserved (serverless Cloudflare Workers, no additional infrastructure)
- ✅ No framework proliferation (uses established React 19 + TanStack + Hono stack)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (memberships in `net.atrarium.community.membership`, moderation in `net.atrarium.moderation.action`)
- ✅ Durable Objects used only as 7-day cache (feed index, community metadata)
- ✅ No centralized user database created (all user data in PDSs)

**Code Quality** (Principle 7):
- ✅ Biome linter checks configured and enforced (existing pre-commit hooks)
- ✅ Biome formatter checks configured and enforced
- ✅ TypeScript type checks configured and enforced (tsconfig.json in client/ and server/)
- ✅ Pre-commit validation automated (existing CI/CD quality gates)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ Feature implementable using AT Protocol + PDS + Lexicon schemas only
- ✅ No separate databases (SQL/NoSQL/KV) introduced beyond Durable Objects cache
- ✅ All persistent state resides in PDS using `net.atrarium.*` Lexicon records
  - Memberships: `net.atrarium.community.membership` (user PDS) with new `status` field
  - Moderation actions: `net.atrarium.moderation.action` (moderator PDS)
  - Community config: `net.atrarium.community.config` (owner PDS) with new `accessType` field
- ✅ Durable Objects Storage used only as 7-day ephemeral cache (existing architecture)
- ✅ No feature requires additional database infrastructure

**Conclusion**: ✅ PASS - Feature complies with all constitution principles

## Project Structure

### Documentation (this feature)
```
specs/013-/
├── spec.md              # Feature specification (/specify command output)
├── plan.md              # This file (/plan command output, updated after /clarify)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command, updated after /clarify)
├── contracts/           # Phase 1 output (/plan command)
│   ├── memberships.ts   # oRPC contracts for membership operations
│   ├── moderation.ts    # oRPC contracts for moderation operations
│   └── feeds.ts         # oRPC contracts for feed operations
├── quickstart.md        # Phase 1 output (/plan command, updated after /clarify)
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)

**Monorepo Structure** (pnpm workspaces):
```
client/                           # React web dashboard (@workspace: client)
├── src/
│   ├── components/
│   │   ├── communities/
│   │   │   ├── CommunityBrowser.tsx       # NEW: Community discovery & browsing
│   │   │   ├── CommunityCard.tsx          # NEW: Individual community card
│   │   │   ├── CommunityDetail.tsx        # NEW: Community detail page
│   │   │   ├── JoinCommunityButton.tsx    # NEW: Join/request join action
│   │   │   └── MembershipStatusBadge.tsx  # NEW: User's membership status display
│   │   ├── feeds/
│   │   │   ├── CommunityFeed.tsx          # NEW: Community-specific feed view
│   │   │   ├── FeedPost.tsx               # NEW: Individual post card
│   │   │   └── FeedPagination.tsx         # NEW: Pagination controls (20/page)
│   │   ├── moderation/
│   │   │   ├── MemberManagementTable.tsx  # NEW: Member list with actions
│   │   │   ├── ModerationActionsPanel.tsx # NEW: Hide/unhide/block controls
│   │   │   ├── ModerationHistory.tsx      # NEW: Moderation log display
│   │   │   ├── JoinRequestList.tsx        # NEW: Pending join requests (invite-only)
│   │   │   ├── CommunityStatsPanel.tsx    # NEW: Member/activity statistics
│   │   │   └── OwnershipTransferDialog.tsx # NEW: Ownership transfer (FR-013b)
│   │   ├── pds/                           # EXISTING: PDS authentication
│   │   ├── layout/                        # EXISTING: Layout components
│   │   └── ui/                            # EXISTING: shadcn/ui components
│   ├── routes/
│   │   ├── __root.tsx                     # EXISTING: Root layout
│   │   ├── index.tsx                      # EXISTING: Home page
│   │   ├── communities/
│   │   │   ├── index.tsx                  # NEW: Community browser route
│   │   │   ├── $communityId.tsx           # NEW: Community detail route
│   │   │   └── $communityId.manage.tsx    # NEW: Admin management route
│   │   └── moderation.tsx                 # EXISTING: Global moderation log
│   ├── lib/
│   │   ├── api.ts                         # UPDATE: Add new oRPC client methods
│   │   ├── pds.ts                         # EXISTING: PDS integration
│   │   └── queryClient.ts                 # EXISTING: TanStack Query config
│   ├── i18n/
│   │   └── locales/
│   │       ├── en/                        # UPDATE: Add new translation keys
│   │       └── ja/                        # UPDATE: Add new translation keys
│   └── types.ts                           # UPDATE: Add new TypeScript types

server/                           # Cloudflare Workers backend (@workspace: @atrarium/server)
├── src/
│   ├── routes/
│   │   ├── communities.ts         # EXISTING: Community CRUD endpoints
│   │   ├── memberships.ts         # UPDATE: Add join/leave/approve endpoints
│   │   ├── moderation.ts          # UPDATE: Add hide/block/history endpoints
│   │   └── feed-generator.ts      # EXISTING: Feed Generator API
│   ├── durable-objects/
│   │   └── community-feed-generator.ts  # EXISTING: Per-community feed cache
│   ├── services/
│   │   └── atproto.ts             # UPDATE: Add membership/moderation PDS methods
│   └── schemas/
│       └── lexicon.ts             # UPDATE: Add status/accessType field types

shared/contracts/                 # oRPC API contracts (@workspace: @atrarium/contracts)
├── src/
│   ├── router.ts                 # UPDATE: Add memberships + moderation routes
│   ├── schemas.ts                # UPDATE: Add Zod schemas for new endpoints
│   ├── types.ts                  # UPDATE: Add TypeScript types
│   └── index.ts                  # EXISTING: Central export point

lexicons/                         # AT Protocol Lexicon schemas
├── net.atrarium.community.config.json        # UPDATE: Add accessType field
├── net.atrarium.community.membership.json    # UPDATE: Add status field
└── net.atrarium.moderation.action.json       # EXISTING: No changes
```

## Phase 0: Research

**Objective**: Analyze existing implementation, identify reusable patterns, and document dependencies.

**See**: [research.md](./research.md) for detailed analysis.

**Key Findings**:
- ✅ PDS authentication context exists (`client/src/contexts/PDSContext.tsx`)
- ✅ oRPC client pattern established (`client/src/lib/api.ts`)
- ✅ shadcn/ui component library configured
- ✅ TanStack Router file-based routing configured
- ✅ i18next localization configured (EN/JA)
- ✅ Backend API endpoints for communities exist (`server/src/routes/communities.ts`)
- ✅ AT Protocol Lexicon schemas deployed (`net.atrarium.community.*`, `net.atrarium.moderation.*`)

**Dependencies Identified**:
- Existing: `@atproto/api` (PDS client), `@orpc/client` (type-safe API), `@tanstack/react-router`, `@tanstack/react-query`
- New: None (all features achievable with existing stack)

## Phase 1: Design

**Objective**: Define API contracts, data models, and provide quickstart guide for implementation.

**Updated after /clarify session 2025-10-07**:
- ✅ Join requests use `status: 'pending'` in existing membership schema (no new Lexicon)
- ✅ Community statistics limited to PDS-feasible metrics (member count only)
- ✅ Activity metrics explicitly out of scope

### 1.1 API Contracts

**See**: [contracts/](./contracts/) directory for detailed oRPC contract definitions.

**New Endpoints**:

**Memberships Router** (`/api/memberships`):
- `POST /api/memberships` - Join open community or request join for invite-only (creates membership with status='active' or 'pending')
- `DELETE /api/memberships/:communityId` - Leave community (set active=false)
- `GET /api/memberships/my` - Get user's memberships
- `GET /api/memberships/:communityId/members` - List community members (admin)
- `PATCH /api/memberships/:communityId/:did/role` - Change member role (owner only)
- `DELETE /api/memberships/:communityId/:did` - Remove member (admin)
- `POST /api/memberships/:communityId/transfer` - Transfer ownership (owner only, FR-013b)

**Join Requests Router** (`/api/join-requests`):
- `GET /api/join-requests/:communityId` - List pending join requests (filter memberships by status='pending', admin only)
- `POST /api/join-requests/:communityId/:did/approve` - Approve join request (change status='pending' → 'active', admin)
- `POST /api/join-requests/:communityId/:did/reject` - Reject join request (delete membership record, admin)

**Moderation Router** (`/api/moderation`):
- `POST /api/moderation/hide` - Hide post with reason
- `POST /api/moderation/unhide` - Unhide post
- `POST /api/moderation/block` - Block user in community
- `POST /api/moderation/unblock` - Unblock user
- `GET /api/moderation/:communityId/history` - Get moderation history

**Feeds Router** (`/api/feeds`):
- `GET /api/feeds/:communityId` - Get community feed (paginated, 20/page)
- `GET /api/feeds/:communityId/stats` - Get community statistics (memberCount, pendingRequestCount only - per /clarify)

### 1.2 Data Model

**See**: [data-model.md](./data-model.md) for detailed entity schemas.

**Key Entities** (all stored in PDS using Lexicon schemas):

1. **Community Membership** (`net.atrarium.community.membership`):
   - `did`: User DID (string)
   - `community`: Community ID (string)
   - `role`: `owner` | `moderator` | `member`
   - `status`: `active` | `pending` **NEW FIELD** (per /clarify)
   - `joinedAt`: ISO 8601 timestamp
   - `active`: boolean

2. **Community Config** (`net.atrarium.community.config` - EXISTING, EXTENDED):
   - `name`: string
   - `hashtag`: `#atrarium_[0-9a-f]{8}`
   - `stage`: `theme` | `community` | `graduated`
   - `accessType`: `open` | `invite-only` **NEW FIELD** (per /clarify)
   - `createdAt`: ISO 8601 timestamp

3. **Moderation Action** (`net.atrarium.moderation.action`):
   - `action`: `hide_post` | `unhide_post` | `block_user` | `unblock_user`
   - `target`: Post URI or User DID
   - `community`: Community ID
   - `reason`: string
   - `moderator`: Moderator DID
   - `timestamp`: ISO 8601 timestamp

4. **Community Metadata** (DERIVED, cached in Durable Objects):
   - `memberCount`: COUNT(memberships WHERE status='active' AND active=true) **UPDATED** (per /clarify)
   - `pendingRequestCount`: COUNT(memberships WHERE status='pending') **NEW** (per /clarify)
   - **Activity metrics (post volume, active members) OUT OF SCOPE** (per /clarify - Principle 8 compliance)

### 1.3 Quickstart Guide

**See**: [quickstart.md](./quickstart.md) for step-by-step implementation guide.

**Development Workflow**:
1. Update Lexicon schemas (add `status` and `accessType` fields)
2. Regenerate TypeScript types from Lexicons
3. Update oRPC contracts in `shared/contracts/src/`
4. Implement server-side handlers in `server/src/routes/`
5. Create React components in `client/src/components/`
6. Add routes in `client/src/routes/`
7. Update i18n translations in `client/src/i18n/locales/`
8. Test with local PDS (DevContainer)

## Post-Design Constitution Check

**Re-evaluation after Phase 1 design and /clarify session**:

**Simplicity Principles** (Principle 2):
- ✅ No new projects introduced
- ✅ No new databases added (PDS + Durable Objects only)
- ✅ No new services created (extended existing Workers)
- ✅ Minimal dependencies maintained (no new npm packages required)
- ✅ **IMPROVED**: No new Lexicon schema required (reuse existing membership schema with status field)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture preserved (Lexicon schemas unchanged, only extended)
- ✅ Economic efficiency maintained (no additional infrastructure costs)
- ✅ Framework consistency maintained (React 19 + TanStack + Hono)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture enforced (all writes to PDS first)
- ✅ Durable Objects cache-only usage confirmed (7-day TTL)
- ✅ No centralized database introduced
- ✅ **IMPROVED**: Join requests stored in requester's PDS (ownership clarity)

**Code Quality** (Principle 7):
- ✅ TypeScript strict mode enabled across all new code
- ✅ Biome configuration applies to new files
- ✅ Pre-commit hooks will validate new code

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ All features implementable via PDS + Lexicon
- ✅ No database requirements beyond Durable Objects cache
- ✅ **IMPROVED**: Community statistics limited to PDS-feasible metrics (member count only, no activity metrics)
- ✅ **IMPROVED**: Join requests use existing schema (no new Lexicon required)
- ✅ Community config extended with `accessType` field (backward-compatible)
- ✅ Membership schema extended with `status` field (backward-compatible)

**Conclusion**: ✅ PASS - Design maintains full constitution compliance, with improvements from /clarify session

## Phase 2: Task Generation Approach

**Objective**: Describe how tasks.md will be generated (executed by /tasks command).

**Task Categories**:

1. **Setup** (T001-T005):
   - Validate PDS-only storage architecture (Principle 8)
   - Configure Biome/TypeScript for new files (Principle 7)
   - **NEW**: Update Lexicon schemas (add `status` and `accessType` fields)

2. **Contracts** (T006-T015):
   - Define oRPC schemas in `shared/contracts/src/schemas.ts`
   - Add router definitions in `shared/contracts/src/router.ts`
   - Write contract tests for each endpoint

3. **Server Implementation** (T016-T043):
   - Implement membership endpoints in `server/src/routes/memberships.ts`
   - Implement moderation endpoints in `server/src/routes/moderation.ts`
   - Add PDS service methods in `server/src/services/atproto.ts`
   - **UPDATED**: Handle `status='pending'` for join requests (no separate API needed)
   - Write integration tests for each route

4. **Client Components** (T044-T070):
   - Create community browsing components
   - Create feed viewing components
   - Create admin management components
   - Create moderation components
   - **NEW**: Ownership transfer dialog (FR-013b)
   - Add i18n translations (EN/JA)

5. **Client Routes** (T071-T094):
   - Add TanStack Router routes for community pages
   - Integrate components with routes
   - Configure TanStack Query hooks (5min cache for static, 10-30s polling for dynamic)

6. **Testing** (T095-T109):
   - Write Vitest component tests
   - Write Playwright E2E tests
   - Test PDS integration with local PDS (DevContainer)

7. **Polish** (T110-T120):
   - Run Biome checks and fix issues
   - Performance optimization (polling intervals, caching per FR-034)
   - Documentation updates

**Parallelization Strategy**:
- Contracts can be developed in parallel with research
- Server routes can be implemented in parallel (different files)
- Client components can be developed in parallel (different files)
- Tests should be written BEFORE implementation (TDD)

**Estimated Task Count**: ~129 tasks (updated after /clarify session and /analyze recommendations)
**Estimated Complexity**: Medium (extends existing patterns, no new infrastructure)

## Progress Tracking

- [x] Load feature spec from Input path
- [x] Set Technical Context
- [x] Initial Constitution Check (PASS)
- [x] Phase 0: Research (research.md generated)
- [x] Phase 1: Design (contracts/, data-model.md, quickstart.md generated and updated after /clarify)
- [x] Post-Design Constitution Check (PASS - improved compliance)
- [x] Phase 2: Task generation approach described
- [x] Phase 3: tasks.md generated (/tasks command completed)
- [ ] Phase 4: Implementation (awaiting /implement or manual execution)
- [ ] Phase 5: Validation (pending implementation)

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (improved after /clarify)
- [x] All NEEDS CLARIFICATION resolved (/clarify session completed with 2 critical questions)
- [x] Complexity deviations documented (none - full compliance)

## Ready for Implementation

All planning artifacts have been generated and updated based on /clarify session results. The feature is ready for implementation via `/implement` command or manual execution.

**Next Steps**:
1. ✅ Run `/clarify` to resolve ambiguities (COMPLETED)
2. ✅ Run `/plan` to update design artifacts (COMPLETED)
3. Run `/tasks` to regenerate task breakdown with clarifications (OPTIONAL - existing tasks.md may need updates)
4. Execute tasks via `/implement` or manually

**Files Generated/Updated**:
- ✅ [plan.md](./plan.md) (this file - updated after /clarify)
- ✅ [research.md](./research.md) (existing, no changes needed)
- ✅ [data-model.md](./data-model.md) (regenerated after /clarify)
- ✅ [contracts/memberships.ts](./contracts/memberships.ts) (existing, may need updates for status field)
- ✅ [contracts/moderation.ts](./contracts/moderation.ts) (existing, no changes needed)
- ✅ [contracts/feeds.ts](./contracts/feeds.ts) (existing, may need stats endpoint update)
- ✅ [quickstart.md](./quickstart.md) (regenerated after /clarify)
- ⏳ tasks.md (existing but may need updates to reflect /clarify decisions)

---
*Based on Constitution v1.2.0 - See `.specify/memory/constitution.md`*
