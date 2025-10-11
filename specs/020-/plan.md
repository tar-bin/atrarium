
# Implementation Plan: Project File Organization

**Branch**: `020-` | **Date**: 2025-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/020-/spec.md`

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
Reorganize Atrarium codebase by splitting large files (>500 lines) and grouping functionality by domain-driven design (DDD) boundaries across both server and client workspaces. Eliminate duplicate utilities by consolidating to `shared/` workspace. Breaking changes allowed for optimal structure with no git history preservation required.

## Technical Context
**Language/Version**: TypeScript 5.7 (Node.js via nodejs_compat for server, ES2020 for client)
**Primary Dependencies**: React 19, Hono 4.6, TanStack Router/Query, @atproto/api 0.13, Biome (linter/formatter)
**Storage**: N/A (code organization only, no data storage changes)
**Testing**: Vitest (@cloudflare/vitest-pool-workers for server, Testing Library for client), Playwright (E2E)
**Target Platform**: Cloudflare Workers (server), Browser (client), pnpm workspaces monorepo
**Project Type**: Web (monorepo with server/, client/, shared/ workspaces)
**Performance Goals**: No performance impact (refactoring only) - `pnpm -r typecheck` must complete without errors, `pnpm -r test` must pass
**Constraints**: Breaking changes allowed for internal code, no backward compatibility requirement, accept git history loss
**Scale/Scope**: ~7500 lines server code, ~2250 lines client code, 3 workspaces (server, client, shared/contracts)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (refactors existing server/, client/, shared/ workspaces)
- ✅ No new databases (N/A - pure code reorganization)
- ✅ No new services (N/A - pure code reorganization)
- ✅ Minimal dependencies (no new dependencies added, uses existing Biome/TypeScript)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (N/A - no protocol changes, organizational refactoring only)
- ✅ Economic efficiency preserved (N/A - no infrastructure changes)
- ✅ No framework proliferation (no new frameworks, uses existing TypeScript/React/Hono stack)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (N/A - no data storage changes, organizational refactoring only)
- ✅ Durable Objects used only as 7-day cache (N/A - no data storage changes)
- ✅ No centralized user database created (N/A - no data storage changes)

**Code Quality** (Principle 7):
- ✅ Biome linter checks configured and enforced (existing biome.json, will run post-refactoring)
- ✅ Biome formatter checks configured and enforced (existing biome.json, will run post-refactoring)
- ✅ TypeScript type checks configured and enforced (`pnpm -r typecheck` validation gate)
- ✅ Pre-commit validation automated (existing husky hooks will validate after refactoring)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ Feature implementable using AT Protocol + PDS + Lexicon schemas only (N/A - no protocol changes, organizational refactoring only)
- ✅ No separate databases (SQL/NoSQL/KV) introduced beyond Durable Objects cache (N/A - no data storage changes)
- ✅ All persistent state resides in PDS using `net.atrarium.*` Lexicon records (N/A - no data storage changes)
- ✅ Durable Objects Storage used only as 7-day ephemeral cache (N/A - no data storage changes)
- ✅ No feature requires additional database infrastructure (confirmed - pure code organization)

**Git Workflow and Commit Integrity** (Principle 9):
- ✅ Implementation plan includes complete commit strategy (refactor in single coherent commit after validation)
- ✅ Pre-commit hooks will validate all changes (Biome + TypeScript will validate after refactoring)
- ⚠️ Emergency bypass procedures documented (git history loss accepted per clarification - not a bypass, intentional design choice)
- ✅ CI/CD validation independent of local hooks (GitHub Actions will validate PR)

**Complete Implementation Over MVP Excuses** (Principle 10):
- ✅ Feature specification includes all required components (all 12 functional requirements defined, no deferrals)
- ✅ Implementation plan covers all specified functionality (both server and client refactoring included)
- ✅ All UI components will be created and integrated (N/A - no new UI, organizational refactoring only)
- ✅ All API endpoints will be implemented and tested (N/A - no new APIs, organizational refactoring only)
- ✅ Completion criteria clearly defined (`pnpm -r typecheck` passes, `pnpm -r test` passes, documentation updated)
- ✅ Incremental delivery plan (if applicable) includes complete, usable increments (single-commit refactoring, atomic change)

**Conclusion**: ✅ PASS - Feature complies with all constitution principles (pure organizational refactoring with no architectural changes)

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
# Current structure (before refactoring)
server/
├── src/
│   ├── durable-objects/
│   ├── routes/
│   ├── schemas/
│   ├── services/           # 🔴 Large files: atproto.ts (1606 lines)
│   ├── utils/              # 🔴 Duplicate utilities (emoji, hashtag)
│   ├── workers/
│   ├── index.ts
│   ├── router.ts
│   └── types.ts
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

client/
├── src/
│   ├── components/         # ✅ Already organized by feature
│   │   ├── communities/
│   │   ├── emoji/
│   │   ├── moderation/
│   │   └── ...
│   ├── lib/                # 🔴 Large files: hooks.ts (433 lines), api.ts (352 lines)
│   ├── routes/
│   ├── contexts/
│   └── ...
└── tests/

shared/
└── contracts/              # oRPC API contracts
    └── src/

# Target structure (after refactoring)
server/
├── src/
│   ├── durable-objects/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   │   ├── atproto/        # 🆕 Split by domain
│   │   │   ├── index.ts
│   │   │   ├── communities.ts
│   │   │   ├── memberships.ts
│   │   │   ├── emoji.ts
│   │   │   └── moderation.ts
│   │   └── auth.ts
│   ├── utils/              # 🔥 Duplicates moved to shared/
│   ├── workers/
│   └── ...
└── tests/

client/
├── src/
│   ├── components/         # ✅ Keep existing organization
│   ├── lib/
│   │   ├── hooks/          # 🆕 Split by feature domain
│   │   │   ├── index.ts
│   │   │   ├── useCommunities.ts
│   │   │   ├── useMemberships.ts
│   │   │   └── useModeration.ts
│   │   ├── api.ts
│   │   └── ...
│   └── ...
└── tests/

shared/
├── contracts/
└── utils/                  # 🆕 Shared utilities (emoji, hashtag validation)
    ├── emoji.ts
    ├── hashtag.ts
    └── validation.ts
```

**Structure Decision**: Web application (monorepo) with server/, client/, shared/ workspaces. Refactoring focuses on:
1. **Server**: Split `atproto.ts` (1606 lines) into domain-specific modules under `services/atproto/`
2. **Client**: Split `hooks.ts` (433 lines) into feature-specific hooks under `lib/hooks/`
3. **Shared**: Move duplicate utilities (emoji, hashtag validation) from server/client to `shared/utils/`

## Phase 0: Outline & Research
✅ **COMPLETED**

1. **Extract unknowns from Technical Context**: All clarified (no NEEDS CLARIFICATION markers)
2. **Research best practices**: 6 research questions addressed
3. **Consolidate findings**: Generated `/workspaces/atrarium/specs/020-/research.md`

**Key Decisions**:
- Feature-based organization with barrel exports (domain-driven design)
- DDD boundaries over strict line counts (500 lines as guideline)
- Feature-based React hooks with TanStack Query patterns
- TypeScript LSP + compiler validation for import path updates
- Shared utilities workspace (`@atrarium/utils`) for code deduplication
- Mirror test structure to match source organization

**Output**: ✅ [research.md](research.md) completed

## Phase 1: Design & Contracts
✅ **COMPLETED**

1. **Extract entities from feature spec**: 5 entities defined in `data-model.md`
   - SourceFile, Module, SharedUtility, ImportDependency, RefactoringTask
2. **Generate refactoring contracts**: Validation contract created in `/contracts/refactoring-contract.md`
   - Pre-conditions, during-refactoring checks, post-conditions, rollback contract
3. **Extract test scenarios**: 10-step quickstart guide with validation commands
4. **Update agent context**: CLAUDE.md updated with TypeScript 5.7, React 19, pnpm workspaces context

**Key Artifacts**:
- ✅ [data-model.md](data-model.md) - 5 entities with attributes, relationships, validation rules
- ✅ [contracts/refactoring-contract.md](contracts/refactoring-contract.md) - 8 POST-conditions, rollback procedures
- ✅ [quickstart.md](quickstart.md) - 10-step validation guide with bash commands
- ✅ CLAUDE.md - Updated agent context (language, framework, project type)

**Output**: All Phase 1 artifacts generated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data-model.md, quickstart.md, contracts/)
- Each quickstart step → implementation task
- Each entity (RefactoringTask) → concrete refactoring operation
- Validation tasks from refactoring-contract.md POST-conditions

**Task Categories**:
1. **Preparation** (T001-T003): Baseline validation, candidate identification, backup creation
2. **Shared Utilities** (T004-T007): Create `@atrarium/utils`, consolidate duplicates, update imports
3. **Server Refactoring** (T008-T012): Split `atproto.ts`, update imports, validate
4. **Client Refactoring** (T013-T017): Split `hooks.ts`, update imports, validate
5. **Documentation** (T018-T020): Update README files, CLAUDE.md
6. **Final Validation** (T021-T025): Full test suite, linting, commit

**Ordering Strategy**:
- Sequential execution (dependencies between tasks)
- Preparation → Shared → Server → Client → Documentation → Validation
- No parallel tasks (refactoring requires sequential imports validation)

**Estimated Output**: 25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected**. This feature is a pure organizational refactoring with no architectural changes:
- No new projects, databases, or services added (Principle 2 ✅)
- No protocol or infrastructure changes (Principles 1, 3 ✅)
- No data storage changes (Principles 4, 5, 8 ✅)
- Code quality enforced via existing tooling (Principle 7 ✅)
- Git history loss is intentional design choice per clarification, not a violation (Principle 9 ⚠️ acceptable)
- Complete implementation planned (Principle 10 ✅)


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md generated
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Approach documented above
- [ ] Phase 3: Tasks generated (/tasks command) - 🔜 Ready for `/tasks` command
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations, N/A for most principles - organizational refactoring only)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (all clarified in Technical Context)
- [x] Complexity deviations documented (N/A - no deviations, simple refactoring)

---
*Based on Constitution v1.5.0 - See `.specify/memory/constitution.md`*
