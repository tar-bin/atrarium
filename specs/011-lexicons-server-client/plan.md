
# Implementation Plan: Reorganize Implementation into Lexicons, Server, and Client

**Branch**: `011-lexicons-server-client` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/011-lexicons-server-client/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type detected: web (has dashboard + backend/src)
   → ✅ Structure Decision: Reorganize into lexicons/, server/, client/
3. Fill the Constitution Check section based on constitution
   → ✅ Analyzed all 6 principles
4. Evaluate Constitution Check section
   → ✅ PASS - Reorganization complies with all principles
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Resolved NEEDS CLARIFICATION items
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Generated design artifacts
7. Re-evaluate Constitution Check section
   → ✅ PASS - Design maintains compliance
   → ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   → ✅ Task generation strategy documented
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
This feature reorganizes the Atrarium codebase into three clear logical components:
- **lexicons/**: AT Protocol Lexicon schemas (protocol definition)
- **server/**: Backend implementation (Cloudflare Workers, Durable Objects, API)
- **client/**: Frontend implementations (dashboard, docs)

The reorganization improves code navigation, separation of concerns, and developer onboarding while maintaining all existing functionality and constitutional compliance (particularly Principle 1: Protocol-First Architecture).

## Technical Context
**Language/Version**: TypeScript 5.7, Node.js (nodejs_compat)
**Primary Dependencies**:
- Server: Hono ^4.6.14, @atproto/api ^0.13.35, Zod ^3.23.8
- Client (Dashboard): React 19, TanStack Router v1, shadcn/ui
- Client (Docs): VitePress
**Storage**: Durable Objects Storage (per-community isolation), user PDSs (AT Protocol)
**Testing**: Vitest with @cloudflare/vitest-pool-workers, Playwright (E2E)
**Target Platform**: Cloudflare Workers + Pages
**Project Type**: web (backend + multiple frontends)
**Performance Goals**: <200ms feed generation, <100ms API response (p95)
**Constraints**: Must maintain existing functionality, zero breaking changes
**Scale/Scope**: ~100 files to reorganize across 3 directories

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (reorganization only, maintains existing structure)
- ✅ No new databases (no storage changes)
- ✅ No new services (same Cloudflare Workers + Durable Objects)
- ✅ Minimal dependencies (no new dependencies added)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture **STRENGTHENED** (lexicons/ directory makes this explicit)
- ✅ Economic efficiency preserved (no infrastructure changes)
- ✅ No framework proliferation (same tech stack)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (no data flow changes)
- ✅ Durable Objects remain 7-day cache only
- ✅ No centralized user database created

**Operational Burden** (Principle 6):
- ✅ No operational changes (same deployment process)
- ✅ Build process updated but not complicated
- ✅ <1 hour/week maintenance goal unaffected

**Conclusion**: ✅ PASS - Feature **enhances** constitutional compliance by making protocol-first architecture more explicit

## Project Structure

### Documentation (this feature)
```
specs/011-lexicons-server-client/
├── spec.md             # Feature specification
├── plan.md             # This file (/plan command output)
├── research.md         # Phase 0 output (/plan command)
├── data-model.md       # Phase 1 output (/plan command)
├── quickstart.md       # Phase 1 output (/plan command)
└── tasks.md            # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
**Current Structure**:
```
/workspaces/atrarium/
├── lexicons/                    # ✅ Already isolated
│   ├── net.atrarium.community.config.json
│   ├── net.atrarium.community.membership.json
│   ├── net.atrarium.moderation.action.json
│   └── README.md
├── src/                         # ❌ Server code (to be moved to server/)
│   ├── durable-objects/
│   ├── routes/
│   ├── services/
│   ├── schemas/
│   ├── utils/
│   ├── workers/
│   ├── index.ts
│   ├── router.ts
│   ├── openapi.ts
│   └── types.ts
├── tests/                       # ❌ Server tests (to be moved to server/tests/)
│   ├── contract/
│   ├── integration/
│   ├── unit/
│   ├── docs/
│   └── helpers/
├── dashboard/                   # ⚠️ Client code (to be moved under client/)
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── docs/                        # ⚠️ Client docs (to be moved under client/)
│   ├── en/
│   ├── ja/
│   ├── package.json
│   └── ...
├── wrangler.toml                # Server config (stays at root or moves to server/)
├── package.json                 # Root workspace config (monorepo)
├── vitest.config.ts             # Server test config (moves to server/)
├── vitest.docs.config.ts        # Docs test config (moves to client/docs/)
└── vitest.pds.config.ts         # Server PDS test config (moves to server/)
```

**Target Structure**:
```
/workspaces/atrarium/
├── lexicons/                    # ✅ Protocol definitions (unchanged)
│   ├── net.atrarium.*.json
│   └── README.md
├── server/                      # ✅ Backend implementation (new location)
│   ├── src/                     # Moved from /src/
│   │   ├── durable-objects/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── utils/
│   │   ├── workers/
│   │   ├── index.ts
│   │   ├── router.ts
│   │   ├── openapi.ts
│   │   └── types.ts
│   ├── tests/                   # Moved from /tests/ (excluding docs/)
│   │   ├── contract/
│   │   ├── integration/
│   │   ├── unit/
│   │   └── helpers/
│   ├── wrangler.toml            # Server config (moved from root)
│   ├── package.json             # Server dependencies
│   ├── tsconfig.json            # Server TypeScript config
│   ├── vitest.config.ts         # Server test config
│   └── vitest.pds.config.ts     # Server PDS test config
├── client/                      # ✅ Frontend implementations (new location)
│   ├── dashboard/               # Moved from /dashboard/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── ...
│   └── docs/                    # Moved from /docs/
│       ├── en/
│       ├── ja/
│       ├── tests/               # Moved from /tests/docs/
│       ├── package.json
│       ├── vitest.docs.config.ts
│       └── ...
├── package.json                 # Root workspace config (monorepo coordination)
├── tsconfig.json                # Root TypeScript config (references server/ and client/)
├── .gitignore                   # Updated paths
├── README.md                    # Updated project structure docs
└── CLAUDE.md                    # Updated project structure docs
```

**Structure Decision**: Web application with clear protocol/backend/frontend separation. The reorganization:
1. **Preserves lexicons/** as protocol definition layer (no changes)
2. **Consolidates server/** for all backend code (was /src/ + /tests/)
3. **Groups client/** implementations (dashboard + docs)
4. **Maintains monorepo** structure with workspace coordination at root

## Phase 0: Outline & Research

### Research Questions
1. **RESOLVED: Client scope** - Does "client" include dashboard only, or docs as well?
   - **Decision**: Include both dashboard and docs under `client/`
   - **Rationale**: Both are frontend artifacts consumed by end users (developers using dashboard, users reading docs). Separating them maintains protocol/backend/frontend distinction
   - **Alternatives considered**: Keep docs at root (rejected: breaks clean separation), Move docs to server (rejected: docs are consumer-facing, not implementation)

2. **RESOLVED: Shared code location** - Where should types/utilities used by both server and client reside?
   - **Decision**: Each implementation maintains its own types. Lexicon schemas are the shared contract
   - **Rationale**: Aligns with Principle 1 (Protocol-First Architecture). Lexicons define the API contract, implementations are independent
   - **Alternatives considered**: Create /shared/ directory (rejected: violates Principle 2 simplicity), Duplicate types (accepted: small duplication acceptable for clean separation)

3. **RESOLVED: Configuration file organization** - Should wrangler.toml, package.json remain at root or move with server?
   - **Decision**: Move wrangler.toml to server/, keep root package.json as workspace coordinator
   - **Rationale**: wrangler.toml is server-specific config. Root package.json coordinates monorepo workspaces
   - **Alternatives considered**: Keep all at root (rejected: mixes concerns), Separate package.json per directory (accepted: standard monorepo pattern)

4. **RESOLVED: Migration strategy** - Should this be gradual or all-at-once?
   - **Decision**: All-at-once migration using `git mv` for history preservation
   - **Rationale**: Single atomic change is easier to review, test, and rollback. Gradual migration creates ambiguous intermediate states
   - **Alternatives considered**: Feature-by-feature migration (rejected: too complex, breaks tests intermittently)

5. **RESOLVED: Build system changes** - How should build processes be updated?
   - **Decision**: Monorepo workspaces with npm/pnpm workspaces. Root package.json coordinates builds
   - **Rationale**: Standard Node.js monorepo pattern, minimal tooling changes
   - **Alternatives considered**: Lerna (rejected: overkill), Turborepo (rejected: adds complexity), Make (rejected: not Node.js idiomatic)

### Technology Decisions

**Monorepo Tooling**:
- **Decision**: npm workspaces (built-in, zero new dependencies)
- **Rationale**: Principle 2 (Simplicity) - use built-in tools before adding dependencies
- **Alternatives**: pnpm workspaces (slightly faster), Yarn workspaces (no significant advantage)

**Import Path Strategy**:
- **Decision**: Update all imports atomically using TypeScript compiler API or find/replace
- **Rationale**: Automated import updates reduce human error
- **Alternatives**: Manual update (rejected: error-prone), ESLint plugin (rejected: adds complexity)

**Git History Preservation**:
- **Decision**: Use `git mv` for all file moves
- **Rationale**: Preserves blame history, makes code archaeology possible
- **Alternatives**: Copy + delete (rejected: loses history), Subtree split (rejected: overkill)

**Testing Strategy**:
- **Decision**: Update test configs to new paths, run full test suite to verify
- **Rationale**: Existing tests validate functionality is preserved (FR-004)
- **Alternatives**: Rewrite tests (rejected: unnecessary), Skip testing (rejected: violates acceptance criteria)

**Output**: See [research.md](./research.md) for detailed analysis

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### Data Model
No new data entities are created. This is a structural reorganization only.

**Output**: See [data-model.md](./data-model.md)

### API Contracts
No API changes. All existing endpoints remain unchanged:
- Feed Generator API (`/xrpc/app.bsky.feed.*`)
- Dashboard API (`/api/communities`, `/api/memberships`, `/api/moderation`)
- Lexicon Publication API (`/xrpc/net.atrarium.lexicon.get`)

**Output**: No new contracts (structural change only)

### Test Scenarios
**Acceptance Test**: Verify reorganization preserves functionality
```bash
# Before reorganization
npm test                    # All tests pass
npm run build               # Build succeeds
npm run typecheck           # No type errors

# After reorganization
npm test                    # All tests still pass (updated paths)
npm run build               # Build succeeds (updated configs)
npm run typecheck           # No type errors (updated tsconfig)
```

**Output**: See [quickstart.md](./quickstart.md)

### Agent Context Update
Update CLAUDE.md to reflect new structure:
- Update "Project Structure" section with new directory layout
- Update "Development Commands" to reference new paths
- Add migration notes for developers

**Output**: CLAUDE.md updated via `.specify/scripts/bash/update-agent-context.sh claude`

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Phase 0: Preparation**
   - Create server/, client/ directories
   - Verify git status clean (no uncommitted changes)

2. **Phase 1: Move Server Code**
   - `git mv src/ server/src/`
   - `git mv tests/ server/tests/` (excluding tests/docs/)
   - `git mv wrangler.toml server/`
   - `git mv vitest.config.ts server/`
   - `git mv vitest.pds.config.ts server/`
   - Create server/package.json
   - Create server/tsconfig.json

3. **Phase 2: Move Client Code**
   - `git mv dashboard/ client/dashboard/`
   - `git mv docs/ client/docs/`
   - `git mv tests/docs/ client/docs/tests/`
   - `git mv vitest.docs.config.ts client/docs/`

4. **Phase 3: Update Configurations**
   - Update root package.json (add workspaces)
   - Update root tsconfig.json (add project references)
   - Update .gitignore (new paths)
   - Update server/wrangler.toml (relative paths)
   - Update client/dashboard/vite.config.ts (relative paths)
   - Update client/docs/.vitepress/config.ts (relative paths)

5. **Phase 4: Update Imports**
   - Update all import statements in server/ files
   - Update all import statements in client/ files
   - Update test imports

6. **Phase 5: Update Documentation**
   - Update README.md (new structure)
   - Update CLAUDE.md (new structure)
   - Update docs/ content (new paths)

7. **Phase 6: Validation**
   - Run `npm install` (install workspace dependencies)
   - Run `npm run typecheck` (verify no type errors)
   - Run `npm test` (verify all tests pass)
   - Run `npm run build` (verify build succeeds)

**Ordering Strategy**:
- Sequential execution (each phase depends on previous)
- Git operations first (preserve history)
- Configuration updates second (enable builds)
- Import updates third (fix references)
- Validation last (verify success)

**Estimated Output**: ~30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. This reorganization **strengthens** constitutional compliance by:
- Making protocol-first architecture (Principle 1) more explicit via lexicons/ directory
- Maintaining simplicity (Principle 2) by not adding new projects/databases/services
- Preserving all other principles (3-6) unchanged

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
