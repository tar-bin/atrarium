# Implementation Plan: Moderation Reason Enum (Privacy-Focused)

**Branch**: `007-reason-enum-atproto` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/007-reason-enum-atproto/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Project Type: web (backend + frontend)
   ✓ All technical details resolved from existing codebase
3. Fill the Constitution Check section
   ✓ No constitution file exists - using project conventions from CLAUDE.md
4. Evaluate Constitution Check section
   ✓ No violations - simple enum change following existing patterns
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   ✓ No unknowns - enum pattern already documented in proposal
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   ✓ Generating design artifacts
7. Re-evaluate Constitution Check section
   ✓ No new violations
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   ✓ TDD approach: Lexicon schema → backend validation → UI dropdown
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Replace free-text `reason` field in `net.atrarium.moderation.action` Lexicon schema with a predefined enum of 17 standardized moderation reasons. This eliminates privacy risks (PII/confidential data leakage) in public PDS records.

**Technical Approach**:
- Update AT Protocol Lexicon schema with enum constraint
- Replace regex-based PII validation with enum-only validation in backend
- Update Dashboard UI to use dropdown/select component instead of text input
- Add bilingual (EN/JA) labels for all 17 reason values in i18n files
- Document external system (Discord) workaround for detailed internal notes

## Technical Context

**Language/Version**: TypeScript 5.7, React 19  
**Primary Dependencies**: Hono 4.6.14, Zod 3.23.8, @atproto/api 0.13.35, TanStack Router v1, shadcn/ui  
**Storage**: AT Protocol PDS (public records), Durable Objects Storage (feed cache)  
**Testing**: Vitest with @cloudflare/vitest-pool-workers, Testing Library (React components)  
**Target Platform**: Cloudflare Workers (backend), Cloudflare Pages (frontend)  
**Project Type**: web (backend + frontend)  
**Performance Goals**: API response <100ms (p95), no additional latency vs current implementation  
**Constraints**: Enum values must match AT Protocol Lexicon spec, backward compatibility for existing free-text reasons (read-only)  
**Scale/Scope**: 17 enum values, 4 moderation endpoints, 1 UI component, 2 i18n files (EN/JA)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*No constitution file found. Following existing project conventions from CLAUDE.md.*

**Project Principles (Derived from CLAUDE.md)**:
- ✅ **PDS-first architecture**: Changes only affect Lexicon schema and validation (no new storage)
- ✅ **Simplicity**: Enum-based validation is simpler than regex PII detection
- ✅ **Privacy-by-design**: Eliminates input-based privacy risks entirely
- ✅ **Existing patterns**: Follows established Lexicon validation approach (see `src/schemas/lexicon.ts`)

**Validation**:
- ✅ No new dependencies introduced: PASS (uses existing Zod, i18next)
- ✅ No new storage layers: PASS (enum values in code, labels in i18n)
- ✅ Follows AT Protocol patterns: PASS (enum in Lexicon schema is standard)
- ✅ Maintains backward compatibility: PASS (existing records remain valid)

## Project Structure

### Documentation (this feature)
```
specs/007-reason-enum-atproto/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (✓ complete)
├── research.md          # Phase 0 output (/plan command) - will generate
├── data-model.md        # Phase 1 output (/plan command) - will generate
├── quickstart.md        # Phase 1 output (/plan command) - will generate
├── contracts/           # Phase 1 output (/plan command) - will generate
│   ├── lexicon/
│   │   └── net.atrarium.moderation.action.json  # Updated Lexicon schema
│   └── tests/
│       └── moderation-reason-validation.test.ts  # Enum validation tests
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

**Backend (Cloudflare Workers)**:
```
src/
├── routes/
│   └── moderation.ts             # UPDATE: Replace validateModerationReason() with enum check
├── schemas/
│   └── lexicon.ts                # UPDATE: Add ModerationReason enum type + Zod schema
└── types.ts                      # UPDATE: Export ModerationReason const array

specs/006-pds-1-db/contracts/lexicon/
└── net.atrarium.moderation.action.json  # UPDATE: Change reason from string to enum
```

**Frontend (React Dashboard)**:
```
dashboard/src/
├── components/
│   └── moderation/
│       ├── ModerationActions.tsx         # UPDATE: Add reason dropdown to dialog
│       └── ModerationReasonSelect.tsx    # NEW: Reusable reason select component
├── lib/
│   └── moderation.ts                     # NEW: ModerationReason const + type
└── i18n/locales/
    ├── en/moderation.json                # UPDATE: Add reason labels
    └── ja/moderation.json                # UPDATE: Add reason labels
```

**Tests**:
```
tests/
├── contract/
│   └── moderation-reason-enum.test.ts    # NEW: API contract tests for enum validation
├── integration/
│   └── moderation-with-reason.test.ts    # UPDATE: Add reason selection scenarios
└── unit/
    └── moderation-reason-validation.test.ts  # UPDATE: Replace regex tests with enum tests

dashboard/tests/components/
└── moderation/
    └── ModerationReasonSelect.test.ts    # NEW: React component tests
```

**Structure Decision**: Web application (backend + frontend). Backend changes in `src/routes/moderation.ts` and `src/schemas/lexicon.ts`. Frontend changes in `dashboard/src/components/moderation/`. Tests follow existing structure (`tests/contract/`, `tests/integration/`, `dashboard/tests/components/`).

## Phase 0: Outline & Research

**Research Status**: ✅ COMPLETE (no unknowns detected)

All technical details are resolved from existing codebase and prior design work:

1. **Enum pattern in AT Protocol Lexicon** ✅
   - Decision: Use standard AT Protocol enum syntax in JSON schema
   - Rationale: AT Protocol Lexicon supports enum constraints natively
   - Reference: Existing Lexicon schemas in `specs/006-pds-1-db/contracts/lexicon/`

2. **Enum validation in TypeScript** ✅
   - Decision: Use `const` array + `typeof` for type inference
   - Rationale: Zod `z.enum()` requires tuple type, const assertion provides this
   - Reference: Existing validation patterns in `src/schemas/validation.ts`

3. **React dropdown component** ✅
   - Decision: Use shadcn/ui `<Select>` component (already in project)
   - Rationale: Consistent with existing UI patterns (see `dashboard/src/components/ui/`)
   - Reference: Existing select usage in `dashboard/src/components/feeds/`

4. **i18n for enum labels** ✅
   - Decision: Store labels in `i18n/locales/{lang}/moderation.json`
   - Rationale: Follows existing i18n structure (see `dashboard/src/i18n/`)
   - Reference: Existing translation files in `dashboard/src/i18n/locales/`

5. **Backward compatibility** ✅
   - Decision: Accept existing free-text reasons (read-only), enforce enum for new actions
   - Rationale: Existing PDS records are immutable, cannot retroactively change
   - Reference: AT Protocol immutability constraints

**Output**: See [research.md](./research.md) (generating next)

## Phase 1: Design & Contracts

### Data Model

**ModerationReason Enum**:
```typescript
const MODERATION_REASONS = [
  'spam',
  'low_quality',
  'duplicate',
  'off_topic',
  'wrong_community',
  'guidelines_violation',
  'terms_violation',
  'copyright',
  'harassment',
  'hate_speech',
  'violence',
  'nsfw',
  'illegal_content',
  'bot_activity',
  'impersonation',
  'ban_evasion',
  'other',
] as const;

type ModerationReason = typeof MODERATION_REASONS[number];
```

**ModerationAction (Updated)**:
- Schema: `net.atrarium.moderation.action`
- Field Change: `reason?: string` → `reason?: ModerationReason`
- Validation: Zod schema `z.enum(MODERATION_REASONS).optional()`

**i18n Labels** (17 × 2 languages = 34 labels):
```json
{
  "moderation": {
    "reasons": {
      "spam": "Spam post",
      "low_quality": "Low-quality content",
      "duplicate": "Duplicate post"
      // ... 14 more
    }
  }
}
```

### API Contracts

**Endpoint**: `POST /api/moderation/hide-post`

**Request Body (Updated)**:
```json
{
  "postUri": "at://did:plc:alice/app.bsky.feed.post/3jzfcijpj2z2a",
  "communityId": "anime-community",
  "reason": "spam"  // CHANGED: Must be one of 17 enum values
}
```

**Validation Rules**:
- `reason` must be in `MODERATION_REASONS` array (if provided)
- Return 400 with error message if invalid enum value
- Remove existing regex-based PII validation (no longer needed)

**Response Codes**:
- 200: Success (unchanged)
- 400: Invalid reason (new error case)
- 401: Unauthorized (unchanged)
- 500: Server error (unchanged)

**Output**: See [contracts/](./contracts/) and [data-model.md](./data-model.md) (generating next)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 contracts and data model
3. Follow TDD order: Tests → Implementation → UI

**Ordering Logic**:

**Phase A: Backend Schema & Validation** (TDD)
- T001 [P]: Write contract test for enum validation (fail)
- T002 [P]: Update Lexicon schema with enum
- T003 [P]: Add ModerationReason const + Zod schema to `src/schemas/lexicon.ts`
- T004: Update `validateModerationReason()` in `src/routes/moderation.ts` (enum check only)
- T005: Run contract tests (should pass)
- T006 [P]: Update unit tests (remove regex tests, add enum tests)

**Phase B: Frontend i18n & Components** (parallel with A after T003)
- T007 [P]: Add reason labels to `dashboard/src/i18n/locales/en/moderation.json`
- T008 [P]: Add reason labels to `dashboard/src/i18n/locales/ja/moderation.json`
- T009 [P]: Write component test for `ModerationReasonSelect` (fail)
- T010: Create `ModerationReasonSelect.tsx` component (shadcn/ui Select)
- T011: Update `ModerationActions.tsx` to use dropdown
- T012: Run component tests (should pass)

**Phase C: Integration & Documentation**
- T013: Write integration test for full moderation flow with reason (fail)
- T014: Run integration test (should pass after T004 + T011)
- T015: Update documentation (`dashboard/README.md`, VitePress docs)
- T016: Update quickstart scenario

**Estimated Output**: 16 numbered, ordered tasks in `tasks.md`

**Parallelization**:
- Tasks marked [P] are parallelizable (independent files)
- Phase A and Phase B can overlap after T003 (backend enum definition)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following TDD approach)  
**Phase 5**: Validation (run all tests, verify quickstart scenario, check i18n completeness)

**Post-Implementation**:
- Remove deprecated `validateModerationReason()` regex logic
- Archive design proposal (`specs/006-pds-1-db/design/moderation-reason-enum-proposal.md`) → reference in completion summary

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No complexity deviations** - this is a simplification that removes regex validation complexity.

| Aspect | Current (Before) | After This Feature |
|--------|------------------|-------------------|
| Validation Logic | 83 lines regex-based PII detection | ~10 lines enum check |
| Privacy Risk | Medium (regex can't catch all PII) | Zero (no free-text input) |
| i18n Support | Not implemented for reasons | Fully localized (EN/JA) |
| Consistency | Free-text (inconsistent) | 17 standardized reasons |

**Justification for Enum Approach**:
- **Simpler**: Removes complex regex patterns
- **Safer**: Eliminates input-based privacy risks
- **Standard**: Follows AT Protocol Lexicon enum pattern
- **Extensible**: Easy to add new reasons (append to array)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - no unknowns detected
- [x] Phase 1: Design complete (/plan command) - all artifacts generated
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations, simplifies codebase)
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (none detected)
- [x] Complexity deviations documented (N/A - simplification)

---

**Completed Artifacts**:
1. ✅ `research.md` - All technical decisions documented
2. ✅ `data-model.md` - Enum definition, Lexicon schema, validation rules
3. ✅ `contracts/lexicon/net.atrarium.moderation.action.json` - Updated Lexicon schema with enum
4. ✅ `contracts/tests/moderation-reason-enum.test.ts` - Contract test template (TDD)
5. ✅ `quickstart.md` - End-to-end user scenario (Alice-Bob moderation flow)
6. ✅ `CLAUDE.md` - Agent context updated with enum pattern

**Ready for /tasks command**:
- All design artifacts complete
- No blockers or unknowns
- Awaiting task generation for implementation

*Based on project conventions from CLAUDE.md (no constitution file)*
