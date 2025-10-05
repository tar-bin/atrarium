# Contract: Concept Documentation Structure

**Feature**: 008- Concept Redefinition
**Date**: 2025-10-05
**Type**: Documentation Structure Contract

## Overview

This contract defines the required structure and content for Atrarium's concept documentation. It serves as a validation schema for all documentation updates.

---

## Primary Contract: VitePress Concept Document

**File**: `docs/en/guide/concept.md`
**Purpose**: Comprehensive concept explanation (primary source of truth)
**Max Length**: 3000 words
**Format**: Markdown with Mermaid diagrams

### Required Sections

#### Section 1: Overview
```yaml
title: "Overview"
required: true
audience: non-technical
word_count: 200-300
required_elements:
  - one_sentence_description: "What is Atrarium in 1 sentence"
  - problem_statement: "Small & open community sustainability crisis (concise)"
  - solution_approach: "Serverless + membership filtering (concise)"
  - positioning: "vs Fediverse/Discord/Bluesky (1-2 sentences each)"
validation:
  - Must be understandable by community managers (non-technical)
  - Must answer "What is this project?" within 30 seconds of reading
```

#### Section 2: The Problem
```yaml
title: "The Problem"
required: true
audience: non-technical
word_count: 400-500
required_elements:
  - sustainability_crisis:
      costs: "$30-150/month"
      time: "5 hours/week"
      closure_rate: "50-70% within 1-2 years"
  - user_pain_points:
      - operational_burden
      - isolation_risk
      - technical_complexity
      - legal_liability
  - data_source:
      citation: "Fediverse Observer 2024 data"
      numbers: "450-800 small instances, 75,000-200,000 users (Japanese-speaking Fediverse)"
validation:
  - Must cite Fediverse Observer 2024
  - Must include all 4 pain point categories
  - Must use concrete numbers (not "many" or "several")
```

#### Section 3: The Solution
```yaml
title: "The Solution"
required: true
audience: non-technical → technical (transition)
word_count: 400-500
required_elements:
  - cost_reduction:
      old_cost: "$30-150/month"
      new_cost: "$0.40-5/month"
      savings: "95%"
      mechanism: "Shared infrastructure via Durable Objects + Queues"
  - time_reduction:
      old_time: "5 hours/week"
      new_time: "1 hour/week"
      savings: "80%"
      mechanism: "Zero server management, automated scaling, no database maintenance"
  - technical_approach:
      architecture: "PDS-first"
      components: "Custom Feed Generator with membership-based filtering"
validation:
  - Must show cost comparison table
  - Must explain mechanism (not just state savings percentage)
  - Must introduce technical concepts gently (define PDS, Custom Feed)
```

#### Section 4: How It Works
```yaml
title: "How It Works"
required: true
audience: technical
word_count: 500-600
required_elements:
  - architecture_diagram:
      type: "Mermaid graph LR (left-to-right flow)"
      components: [PDS, Firehose, Queue, Durable Objects, Feed API, AppView]
      format: "```mermaid\ngraph LR\n    PDS --> Firehose --> Queue --> DO --> Feed --> AppView\n```"
  - component_descriptions:
      - pds: "Personal Data Server (user's data storage)"
      - firehose: "Jetstream WebSocket (AT Protocol event stream)"
      - queue: "Cloudflare Queue (batched event processing)"
      - durable_objects: "CommunityFeedGenerator (per-community feed index)"
      - feed_api: "getFeedSkeleton (returns post URIs)"
      - appview: "Bluesky Official AppView (fetches full post content)"
  - integration_explanation:
      - "Posts from PDS flow through Firehose to Queue"
      - "Queue processes events and updates Durable Objects feed index"
      - "Feed API returns URIs, AppView fetches content"
      - "Viewable on Bluesky official app without custom client"
validation:
  - Must include Mermaid data flow diagram
  - Must show 5-stage pipeline (PDS → Firehose → Queue → DO → Feed → AppView)
  - Must explain Bluesky AppView compatibility
```

#### Section 5: Differentiation
```yaml
title: "Differentiation"
required: true
audience: technical + non-technical
word_count: 500-600
required_elements:
  - vs_fediverse:
      - "Serverless vs VPS (no server management)"
      - "Zero migration cost via DID (portable identity)"
      - "Horizontal scaling vs database bottlenecks"
  - vs_discord:
      - "Open/public communities vs closed servers"
      - "Decentralized identity vs platform lock-in"
      - "No platform dependency (own your data)"
  - vs_standard_bluesky:
      - "Membership-based feed filtering (not available in standard feeds)"
      - "Custom Feed Generator (community-specific logic)"
      - "Still viewable on official Bluesky AppView"
  - positioning_matrix:
      type: "Table or Mermaid quadrant chart"
      dimensions: ["Openness (Closed ← → Open)", "Ops Burden (High ← → Low)"]
      platforms: [Fediverse, Discord, Standard Bluesky, Atrarium]
validation:
  - Must differentiate from all 3 alternatives
  - Must use concrete technical terms (VPS, DID, horizontal scaling)
  - Must include positioning visualization (table or diagram)
```

#### Section 6: Current Status & Future Vision
```yaml
title: "Current Status & Future Vision"
required: true
audience: technical + non-technical
word_count: 300-400
required_elements:
  - phase_1_status:
      completion: "PDS-first architecture complete"
      deployment: "Production deployment pending (Phase 2)"
  - completed_capabilities:
      - "Feed Generator API (getFeedSkeleton)"
      - "Hashtag system (#atr_[0-9a-f]{8})"
      - "Moderation (hide posts, block users)"
      - "React dashboard (community management)"
      - "Bluesky AppView compatibility"
  - future_vision:
      phase: "Phase 2+"
      concept: "Maintain optimal community size"
      mechanism: "Automated community splitting/graduation when growth exceeds healthy scale"
validation:
  - Must state "Phase 1 complete" (not "in progress")
  - Must list 5 completed capabilities
  - Must mark future vision as "Phase 2+" (not current implementation)
```

---

## Secondary Contract: README.md Summary

**File**: `README.md`
**Purpose**: Entry point with concise summary
**Max Length**: 500 words (Project Overview section only)
**Format**: Markdown

### Required Sections

#### Project Overview
```yaml
title: "Project Overview" or equivalent top-level heading
required: true
max_words: 500
required_elements:
  - one_sentence_description: "Atrarium in 1 sentence"
  - problem_concise: "Community sustainability problem (1-2 sentences)"
  - solution_concise: "Serverless + membership filtering (1-2 sentences)"
  - link_to_full_docs:
      text: "See full concept documentation"
      url: "https://docs.atrarium.net/en/guide/concept.html" or "/docs/en/guide/concept.md"
validation:
  - Must link to VitePress concept.md
  - Must be English (canonical version)
  - Must not duplicate VitePress content (summary only)
```

#### Key Features (Optional but Recommended)
```yaml
title: "Key Features" or "Features"
required: false
format: "Bullet list"
suggested_items:
  - "Membership-based feed filtering (not in standard Bluesky)"
  - "Bluesky AppView compatibility (no custom client needed)"
  - "Cost efficient: $0.40-5/month (vs $30-150 for Fediverse)"
  - "Zero server management (Cloudflare serverless)"
validation:
  - If present, must be consistent with VitePress content
```

---

## Tertiary Contract: CLAUDE.md Synchronization

**File**: `CLAUDE.md`
**Purpose**: AI agent context (project instructions)
**Update Type**: Incremental (add/update specific sections only)
**Format**: Markdown

### Sections to Update

#### Project Overview
```yaml
section: "## Project Overview"
location: "Top of file (after title)"
required_updates:
  - positioning_summary:
      add_after: "Atrarium is a community management system..."
      content: "Positioned as an alternative to Fediverse (open but high ops burden), Discord (low ops but closed), and standard Bluesky (open, low ops, but no membership filtering)."
validation:
  - Must synchronize with README.md Project Overview
  - Must not exceed 3-4 sentences (concise context for AI)
```

#### Core Concepts (if exists)
```yaml
section: "## Core Concepts" or "## Key Concepts"
location: "After Project Overview or Architecture section"
required_updates:
  - future_vision:
      add_item: "**Future Vision (Phase 2+)**: \"Maintain optimal community size\" - automated community splitting/graduation when growth exceeds healthy scale."
validation:
  - Must mark as Phase 2+ (not current implementation)
  - Must be brief (1-2 sentences)
```

#### Architecture
```yaml
section: "## Architecture" or "## Architecture (006-pds-1-db)"
location: "Existing architecture section"
required_updates:
  - data_flow_reference:
      add_note: "For detailed data flow visualization, see [VitePress concept docs](https://docs.atrarium.net/en/guide/concept.html#how-it-works)."
validation:
  - Must link to VitePress diagram (not duplicate diagram in CLAUDE.md)
  - Must preserve existing architecture details
```

---

## i18n Contract: Japanese Translation

**File**: `docs/ja/guide/concept.md`
**Purpose**: Japanese version of concept documentation
**Requirement**: Mirror structure of `docs/en/guide/concept.md`
**Format**: Markdown with Mermaid diagrams (same as EN)

### Structural Requirements

```yaml
structure_parity:
  - section_count: "Must match EN version (6 sections)"
  - section_titles: "Translate but keep same order"
  - diagrams: "Keep Mermaid code identical (English labels OK, or translate)"
  - word_count: "Approximate parity (JP may be shorter due to language density)"

validation:
  - Run: npm run test:docs -- i18n.test.ts
  - Check: EN section count == JA section count
  - Check: EN diagram count == JA diagram count
```

### Translation Guidelines

```yaml
technical_terms:
  preserve_english:
    - "PDS (Personal Data Server)"
    - "Firehose"
    - "Durable Objects"
    - "Feed Generator API"
    - "Bluesky AppView"
  translate:
    - "sustainability crisis" → "持続可能性の危機"
    - "operational burden" → "運用負荷"
    - "open communities" → "オープンなコミュニティ"
    - "membership-based filtering" → "メンバーシップベースのフィルタリング"

data_consistency:
  - costs: "$30-150/month → $0.40-5/month" (keep USD, no JPY conversion)
  - percentages: "95% savings" → "95%のコスト削減"
  - citations: "Fediverse Observer 2024 data" → "Fediverse Observer 2024年データ"
```

---

## Validation Schema

### Automated Tests

#### Structure Test
```typescript
// tests/docs/concept-structure.test.ts
describe('Concept Documentation Structure', () => {
  const enPath = 'docs/en/guide/concept.md';
  const jaPath = 'docs/ja/guide/concept.md';

  it('EN: has all 6 required sections', async () => {
    const content = await fs.readFile(enPath, 'utf-8');
    expect(content).toContain('## Overview');
    expect(content).toContain('## The Problem');
    expect(content).toContain('## The Solution');
    expect(content).toContain('## How It Works');
    expect(content).toContain('## Differentiation');
    expect(content).toContain('## Current Status & Future Vision');
  });

  it('EN: includes Fediverse Observer citation', async () => {
    const content = await fs.readFile(enPath, 'utf-8');
    expect(content).toMatch(/Fediverse Observer 2024/i);
  });

  it('EN: includes data flow diagram', async () => {
    const content = await fs.readFile(enPath, 'utf-8');
    expect(content).toContain('```mermaid');
    expect(content).toMatch(/PDS.*Firehose.*Queue.*Durable Objects.*Feed.*AppView/s);
  });

  it('EN: differentiates from 3 alternatives', async () => {
    const content = await fs.readFile(enPath, 'utf-8');
    expect(content).toMatch(/vs.*Fediverse/i);
    expect(content).toMatch(/vs.*Discord/i);
    expect(content).toMatch(/vs.*Bluesky/i);
  });

  it('JA: mirrors EN structure (section count)', async () => {
    const enContent = await fs.readFile(enPath, 'utf-8');
    const jaContent = await fs.readFile(jaPath, 'utf-8');

    const enSections = (enContent.match(/^## /gm) || []).length;
    const jaSections = (jaContent.match(/^## /gm) || []).length;

    expect(enSections).toBe(6);
    expect(jaSections).toBe(enSections);
  });
});
```

#### Synchronization Test
```typescript
// tests/docs/concept-sync.test.ts
describe('Concept Documentation Synchronization', () => {
  it('README links to VitePress concept docs', async () => {
    const readme = await fs.readFile('README.md', 'utf-8');
    expect(readme).toMatch(/docs\.atrarium\.net\/en\/guide\/concept|\/docs\/en\/guide\/concept\.md/);
  });

  it('Cost data consistent across all files', async () => {
    const files = [
      'docs/en/guide/concept.md',
      'README.md',
      'CLAUDE.md'
    ];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toMatch(/\$0\.40-5\/month|\$0\.40-\$5\/month/);
    }
  });

  it('Phase status consistent (Phase 1 complete)', async () => {
    const vitepress = await fs.readFile('docs/en/guide/concept.md', 'utf-8');
    expect(vitepress).toMatch(/Phase 1.*complete/i);
    expect(vitepress).toMatch(/Phase 2.*pending|future/i);
  });
});
```

---

## Manual Validation Checklist

### Content Quality
- [ ] Overview section understandable by non-technical readers (< 2 minutes, FR-012)
- [ ] Problem section includes all 4 pain points (ops burden, isolation, complexity, legal)
- [ ] Solution section explains mechanisms (not just states percentages)
- [ ] Diagrams render correctly in VitePress dev server
- [ ] Differentiation clearly shows Atrarium's unique position

### Technical Accuracy
- [ ] Architecture diagram shows correct 5-stage flow
- [ ] Component names match actual implementation (PDS, Firehose, Queue, DO, Feed, AppView)
- [ ] Cost data matches Cloudflare pricing ($0.40-5/month calculation correct)
- [ ] Phase status reflects reality (Phase 1 complete, Phase 2 pending)
- [ ] Completed capabilities list is accurate

### Synchronization
- [ ] VitePress → README summary extraction complete (< 500 words)
- [ ] README → CLAUDE.md sync complete (positioning + future vision added)
- [ ] VitePress → JA translation complete (section count matches)
- [ ] README → README.ja.md translation complete

### Build & Deployment
- [ ] VitePress build succeeds: `cd docs && npm run docs:build`
- [ ] Build time < 60s
- [ ] No broken links in built site
- [ ] Mermaid diagrams render in production build

---

## Contract Version

**Version**: 1.0.0
**Last Updated**: 2025-10-05
**Status**: Active

**Change Log**:
- 2025-10-05: Initial contract creation (v1.0.0)

**Dependencies**:
- VitePress 1.x (Mermaid support)
- i18next (EN/JA translations)
- Vitest (documentation tests)

**Next Review**: After Phase 1 implementation complete
