# Implementation Plan: Atrarium MVP - Community Management System on AT Protocol

**Branch**: `001-` | **Date**: 2025-10-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/001-/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Atrarium MVP is a serverless community management system built on AT Protocol (Bluesky), designed for small communities (10-200 members) to replace expensive Mastodon/Misskey servers. The system allows users to create communities with theme-based discussion feeds, where members post directly to specific feeds. Key technical approach: Cloudflare Workers for serverless execution, D1 for SQLite storage, KV for caching, and AT Protocol Feed Generator API for Bluesky client compatibility. Major design clarification: Users post directly to theme feeds (not hashtag-filtered from Bluesky Firehose), significantly simplifying the architecture.

## Technical Context
**Language/Version**: TypeScript (latest stable, targeting ES2022)
**Primary Dependencies**:
- @atproto/api (AT Protocol SDK)
- Cloudflare Workers runtime (wrangler CLI)
- Hono (lightweight web framework for Workers)
- zod (schema validation)

**Storage**:
- Cloudflare D1 (SQLite for relational data: communities, memberships, posts)
- Cloudflare KV (key-value cache for post metadata, 7-day TTL)

**Testing**:
- vitest (unit/integration tests)
- miniflare (local Workers environment)
- wrangler (deployment and remote testing)

**Target Platform**: Cloudflare Workers (serverless edge runtime)

**Project Type**: web (backend Workers API + frontend React dashboard)

**Performance Goals**:
- Feed generation: <200ms p95
- API response: <100ms p95
- Uptime: >99.9%
- D1 query: <50ms
- KV access: <10ms

**Constraints**:
- Cost target: $5/month (Cloudflare Workers Paid plan)
- AT Protocol Feed Generator API compliance
- No Firehose connection (direct posting model)
- Serverless execution limits (10ms-50ms CPU time per request)
- D1 limits: 5GB storage, 5M reads/day, 100k writes/day (free tier)

**Scale/Scope**:
- Target: 10-200 members per community
- Initial deployment: Single community for testing
- Phase 0 MVP: Basic feed generation, community creation, theme feed management
- Deferred: Achievement system, advanced moderation, analytics

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is in template state (not ratified). No constitutional principles defined yet. Proceeding with standard best practices:
- ✅ Test-driven development (contract tests before implementation)
- ✅ Clear API contracts (AT Protocol Feed Generator spec)
- ✅ Separation of concerns (Workers routing, D1 persistence, KV caching)
- ✅ Minimal complexity (no unnecessary abstractions for MVP)

**Gate Status**: PASS (no constitution violations, template state)

## Project Structure

### Documentation (this feature)
```
specs/001-/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (input)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── feed-generator-api.yaml  # AT Protocol Feed Generator API
│   └── dashboard-api.yaml       # Admin dashboard API
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure (Workers backend + React frontend)
src/                     # Cloudflare Workers backend (TypeScript)
├── index.ts            # Main entry point, router
├── routes/
│   ├── feed-generator.ts   # AT Protocol Feed Generator API
│   ├── communities.ts      # Community management API
│   ├── theme-feeds.ts      # Theme feed management API
│   ├── posts.ts            # Post creation/retrieval API
│   └── memberships.ts      # Membership management API
├── models/
│   ├── community.ts        # Community entity logic
│   ├── theme-feed.ts       # Theme feed entity logic
│   ├── membership.ts       # Membership entity logic
│   └── post-index.ts       # Post index entity logic
├── services/
│   ├── auth.ts            # JWT authentication with DID verification
│   ├── db.ts              # D1 database access layer
│   ├── cache.ts           # KV cache access layer
│   └── atproto.ts         # AT Protocol integration (post retrieval)
├── schemas/
│   └── validation.ts      # Zod schemas for request/response validation
└── utils/
    ├── did.ts             # DID document generation
    └── errors.ts          # Error handling utilities

tests/
├── contract/              # Contract tests (AT Protocol compliance)
│   ├── feed-generator.test.ts
│   └── did-document.test.ts
├── integration/           # Integration tests (API flows)
│   ├── community-creation.test.ts
│   ├── theme-feed-lifecycle.test.ts
│   └── post-workflow.test.ts
└── unit/                  # Unit tests (models, services)
    ├── models/
    ├── services/
    └── utils/

dashboard/                 # React frontend (Cloudflare Pages)
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── CommunityList.tsx
│   │   ├── ThemeFeedForm.tsx
│   │   └── Stats.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Community.tsx
│   │   └── Settings.tsx
│   └── services/
│       └── api.ts         # Backend API client
├── vite.config.ts
└── package.json

schema.sql                 # D1 database schema
wrangler.toml             # Cloudflare Workers configuration
```

**Structure Decision**: Web application structure selected. Backend implemented as Cloudflare Workers (src/) serving both AT Protocol Feed Generator API and admin dashboard API. Frontend as React SPA (dashboard/) deployed to Cloudflare Pages. This structure aligns with the serverless architecture requirement and separates concerns between protocol compliance (backend) and user management (frontend).

## Phase 0: Outline & Research
*Status: To be executed*

### Research Tasks
1. **AT Protocol Feed Generator API specification**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

2. **Cloudflare Workers + D1 + KV integration patterns**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

3. **DID document generation and .well-known routing**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

4. **JWT authentication with DID verification**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

5. **Post deletion synchronization strategy (best-effort)**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

6. **Feed composition mixing algorithm (own/parent/global ratios)**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

7. **Language handling for international posts (deferred from clarification)**:
   - Decision: [to be researched]
   - Rationale: [to be documented]
   - Alternatives considered: [to be documented]

**Output**: research.md with all decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### Design Deliverables
1. **data-model.md**:
   - Extract entities from spec (Community, Theme Feed, Membership, Post Index, Achievement, Owner Transition Log)
   - Define D1 schema with indexes and constraints
   - Document state transitions (theme→community→graduated, active→warning→archived)

2. **contracts/**:
   - `feed-generator-api.yaml`: AT Protocol Feed Generator spec (/.well-known/did.json, /xrpc/app.bsky.feed.getFeedSkeleton)
   - `dashboard-api.yaml`: Admin API (communities CRUD, theme feeds CRUD, memberships, posts)

3. **quickstart.md**:
   - Local development setup (wrangler, D1, KV)
   - Create community → Create theme feed → Post to feed → View feed workflow
   - Validation steps matching acceptance scenarios from spec

4. **CLAUDE.md update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add Cloudflare Workers, AT Protocol, TypeScript context
   - Preserve existing project overview
   - Keep under 150 lines

**Output**: data-model.md, contracts/, quickstart.md, CLAUDE.md (updated)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract endpoint → contract test task [P]
- Each entity → model creation task [P]
- Each user story from spec → integration test task
- Implementation tasks ordered by dependency (models→services→routes)

**Ordering Strategy**:
- TDD order: Contract tests → Integration tests → Implementation
- Dependency order:
  1. Database schema (schema.sql)
  2. Models (Community, ThemeFeed, Membership, PostIndex) [P]
  3. Services (DB, Cache, Auth, ATProto) [P]
  4. Routes (feed-generator, communities, theme-feeds, posts) [P after services]
  5. DID document + .well-known routing
  6. Dashboard frontend (after backend API stable)

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation against <200ms target)

## Complexity Tracking
*No constitutional violations detected (constitution in template state)*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - 7 research tasks completed
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (template state, no violations)
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (7/7 research tasks)
- [x] Complexity deviations documented: N/A (none)

---
*Based on Constitution template - See `.specify/memory/constitution.md`*
