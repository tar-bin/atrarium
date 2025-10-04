# Implementation Plan: Web Dashboard for Atrarium with Local PDS Integration

**Branch**: `005-pds-web-atrarim` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/005-pds-web-atrarim/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
2. Fill Technical Context ✅
   → Project Type: web (frontend React dashboard + existing backend Workers)
   → Structure Decision: New dashboard/ directory at repo root
3. Constitution Check ✅
   → No constitutional file exists (template placeholder)
   → Apply general best practices: test-first, contracts, integration tests
4. Execute Phase 0 → research.md ✅
5. Execute Phase 1 → contracts, data-model.md, quickstart.md ✅
6. Re-evaluate Constitution Check ✅
7. Plan Phase 2 → Task generation approach described ✅
8. STOP - Ready for /tasks command
```

## Summary

This feature adds a React-based web dashboard to Atrarium that enables visual management of communities, feeds, and moderation through a browser interface. The dashboard integrates with the existing Cloudflare Workers backend API and local Bluesky PDS for testing AT Protocol posting workflows.

**Primary Requirement**: Provide a web UI for community owners/moderators/members to manage Atrarium features without API tools.

**Technical Approach**:
- React 18 + TypeScript + Vite for frontend
- **TanStack Query** for server state management (automatic caching, refetching, mutations)
- **TanStack Router** for type-safe file-based routing
- **TanStack Table** for moderation log and post lists
- @atproto/api for direct PDS posting
- Tailwind CSS for styling
- Deploy to Cloudflare Pages

## Technical Context

**Language/Version**: TypeScript 5.3+ (aligned with existing backend), React 18
**Primary Dependencies**:
- Frontend: React 18, Vite 5, **TanStack Query v5** (data fetching), **TanStack Router v1** (routing), **TanStack Table v8** (tables), **react-i18next** (i18n EN/JA), **shadcn/ui** (UI components), **react-hook-form + Zod** (form validation), **lucide-react** (icons), **date-fns** (date formatting), **react-error-boundary** (error handling), **oRPC** (type-safe API), Tailwind CSS 3, @atproto/api
- Existing Backend: Hono (Workers), D1, KV, @atproto/api
**Storage**: Uses existing D1 database (no schema changes needed)
**Testing**: Vitest + @testing-library/react + MSW (frontend unit/component/integration), existing backend contract tests
**Target Platform**: Modern browsers (Chrome/Firefox/Safari latest 2 versions), deployed on Cloudflare Pages
**Project Type**: web - adds frontend to existing backend Workers
**Performance Goals**:
- Page load < 2s (initial), < 500ms (subsequent)
- API response rendering < 100ms
- PDS posting < 1s
**Constraints**:
- Local development only (no production deployment in Phase 0)
- Must work with local PDS (http://localhost:3000)
- Works with existing Workers API (http://localhost:8787)
**Scale/Scope**:
- ~8-10 pages (Home, Communities, Community Detail, Feed Detail, Moderation Log)
- ~20 components
- Supports 1-5 concurrent users (local dev)

## Constitution Check

*No project constitution exists - applying general best practices*

**Test-First Approach**: ✅
- Generate component tests before implementation
- Contract tests already exist for backend API
- Integration tests for PDS workflows

**Clear Contracts**: ✅
- Reuse existing backend API contracts (OpenAPI-style)
- Document component prop interfaces
- Type-safe Hono client for API calls

**Integration Testing**: ✅
- Test PDS login flow
- Test post creation with hashtag appending
- Test moderation actions

**Observability**: ✅
- Console logging for API errors
- Error boundaries for React components
- Network request logging (dev mode)

**Simplicity**: ✅
- Server state via TanStack Query (no Redux/Zustand needed)
- File-based routing (no manual route config)
- REST API only (no GraphQL)
- Minimal dependencies (TanStack ecosystem cohesive)

**Complexity Deviations**: None

## Project Structure

### Documentation (this feature)
```
specs/005-pds-web-atrarim/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
dashboard/                      # NEW: React frontend
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── communities/
│   │   │   ├── CommunityList.tsx
│   │   │   ├── CommunityCard.tsx
│   │   │   ├── CommunityDetail.tsx
│   │   │   └── CreateCommunityModal.tsx
│   │   ├── feeds/
│   │   │   ├── FeedList.tsx
│   │   │   ├── FeedCard.tsx
│   │   │   ├── FeedDetail.tsx
│   │   │   └── CreateFeedModal.tsx
│   │   ├── posts/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   └── CreatePostForm.tsx
│   │   ├── moderation/
│   │   │   ├── ModerationLog.tsx
│   │   │   └── ModerationActions.tsx
│   │   └── pds/
│   │       └── PDSLoginForm.tsx
│   ├── lib/
│   │   ├── api.ts              # Hono client setup
│   │   └── pds.ts              # @atproto/api client
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Communities.tsx
│   │   ├── CommunityDetailPage.tsx
│   │   └── FeedDetailPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── tests/
│   ├── components/
│   └── integration/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
└── README.md

src/                            # EXISTING: Cloudflare Workers backend
└── (no changes to existing backend structure)

tests/                          # EXISTING: Backend tests
└── (no changes to existing tests)
```

**Structure Decision**: Web application structure with new `dashboard/` directory at repo root containing React frontend. Existing `src/` directory contains Workers backend (unchanged). This separation aligns with deployment targets: Workers for backend, Cloudflare Pages for frontend.

## Phase 0: Outline & Research

**Research Tasks Identified**:
1. React 18 + Vite setup best practices for Cloudflare Pages
2. TanStack ecosystem (Query, Router, Table) integration patterns
3. shadcn/ui setup and component usage
4. react-hook-form + Zod for form validation
5. oRPC for type-safe API communication with Hono backend
6. @atproto/api usage for PDS login and posting
7. react-i18next for EN/JA internationalization
8. lucide-react icon library integration
9. date-fns for timestamp formatting
10. react-error-boundary for error handling
11. Frontend testing strategy (Vitest + Testing Library + MSW)
12. Local PDS integration patterns (authentication, error handling)
13. Cloudflare Pages deployment configuration

**Output**: [research.md](./research.md) (see below)

## Phase 1: Design & Contracts

**Data Model Entities** (frontend-specific, maps to existing backend):
- UserSession (local state): PDS credentials, user DID, handle
- Community (from API): id, name, description, memberCount, postCount
- Feed (from API): id, name, hashtag, status, stats
- Post (from API): uri, authorDid, text, createdAt, moderationStatus
- ModerationAction (from API): action, targetUri, moderatorDid, reason

**API Contracts** (reuse existing backend):
- GET /api/communities
- POST /api/communities
- GET /api/communities/:id
- GET /api/communities/:id/feeds
- POST /api/communities/:id/feeds
- GET /api/posts?feedId=xxx
- POST /api/moderation/posts/:uri/hide
- POST /api/moderation/feeds/:feedId/blocklist

**Component Contracts**:
- See [contracts/components.yaml](./contracts/components.yaml)

**Contract Tests** (component-level):
- CommunityList renders community cards
- CreateCommunityModal validates 50-char limit
- FeedCard displays hashtag with copy button
- PDSLoginForm authenticates via @atproto/api
- CreatePostForm appends hashtag and enforces 300-char limit
- ModerationActions show confirmation dialogs

**Integration Test Scenarios**:
- User Story 1: Create community → appears in list
- User Story 2: Create feed → see generated hashtag
- User Story 3: Login to PDS → post with hashtag → success
- User Story 4: View feed → see posts
- User Story 5: Hide post → removed from public view

**Agent File Update**:
- Run `.specify/scripts/bash/update-agent-context.sh claude`
- Add dashboard tech stack (React 18, Vite, Tailwind)
- Update active branch to 005-pds-web-atrarim
- Document new dashboard/ structure

**Output**:
- [data-model.md](./data-model.md)
- [contracts/components.yaml](./contracts/components.yaml)
- [quickstart.md](./quickstart.md)
- CLAUDE.md updated

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Project Setup Tasks** (5 tasks):
   - Initialize Vite + React project in dashboard/
   - Install dependencies (React, Hono client, @atproto/api, Tailwind)
   - Configure Tailwind CSS + PostCSS
   - Setup TypeScript config
   - Create .env.development with API URLs

2. **Component Test Tasks** (15 tasks):
   - One test task per component contract
   - Tests fail initially (no components exist)
   - Use Vitest + React Testing Library

3. **Component Implementation Tasks** (20 tasks):
   - Layout components (3)
   - Community management components (4)
   - Feed management components (4)
   - Post components (3)
   - Moderation components (2)
   - PDS integration components (1)
   - Pages (3)

4. **Integration Test Tasks** (5 tasks):
   - One task per user story acceptance scenario
   - Requires local Workers + PDS running

5. **Documentation Tasks** (2 tasks):
   - dashboard/README.md setup guide
   - Update root README.md with dashboard info

**Ordering Strategy**:
- Setup tasks first (prerequisites)
- Component tests before component implementation (TDD)
- Layout components before feature components (dependencies)
- Integration tests after all components (end-to-end)

**Estimated Output**: ~47 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run all tests, verify quickstart.md, test with local PDS)

## Complexity Tracking

*No constitutional violations - table empty*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | N/A |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no constitution, best practices applied)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 clarifications in spec.md)
- [x] Complexity deviations documented (none)

---

**Next Command**: `/tasks` to generate detailed implementation tasks

*Plan completed following best practices (no formal constitution exists)*
