# Tasks: AT Protocol Lexicon Publication

**Feature**: 010-lexicon
**Input**: Design documents from `/workspaces/atrarium/specs/010-lexicon/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Status
```
Phase 0: Planning → ✅ COMPLETE (spec.md, plan.md created)
Phase 1: Research → ✅ COMPLETE (research.md, data-model.md created)
Phase 2: Contracts → ✅ COMPLETE (21 failing tests created)
Phase 3: Implementation → 🚧 IN PROGRESS (tasks execution)
Phase 4: Validation → ⏳ PENDING
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root `/workspaces/atrarium/`

---

## Phase 3.1: Setup & Dependencies

### T001: Create Lexicon directory structure
**Files**: `src/lexicons/` (new directory)
**Description**: Create `src/lexicons/` directory to store Lexicon JSON schemas.
```bash
mkdir -p /workspaces/atrarium/src/lexicons
```

### T002: Copy Lexicon JSON schemas from specs
**Files**: `src/lexicons/*.json` (3 files)
**Dependencies**: T001
**Description**: Copy 3 Lexicon JSON schemas from `specs/006-pds-1-db/contracts/lexicon/` to `src/lexicons/`:
- `net.atrarium.community.config.json`
- `net.atrarium.community.membership.json`
- `net.atrarium.moderation.action.json`

Verify each JSON has `$type: "com.atproto.lexicon.schema"` field.

### T003: Install @atproto/lex-cli dependency
**Files**: `package.json`, `package-lock.json`
**Dependencies**: None
**Description**: Add `@atproto/lex-cli` as dev dependency:
```bash
npm install --save-dev @atproto/lex-cli
```
Pin version to avoid breaking changes (e.g., `^0.9.1`).

### T004: Configure TypeScript codegen npm script
**Files**: `package.json`
**Dependencies**: T003
**Description**: Add npm script for TypeScript code generation:
```json
"scripts": {
  "codegen": "lex-cli gen-api src/schemas/generated/ src/lexicons/*.json"
}
```

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T005: [P] Move contract test: Lexicon endpoint accessibility
**Files**: `tests/contract/lexicon/lexicon-endpoint.test.ts` (new file)
**Dependencies**: None
**Description**: Move pre-written contract test from `specs/010-lexicon/contracts/tests/lexicon-endpoint.test.ts` to `tests/contract/lexicon/lexicon-endpoint.test.ts`.

Create directory:
```bash
mkdir -p /workspaces/atrarium/tests/contract/lexicon
```

Update import paths if needed to match project structure. Verify test FAILS (expected: no implementation yet).

### T006: [P] Move contract test: Lexicon caching behavior
**Files**: `tests/contract/lexicon/lexicon-caching.test.ts` (new file)
**Dependencies**: None
**Description**: Move pre-written contract test from `specs/010-lexicon/contracts/tests/lexicon-caching.test.ts` to `tests/contract/lexicon/lexicon-caching.test.ts`.

Update import paths if needed. Verify test FAILS (expected: no implementation yet).

### T007: [P] Write integration test: Lexicon publication end-to-end
**Files**: `tests/integration/lexicon-publication.test.ts` (new file)
**Dependencies**: None
**Description**: Write integration test simulating PDS workflow:
1. Fetch `net.atrarium.community.config` schema
2. Validate JSON structure (AT Protocol Lexicon format)
3. Verify ETag and Cache-Control headers
4. Test conditional request (If-None-Match → 304)

Reference: `specs/010-lexicon/quickstart.md` steps 1-3.

Test MUST FAIL initially.

### T008: [P] Write unit test: TypeScript codegen validation
**Files**: `tests/unit/lexicon-codegen.test.ts` (new file)
**Dependencies**: None
**Description**: Write unit test to verify:
1. Generated TypeScript files exist in `src/schemas/generated/`
2. Generated types match Lexicon JSON structure
3. No TypeScript compilation errors (`tsc --noEmit`)

Test MUST FAIL initially (no generated files yet).

---

## Phase 3.3: Code Generation (ONLY after tests are failing)

### T009: Run TypeScript code generation
**Files**: `src/schemas/generated/*.ts` (auto-generated)
**Dependencies**: T004, T005, T006, T007, T008 (all tests failing)
**Description**: Execute TypeScript code generation from Lexicon JSON schemas:
```bash
npm run codegen
```

Expected output:
- `src/schemas/generated/` directory with TypeScript files
- Type definitions for all 3 Lexicon schemas

Commit generated files to Git (per FR-012: build reproducibility).

### T010: Verify generated types pass unit test
**Files**: `tests/unit/lexicon-codegen.test.ts`
**Dependencies**: T009
**Description**: Run T008 unit test to verify generated TypeScript types:
```bash
npx vitest run tests/unit/lexicon-codegen.test.ts
```

Expected: Test PASSES (generated files exist and compile).

---

## Phase 3.4: Core Implementation

### T011: Create Lexicon route handler
**Files**: `src/routes/lexicon.ts` (new file)
**Dependencies**: T002, T009
**Description**: Create Hono route handler for Lexicon endpoints:

**Functionality**:
- Import 3 Lexicon JSON schemas from `src/lexicons/`
- Implement `GET /xrpc/net.atrarium.lexicon.get?nsid={nsid}`
- Parse `nsid` query parameter
- Return matching schema or 404 if not found
- Generate ETag using SHA-256 content hash (first 16 hex chars)
- Handle conditional requests (If-None-Match → 304 Not Modified)
- Set headers:
  - `Content-Type: application/json`
  - `ETag: "<hash>"`
  - `Cache-Control: public, max-age=3600` (beta period)
  - `Access-Control-Allow-Origin: *`

Reference implementation from `specs/010-lexicon/research.md` section 3-4.

### T012: Add CORS preflight handler
**Files**: `src/routes/lexicon.ts`
**Dependencies**: T011
**Description**: Add OPTIONS handler for CORS preflight:
```typescript
app.options('/xrpc/net.atrarium.lexicon.get', (c) => {
  return c.text('', 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'If-None-Match',
    'Access-Control-Max-Age': '86400',
  });
});
```

### T013: Integrate Lexicon routes into main router
**Files**: `src/router.ts`
**Dependencies**: T011
**Description**: Update oRPC router to include Lexicon routes:
- Import `src/routes/lexicon.ts` handler
- Add route to router configuration
- Ensure no authentication middleware applied (public endpoint per FR-004)

### T014: Verify contract tests pass
**Files**: `tests/contract/lexicon/*.test.ts`
**Dependencies**: T011, T012, T013
**Description**: Run contract tests to verify implementation:
```bash
npx vitest run tests/contract/lexicon/
```

Expected: All 21 contract tests PASS.

If failing:
- Check ETag generation algorithm (SHA-256, stable)
- Verify CORS headers match contract
- Check 304 response has no body

---

## Phase 3.5: Integration & Polish

### T015: [P] Verify integration test passes
**Files**: `tests/integration/lexicon-publication.test.ts`
**Dependencies**: T014
**Description**: Run integration test:
```bash
npx vitest run tests/integration/lexicon-publication.test.ts
```

Expected: Integration test PASSES (end-to-end Lexicon publication works).

### T016: [P] Update CLAUDE.md with Lexicon context
**Files**: `CLAUDE.md`
**Dependencies**: None (already updated in Phase 1)
**Description**: Verify CLAUDE.md includes:
- Lexicon publication endpoints (`/xrpc/net.atrarium.lexicon.get`)
- `src/lexicons/` directory as single source of truth
- ETag caching strategy (beta: 1 hour, stable: 24 hours)
- TypeScript codegen workflow (`npm run codegen`)

Already updated via `.specify/scripts/bash/update-agent-context.sh` - verify changes committed.

### T017: [P] Add Lexicon codegen to CI/CD workflow
**Files**: `.github/workflows/*.yml` (if exists) or document in README
**Dependencies**: T004
**Description**: Ensure TypeScript codegen runs in CI:
- Add `npm run codegen` to build pipeline
- Verify generated files are committed (fail if uncommitted changes detected)

If no CI workflow exists, document manual verification in README:
```markdown
## Development Workflow
1. Edit Lexicon JSON schemas in `src/lexicons/`
2. Run `npm run codegen` to regenerate TypeScript types
3. Commit generated files to Git
```

### T018: Execute manual quickstart validation
**Files**: `specs/010-lexicon/quickstart.md`
**Dependencies**: T014, T015
**Description**: Execute all 7 steps from `specs/010-lexicon/quickstart.md` manually:
1. Fetch Community Config schema via curl
2. Validate JSON structure
3. Test HTTP caching (ETag + 304)
4. Test all 3 schemas
5. Test error handling (404)
6. Test CORS preflight
7. Measure response time (p95 < 100ms)

Document results in `specs/010-lexicon/quickstart-results.md`.

### T019: Performance validation (p95 < 100ms)
**Files**: `tests/contract/lexicon/lexicon-caching.test.ts`
**Dependencies**: T014
**Description**: Run performance test from contract test:
```bash
npx vitest run tests/contract/lexicon/lexicon-caching.test.ts -t "should respond in less than 100ms"
```

Expected: p95 response time < 100ms (per NFR-002).

If failing:
- Check ETag generation overhead
- Verify Cloudflare Workers caching active
- Profile request handling

### T020: [P] Update documentation
**Files**: `README.md`, `CLAUDE.md`
**Dependencies**: T018
**Description**: Update project documentation:

**README.md**:
- Add section "Lexicon Publication" explaining schema availability
- Document `npm run codegen` workflow
- Link to `specs/010-lexicon/quickstart.md` for testing

**CLAUDE.md** (verify):
- Lexicon schemas location (`src/lexicons/`)
- Codegen command
- Endpoint URL pattern

---

## Phase 3.6: Final Validation

### T021: Run all tests
**Files**: N/A (test execution)
**Dependencies**: T014, T015, T019
**Description**: Run full test suite to ensure no regressions:
```bash
npm test
```

Expected: All tests PASS (including new Lexicon tests + existing tests).

### T022: Deploy to staging and verify
**Files**: N/A (deployment)
**Dependencies**: T021
**Description**: Deploy to Cloudflare Workers staging environment:
```bash
npm run deploy
```

Verify Lexicon endpoint accessible from external client:
```bash
curl https://atrarium-staging.example.com/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config
```

Expected:
- 200 OK response
- Valid JSON schema
- CORS headers present

---

## Dependencies Graph

```
T001 (mkdir) → T002 (copy JSON)
T003 (install lex-cli) → T004 (npm script)

T002 → T009 (codegen) → T010 (verify)
T004 → T009

T005, T006, T007, T008 (tests) → [GATE: tests must fail] → T009

T002, T009 → T011 (route handler)
T011 → T012 (CORS) → T013 (router) → T014 (contract tests)

T014 → T015 (integration test)
T014 → T019 (performance)

T014, T015 → T018 (quickstart)
T018 → T020 (docs)

T014, T015, T019 → T021 (all tests)
T021 → T022 (deploy)
```

---

## Parallel Execution Examples

### Phase 3.2: Contract Tests (all parallel)
```bash
# Launch T005-T008 together (different files, no dependencies):
npx vitest run tests/contract/lexicon/lexicon-endpoint.test.ts &
npx vitest run tests/contract/lexicon/lexicon-caching.test.ts &
npx vitest run tests/integration/lexicon-publication.test.ts &
npx vitest run tests/unit/lexicon-codegen.test.ts &
wait
```

### Phase 3.5: Polish (some parallel)
```bash
# T016, T017, T020 can run in parallel (different files):
# Update CLAUDE.md
vim CLAUDE.md &
# Update CI workflow
vim .github/workflows/test.yml &
# Update README
vim README.md &
wait
```

---

## Task Checklist

### Phase 3.1: Setup (4 tasks)
- [ ] T001: Create `src/lexicons/` directory
- [ ] T002: Copy 3 Lexicon JSON schemas
- [ ] T003: Install `@atproto/lex-cli`
- [ ] T004: Add `npm run codegen` script

### Phase 3.2: Tests First (4 tasks) ⚠️
- [ ] T005: [P] Move contract test: endpoint accessibility
- [ ] T006: [P] Move contract test: caching behavior
- [ ] T007: [P] Write integration test: end-to-end publication
- [ ] T008: [P] Write unit test: codegen validation

### Phase 3.3: Code Generation (2 tasks)
- [ ] T009: Run `npm run codegen`
- [ ] T010: Verify generated types pass unit test

### Phase 3.4: Core Implementation (4 tasks)
- [ ] T011: Create Lexicon route handler (`src/routes/lexicon.ts`)
- [ ] T012: Add CORS preflight handler
- [ ] T013: Integrate routes into main router
- [ ] T014: Verify contract tests pass (21 tests)

### Phase 3.5: Integration & Polish (6 tasks)
- [ ] T015: [P] Verify integration test passes
- [ ] T016: [P] Update CLAUDE.md (verify)
- [ ] T017: [P] Add codegen to CI/CD
- [ ] T018: Execute manual quickstart (7 steps)
- [ ] T019: Performance validation (p95 < 100ms)
- [ ] T020: [P] Update documentation (README, CLAUDE.md)

### Phase 3.6: Final Validation (2 tasks)
- [ ] T021: Run all tests (`npm test`)
- [ ] T022: Deploy to staging and verify

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [x] All contracts have corresponding tests (T005, T006)
- [x] All entities have model tasks (N/A - no database entities, only JSON files)
- [x] All tests come before implementation (T005-T008 before T011)
- [x] Parallel tasks truly independent (T005-T008, T015-T017, T020)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [ ] All 21 contract tests passing (after T014)
- [ ] Integration test passing (after T015)
- [ ] Performance test passing (after T019)
- [ ] Manual quickstart completed (after T018)
- [ ] Staging deployment verified (after T022)

---

**Total Tasks**: 22
**Estimated Time**: ~6-8 hours (including testing and documentation)
**Critical Path**: T001 → T002 → T009 → T011 → T013 → T014 → T021 → T022

**Next Step**: Start with Phase 3.1 (T001-T004) to set up directory structure and dependencies.
