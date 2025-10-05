# Research: Concept Redefinition

**Feature**: 008- Concept Redefinition
**Date**: 2025-10-05
**Status**: Complete

## Research Questions

### 1. Documentation Structure Approach

**Question**: What is the optimal structure for redefining project concept documentation?

**Decision**: VitePress-first approach with synchronized distribution

**Rationale**:
- **VitePress advantages**:
  - Native support for Mermaid diagrams (architecture visualization)
  - Multi-page structure accommodates detailed explanation
  - Built-in i18n support (EN/JA parity enforcement)
  - Version-controlled (text-based Markdown)
- **README.md role**: Entry point with concise summary + link to full docs
- **CLAUDE.md role**: AI agent context synchronization
- **Existing infrastructure**: VitePress already deployed on Cloudflare Pages

**Alternatives Considered**:
| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| README-first | Single file simplicity | Limited space for diagrams + detailed explanation | Cannot fit 6 sections + 2 diagrams in README |
| Separate API docs | Dedicated space | Concept is narrative, not API reference | OpenAPI/Swagger UI already standardized for API docs |
| Wiki-style docs | Flexible structure | Requires external tool (GitHub Wiki) | VitePress already in use, no additional tool needed |

**Supporting Evidence**:
- CLAUDE.md line 282-286: "VitePress documentation (20 pages, EN/JA, deployed to Cloudflare Pages)"
- README.md line 143: "Documentation Site - VitePress documentation (EN/JA)"

---

### 2. Diagram Format Selection

**Question**: What diagram format best visualizes PDS-first architecture for dual audiences?

**Decision**: Mermaid.js for all architecture diagrams

**Rationale**:
- **Version control**: Text-based format (no binary files)
- **Native support**: VitePress renders Mermaid without plugins
- **GitHub compatibility**: Renders in README.md preview
- **Maintenance**: Easy to update (edit text vs regenerate image)
- **Dual audience**: Can create both technical data flow + simplified positioning matrix

**Alternatives Considered**:
| Format | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| PNG/SVG images | High fidelity | Not version-controlled, hard to update | Requires external tool, binary files in git |
| Draw.io | Visual editor | Requires external tool, XML format | Not inline with docs, extra dependency |
| Graphviz DOT | Powerful layouts | Steep learning curve, less intuitive syntax | Mermaid simpler for team collaboration |
| ASCII art | Plain text | Limited visual clarity | Poor readability for complex flows |

**Implementation Plan**:
1. **Data Flow Diagram** (technical audience):
   ```mermaid
   graph LR
       PDS[Personal Data Server] --> Firehose[Jetstream Firehose]
       Firehose --> Queue[Cloudflare Queue]
       Queue --> DO[Durable Objects]
       DO --> Feed[Feed Generator API]
       Feed --> AppView[Bluesky Official AppView]
   ```

2. **Positioning Matrix** (non-technical audience):
   ```mermaid
   quadrantChart
       title Community Platform Positioning
       x-axis Closed --> Open
       y-axis High Ops Burden --> Low Ops Burden
       Discord: [0.2, 0.8]
       Fediverse: [0.8, 0.2]
       Standard Bluesky: [0.6, 0.9]
       Atrarium: [0.8, 0.9]
   ```

---

### 3. Positioning Differentiation Strategy

**Question**: How to clearly differentiate Atrarium from Fediverse, Discord, and standard Bluesky?

**Decision**: Three-way comparison matrix with 3 dimensions (openness, ops burden, features)

**Rationale**:
- **Addresses "why not X?" questions**: Each alternative targets different pain points
- **Dual audience communication**:
  - Non-technical: Openness (Discord vs Atrarium) + Ops burden (Fediverse vs Atrarium)
  - Technical: Feature comparison (Standard Bluesky vs Atrarium membership filtering)
- **Clarifies unique value proposition**: Only solution with open communities + low ops burden + membership filtering

**Comparison Dimensions**:

| Dimension | Fediverse (Mastodon/Misskey) | Discord | Standard Bluesky | **Atrarium** |
|-----------|------------------------------|---------|------------------|--------------|
| **Openness** | ✅ Open/public communities | ❌ Closed servers | ✅ Open feeds | ✅ Open communities |
| **Ops Burden** | ❌ High (VPS, 5 hrs/week) | ✅ Low (managed) | ✅ Low (managed) | ✅ Low (serverless, 1 hr/week) |
| **Cost** | ❌ $30-150/month | ✅ Free (platform lock-in) | ✅ Free (basic) | ✅ $0.40-5/month (independent) |
| **Identity** | ❌ Instance-bound | ❌ Platform lock-in | ✅ DID (portable) | ✅ DID (portable) |
| **Membership Filtering** | ✅ Instance-level | ✅ Server-level | ❌ No filtering | ✅ Feed-level (custom) |

**Alternatives Considered**:
| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Two-way comparison (Fediverse only) | Simpler message | Misses Discord positioning | Doesn't explain "why not Discord?" |
| Feature list without comparison | Shows capabilities | Doesn't clarify differentiation | User left wondering "how is this different?" |
| Use case scenarios | Concrete examples | Verbose, hard to scan | Matrix more scannable for quick comprehension |

---

### 4. Content Validation Methodology

**Question**: How to validate FR-012 "understandable within 2 minutes" for non-technical audience?

**Decision**: Subjective author judgment with feedback-driven iteration

**Rationale**:
- **Resource alignment**: Documentation update doesn't warrant formal user testing budget
- **Iteration speed**: Allows rapid refinement based on feedback
- **Clarification context**: User explicitly stated "そこまで厳密にはしない。一旦私の感覚値でわかりにくいと言われたら修正ぐらい。" (not strict, modify if feedback says unclear)

**Validation Process**:
1. Author reviews VitePress concept.md for clarity
2. If feedback indicates difficulty understanding → revise
3. Re-validate after revisions
4. Repeat until no clarity issues reported

**Alternatives Considered**:
| Method | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| Formal user testing (5 non-technical readers) | Quantitative validation | Time-intensive, requires recruiting | User explicitly rejected strict validation |
| Readability metrics (Flesch-Kincaid) | Objective score | Doesn't validate comprehension | Metrics don't guarantee understanding |
| Continuous testing on every update | Quality assurance | Overhead for documentation changes | Overkill for initial concept clarification |

---

## Technology Stack Decisions

### Documentation Tools
- **VitePress 1.x**: Documentation framework (already in use)
- **Mermaid.js**: Architecture diagrams (native VitePress support)
- **i18next**: EN/JA translations (existing contract)

### Testing Infrastructure
- **Vitest**: Documentation validation tests (already configured)
- **vitest.docs.config.ts**: Dedicated docs test config (existing)

### Deployment
- **Cloudflare Pages**: Documentation hosting (already deployed)
- **GitHub Actions**: Auto-deployment on push to master (existing)

---

## Key Constraints Identified

### i18n Contract
- **Requirement**: Every `docs/en/*.md` must have corresponding `docs/ja/*.md`
- **Impact**: Concept documentation requires Japanese translation
- **Mitigation**: Structure first in English, then translate (mirrors existing pattern)

### Documentation Policy
- **Canonical source**: README.md (English) for project info
- **Comprehensive docs**: VitePress for detailed guides
- **Synchronization**: CLAUDE.md syncs with README.md
- **Impact**: Update flow must be VitePress → README → CLAUDE → i18n

### Performance Targets
- **VitePress build**: < 60s (current baseline: ~30s)
- **Page load**: < 2s (Cloudflare Pages CDN)
- **Impact**: Mermaid diagrams may increase build time slightly, but within budget

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Mermaid diagram complexity breaks VitePress build | Low | Medium | Test diagrams in isolated .md file first |
| i18n translation accuracy loss | Medium | Medium | Use existing EN/JA translation patterns |
| Concept still unclear after update | Medium | High | Iterative feedback loop (author judgment) |
| README.md summary too long | Low | Low | 500-word limit enforced in contract |

---

## Open Questions (Resolved)

1. ~~Which files to update?~~ → **Resolved**: VitePress → README → CLAUDE → i18n
2. ~~Diagram format?~~ → **Resolved**: Mermaid.js
3. ~~Positioning strategy?~~ → **Resolved**: Three-way comparison matrix
4. ~~Validation method?~~ → **Resolved**: Subjective author judgment

---

## Next Steps

1. ✅ Research complete
2. → Phase 1: Create data-model.md (documentation entities)
3. → Phase 1: Create contracts/concept-doc-structure.md
4. → Phase 1: Create quickstart.md (validation steps)
5. → Phase 2: Generate tasks.md (/tasks command)
