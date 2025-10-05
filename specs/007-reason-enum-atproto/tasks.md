# Tasks: Moderation Reason Enum (Privacy-Focused)

**Input**: Design documents from `/workspaces/atrarium/specs/007-reason-enum-atproto/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Loaded: TypeScript 5.7, React 19, Hono 4.6.14, Zod 3.23.8
   ✓ Structure: Web app (backend + frontend)
2. Load optional design documents:
   ✓ data-model.md: ModerationReason enum (17 values)
   ✓ contracts/: Lexicon schema + test template
   ✓ research.md: All decisions resolved
3. Generate tasks by category:
   ✓ Setup: TypeScript types, Zod schemas
   ✓ Tests: Contract tests (1 file), component tests (2 files)
   ✓ Core: Backend validation, frontend components, i18n
   ✓ Integration: End-to-end moderation flow
   ✓ Polish: Documentation, cleanup
4. Apply task rules:
   ✓ Different files = mark [P] for parallel
   ✓ Same file = sequential (no [P])
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T020)
6. Generate dependency graph (below)
7. Create parallel execution examples (below)
8. Validate task completeness:
   ✓ All contracts have tests
   ✓ All entities have schemas
   ✓ All endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `/workspaces/atrarium/src/` (Cloudflare Workers)
- **Frontend**: `/workspaces/atrarium/dashboard/src/` (React)
- **Tests**: `/workspaces/atrarium/tests/` (backend), `/workspaces/atrarium/dashboard/tests/` (frontend)

---

## Phase 3.1: Setup (TypeScript Types & Validation)

**Goal**: Define ModerationReason enum and Zod schema for backend validation

- [x] **T001** [P] Add ModerationReason const array and type to `src/types.ts`
  - Export: `export const MODERATION_REASONS = [...] as const;`
  - Export: `export type ModerationReason = typeof MODERATION_REASONS[number];`
  - Exactly 17 enum values as documented in data-model.md
  - File: `/workspaces/atrarium/src/types.ts`

- [x] **T002** [P] Add ModerationReason Zod schema to `src/schemas/validation.ts`
  - Import MODERATION_REASONS from `src/types.ts`
  - Export: `export const moderationReasonSchema = z.enum(MODERATION_REASONS).optional();`
  - Update `moderationActionSchema` to use `moderationReasonSchema` for `reason` field
  - File: `/workspaces/atrarium/src/schemas/validation.ts`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

- [x] **T003** [P] Contract test: Enum validation for all 4 moderation endpoints in `tests/contract/moderation/moderation-reason-enum.test.ts`
  - Write failing tests based on template: `specs/007-reason-enum-atproto/contracts/tests/moderation-reason-enum.test.ts`
  - Test cases:
    - Accept all 17 valid enum values (spam, low_quality, ..., other)
    - Accept omitted reason (optional field)
    - Accept empty string reason
    - Reject invalid enum values (400 Bad Request)
    - Reject free-text reason (400 Bad Request)
    - Reject PII (email, phone) - caught by enum validation
    - Reject typos/wrong case (e.g., "SPAM", "spamm")
  - Test all 4 endpoints: POST /api/moderation/hide-post, unhide-post, block-user, unblock-user
  - Verify error message format: "Invalid reason. Must be one of: ..."
  - File: `/workspaces/atrarium/tests/contract/moderation/moderation-reason-enum.test.ts`

- [x] **T004** [P] Component test: ModerationReasonSelect component in `dashboard/tests/components/moderation/ModerationReasonSelect.test.tsx`
  - Test dropdown renders all 17 options
  - Test labels are translated correctly (EN + JA)
  - Test selection updates parent state
  - Test keyboard navigation (ArrowDown, Enter)
  - Test default placeholder text
  - File: `/workspaces/atrarium/dashboard/tests/components/moderation/ModerationReasonSelect.test.tsx`

- [x] **T005** [P] Integration test: End-to-end moderation with enum reason in `tests/integration/moderation-reason-flow.test.ts`
  - Based on quickstart.md scenario (Alice hides Bob's spam post)
  - Test flow: Select "spam" → API call → PDS write → Feed update
  - Verify PDS record contains enum value `"spam"`
  - Verify moderation log displays translated label "スパム投稿"
  - Verify backward compatibility (read old free-text reason)
  - File: `/workspaces/atrarium/tests/integration/moderation-reason-flow.test.ts`

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend

- [x] **T006** Update `validateModerationReason()` in `src/routes/moderation.ts` to use enum validation
  - Replace 83 lines of regex-based PII validation (lines 30-84)
  - New implementation (~10 lines):
    ```typescript
    function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
      if (!reason || reason.trim() === '') {
        return { valid: true }; // Optional field
      }
      if (!MODERATION_REASONS.includes(reason as ModerationReason)) {
        return {
          valid: false,
          error: `Invalid reason. Must be one of: ${MODERATION_REASONS.join(', ')}`,
        };
      }
      return { valid: true };
    }
    ```
  - Import MODERATION_REASONS from `src/types.ts`
  - File: `/workspaces/atrarium/src/routes/moderation.ts`
  - **Dependency**: T001, T002 (requires enum definition)

- [x] **T007** Verify enum validation in all 4 moderation endpoints (`src/routes/moderation.ts`)
  - POST /api/moderation/hide-post (line 91)
  - POST /api/moderation/unhide-post
  - POST /api/moderation/block-user
  - POST /api/moderation/unblock-user
  - Ensure all call `validateModerationReason(reason)` and return 400 if invalid
  - File: `/workspaces/atrarium/src/routes/moderation.ts`
  - **Dependency**: T006 (same file, sequential)

### Frontend - i18n Labels

- [x] **T008** [P] Add English reason labels to `dashboard/src/i18n/locales/en/moderation.json`
  - Create file if not exists (currently no moderation.json)
  - Add nested structure:
    ```json
    {
      "selectReason": "Select reason (optional)",
      "reasons": {
        "spam": "Spam post",
        "low_quality": "Low-quality content",
        ... // All 17 labels from data-model.md
      }
    }
    ```
  - File: `/workspaces/atrarium/dashboard/src/i18n/locales/en/moderation.json`

- [x] **T009** [P] Add Japanese reason labels to `dashboard/src/i18n/locales/ja/moderation.json`
  - Create file if not exists
  - Add nested structure with Japanese translations:
    ```json
    {
      "selectReason": "理由を選択（任意）",
      "reasons": {
        "spam": "スパム投稿",
        "low_quality": "低品質コンテンツ",
        ... // All 17 labels from data-model.md
      }
    }
    ```
  - File: `/workspaces/atrarium/dashboard/src/i18n/locales/ja/moderation.json`

### Frontend - Components

- [x] **T010** Copy ModerationReason type to frontend (`dashboard/src/lib/moderation.ts`)
  - Create new file `dashboard/src/lib/moderation.ts`
  - Export: `export const MODERATION_REASONS = [...] as const;` (same 17 values)
  - Export: `export type ModerationReason = typeof MODERATION_REASONS[number];`
  - File: `/workspaces/atrarium/dashboard/src/lib/moderation.ts`
  - **Note**: Duplicates backend type (frontend has no direct access to backend src/)

- [x] **T011** Create ModerationReasonSelect component (`dashboard/src/components/moderation/ModerationReasonSelect.tsx`)
  - Use shadcn/ui `<Select>` component
  - Import MODERATION_REASONS from `@/lib/moderation`
  - Use i18next for labels: `t('moderation.reasons.${reason}')`
  - Props: `{ value?: ModerationReason; onChange: (value: ModerationReason) => void }`
  - Render 17 options with translated labels
  - File: `/workspaces/atrarium/dashboard/src/components/moderation/ModerationReasonSelect.tsx`
  - **Dependency**: T008, T009, T010 (requires i18n labels + enum)

- [x] **T012** Update ModerationActions component to include reason dropdown (`dashboard/src/components/moderation/ModerationActions.tsx`)
  - Import `<ModerationReasonSelect>` from `./ModerationReasonSelect`
  - Add state: `const [reason, setReason] = useState<ModerationReason>();`
  - Add `<ModerationReasonSelect value={reason} onChange={setReason} />` to hide/block dialogs
  - Pass `reason` to `onHide()`, `onBlockUser()` callbacks
  - File: `/workspaces/atrarium/dashboard/src/components/moderation/ModerationActions.tsx`
  - **Dependency**: T011 (requires ModerationReasonSelect component)

---

## Phase 3.4: Integration & Verification

- [x] **T013** Run contract tests and verify they pass (`tests/contract/moderation/moderation-reason-enum.test.ts`)
  - Command: `npx vitest run tests/contract/moderation/moderation-reason-enum.test.ts`
  - Expect: All tests PASS (previously failing in T003)
  - Verify: 400 Bad Request for invalid enum values
  - Verify: 200 OK for all 17 valid enum values
  - **Dependency**: T006, T007 (requires backend implementation)

- [x] **T014** Run component tests and verify they pass (`dashboard/tests/components/moderation/ModerationReasonSelect.test.tsx`)
  - Command: `cd dashboard && npm test -- ModerationReasonSelect.test.tsx`
  - Expect: All tests PASS (previously failing in T004)
  - Verify: Dropdown renders 17 options
  - Verify: Labels translated correctly (EN/JA)
  - **Dependency**: T011 (requires component implementation)

- [x] **T015** Run integration test and verify full flow (`tests/integration/moderation-reason-flow.test.ts`)
  - Command: `npx vitest run tests/integration/moderation-reason-flow.test.ts`
  - Expect: End-to-end flow passes (Alice hides Bob's post with "spam" reason)
  - Verify: PDS record contains `reason: "spam"`
  - Verify: Moderation log displays "スパム投稿"
  - **Dependency**: T006, T007, T011, T012 (requires full stack)

- [x] **T016** Manual testing with local PDS (follow quickstart.md scenario)
  - Start local PDS in DevContainer
  - Login as Alice (moderator)
  - Navigate to Anime Community feed
  - Click "Hide" on Bob's spam post
  - Select "スパム投稿" from dropdown
  - Verify post hidden from feed
  - Verify moderation log entry
  - **Dependency**: T012 (requires UI implementation)

---

## Phase 3.5: Polish & Documentation

- [x] **T017** [P] Update VitePress documentation (`docs/en/reference/moderation-reasons.md` already exists)
  - Verify all 17 reasons documented with examples
  - Add usage examples for moderators
  - Add screenshots of dropdown UI
  - File: `/workspaces/atrarium/docs/en/reference/moderation-reasons.md`

- [x] **T018** [P] Update Japanese VitePress documentation (`docs/ja/reference/moderation-reasons.md` already exists)
  - Verify translation parity with English version
  - Add Japanese screenshots
  - File: `/workspaces/atrarium/docs/ja/reference/moderation-reasons.md`

- [x] **T019** [P] Update dashboard README.md with new moderation reason workflow
  - Add section: "Moderation Reason Selection (Enum-Based)"
  - Document dropdown UI
  - Explain external notes workflow (Discord)
  - File: `/workspaces/atrarium/dashboard/README.md`

- [x] **T020** Remove old PII validation tests (`tests/unit/moderation-reason-validation.test.ts`)
  - Delete or update unit tests that tested regex-based PII detection
  - Replace with enum validation tests (if needed, may already be covered by T003)
  - File: `/workspaces/atrarium/tests/unit/moderation-reason-validation.test.ts`
  - **Dependency**: T013 (ensure contract tests pass first)

---

## Dependencies

### Sequential Dependencies (must run in order)
- T001, T002 → T006 (backend enum → backend validation)
- T006 → T007 (validateModerationReason → endpoint verification)
- T008, T009, T010 → T011 (i18n + enum → component)
- T011 → T012 (component → integration)
- T006, T007 → T013 (backend → contract tests pass)
- T011 → T014 (component → component tests pass)
- T006, T007, T011, T012 → T015 (full stack → integration test)
- T012 → T016 (UI → manual testing)
- T013 → T020 (contract tests pass → cleanup old tests)

### Parallel Groups (can run together)
- **Group A (Setup)**: T001, T002
- **Group B (Test Writing)**: T003, T004, T005 (after Group A)
- **Group C (i18n)**: T008, T009, T010 (after Group A)
- **Group D (Documentation)**: T017, T018, T019 (after implementation)

---

## Parallel Execution Examples

### Example 1: Setup Phase
```bash
# Launch T001 and T002 together (different files)
Task: "Add ModerationReason const array and type to src/types.ts"
Task: "Add ModerationReason Zod schema to src/schemas/validation.ts"
```

### Example 2: Test Writing Phase (TDD)
```bash
# Launch T003, T004, T005 together (different files)
Task: "Contract test: Enum validation for all 4 moderation endpoints in tests/contract/moderation/moderation-reason-enum.test.ts"
Task: "Component test: ModerationReasonSelect component in dashboard/tests/components/moderation/ModerationReasonSelect.test.tsx"
Task: "Integration test: End-to-end moderation with enum reason in tests/integration/moderation-reason-flow.test.ts"
```

### Example 3: i18n + Frontend Setup
```bash
# Launch T008, T009, T010 together (different files)
Task: "Add English reason labels to dashboard/src/i18n/locales/en/moderation.json"
Task: "Add Japanese reason labels to dashboard/src/i18n/locales/ja/moderation.json"
Task: "Copy ModerationReason type to frontend (dashboard/src/lib/moderation.ts)"
```

### Example 4: Documentation Phase
```bash
# Launch T017, T018, T019 together (different files)
Task: "Update VitePress documentation (docs/en/reference/moderation-reasons.md)"
Task: "Update Japanese VitePress documentation (docs/ja/reference/moderation-reasons.md)"
Task: "Update dashboard README.md with new moderation reason workflow"
```

---

## Notes

### TDD Workflow
1. **Phase 3.2**: Write failing tests (T003-T005)
2. **Phase 3.3**: Implement code to make tests pass (T006-T012)
3. **Phase 3.4**: Verify tests pass (T013-T016)
4. **Phase 3.5**: Polish and document (T017-T020)

### File Changes Summary
- **Backend (src/)**: 2 files
  - `src/types.ts` (T001) - Add enum
  - `src/schemas/validation.ts` (T002) - Add Zod schema
  - `src/routes/moderation.ts` (T006, T007) - Update validation
- **Frontend (dashboard/src/)**: 5 files
  - `dashboard/src/i18n/locales/en/moderation.json` (T008) - NEW
  - `dashboard/src/i18n/locales/ja/moderation.json` (T009) - NEW
  - `dashboard/src/lib/moderation.ts` (T010) - NEW
  - `dashboard/src/components/moderation/ModerationReasonSelect.tsx` (T011) - NEW
  - `dashboard/src/components/moderation/ModerationActions.tsx` (T012) - UPDATE
- **Tests**: 3 files
  - `tests/contract/moderation/moderation-reason-enum.test.ts` (T003) - NEW
  - `dashboard/tests/components/moderation/ModerationReasonSelect.test.tsx` (T004) - NEW
  - `tests/integration/moderation-reason-flow.test.ts` (T005) - NEW
- **Documentation**: 3 files (already exist, update only)

### Code Simplification
- **Before**: 83 lines of regex PII validation
- **After**: 10 lines of enum validation
- **Performance**: 10-20x faster (<1ms vs 10-20ms)

### Privacy Protection
- ✅ **Zero privacy risk**: No free-text input possible
- ✅ **Enum-only validation**: PII cannot be submitted
- ✅ **External notes workflow**: Discord for detailed internal context

---

## Validation Checklist
*GATE: Checked before marking tasks.md complete*

- [x] All contracts have corresponding tests (T003)
- [x] All entities have schemas (T001, T002)
- [x] All tests come before implementation (T003-T005 → T006-T012)
- [x] Parallel tasks truly independent (T001+T002, T008+T009+T010, T017+T018+T019)
- [x] Each task specifies exact file path (all tasks include absolute paths)
- [x] No task modifies same file as another [P] task (verified)

---

## Success Criteria

### Functional
- [ ] All 17 enum values accepted by API
- [ ] Invalid enum values rejected with 400 Bad Request
- [ ] Dropdown shows all 17 options with correct labels
- [ ] Reason stored in PDS as enum value (not label)
- [ ] Moderation log displays translated labels

### Privacy
- [ ] No free-text input possible in UI
- [ ] Backend rejects non-enum values
- [ ] PII cannot be submitted via reason field

### Performance
- [ ] Enum validation <1ms (measured in T003)
- [ ] No API latency increase
- [ ] Frontend bundle size increase <2KB

### Backward Compatibility
- [ ] Old free-text reasons display correctly (T005)
- [ ] New actions enforce enum-only (T003)
- [ ] No breaking changes for existing PDS records

---

**Total Tasks**: 20 (T001-T020)
**Estimated Completion Time**: 6-8 hours (assuming serial execution)
**Parallel Execution Time**: 3-4 hours (with 4 parallel groups)

**Ready for Implementation**: All design artifacts complete, no blockers.
