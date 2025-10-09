
# Implementation Plan: Custom Emoji Reactions

**Branch**: `016-slack-mastodon-misskey` | **Date**: 2025-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/016-slack-mastodon-misskey/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Enable community members to express quick emotional responses to posts using emoji reactions (similar to Slack, Mastodon, and Misskey), including support for custom community-specific emojis.

**Key Features**:
- Add/remove emoji reactions on posts (toggle behavior)
- Support both Unicode emojis and custom community emojis
- Display reaction counts with reactor identities
- Owner/moderator custom emoji management (upload, configure, delete)
- Real-time updates via Server-Sent Events (SSE)
- Rate limiting (100 reactions/hour/user) and display limits (20 emoji types inline, modal for more)

**Technical Approach**:
- PDS-first architecture: Reactions stored as `net.atrarium.community.reaction` Lexicon records in user PDSs
- Custom emoji metadata stored in community owner's PDS using `net.atrarium.community.emoji` Lexicon schema
- Custom emoji images stored as AT Protocol blobs in PDS blob storage (256KB max, 64px height, 512px max width)
- Reaction aggregates cached in Durable Objects (7-day TTL) for performance, rebuildable from PDS
- SSE endpoint for near real-time reaction count updates to connected clients

## Technical Context
**Language/Version**: TypeScript 5.7 (Node.js via nodejs_compat on Cloudflare Workers)
**Primary Dependencies**: Hono ^4.6.14 (routing), Zod ^4.1.11 (validation), oRPC ^1.9.3 (type-safe RPC), @atproto/api ^0.13.35 (AT Protocol client), React 19 (frontend)
**Storage**: PDS (source of truth) + Durable Objects Storage (7-day cache) + PDS blob storage (custom emoji images)
**Testing**: Vitest + @cloudflare/vitest-pool-workers (backend), Vitest + Testing Library (frontend), Playwright (E2E)
**Target Platform**: Cloudflare Workers (backend), Cloudflare Pages (frontend), AT Protocol-compatible PDS (data storage)
**Project Type**: web (frontend: client/, backend: server/, shared: shared/contracts/)
**Performance Goals**: <200ms API response (p95), <100ms Durable Object read, SSE latency <1s
**Constraints**: 256KB max custom emoji file size, 64px max height, 512px max width (8:1 aspect ratio), 100 reactions/hour/user, 20 emoji types inline display
**Scale/Scope**: Supports unlimited communities (horizontal scaling via Durable Objects), ~$0.40/month for 1000 communities

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (extends existing application)
- ✅ No new databases (or justification provided)
- ✅ No new services (or justification provided)
- ✅ Minimal dependencies (reuses existing stack)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (Lexicon schemas as API contract)
- ✅ Economic efficiency preserved (serverless/pay-per-use)
- ✅ No framework proliferation

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (user data in Personal Data Servers)
- ✅ Durable Objects used only as 7-day cache (if applicable)
- ✅ No centralized user database created

**Code Quality** (Principle 7):
- ✅ Biome linter checks configured and enforced
- ✅ Biome formatter checks configured and enforced
- ✅ TypeScript type checks configured and enforced
- ✅ Pre-commit validation automated (CI/CD quality gates)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ Feature implementable using AT Protocol + PDS + Lexicon schemas only
- ✅ No separate databases (SQL/NoSQL/KV) introduced beyond Durable Objects cache
- ✅ All persistent state resides in PDS using `net.atrarium.*` Lexicon records
- ✅ Durable Objects Storage used only as 7-day ephemeral cache (if applicable)
- ✅ No feature requires additional database infrastructure

**Git Workflow and Commit Integrity** (Principle 9):
- ✅ Implementation plan includes complete commit strategy (no partial merges)
- ✅ Pre-commit hooks will validate all changes (no --no-verify planned)
- ✅ Emergency bypass procedures documented (if applicable)
- ✅ CI/CD validation independent of local hooks

**Complete Implementation Over MVP Excuses** (Principle 10):
- ✅ Feature specification includes all required components (no "Phase 2" deferrals)
- ✅ Implementation plan covers all specified functionality (not just "MVP subset")
- ✅ All UI components will be created and integrated (not placeholders)
- ✅ All API endpoints will be implemented and tested (not mocked)
- ✅ Completion criteria clearly defined (no ambiguous "MVP" language)
- ✅ Incremental delivery plan (if applicable) includes complete, usable increments

**Conclusion**: ✅ PASS - Feature complies with all constitution principles
(or ❌ FAIL with explicit justification and remediation plan)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
lexicons/                             # AT Protocol Lexicon schemas (NEW)
├── net.atrarium.community.reaction.json   # Reaction records (user DID, post URI, emoji, timestamp)
└── net.atrarium.community.emoji.json      # Custom emoji metadata (shortcode, blob CID, community ID)

server/                               # Cloudflare Workers backend
├── src/
│   ├── routes/
│   │   ├── reactions.ts              # NEW: Reaction API (add, remove, list, SSE)
│   │   └── emojis.ts                 # NEW: Custom emoji API (upload, delete, list, approve)
│   ├── durable-objects/
│   │   └── community-feed-generator.ts  # EXTEND: Reaction aggregation logic (7-day cache)
│   ├── services/
│   │   └── atproto.ts                # EXTEND: PDS reaction/emoji read/write methods
│   ├── schemas/
│   │   ├── generated/                # NEW: Auto-generated types from lexicons/
│   │   └── validation.ts             # EXTEND: Reaction/emoji Zod schemas
│   └── utils/
│       └── rate-limiter.ts           # NEW: Rate limiting (100 reactions/hour/user)
└── tests/
    ├── contract/
    │   └── reactions.test.ts         # NEW: Reaction API contract tests
    └── integration/
        └── reaction-flow.test.ts     # NEW: End-to-end reaction workflow

shared/contracts/                     # oRPC API contracts
└── src/
    ├── router.ts                     # EXTEND: Reaction/emoji routes
    └── schemas.ts                    # EXTEND: Reaction/emoji Zod schemas

client/                               # React web dashboard
├── src/
│   ├── components/
│   │   ├── reactions/                # NEW: Reaction UI components
│   │   │   ├── ReactionBar.tsx       # Display reaction counts with toggle
│   │   │   ├── ReactionPicker.tsx    # Emoji picker (Unicode + custom)
│   │   │   └── EmojiPicker.tsx       # Advanced picker (categories, search)
│   │   └── emoji/                    # NEW: Custom emoji management UI
│   │       ├── CustomEmojiUpload.tsx # Upload form with validation
│   │       ├── CustomEmojiList.tsx   # User's emoji list
│   │       └── EmojiApproval.tsx     # Owner approval queue
│   ├── lib/
│   │   └── api.ts                    # EXTEND: Reaction/emoji API helpers (6 new functions)
│   └── routes/
│       └── communities/$id/emoji.tsx # NEW: Emoji management page
└── tests/
    └── components/
        └── reactions/                # NEW: Reaction component tests
```

**Structure Decision**: Web application structure (frontend: client/, backend: server/, shared: shared/contracts/). This feature extends existing monorepo workspaces without creating new projects, adhering to Constitution Principle 2 (Simplicity). All new code integrates into established directories.

## Phase 0: Outline & Research

✅ **COMPLETED** - No NEEDS CLARIFICATION in Technical Context (all resolved via `/clarify` command).

**Research Findings** ([research.md](research.md)):
1. **Reaction Storage**: PDS-first with Durable Objects aggregation cache (7-day TTL)
2. **Custom Emoji Storage**: PDS blob storage + Lexicon metadata (no external CDN)
3. **Real-Time Updates**: Server-Sent Events (SSE) - simpler than WebSocket, better than polling
4. **Rate Limiting**: 100 reactions/hour/user (Slack-equivalent, sliding window)
5. **Emoji Display Limits**: 20 types inline, modal for additional (UI overflow prevention)
6. **Custom Emoji Validation**: Multi-stage (client + server), 256KB max, 64px×512px max, 8:1 aspect ratio
7. **Firehose Integration**: Extend existing pipeline (no new infrastructure)
8. **SSE Architecture**: Per-community endpoint, 100 concurrent connections, graceful fallback

**Output**: [research.md](research.md) - 8 technical decisions with rationale and alternatives

## Phase 1: Design & Contracts

✅ **COMPLETED**

**Data Model** ([data-model.md](data-model.md)):
- **Reaction**: PDS Lexicon record (`net.atrarium.community.reaction`) - user DID, post URI, emoji, community ID, timestamp
- **CustomEmoji**: PDS Lexicon record (`net.atrarium.community.emoji`) - shortcode, blob CID, approval status, timestamps
- **ReactionAggregate**: Durable Objects cache - post URI + emoji → count + reactor DIDs (7-day TTL)
- **RateLimitRecord**: Durable Objects ephemeral - user ID → reaction timestamps (1-hour sliding window)
- Includes data flow diagrams, validation rules, state transitions, indexing strategy

**API Contracts** ([contracts/reactions-api.ts](contracts/reactions-api.ts)):
- **Reaction Routes**: `add`, `remove`, `list`, `stream` (SSE)
- **Custom Emoji Routes**: `upload`, `delete`, `list`, `listUser`, `listPending`, `approve`
- oRPC-compatible Zod schemas for request/response validation
- Error schemas: `rateLimitError`, `validationError`, `authorizationError`, `notFoundError`
- Full TypeScript types exported for server/client use

**Lexicon Schemas** ([contracts/*.json](contracts/)):
- `net.atrarium.community.reaction.json`: Reaction record schema
- `net.atrarium.community.emoji.json`: Custom emoji metadata schema
- Ready for code generation via `pnpm --filter server codegen`

**Quickstart Scenario** ([quickstart.md](quickstart.md)):
- 9-step end-to-end validation workflow (Alice creates community → Bob reacts → toggle behavior)
- Includes automated test script template
- Performance benchmarks: < 200ms API response, < 1s SSE latency
- Edge case validation checklist (rate limit, 20+ emojis, SSE reconnection, etc.)

**Agent Context Update**: Next step (see below)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Lexicon Schemas** (2 tasks):
   - Create `lexicons/net.atrarium.community.reaction.json`
   - Create `lexicons/net.atrarium.community.emoji.json`
   - Run codegen to generate TypeScript types

2. **Server Implementation** (~15 tasks):
   - Contract tests for reactions API (`server/tests/contract/reactions.test.ts`)
   - Contract tests for emojis API (`server/tests/contract/emojis.test.ts`)
   - Extend `server/src/services/atproto.ts` with reaction/emoji PDS methods
   - Create `server/src/routes/reactions.ts` (add, remove, list, SSE endpoints)
   - Create `server/src/routes/emojis.ts` (upload, delete, list, approve endpoints)
   - Create `server/src/utils/rate-limiter.ts` (sliding window logic)
   - Extend `server/src/durable-objects/community-feed-generator.ts` (reaction aggregation, SSE broadcast)
   - Extend `server/src/schemas/validation.ts` (reaction/emoji Zod schemas)
   - Extend Firehose filter to index `net.atrarium.community.reaction` collection
   - Integration test: `server/tests/integration/reaction-flow.test.ts` (quickstart scenario)

3. **Client Implementation** (~10 tasks):
   - Create `client/src/components/reactions/ReactionBar.tsx`
   - Create `client/src/components/reactions/ReactionPicker.tsx`
   - Create `client/src/components/reactions/EmojiPicker.tsx` (Unicode categories + search + custom tab)
   - Create `client/src/components/emoji/CustomEmojiUpload.tsx`
   - Create `client/src/components/emoji/CustomEmojiList.tsx`
   - Create `client/src/components/emoji/EmojiApproval.tsx`
   - Extend `client/src/lib/api.ts` (6 new API helper functions)
   - Create `client/src/routes/communities/$id/emoji.tsx` (emoji management page)
   - Integrate ReactionBar into PostCard component
   - Component tests: `client/tests/components/reactions/*.test.tsx`

4. **Shared Contracts** (1 task):
   - Extend `shared/contracts/src/router.ts` (reactions + emoji routes)
   - Extend `shared/contracts/src/schemas.ts` (Zod schemas from contracts/reactions-api.ts)

**Ordering Strategy**:
- **Phase 1**: Lexicon schemas + codegen (blocks all other tasks)
- **Phase 2**: Shared contracts (blocks server/client implementation)
- **Phase 3**: Server implementation (parallel within phase)
  - Contract tests → Implementation → Integration tests (sequential per feature)
  - Reactions and Emojis can be parallelized
- **Phase 4**: Client implementation (parallel within phase, depends on Phase 3 API)
- **Phase 5**: Integration and E2E tests

**Estimated Output**: ~35 numbered tasks in tasks.md

**Parallel Execution Markers**:
- `[P]` for independent files (e.g., ReactionBar.tsx and EmojiPicker.tsx)
- Sequential dependencies enforced by task ordering

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - approach described, ~35 tasks estimated)
- [ ] Phase 3: Tasks generated (/tasks command) - NOT YET (pending)
- [ ] Phase 4: Implementation complete - NOT YET (pending)
- [ ] Phase 5: Validation passed - NOT YET (pending)

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations, extends existing architecture)
- [x] Post-Design Constitution Check: PASS (PDS-first, no new databases/services, Durable Objects cache only)
- [x] All NEEDS CLARIFICATION resolved (10 clarifications via /clarify command)
- [x] Complexity deviations documented (none - fully compliant)

---
*Based on Constitution v1.5.0 - See `.specify/memory/constitution.md`*
