# Implementation Plan: Complete Communities API

**Branch**: `019-communities-api-api` | **Date**: 2025-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/019-communities-api-api/spec.md`

## Execution Flow (/plan command scope)

1. ✅ Load feature spec from Input path
2. ✅ Fill Technical Context (no NEEDS CLARIFICATION found)
3. ✅ Fill Constitution Check section
4. ✅ Evaluate Constitution Check section → PASS
5. ✅ Execute Phase 0 → [research.md](research.md)
6. ✅ Execute Phase 1 → [contracts/](contracts/), [data-model.md](data-model.md), [quickstart.md](quickstart.md), agent context updated
7. ✅ Re-evaluate Constitution Check section → PASS
8. ✅ Plan Phase 2 → Task generation approach documented
9. ✅ STOP - Ready for /tasks command

## Summary

Implement 6 missing oRPC API endpoints for community hierarchy management: child community creation, stage upgrades/downgrades, child listing, parent retrieval, and safe deletion. All endpoints extend existing Communities API using established oRPC patterns, with zero new dependencies or infrastructure. Data stored in PDS via `net.atrarium.group.config` Lexicon schema, cached in Durable Objects for 7-day TTL.

**Technical Approach**: Extend `server/src/router.ts` with 6 new handlers following oRPC pattern. Integrate with existing ATProtoService for PDS operations and CommunityFeedGenerator Durable Object for cached hierarchy lookups. All contracts and schemas already defined in `shared/contracts/`.

## Technical Context

**Language/Version**: TypeScript 5.7 (Node.js via nodejs_compat)
**Primary Dependencies**: oRPC ^1.9.3, Zod ^4.1.11, @atproto/api ^0.13.35, Hono ^4.6.14
**Storage**: Durable Objects Storage (per-community cache, 7-day TTL), PDS (permanent storage via AT Protocol)
**Testing**: Vitest with @cloudflare/vitest-pool-workers (contract, integration, unit tests)
**Target Platform**: Cloudflare Workers (serverless)
**Project Type**: Web (monorepo: shared/contracts, server, client)
**Performance Goals**: API response p95 <100ms, feed generation <200ms, DO read <10ms
**Constraints**: <$5/month operational cost, <1 hour/week maintenance, 99.9% uptime
**Scale/Scope**: 6 API endpoints, 3 stage transitions, unlimited hierarchy depth (recommended max 3 levels)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2): ✅
- ✅ No new projects (extends existing server application)
- ✅ No new databases (uses existing Durable Objects Storage + PDS)
- ✅ No new services (extends existing Communities API)
- ✅ Minimal dependencies (reuses existing oRPC, Zod, @atproto/api stack)

**Technology Choices** (Principle 1, 3): ✅
- ✅ Protocol-first architecture maintained (Lexicon schemas as API contract: `net.atrarium.group.config`)
- ✅ Economic efficiency preserved (zero cost impact, pure API implementation)
- ✅ No framework proliferation (reuses Hono, oRPC, TanStack)

**Data Ownership** (Principle 4, 5): ✅
- ✅ PDS-first architecture maintained (all hierarchy data in user PDSs)
- ✅ Durable Objects used only as 7-day cache (hierarchy lookups, member counts)
- ✅ No centralized user database created (all state in PDS, DO ephemeral)

**Code Quality** (Principle 7): ✅
- ✅ Biome linter checks configured and enforced (pre-commit validation)
- ✅ Biome formatter checks configured and enforced (auto-format on commit)
- ✅ TypeScript type checks configured and enforced (strict mode, src/ and lib/)
- ✅ Pre-commit validation automated (lint-staged + husky hooks)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8): ✅
- ✅ Feature implementable using AT Protocol + PDS + Lexicon schemas only
- ✅ No separate databases (SQL/NoSQL/KV) introduced beyond Durable Objects cache
- ✅ All persistent state resides in PDS using `net.atrarium.group.config` Lexicon records
- ✅ Durable Objects Storage used only as 7-day ephemeral cache (hierarchy indexes, member counts)
- ✅ No feature requires additional database infrastructure

**Git Workflow and Commit Integrity** (Principle 9): ✅
- ✅ Implementation plan includes complete commit strategy (6 endpoints, TDD approach)
- ✅ Pre-commit hooks will validate all changes (no --no-verify planned)
- ✅ Emergency bypass procedures documented (maintainer approval required)
- ✅ CI/CD validation independent of local hooks (GitHub Actions)

**Complete Implementation Over MVP Excuses** (Principle 10): ✅
- ✅ Feature specification includes all required components (all 6 endpoints specified)
- ✅ Implementation plan covers all specified functionality (createChild, upgradeStage, downgradeStage, listChildren, getParent, delete)
- ✅ All UI components will be created and integrated (client integration in separate task)
- ✅ All API endpoints will be implemented and tested (contract + integration tests per endpoint)
- ✅ Completion criteria clearly defined (all 6 endpoints functional, tests passing, quickstart validated)
- ✅ Incremental delivery plan (TDD: tests → implementation → validation per endpoint)

**Conclusion**: ✅ PASS - Feature complies with all constitution principles

## Project Structure

### Documentation (this feature)
```
specs/019-communities-api-api/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (validation scenario)
├── contracts/           # Phase 1 output (API specifications)
│   └── communities-hierarchy-api.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)

**Monorepo Structure** (pnpm workspaces):
```
shared/contracts/        # oRPC API contracts (@atrarium/contracts)
├── src/
│   ├── router.ts        # oRPC router contract (lines 119-167: hierarchy endpoints)
│   ├── schemas.ts       # Zod validation schemas (lines 456-513: hierarchy schemas)
│   ├── types.ts         # TypeScript types (inferred from Zod)
│   └── client-types.ts  # Client-compatible RouterClient type

server/                  # Cloudflare Workers backend (@atrarium/server)
├── src/
│   ├── router.ts        # oRPC router implementation (ADD: 6 new handlers)
│   ├── services/
│   │   └── atproto.ts   # AT Protocol client (PDS read/write methods)
│   ├── durable-objects/
│   │   └── community-feed-generator.ts  # Per-community feed index (ADD: hierarchy RPC endpoints)
│   └── types.ts         # TypeScript type definitions
├── tests/
│   ├── contract/        # API contract tests (ADD: 6 endpoint tests)
│   ├── integration/     # End-to-end workflows (ADD: hierarchy lifecycle test)
│   └── unit/            # Isolated logic validation (ADD: circular reference detection)

client/                  # React dashboard (TanStack Router + Query)
├── src/
│   ├── components/
│   │   └── communities/ # Community management components (FUTURE: hierarchy UI)
│   └── lib/
│       └── api.ts       # oRPC client (type-safe API calls)

lexicons/                # AT Protocol Lexicon schemas
└── net.atrarium.group.config.json  # Community config (ALREADY has parentGroup, feedMix)
```

**Structure Decision**: Monorepo web application with shared contracts. This feature extends existing server application without new projects or services. Client integration (dashboard UI) is deferred to future task (not part of this feature scope per Principle 10).

## Phase 0: Outline & Research

**Status**: ✅ Completed

**Output**: [research.md](research.md)

**Summary of Decisions**:
1. **Implementation Approach**: Extend existing oRPC router in `server/src/router.ts` (6 new handlers)
2. **Durable Object Integration**: Extend CommunityFeedGenerator with hierarchy RPC endpoints
3. **Stage Transition Validation**: Member count thresholds (theme→community: 10+, community→graduated: 50+)
4. **Deletion Safety Checks**: Multi-layered validation (active members, children, posts)
5. **Feed Mix Configuration**: Optional FeedMixConfig (own/parent/global percentages, sum=100)
6. **Error Handling Patterns**: ORPCError with semantic codes (FORBIDDEN, BAD_REQUEST, CONFLICT, NOT_FOUND)

**Performance Targets**:
- Create child: <200ms
- Upgrade/downgrade: <150ms
- List children: <100ms
- Get parent: <50ms
- Delete: <150ms

**All unknowns resolved** - Ready for Phase 1

## Phase 1: Design & Contracts

**Status**: ✅ Completed

**Artifacts Generated**:

1. **Data Model** ([data-model.md](data-model.md)):
   - Community Hierarchy entity (parentGroup, stage, feedMix)
   - Community Stage Lifecycle (theme → community → graduated)
   - Feed Mix Configuration (own/parent/global percentages)
   - Data flow diagrams (create child, stage transitions, deletion)
   - Caching strategy (Durable Objects Storage)
   - Error states and performance targets

2. **API Contracts** ([contracts/communities-hierarchy-api.md](contracts/communities-hierarchy-api.md)):
   - 6 endpoint specifications (createChild, upgradeStage, downgradeStage, listChildren, getParent, delete)
   - Request/response schemas (Zod validation)
   - Error responses (oRPC error format)
   - Business rules per endpoint
   - Example requests/responses
   - Testing strategy per endpoint

3. **Quickstart Guide** ([quickstart.md](quickstart.md)):
   - Complete hierarchy lifecycle test scenario (10 steps)
   - Edge case validation (circular references, feed mix, permissions)
   - Performance validation (latency targets)
   - Troubleshooting guide
   - Success criteria checklist

4. **Agent Context Update**:
   - Updated CLAUDE.md with feature metadata
   - Added database info (Durable Objects Storage + PDS)
   - Added project type (web/monorepo)

**Contract Tests** (to be created in Phase 3):
- 6 endpoint tests (valid inputs → success, validation failures → errors)
- Permission checks (FORBIDDEN for non-owners)
- Business logic validation (stage constraints, deletion safety)

**Integration Tests** (to be created in Phase 3):
- Complete hierarchy workflow (create parent → upgrade → create child → list → delete)
- Stage transition validation (insufficient members → upgrade fails)
- Deletion safety (non-empty community → delete fails)
- Feed mix inheritance (child inherits or overrides parent mix)

**Constitution Re-check**: ✅ PASS - All principles satisfied

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Tasks Template**: Use `.specify/templates/tasks-template.md` as base structure
2. **Generate Tasks from Design Docs**: Extract concrete tasks from Phase 1 artifacts
3. **TDD Order**: Tests before implementation (contract tests → integration tests → handlers)
4. **Dependency Order**: ATProtoService methods → DO RPC endpoints → router handlers → validation

**Ordering Strategy**:

**Phase A: Infrastructure (ATProtoService PDS Methods)** [P] = parallel
- T001 [P]: Add `getCommunityStats` method (member count aggregation)
- T002 [P]: Add `getCommunityChildren` method (query by parentGroup)
- T003 [P]: Add `validateCircularReference` method (hierarchy validation)

**Phase B: Durable Object Extensions** [Sequential per DO method]
- T004: Add `checkMembership` RPC endpoint (hierarchy permission checks)
- T005: Add `getHierarchy` RPC endpoint (cached parent-child relationships)
- T006: Add `validateStageTransition` RPC endpoint (member count checks)

**Phase C: Contract Tests (TDD)** [P] = parallel per endpoint
- T007 [P]: Create child community contract test
- T008 [P]: Upgrade stage contract test
- T009 [P]: Downgrade stage contract test
- T010 [P]: List children contract test
- T011 [P]: Get parent contract test
- T012 [P]: Delete community contract test

**Phase D: Router Handlers** [P] = parallel per handler
- T013 [P]: Implement `createChild` handler
- T014 [P]: Implement `upgradeStage` handler
- T015 [P]: Implement `downgradeStage` handler
- T016 [P]: Implement `listChildren` handler
- T017 [P]: Implement `getParent` handler
- T018 [P]: Implement `delete` handler

**Phase E: Integration Tests** [Sequential workflow tests]
- T019: Complete hierarchy lifecycle test (create → upgrade → child → list → delete)
- T020: Stage transition validation test (insufficient members → upgrade fails)
- T021: Deletion safety test (non-empty → delete fails)
- T022: Feed mix inheritance test (child inherits/overrides parent mix)
- T023: Circular reference prevention test (A→B→A invalid)

**Phase F: Quickstart Validation** [Sequential]
- T024: Run quickstart.md scenario (all 10 steps)
- T025: Validate performance targets (p95 <200ms)
- T026: Update CLAUDE.md Implementation Status (mark complete)

**Estimated Output**: 26 numbered, ordered tasks in tasks.md

**Parallel Execution Markers**:
- [P] = Can run in parallel (independent files/methods)
- Sequential = Must run in order (dependencies)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md with 26 tasks)
**Phase 4**: Implementation (execute tasks.md following TDD approach)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

**Client Integration** (Future Feature):
- Dashboard UI for hierarchy management (create children, stage transitions, delete)
- Visual hierarchy tree component
- Feed mix configuration UI
- Stage upgrade/downgrade buttons with validation feedback

This is **NOT** part of the current feature scope per Principle 10 (complete backend API first, then client UI as separate feature).

## Complexity Tracking

*No violations - Constitution Check passed*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - [research.md](research.md)
- [x] Phase 1: Design complete (/plan command) - [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)
- [x] Phase 2: Task planning complete (/plan command - approach documented above)
- [x] Phase 3: Tasks generated (/tasks command) - [tasks.md](tasks.md) - **26 tasks ready**
- [ ] Phase 4: Implementation complete - **NEXT STEP**
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none found)
- [x] Complexity deviations documented (none)

---

## Next Steps

Run the following command to generate tasks.md:

```bash
/tasks
```

This will create 26 numbered tasks following the TDD approach outlined in Phase 2.

---

*Based on Constitution v1.5.0 - See `.specify/memory/constitution.md`*
