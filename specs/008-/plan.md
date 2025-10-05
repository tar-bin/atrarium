# Implementation Plan: Concept Redefinition

**Branch**: `008-` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/008-/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All clarifications resolved in spec.md
   → Project Type: Documentation update (web project with VitePress docs)
3. Constitution Check
   → ✅ Documentation-only changes, no code architecture impact
4. Execute Phase 0 → research.md
   → ✅ Complete
5. Execute Phase 1 → data-model.md, contracts/, quickstart.md
   → ✅ Complete (documentation structure as data model)
6. Re-evaluate Constitution Check
   → ✅ No violations
7. Plan Phase 2 → Task generation approach described
   → ✅ Complete
8. STOP - Ready for /tasks command
```

## Summary

**Primary Requirement**: Redefine Atrarium's core concept documentation to clearly explain the problem-solution relationship, positioning, and technical approach for both technical and non-technical audiences.

**Technical Approach**:
- Update VitePress documentation (docs/en/guide/concept.md) as primary source
- Create architecture diagrams (data flow, positioning matrix)
- Synchronize updates to README.md and CLAUDE.md
- Maintain i18n parity (docs/ja/)

**Key Innovation**: Two-layer explanation model serving dual audiences (community managers + developers) with clear differentiation from Fediverse, Discord, and standard Bluesky.

## Technical Context

**Language/Version**: Markdown (VitePress 1.x), Mermaid diagrams
**Primary Dependencies**: VitePress (documentation framework), i18next (EN/JA translations)
**Storage**: Git repository, static files (docs/en/, docs/ja/, README.md, CLAUDE.md)
**Testing**: Documentation validation tests (navigation, i18n parity, links, build)
**Target Platform**: Cloudflare Pages (documentation hosting)
**Project Type**: Documentation update (web project with VitePress + React dashboard)
**Performance Goals**: Documentation build < 60s, page load < 2s
**Constraints**:
- i18n contract: every docs/en/*.md must have corresponding docs/ja/*.md
- README.md is canonical source for project info (English)
- VitePress docs provide comprehensive guides
- CLAUDE.md synchronizes with README.md
**Scale/Scope**:
- 4 documentation files (VitePress concept, README, CLAUDE, ja translation)
- 2 diagrams (data flow, positioning matrix)
- 15 functional requirements across 4 categories

## Constitution Check

**GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.**

Since no constitution.md file exists, checking against CLAUDE.md project guidelines:

✅ **Documentation Policy Compliance**:
- English (README.md) as primary/canonical version ✓
- VitePress docs for comprehensive guides ✓
- Translations kept in sync ✓
- No proactive documentation creation (user requested) ✓

✅ **Architecture Alignment**:
- Reflects current implementation (PDS-first, 006-pds-1-db) ✓
- References actual cost data ($0.40-5/month) ✓
- No implementation details in concept docs ✓

✅ **Quality Standards**:
- Focus on user value and WHY ✓
- Two-layer structure (non-technical + technical) ✓
- Testable acceptance criteria ✓

**Result**: PASS - No constitutional violations

## Project Structure

### Documentation (this feature)
```
specs/008-/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (documentation structure research)
├── data-model.md        # Phase 1 output (documentation entities)
├── quickstart.md        # Phase 1 output (validation steps)
├── contracts/           # Phase 1 output (documentation structure contracts)
│   └── concept-doc-structure.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
docs/                    # VitePress documentation site
├── en/                     # English documentation (primary)
│   ├── guide/
│   │   └── concept.md      # PRIMARY UPDATE TARGET (new content)
│   └── .vitepress/
│       └── config.ts       # VitePress configuration
├── ja/                     # Japanese documentation (synchronized)
│   └── guide/
│       └── concept.md      # Japanese translation (mirrors en/)
└── package.json            # VitePress dependencies

README.md                # Project summary (synchronized from VitePress)
CLAUDE.md                # Project instructions (synchronized)
README.ja.md             # Japanese README (synchronized)

dashboard/               # React dashboard (no changes)
src/                     # Cloudflare Workers backend (no changes)
tests/                   # Test suite (documentation tests exist)
└── docs/
    ├── navigation.test.ts  # VitePress navigation validation
    ├── i18n.test.ts        # i18n parity check (en ↔ ja)
    ├── links.test.ts       # Link validation
    └── build.test.ts       # VitePress build validation
```

**Structure Decision**: Documentation-only update following existing VitePress + i18n structure. No code changes required. Update flow: VitePress (docs/en/guide/concept.md) → README.md summary → CLAUDE.md sync → i18n (docs/ja/, README.ja.md).

## Phase 0: Outline & Research

**Research completed during clarification phase. Key findings:**

### 1. Documentation Structure Research
**Decision**: VitePress-first approach with synchronized distribution
**Rationale**:
- VitePress provides comprehensive documentation with diagrams
- README.md serves as entry point (summary)
- CLAUDE.md maintains AI agent context
- Existing i18n contract enforces EN/JA parity

**Alternatives considered**:
- README-first approach (rejected: insufficient space for diagrams + detailed explanation)
- Separate API docs (rejected: OpenAPI/Swagger UI already standardized, concept is narrative)

### 2. Diagram Format Research
**Decision**: Mermaid.js for architecture diagrams
**Rationale**:
- Native VitePress support (no external tools)
- Version-controlled (text-based)
- Renders in GitHub README

**Alternatives considered**:
- PNG/SVG diagrams (rejected: not version-controlled, hard to update)
- Draw.io (rejected: requires external tool, not inline)

### 3. Positioning Differentiation Research
**Decision**: Three-way comparison matrix (Fediverse vs Discord vs Standard Bluesky)
**Rationale**:
- Clarifies unique value proposition
- Addresses both technical and non-technical audiences
- Resolves "why not just use X?" questions

**Alternatives considered**:
- Two-way comparison only (rejected: misses Discord positioning)
- Feature list without comparison (rejected: doesn't clarify differentiation)

### 4. Content Validation Research
**Decision**: Subjective author judgment with feedback-driven iteration
**Rationale**:
- Lightweight validation (no formal user testing)
- Aligns with project resources
- Allows rapid iteration

**Alternatives considered**:
- Formal user testing (rejected: too heavyweight for documentation update)
- Readability metrics only (rejected: doesn't validate comprehension)

**Output**: ✅ research.md created (see below)

---

## Phase 1: Design & Contracts

*Prerequisites: research.md complete ✅*

### 1. Documentation Entities (data-model.md)

**Entity: Concept Document**
- **Attributes**:
  - `problem_statement` (string): Small & open community sustainability crisis
  - `solution_approach` (string): Serverless + membership filtering
  - `architecture_diagram` (Mermaid): Data flow visualization
  - `cost_comparison` (table): $30-150/month → $0.40-5/month
  - `positioning_matrix` (table): vs Fediverse/Discord/Bluesky
  - `feature_status` (list): Completed capabilities (Phase 1)
  - `future_vision` (string): "Maintain optimal community size" (Phase 2+)
- **Relationships**:
  - Primary in `docs/en/guide/concept.md`
  - Summarized in `README.md`
  - Synchronized to `CLAUDE.md`
  - Translated to `docs/ja/guide/concept.md`
- **Validation Rules**:
  - Must include Fediverse Observer 2024 data source citation
  - Must show data flow: PDS → Firehose → Queue → DO → Feed → AppView
  - Must differentiate from 3 alternatives (Fediverse, Discord, Bluesky)
  - Must use two-layer structure (non-technical → technical)

**Entity: Architecture Diagram**
- **Attributes**:
  - `type` (enum): "data-flow" | "positioning-matrix"
  - `format` (string): Mermaid.js
  - `components` (list): [PDS, Firehose, Queue, Durable Objects, Feed API, AppView]
- **Validation Rules**:
  - Data flow must show 5-stage pipeline
  - Positioning matrix must compare 3 dimensions (openness, ops burden, features)

### 2. Documentation Structure Contracts

**Contract: VitePress Concept Document**
```yaml
# File: docs/en/guide/concept.md
sections:
  - title: "Overview"
    required: true
    content: |
      - Problem statement (small & open communities)
      - Solution approach (serverless + membership filtering)
      - Positioning (vs Fediverse/Discord/Bluesky)

  - title: "The Problem"
    required: true
    content: |
      - Sustainability crisis (costs, time, closure rate)
      - User pain points (ops burden, isolation, complexity, legal)
      - Data citation (Fediverse Observer 2024)

  - title: "The Solution"
    required: true
    content: |
      - Cost reduction mechanism (95% savings)
      - Time reduction mechanism (80% savings)
      - Technical approach (PDS-first + Custom Feed)

  - title: "How It Works"
    required: true
    content: |
      - Architecture diagram (Mermaid data flow)
      - Component descriptions
      - Integration with Bluesky AppView

  - title: "Differentiation"
    required: true
    content: |
      - vs Fediverse (serverless, no VPS, DID migration)
      - vs Discord (open communities, no platform lock-in)
      - vs Standard Bluesky (membership filtering)

  - title: "Current Status & Future Vision"
    required: true
    content: |
      - Phase 1 complete (PDS-first architecture)
      - Completed capabilities (Feed API, hashtags, moderation, dashboard)
      - Phase 2+ vision ("Maintain optimal community size")

validation:
  - Must cite Fediverse Observer 2024 data
  - Must include data flow diagram
  - Must show cost comparison table
  - Must differentiate from 3 alternatives
```

**Contract: README.md Summary**
```yaml
# File: README.md
sections:
  - title: "Project Overview"
    required: true
    max_length: 500_words
    content: |
      - One-sentence description
      - Problem statement (concise)
      - Solution approach (concise)
      - Link to full concept docs

  - title: "Key Features"
    required: true
    content: |
      - Membership-based feed filtering
      - Bluesky AppView compatibility
      - Cost efficiency ($0.40-5/month)

validation:
  - Must link to docs/en/guide/concept.md
  - Must be English (canonical version)
  - Must synchronize with VitePress content
```

### 3. Validation Tests

**Test: Documentation Structure Validation**
```typescript
// tests/docs/concept-structure.test.ts
describe('Concept Documentation Structure', () => {
  it('VitePress concept.md has all required sections', async () => {
    const content = await fs.readFile('docs/en/guide/concept.md', 'utf-8');
    expect(content).toContain('## Overview');
    expect(content).toContain('## The Problem');
    expect(content).toContain('## The Solution');
    expect(content).toContain('## How It Works');
    expect(content).toContain('## Differentiation');
    expect(content).toContain('## Current Status & Future Vision');
  });

  it('includes Fediverse Observer data citation', async () => {
    const content = await fs.readFile('docs/en/guide/concept.md', 'utf-8');
    expect(content).toMatch(/Fediverse Observer 2024/);
  });

  it('includes data flow diagram', async () => {
    const content = await fs.readFile('docs/en/guide/concept.md', 'utf-8');
    expect(content).toContain('```mermaid');
    expect(content).toMatch(/PDS.*Firehose.*Queue.*Durable Objects.*Feed.*AppView/s);
  });

  it('differentiates from 3 alternatives', async () => {
    const content = await fs.readFile('docs/en/guide/concept.md', 'utf-8');
    expect(content).toMatch(/vs.*Fediverse/i);
    expect(content).toMatch(/vs.*Discord/i);
    expect(content).toMatch(/vs.*Bluesky/i);
  });
});
```

**Test: i18n Parity Validation**
```typescript
// tests/docs/i18n-concept.test.ts (extends existing i18n.test.ts)
describe('Concept i18n Parity', () => {
  it('Japanese concept.md mirrors English structure', async () => {
    const enContent = await fs.readFile('docs/en/guide/concept.md', 'utf-8');
    const jaContent = await fs.readFile('docs/ja/guide/concept.md', 'utf-8');

    const enSections = extractSections(enContent);
    const jaSections = extractSections(jaContent);

    expect(enSections.length).toBe(jaSections.length);
    enSections.forEach((section, i) => {
      expect(jaSections[i]).toBeDefined();
    });
  });
});
```

### 4. Quickstart Validation Scenario

**File: quickstart.md**
```markdown
# Quickstart: Concept Documentation Validation

## Prerequisites
- VitePress installed (`cd docs && npm install`)
- Documentation tests passing (`npm run test:docs`)

## Validation Steps

### Step 1: Read VitePress Concept Documentation
1. Start VitePress dev server: `cd docs && npm run docs:dev`
2. Navigate to http://localhost:5173/en/guide/concept.html
3. ✅ Verify "Overview" section clearly states problem + solution
4. ✅ Verify "The Problem" section cites Fediverse Observer 2024 data
5. ✅ Verify "How It Works" section shows Mermaid data flow diagram
6. ✅ Verify "Differentiation" section compares 3 alternatives

**Expected Time**: < 2 minutes (FR-012 validation)

### Step 2: Verify README.md Summary
1. Open README.md in repository root
2. ✅ Verify overview section links to VitePress concept docs
3. ✅ Verify cost comparison ($0.40-5/month) is accurate
4. ✅ Verify positioning (Fediverse/Discord/Bluesky) is mentioned

### Step 3: Verify CLAUDE.md Synchronization
1. Open CLAUDE.md in repository root
2. ✅ Verify "Project Overview" section matches README.md
3. ✅ Verify "Core Concepts" section reflects VitePress content
4. ✅ Verify "Architecture" section includes data flow reference

### Step 4: Verify i18n Parity
1. Navigate to http://localhost:5173/ja/guide/concept.html
2. ✅ Verify Japanese version has same section structure
3. ✅ Run i18n test: `npm run test:docs -- i18n.test.ts`
4. ✅ Verify no missing translations

### Step 5: Build Validation
1. Build VitePress site: `cd docs && npm run docs:build`
2. ✅ Verify build completes without errors
3. ✅ Verify concept.md is included in build output

## Success Criteria
- [ ] All ✅ checkpoints passed
- [ ] Documentation tests pass (`npm run test:docs`)
- [ ] VitePress build succeeds (< 60s)
- [ ] README.md accurately summarizes VitePress content
- [ ] CLAUDE.md synchronized with README.md
- [ ] i18n parity maintained (EN ↔ JA)
```

### 5. Update CLAUDE.md (Incremental)

Since this is a documentation-only feature, CLAUDE.md update focuses on concept clarification:

```bash
# Execute update script (preserves existing content)
bash .specify/scripts/bash/update-agent-context.sh claude
```

**Expected Changes**:
- **Project Overview** section: Add positioning summary (vs Fediverse/Discord/Bluesky)
- **Core Concepts** section: Add "optimal community size" future vision
- **Architecture** section: Add reference to data flow diagram in VitePress docs
- **Documentation Policy** section: Reinforce VitePress-first approach

**Output**: ✅ data-model.md, contracts/, quickstart.md created; CLAUDE.md updated

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Documentation Content Tasks** (from contracts/concept-doc-structure.md):
   - Task 1: Create VitePress concept.md skeleton with 6 sections [P]
   - Task 2: Write "Overview" section (problem + solution + positioning) [P]
   - Task 3: Write "The Problem" section (with Fediverse Observer citation) [P]
   - Task 4: Write "The Solution" section (cost/time reduction) [P]
   - Task 5: Create Mermaid data flow diagram (PDS → AppView) [P]
   - Task 6: Write "How It Works" section (embed diagram) [depends: 5]
   - Task 7: Create positioning matrix (Fediverse/Discord/Bluesky comparison) [P]
   - Task 8: Write "Differentiation" section (embed matrix) [depends: 7]
   - Task 9: Write "Current Status & Future Vision" section [P]

2. **Synchronization Tasks** (from update priority):
   - Task 10: Extract README.md summary from VitePress concept.md [depends: 2,3,4,6,8,9]
   - Task 11: Update CLAUDE.md with concept clarifications [depends: 10]
   - Task 12: Translate docs/ja/guide/concept.md (mirror EN structure) [depends: 1-9]
   - Task 13: Update README.ja.md (Japanese summary) [depends: 10,12]

3. **Validation Tasks** (from quickstart.md):
   - Task 14: Add concept structure test to tests/docs/ [P]
   - Task 15: Add i18n parity test for concept.md [P]
   - Task 16: Run all documentation tests [depends: 14,15]
   - Task 17: Build VitePress site and verify concept.md [depends: 1-13]

4. **Review Tasks**:
   - Task 18: Execute quickstart.md validation steps [depends: 17]
   - Task 19: Verify 2-minute comprehension (FR-012 subjective test) [depends: 18]
   - Task 20: Fix any identified clarity issues [depends: 19]

**Ordering Strategy**:
- Parallel execution for independent content sections ([P] markers)
- Sequential for diagram embedding (diagram creation → section writing)
- Synchronization after VitePress content complete
- Validation after all content + synchronization complete

**Estimated Output**: 20 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Documentation writing (execute tasks.md following two-layer model)
**Phase 5**: Validation (run tests, execute quickstart.md, FR-012 comprehension check)

---

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected** - Documentation-only changes align with existing project guidelines.

---

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
- [x] Complexity deviations documented (N/A)

---

*Based on CLAUDE.md project guidelines - No constitution.md found*
