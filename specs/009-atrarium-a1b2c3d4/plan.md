
# Implementation Plan: Update Hashtag Prefix to 'atrarium_'

**Branch**: `009-atrarium-a1b2c3d4` | **Date**: 2025-10-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-atrarium-a1b2c3d4/spec.md`

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
Update hashtag format from `#atr_[8-hex]` to `#atrarium_[8-hex]` to improve brand recognition and clarity for users posting to Atrarium communities. This affects hashtag generation, validation, Firehose filtering, and UI display across the entire system.

## Technical Context
**Language/Version**: TypeScript 5.7 (Cloudflare Workers with nodejs_compat)
**Primary Dependencies**: Hono ^4.6.14 (routing), Zod ^3.23.8 (validation), @atproto/api ^0.13.35
**Storage**: Durable Objects Storage (per-community isolation), PDS (AT Protocol records)
**Testing**: Vitest with @cloudflare/vitest-pool-workers (Workers env simulation)
**Target Platform**: Cloudflare Workers + Durable Objects + Queues (serverless)
**Project Type**: Web (backend Workers + frontend dashboard)
**Performance Goals**: <200ms feed generation, <100ms API response (p95), 5000 msg/sec Queue throughput
**Constraints**: 7-day post retention in Durable Objects, PDS as source of truth, Jetstream WebSocket reliability
**Scale/Scope**: 1,000-10,000 communities, 10-200 members/community, hashtag collision <0.001%

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (from CLAUDE.md):
- ✅ No new abstractions needed - using existing hashtag utilities
- ✅ No new services/layers - modifying existing generation/validation logic
- ✅ Minimal file changes - ~5 files affected (hashtag.ts, firehose-receiver.ts, firehose-processor.ts, communities.ts, tests)

**Architecture Alignment** (006-pds-1-db):
- ✅ PDS-first architecture maintained - no storage schema changes
- ✅ Durable Objects isolation preserved - only key prefix changes
- ✅ Two-stage filtering pattern unchanged - update regex only
- ✅ AT Protocol compatibility - hashtags are user-facing, not protocol-level

**Testing Requirements**:
- ✅ Contract tests exist for hashtag generation/validation
- ✅ Integration tests cover Firehose → Feed flow
- ✅ Unit tests for hashtag utilities already present

**No Constitution Violations Detected** - Simple string replacement feature

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
src/                              # Cloudflare Workers backend
├── utils/
│   └── hashtag.ts               # [MODIFY] Hashtag generation/validation
├── routes/
│   └── communities.ts           # [MODIFY] Community creation with new hashtag format
├── durable-objects/
│   └── firehose-receiver.ts     # [MODIFY] Lightweight filter: '#atrarium_'
├── workers/
│   └── firehose-processor.ts    # [MODIFY] Heavyweight filter: /#atrarium_[0-9a-f]{8}/g
└── schemas/
    └── validation.ts            # [REVIEW] Hashtag validation schemas

tests/                           # Test suite
├── contract/
│   ├── dashboard/
│   │   └── post-to-feed-with-hashtag.test.ts  # [UPDATE] Test new format
│   └── feed-generator/
│       └── get-feed-skeleton-with-hashtags.test.ts  # [UPDATE] Test new format
├── integration/
│   ├── hashtag-indexing-flow.test.ts   # [UPDATE] End-to-end hashtag flow
│   └── pds-to-feed-flow.test.ts        # [UPDATE] Quickstart scenario
└── unit/
    └── feed-hashtag-generator.test.ts  # [UPDATE] Hashtag generation unit tests

dashboard/                       # React dashboard
└── src/
    └── components/
        └── communities/         # [REVIEW] Community hashtag display
```

**Structure Decision**: Web application structure (Cloudflare Workers backend + React dashboard frontend). This feature primarily affects backend hashtag processing pipeline and requires minimal dashboard updates for display purposes.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Post-Design Constitution Re-Check

**Re-evaluation after Phase 1 Design** ✅

**Simplicity Maintained**:
- ✅ No new abstractions introduced in design
- ✅ No new Durable Objects or Workers
- ✅ No new database schemas or storage patterns
- ✅ Contract updates are string pattern changes only

**Architecture Integrity**:
- ✅ PDS-first pattern preserved (hashtag stored in PDS records)
- ✅ Two-stage filtering maintained (only regex patterns updated)
- ✅ Durable Objects isolation unchanged
- ✅ No breaking changes to AT Protocol integration

**Complexity Assessment**:
- Total files modified: 5 core files + 6 test files
- New code: Collision check logic (~20 lines)
- Removed code: None (replacement only)
- Net complexity: **Neutral** (same abstractions, different values)

**Constitution Status**: ✅ **PASS** - No violations introduced during design

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Update Core Utilities** (3 tasks):
   - Update `src/utils/hashtag.ts`: `generateFeedHashtag()` → `#atrarium_`
   - Update `src/utils/hashtag.ts`: `validateHashtagFormat()` → new regex
   - Update `src/utils/hashtag.ts`: `extractFeedHashtags()` → new regex

2. **Update Firehose Pipeline** (2 tasks):
   - Update `src/durable-objects/firehose-receiver.ts`: lightweight filter `#atrarium_`
   - Update `src/workers/firehose-processor.ts`: heavyweight filter `/#atrarium_[0-9a-f]{8}/g`

3. **Add Collision Check Logic** (1 task):
   - Update `src/routes/communities.ts`: Add PDS hashtag uniqueness check with retry

4. **Update Test Fixtures** (6 tasks, parallel):
   - Update `tests/unit/feed-hashtag-generator.test.ts` [P]
   - Update `tests/contract/dashboard/post-to-feed-with-hashtag.test.ts` [P]
   - Update `tests/contract/feed-generator/get-feed-skeleton-with-hashtags.test.ts` [P]
   - Update `tests/integration/hashtag-indexing-flow.test.ts` [P]
   - Update `tests/integration/pds-to-feed-flow.test.ts` [P]
   - Update `tests/integration/pds-posting.test.ts` [P]

5. **Update Documentation** (3 tasks, parallel):
   - Update CLAUDE.md: hashtag format references [P]
   - Update docs/: API examples with new format [P]
   - Update README.md: hashtag description [P]

6. **Validation** (2 tasks):
   - Run full test suite and verify all pass
   - Execute quickstart.md validation steps

**Ordering Strategy**:
```
Phase A (Core):     Tasks 1-3 (sequential - hashtag utils → pipeline → collision check)
Phase B (Tests):    Tasks 4-9 (parallel - independent test files)
Phase C (Docs):     Tasks 10-12 (parallel - independent doc files)
Phase D (Validate): Tasks 13-14 (sequential - tests → quickstart)
```

**Estimated Output**: 14 numbered, dependency-ordered tasks in tasks.md

**Task Dependencies**:
- Tests depend on core implementation (4-9 depend on 1-3)
- Docs can run in parallel with tests
- Validation runs after all updates complete

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
- [x] Phase 2: Task planning complete (/plan command - described approach, 14 tasks estimated)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 17 tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations detected)
- [x] Post-Design Constitution Check: PASS (complexity neutral)
- [x] All NEEDS CLARIFICATION resolved (no unknowns in Technical Context)
- [x] Complexity deviations documented (none - simple string replacement)

**Artifacts Generated**:
- ✅ `/specs/009-atrarium-a1b2c3d4/plan.md` (this file)
- ✅ `/specs/009-atrarium-a1b2c3d4/research.md` (Phase 0)
- ✅ `/specs/009-atrarium-a1b2c3d4/data-model.md` (Phase 1)
- ✅ `/specs/009-atrarium-a1b2c3d4/contracts/hashtag-api.yaml` (Phase 1)
- ✅ `/specs/009-atrarium-a1b2c3d4/quickstart.md` (Phase 1)
- ✅ `/specs/009-atrarium-a1b2c3d4/tasks.md` (Phase 3)
- ✅ `/workspaces/atrarium/CLAUDE.md` (updated with feature context)

---
*Based on project CLAUDE.md - Constitution principles: simplicity, PDS-first architecture, test coverage*
