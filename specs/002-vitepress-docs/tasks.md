# Tasks: VitePress Documentation Site

**Input**: Design documents from `/workspaces/atrarium/specs/002-vitepress-docs/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/navigation.md, contracts/i18n.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: VitePress, Vue 3, Node.js 18+
   → Structure: docs-site/ with en/, ja/ locales
2. Load optional design documents ✅
   → data-model.md: Documentation Page, Navigation, Locale entities
   → contracts/: navigation.md, i18n.md
   → research.md: VitePress decisions
3. Generate tasks by category ✅
   → Setup: VitePress init, dependencies
   → Tests: navigation, i18n parity, links, build
   → Core: content migration, i18n config
   → Integration: Cloudflare Pages deployment
   → Polish: documentation updates
4. Apply task rules ✅
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
   → All contracts have tests ✅
   → All migration targets covered ✅
9. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Documentation site**: `docs-site/` at repository root
- **English content**: `docs-site/en/`
- **Japanese content**: `docs-site/ja/`
- **Config**: `docs-site/.vitepress/`
- **Tests**: `tests/docs-site/`

## Phase 3.1: Setup & Initialization

- [x] **T001** [P] Initialize VitePress project structure at `docs-site/` with package.json, .vitepress/ directory, and basic folder structure (en/, ja/, public/)

- [x] **T002** [P] Install VitePress dependencies in `docs-site/package.json`: vitepress@^1.x, vue@^3.x

- [x] **T003** [P] Create base VitePress configuration file `docs-site/.vitepress/config.ts` with TypeScript setup (no locales yet)

- [x] **T004** [P] Configure npm scripts in `docs-site/package.json`: docs:dev, docs:build, docs:preview, test:docs

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T005** [P] Write navigation structure validation test in `tests/docs-site/navigation.test.ts` - validates sidebar/navbar structure matches contract

- [x] **T006** [P] Write i18n parity test in `tests/docs-site/i18n.test.ts` - validates all en/ pages have corresponding ja/ pages

- [x] **T007** [P] Write link validation test in `tests/docs-site/links.test.ts` - validates all internal links resolve to existing pages

- [x] **T008** [P] Write build validation test in `tests/docs-site/build.test.ts` - validates VitePress build succeeds without errors

## Phase 3.3: i18n Configuration (ONLY after tests are failing)

- [x] **T009** Configure i18n locales in `docs-site/.vitepress/config.ts` - add en and ja locale config with labels, lang, and link settings

- [x] **T010** [P] Create English navigation config in `docs-site/.vitepress/locales/en.ts` - sidebar and nav structure per navigation.md contract

- [x] **T011** [P] Create Japanese navigation config in `docs-site/.vitepress/locales/ja.ts` - sidebar and nav structure (mirroring en.ts, Japanese text)

## Phase 3.4: Content Migration - English Baseline

- [x] **T012** Migrate `docs/01-overview.md` to `docs-site/en/guide/overview.md` - add frontmatter (title, description, order)

- [x] **T013** Migrate `docs/02-system-design.md` to `docs-site/en/architecture/system-design.md` - add frontmatter, update internal links to /en/ paths

- [x] **T014** Migrate `docs/03-implementation.md` to `docs-site/en/reference/implementation.md` - add frontmatter, update internal links

- [x] **T015** Migrate `docs/development-spec.md` to `docs-site/en/reference/development-spec.md` - add frontmatter, update internal links

- [x] **T016** Create `docs-site/en/index.md` - homepage with project introduction, links to README.md and CLAUDE.md in repository

- [x] **T017** Create `docs-site/en/guide/setup.md` - getting started guide extracted from README.md Installation section

- [x] **T018** Create `docs-site/en/guide/quickstart.md` - quick reference for common tasks (from README.md Quick Start section)

- [x] **T019** Create `docs-site/en/architecture/database.md` - database schema documentation (extracted from system-design.md)

- [x] **T020** Create `docs-site/en/architecture/api.md` - API endpoints documentation (extracted from system-design.md or api-reference.md)

## Phase 3.5: Content Translation - Japanese

- [x] **T021** [P] Create Japanese homepage `docs-site/ja/index.md` - translate en/index.md content, update links to /ja/ paths

- [x] **T022** [P] Translate `docs-site/en/guide/overview.md` to `docs-site/ja/guide/overview.md` - preserve frontmatter structure, translate content

- [x] **T023** [P] Translate `docs-site/en/guide/setup.md` to `docs-site/ja/guide/setup.md`

- [x] **T024** [P] Translate `docs-site/en/guide/quickstart.md` to `docs-site/ja/guide/quickstart.md`

- [x] **T025** [P] Translate `docs-site/en/architecture/system-design.md` to `docs-site/ja/architecture/system-design.md`

- [x] **T026** [P] Translate `docs-site/en/architecture/database.md` to `docs-site/ja/architecture/database.md`

- [x] **T027** [P] Translate `docs-site/en/architecture/api.md` to `docs-site/ja/architecture/api.md`

- [x] **T028** [P] Translate `docs-site/en/reference/api-reference.md` to `docs-site/ja/reference/api-reference.md`

- [x] **T029** [P] Translate `docs-site/en/reference/implementation.md` to `docs-site/ja/reference/implementation.md`

- [x] **T030** [P] Translate `docs-site/en/reference/development-spec.md` to `docs-site/ja/reference/development-spec.md`

## Phase 3.6: Navigation Integration

- [x] **T031** Update `docs-site/.vitepress/config.ts` - integrate en.ts and ja.ts locale configs, configure theme (logo, social links, footer)

- [x] **T032** Configure search in `docs-site/.vitepress/config.ts` - enable local search with English and Japanese translations

- [x] **T033** Configure "Edit this page" links in locale configs - add editLink with GitHub URL pattern for both locales

- [x] **T034** Add Atrarium logo to `docs-site/public/` and reference in config.ts

## Phase 3.7: Theme Customization

- [x] **T035** [P] Create custom CSS file `docs-site/.vitepress/theme/custom.css` - define Atrarium brand colors (CSS variables)

- [x] **T036** [P] Create theme index file `docs-site/.vitepress/theme/index.ts` - extend default theme with custom styles

## Phase 3.8: Deployment Configuration

- [x] **T037** Create Cloudflare Pages configuration instructions in `docs-site/README.md` - document GitHub integration setup, build command, output directory

- [x] **T038** [P] Create deployment validation checklist in `docs-site/DEPLOYMENT.md` - steps to verify production deployment

## Phase 3.9: Test Validation (Run All Tests)

- [x] **T039** Run navigation test (`npm run test:docs -- navigation.test.ts`) - verify sidebar/nav structure passes

- [x] **T040** Run i18n parity test (`npm run test:docs -- i18n.test.ts`) - verify all en/ pages have ja/ equivalents

- [x] **T041** Run link validation test (`npm run test:docs -- links.test.ts`) - verify no broken internal links

- [x] **T042** Run build validation test (`npm run test:docs -- build.test.ts`) - verify production build succeeds

## Phase 3.10: Polish & Documentation

- [x] **T043** [P] Update main repository CLAUDE.md - add VitePress documentation site section (already done by /plan)

- [x] **T044** [P] Update main repository README.md - add link to documentation site in Documentation section

- [x] **T045** [P] Create `docs-site/CONTRIBUTING.md` - guide for contributing to documentation (adding pages, translations)

- [x] **T046** Local build and preview - run `npm run docs:build && npm run docs:preview`, verify site works locally

- [x] **T047** Test locale switcher - verify switching between English and Japanese preserves page path

- [x] **T048** Test search functionality - verify search works for both locales, results are locale-scoped

## Dependencies

### Critical Path
1. Setup (T001-T004) must complete first
2. Tests (T005-T008) before any content/config
3. i18n config (T009-T011) before content migration
4. English content (T012-T020) before Japanese translation (T021-T030)
5. Navigation integration (T031-T034) after content exists
6. Test validation (T039-T042) before deployment

### Blocking Dependencies
- T009 blocks T012-T020 (need i18n config before creating localized content)
- T012-T020 block T021-T030 (need English baseline before translation)
- T010-T011 block T031 (need locale configs before integration)
- T012-T030 block T039-T042 (need content before validation tests pass)

## Parallel Execution Examples

### Phase 3.1 (All can run in parallel)
```bash
# T001-T004 can all run together (different files)
Task: "Initialize VitePress project structure at docs-site/"
Task: "Install VitePress dependencies in docs-site/package.json"
Task: "Create base VitePress configuration file docs-site/.vitepress/config.ts"
Task: "Configure npm scripts in docs-site/package.json"
```

### Phase 3.2 (All tests in parallel)
```bash
# T005-T008 can all run together (different test files)
Task: "Write navigation structure validation test in tests/docs-site/navigation.test.ts"
Task: "Write i18n parity test in tests/docs-site/i18n.test.ts"
Task: "Write link validation test in tests/docs-site/links.test.ts"
Task: "Write build validation test in tests/docs-site/build.test.ts"
```

### Phase 3.3 (Locale configs in parallel)
```bash
# T010-T011 can run together (different files)
Task: "Create English navigation config in docs-site/.vitepress/locales/en.ts"
Task: "Create Japanese navigation config in docs-site/.vitepress/locales/ja.ts"
```

### Phase 3.5 (All Japanese translations in parallel)
```bash
# T021-T030 can all run together (different files)
Task: "Create Japanese homepage docs-site/ja/index.md"
Task: "Translate docs-site/en/guide/overview.md to docs-site/ja/guide/overview.md"
Task: "Translate docs-site/en/guide/setup.md to docs-site/ja/guide/setup.md"
# ... (all 10 translation tasks)
```

### Phase 3.7 (Theme customization in parallel)
```bash
# T035-T036 can run together (different files)
Task: "Create custom CSS file docs-site/.vitepress/theme/custom.css"
Task: "Create theme index file docs-site/.vitepress/theme/index.ts"
```

### Phase 3.10 (Documentation polish in parallel)
```bash
# T043-T045 can run together (different files)
Task: "Update main repository CLAUDE.md"
Task: "Update main repository README.md"
Task: "Create docs-site/CONTRIBUTING.md"
```

## Notes

### Parallel Execution ([P] tasks)
- Tasks marked [P] operate on different files with no dependencies
- Can be executed concurrently for faster completion
- Tests (T005-T008) should run in parallel since they're independent test files
- Japanese translations (T021-T030) can all run in parallel

### Sequential Execution (no [P])
- T009 (i18n config) must happen before content migration (T012-T020)
- English content (T012-T020) must exist before Japanese translation (T021-T030)
- Navigation integration (T031) needs locale configs (T010-T011) and content

### TDD Requirement
- **CRITICAL**: Tests T005-T008 MUST fail initially (no implementation yet)
- Only proceed to Phase 3.3+ after confirming tests fail
- Tests will pass after content and config are complete

### Deployment
- T037-T038 create documentation, not actual deployment
- Actual Cloudflare Pages deployment happens via GitHub integration (automatic)
- No manual wrangler commands needed

## Validation Checklist

### Contract Coverage
- [x] navigation.md contract → T005 (navigation test), T010-T011 (nav config), T031 (integration)
- [x] i18n.md contract → T006 (i18n test), T009 (locale config), T021-T030 (translations)

### Entity Coverage (from data-model.md)
- [x] Documentation Page → T012-T030 (create all pages)
- [x] Navigation Structure → T010-T011 (locale nav configs)
- [x] Locale Configuration → T009 (i18n config)
- [x] Theme Configuration → T035-T036 (custom theme)
- [x] Table of Contents → Auto-generated by VitePress (no task needed)

### Test Coverage
- [x] All contracts have tests (T005-T008)
- [x] Tests before implementation (Phase 3.2 before 3.3+)
- [x] Build validation included (T008, T042)

### File Path Specificity
- [x] All tasks specify exact file paths
- [x] Parallel tasks use different files
- [x] No file conflicts in [P] tasks

## Estimated Completion Time
- **Phase 3.1** (Setup): 30 minutes
- **Phase 3.2** (Tests): 1 hour
- **Phase 3.3** (i18n Config): 30 minutes
- **Phase 3.4** (English Content): 2 hours
- **Phase 3.5** (Japanese Translation): 3 hours
- **Phase 3.6** (Navigation): 30 minutes
- **Phase 3.7** (Theme): 30 minutes
- **Phase 3.8** (Deployment Docs): 30 minutes
- **Phase 3.9** (Test Validation): 30 minutes
- **Phase 3.10** (Polish): 1 hour

**Total**: ~10 hours (can be reduced to ~6 hours with parallel execution)

## Next Steps

1. Review and approve task list
2. Begin with Phase 3.1 (Setup tasks T001-T004)
3. Proceed to Phase 3.2 (Write tests T005-T008, verify they fail)
4. Execute remaining phases in order
5. Use parallel execution where marked [P] to save time
6. Validate with test suite (Phase 3.9) before considering complete
