
# Implementation Plan: Hierarchical Group System

**Branch**: `017-1-1` | **Date**: 2025-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/017-1-1/spec.md`

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
Enable 1-level hierarchical group structure where Graduated-stage groups can create child Theme groups. Implements Dunbar number-based stage progression (Theme→Community at ~15 members, Community→Graduated at ~50 members) with bidirectional transitions. Theme groups inherit moderation from parent Graduated groups. Reuses existing `net.atrarium.group.config` Lexicon schema with immutable `parentGroup` field. No new infrastructure required.

## Technical Context
**Language/Version**: TypeScript 5.7, Node.js (via nodejs_compat)
**Primary Dependencies**: Hono ^4.6.14 (routing), Zod ^4.1.11 (validation), @atproto/api ^0.13.35 (AT Protocol), React 19 + TanStack Router/Query/Table (Dashboard), shadcn/ui (UI components)
**Storage**: Durable Objects Storage (per-group cache, 7-day TTL), PDS (permanent storage via AT Protocol Lexicon)
**Testing**: Vitest + @cloudflare/vitest-pool-workers (server), Vitest + Testing Library (client), Playwright (E2E)
**Target Platform**: Cloudflare Workers + Durable Objects (backend), Cloudflare Pages (frontend)
**Project Type**: Web (backend: server/, frontend: client/)
**Performance Goals**: <200ms p95 API response, <10ms Durable Object reads, 5000 msg/sec Queue throughput
**Constraints**: <$5/month operational cost, PDS-first architecture (all state in PDS), 7-day Durable Objects cache TTL
**Scale/Scope**: 1000+ groups, ~200 members per group, 1-level hierarchy (Graduated→Theme only)

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

**Conclusion**: ✅ PASS - Feature complies with all constitution principles. Reuses existing Lexicon schema (`parentGroup` field), no new infrastructure, Dunbar-based thresholds align with project philosophy. 1-level hierarchy prevents complexity explosion.

## Project Structure

### Documentation (this feature)
```
specs/017-1-1/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
server/                  # Cloudflare Workers backend
├── src/
│   ├── routes/
│   │   └── groups.ts         # Group management API (create child, stage upgrade/downgrade, deletion blocking)
│   ├── durable-objects/
│   │   └── group-feed-generator.ts  # Per-group feed (hierarchy queries, child post aggregation, moderation inheritance)
│   ├── services/
│   │   └── atproto.ts             # PDS methods (parentGroup CRUD, stage transitions, member count queries)
│   ├── schemas/
│   │   └── validation.ts          # Stage rules, parent-child validation, Dunbar thresholds
│   └── types.ts                   # Hierarchy types, stage enums
└── tests/
    ├── contract/
    │   └── hierarchy.test.ts      # Parent-child API, stage progression, deletion blocking
    ├── integration/
    │   └── hierarchy-flow.test.ts # Graduated→Theme creation, moderation inheritance
    └── unit/
        └── stage-validation.test.ts  # Dunbar thresholds, stage rules

client/                  # React dashboard
├── src/
│   ├── components/
│   │   ├── groups/
│   │   │   ├── GroupHierarchy.tsx   # Parent-child tree view, navigation
│   │   │   ├── StageUpgradeButton.tsx   # Stage progression UI (with Dunbar threshold display)
│   │   │   └── CreateChildTheme.tsx     # Child theme creation form (Graduated only)
│   │   └── moderation/
│   │       └── InheritedModeration.tsx  # Theme moderation via parent
│   ├── routes/
│   │   └── groups/$id/children.tsx # Child themes list route
│   └── lib/
│       └── api.ts                 # Hierarchy API methods (createChild, upgradeStage, etc.)
└── tests/
    └── components/
        └── hierarchy.test.tsx     # Hierarchy UI tests

shared/contracts/        # oRPC API contracts
└── src/
    ├── router.ts                  # Hierarchy endpoints (createChild, upgradeStage, downgradeStage)
    └── schemas.ts                 # Hierarchy validation schemas

lexicons/                # AT Protocol Lexicon (no changes - reuses existing parentGroup field)
└── net.atrarium.group.config.json  # Existing schema with parentGroup field
```

**Structure Decision**: Web application (backend: server/, frontend: client/). Existing monorepo structure with shared contracts. Backend handles PDS writes + Durable Objects caching. Frontend provides hierarchy UI. Reuses existing Lexicon schemas without modifications.

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

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each API endpoint → contract test task [P] (6 hierarchy endpoints)
- Backend implementation tasks:
  - Extend validation schemas with stage rules, Dunbar thresholds
  - Add PDS methods (createChild, upgradeStage, member count queries)
  - Extend Durable Objects with parent/children cache keys
  - Update Firehose processor for hierarchy validation
- Frontend implementation tasks:
  - Create hierarchy UI components (GroupHierarchy, StageUpgradeButton, CreateChildTheme)
  - Add hierarchy routes (children list, parent navigation)
  - Integrate hierarchy API calls
- Integration test tasks for user story validation (quickstart scenarios)

**Ordering Strategy**:
- TDD order: Contract tests → Implementation → Integration tests
- Dependency order:
  1. [P] Backend schemas + validation (independent)
  2. [P] PDS service methods (depends on schemas)
  3. [P] Durable Objects extensions (depends on schemas)
  4. API route handlers (depends on PDS + DO methods)
  5. [P] Frontend components (independent)
  6. [P] Frontend routes (depends on components)
  7. Integration tests (depends on full stack)
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**Key Task Categories**:
1. Contract Tests (6 tasks): createChild, upgradeStage, downgradeStage, listChildren, getParent, delete-with-blocking
2. Backend Schema (3 tasks): Stage validation, parent-child rules, Dunbar thresholds
3. PDS Service (4 tasks): Create child, stage transitions, member count, parent queries
4. Durable Objects (3 tasks): Parent/children cache keys, hierarchy queries, moderation inheritance
5. API Routes (6 tasks): Hierarchy endpoint handlers
6. Frontend Components (5 tasks): Hierarchy tree, stage upgrade UI, child creation form, parent link, moderation indicator
7. Frontend Routes (2 tasks): Children list, parent navigation
8. Integration Tests (5 tasks): Quickstart scenario validation (create, upgrade, children, moderation, deletion)

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
- [x] Phase 0: Research complete (/plan command) → research.md created
- [x] Phase 1: Design complete (/plan command) → data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) → 30-35 tasks estimated
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (reuses existing Lexicon, no new infrastructure)
- [x] Post-Design Constitution Check: PASS (PDS+DO only, no violations)
- [x] All NEEDS CLARIFICATION resolved (spec.md clarification session complete)
- [x] Complexity deviations documented (none - simple 1-level hierarchy)

---
*Based on Constitution v1.5.0 - See `.specify/memory/constitution.md`*
