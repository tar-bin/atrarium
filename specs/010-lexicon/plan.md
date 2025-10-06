
# Implementation Plan: AT Protocol Lexicon Publication

**Branch**: `010-lexicon` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/010-lexicon/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ COMPLETE
2. Fill Technical Context → ✅ COMPLETE
3. Fill Constitution Check section → ✅ COMPLETE (minimal complexity)
4. Evaluate Constitution Check → ✅ PASS (no violations)
5. Execute Phase 0 → research.md → IN PROGRESS
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
7. Re-evaluate Constitution Check
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

## Summary

Publish Atrarium's three custom AT Protocol Lexicon schemas (`net.atrarium.community.config`, `net.atrarium.community.membership`, `net.atrarium.moderation.action`) at public HTTP endpoints following AT Protocol conventions. Schemas will be served from `src/lexicons/` directory with HTTP caching headers (ETag + conditional requests during beta, transitioning to 24-hour immutable cache post-stabilization). TypeScript types will be auto-generated from JSON definitions using `@atproto/lexicon` tooling to ensure consistency.

**Strategic Importance**: This feature publishes the **true core value** of Atrarium - the Lexicon schemas that define community semantics as an open standard. The current Cloudflare Workers implementation is a reference implementation chosen for economic efficiency (95% cost reduction), not architectural necessity. Publishing these schemas enables:
- Third-party implementations of Atrarium-compatible servers
- Interoperability with any AT Protocol client (including official Bluesky apps)
- No vendor lock-in: communities can migrate to alternative platforms while preserving data structures
- Community membership attestation independent of Atrarium infrastructure

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js (via nodejs_compat)
**Primary Dependencies**:
- `@atproto/api` ^0.13.35 (AT Protocol client)
- `@atproto/identity` ^0.4.3 (DID resolution)
- `@atproto/lexicon` (code generation tooling)
- `hono` ^4.6.14 (HTTP routing)
- `zod` ^3.23.8 (runtime validation)

**Storage**: Static JSON files in `src/lexicons/` directory (no database required)
**Testing**: Vitest with `@cloudflare/vitest-pool-workers` (Cloudflare Workers environment simulation)
**Target Platform**: Cloudflare Workers (edge runtime)
**Project Type**: Single project (backend-only, existing Cloudflare Workers application)
**Performance Goals**:
- Response time < 100ms (p95) for Lexicon schema requests
- Support conditional requests (304 Not Modified) via ETag
**Constraints**:
- Must follow AT Protocol Lexicon discovery conventions (`.well-known/atproto-lexicon/` path likely)
- Beta period caching: `Cache-Control: public, max-age=3600` + ETag
- Post-stabilization: `Cache-Control: public, max-age=86400, immutable`
**Scale/Scope**: 3 Lexicon schemas, publicly accessible endpoints, no authentication required

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles**:
- ✅ No new projects (extends existing Cloudflare Workers application)
- ✅ No new databases (static JSON files only)
- ✅ No new services (adds HTTP routes to existing Hono router)
- ✅ Minimal dependencies (reuses existing `@atproto/*` packages, adds `@atproto/lexicon` for codegen)

**Technology Choices**:
- ✅ Uses existing stack (Hono, Cloudflare Workers, TypeScript)
- ✅ Follows AT Protocol conventions (official tooling)
- ✅ No framework proliferation

**Conclusion**: ✅ PASS - Feature adds minimal complexity (3 JSON files + 1 HTTP route)

## Project Structure

### Documentation (this feature)
```
specs/010-lexicon/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
lexicons/                          # NEW: Lexicon schemas (protocol definition, implementation-agnostic)
├── net.atrarium.community.config.json
├── net.atrarium.community.membership.json
├── net.atrarium.moderation.action.json
└── README.md                      # Lexicon schema documentation

src/                               # Cloudflare Workers implementation (reference implementation)
├── schemas/
│   ├── generated/                 # UPDATED: Auto-generated TypeScript types from lexicons/
│   └── validation.ts              # Existing Zod schemas
├── routes/
│   └── lexicon.ts                 # NEW: Lexicon publication endpoints (serves lexicons/)
├── router.ts                      # UPDATED: Add lexicon routes
└── index.ts                       # Existing entry point

tests/
├── contract/
│   └── lexicon/                   # NEW: Contract tests for Lexicon endpoints
│       ├── lexicon-endpoint.test.ts
│       └── lexicon-caching.test.ts
├── integration/
│   └── lexicon-publication.test.ts  # NEW: End-to-end Lexicon publication test
└── unit/
    └── lexicon-codegen.test.ts      # NEW: TypeScript codegen validation
```

**Structure Decision**: Lexicon schemas separated from implementation in top-level `lexicons/` directory to emphasize:
- Protocol definition is implementation-agnostic (reusable by Go, Rust, Python servers)
- Clear boundary between "what" (Lexicon) and "how" (Cloudflare Workers)
- Single source of truth for community data structures
- Reference implementation in `src/` serves schemas from `lexicons/`

## Phase 0: Outline & Research

**Unknowns to resolve**:
1. AT Protocol Lexicon discovery conventions (exact URL path format)
2. `@atproto/lexicon` tooling usage (code generation workflow)
3. ETag generation strategy for static JSON files
4. Cloudflare Workers static file serving best practices

**Research tasks**:
1. Research AT Protocol Lexicon publication conventions
   - How do PDS servers discover custom Lexicon schemas?
   - What is the standard URL path format? (`.well-known/atproto-lexicon/` hypothesis)
   - Reference: Official AT Protocol Lexicon spec

2. Research `@atproto/lexicon` code generation
   - How to use `lex-cli` or equivalent tooling?
   - Input/output format for TypeScript type generation
   - Integration with build process (npm scripts)

3. Research ETag and HTTP caching for Cloudflare Workers
   - How to generate stable ETags for static JSON content?
   - Cloudflare Workers Cache API usage
   - Conditional request handling (If-None-Match header)

4. Research Cloudflare Workers static asset serving
   - Best practices for serving JSON files from `src/` directory
   - Build-time bundling vs runtime file reading
   - CORS header configuration

**Output**: research.md with all findings and decisions

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

**Data Model** (`data-model.md`):
- Lexicon Schema entity (JSON file structure)
- HTTP Response entity (headers, body, status codes)
- ETag entity (generation algorithm, storage)

**API Contracts** (`/contracts/`):
```
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.membership
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.moderation.action

Response:
- Status: 200 OK | 304 Not Modified
- Headers:
  - Content-Type: application/json
  - Cache-Control: public, max-age=3600
  - ETag: "<hash>"
  - Access-Control-Allow-Origin: *
- Body: Lexicon JSON schema
```

**Contract Tests**:
- `tests/contract/lexicon/lexicon-endpoint.test.ts`: Verify all 3 schemas are accessible
- `tests/contract/lexicon/lexicon-caching.test.ts`: Verify ETag and 304 responses

**Integration Test Scenario** (from user story):
- PDS server fetches Lexicon → validates community config record → success

**Quickstart Test** (`quickstart.md`):
1. Fetch `net.atrarium.community.config.json` via HTTP
2. Validate JSON structure matches AT Protocol Lexicon format
3. Verify ETag header present
4. Send conditional request with If-None-Match → receive 304

**Agent File Update**:
- Run `.specify/scripts/bash/update-agent-context.sh claude`
- Add: Lexicon publication endpoints, `src/lexicons/` directory, ETag caching

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md update

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Setup tasks**:
   - Create `src/lexicons/` directory
   - Copy existing Lexicon JSON files from `specs/006-pds-1-db/contracts/lexicon/`
   - Add `@atproto/lexicon` to package.json

2. **Code generation tasks**:
   - Research and configure `lex-cli` or equivalent tooling
   - Add npm script for TypeScript codegen from JSON
   - Generate TypeScript types to `src/schemas/lexicon.ts`
   - Verify types match existing manual definitions

3. **Endpoint implementation tasks**:
   - Create `src/routes/lexicon.ts` with Hono routes
   - Implement ETag generation for static JSON
   - Add Cache-Control headers (beta period settings)
   - Handle conditional requests (If-None-Match)
   - Add CORS headers

4. **Integration tasks**:
   - Update `src/router.ts` to include lexicon routes
   - Configure wrangler.toml if needed (static assets)

5. **Testing tasks**:
   - Write contract test: Lexicon endpoint accessibility [P]
   - Write contract test: HTTP caching behavior [P]
   - Write integration test: End-to-end Lexicon publication [P]
   - Write unit test: TypeScript codegen validation [P]

6. **Documentation tasks**:
   - Update CLAUDE.md with Lexicon publication details
   - Document codegen workflow in README or CONTRIBUTING

**Ordering Strategy**:
- Phase A: Setup (tasks 1-2) - sequential
- Phase B: Codegen (task 2) - blocks Phase C
- Phase C: Endpoint implementation (tasks 3-4) + Tests (task 5) - parallel [P]
- Phase D: Documentation (task 6) - final

**Estimated Output**: ~15-20 tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation
- Run all contract tests (must pass)
- Execute quickstart.md manually
- Verify Lexicon schemas accessible via curl
- Test ETag/304 caching behavior
- Deploy to staging and verify from external PDS

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected - this section is not needed.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (resolved in Phase 0 research)
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- [x] research.md (4 research questions resolved)
- [x] data-model.md (4 entities defined)
- [x] contracts/lexicon-endpoint-contract.md (API contract spec)
- [x] contracts/tests/lexicon-endpoint.test.ts (11 failing contract tests)
- [x] contracts/tests/lexicon-caching.test.ts (10 failing caching tests)
- [x] quickstart.md (7-step manual validation guide)
- [x] CLAUDE.md (updated with lexicon publication context)

---
*Based on project structure analysis and AT Protocol specifications*
