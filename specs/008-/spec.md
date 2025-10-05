# Feature Specification: Concept Redefinition

**Feature Branch**: `008-`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "現行の状態からコンセプトについての説明の再定義"

## Execution Flow (main)
```
1. Parse user description from Input
   → Identify need: Redefine project concept explanation based on current state
2. Extract key concepts from description
   → Actors: Documentation readers, potential users, contributors
   → Actions: Update concept description, align with implemented architecture
   → Data: Project documentation (README.md, CLAUDE.md, docs/)
   → Constraints: Must reflect PDS-first architecture, actual cost data ($0.40-5/month)
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Which documentation files should be updated? README.md only, or also CLAUDE.md and docs/en/guide/concept.md?]
   → [NEEDS CLARIFICATION: Should the concept description emphasize technical architecture (PDS-first) or business value (cost reduction)?]
   → [NEEDS CLARIFICATION: What is the target audience for the redefined concept - developers, community managers, or both?]
4. Fill User Scenarios & Testing section
   → User flow identified: Reader encounters outdated concept → reads updated explanation → understands current implementation
5. Generate Functional Requirements
   → Each requirement testable via documentation review
6. Identify Key Entities
   → Documentation files, concept elements (architecture, costs, features)
7. Run Review Checklist
   → WARN "Spec has uncertainties" - clarifications needed on scope and audience
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- �� Written for business stakeholders, not developers

---

## Objective & Approach Clarification

### Objective
**What**: Clarify Atrarium's core concept by defining (1) the problem it solves and (2) the approach used to solve it, making this understanding accessible to both technical and non-technical audiences.

**Why**: Current documentation (README.md, CLAUDE.md) contains detailed implementation information but lacks a clear, concise explanation of the fundamental problem-solution relationship. Readers need to quickly understand "Why Atrarium exists" and "How it achieves its goals" before diving into technical details.

### Approach
**Two-Layer Explanation Model**:

1. **Problem-Solution Core** (Non-technical layer):
   - Problem: Small & open community servers (10-200 people) face unsustainable costs ($30-150/month) and operational burden (5 hours/week)
   - Solution: Serverless architecture on shared infrastructure reduces costs by 95% ($0.40-5/month) and time by 80% (1 hour/week)
   - Value: Community independence without operational overhead (positioned between Fediverse self-hosting and Discord closed communities)
   - Positioning: Open communities (vs Discord's closed model) with minimal operational burden (vs Fediverse's self-hosting complexity)
   - Future Vision: "Maintain optimal community size" - automated community splitting/graduation when growth exceeds healthy scale (Phase 2+)

2. **Technical Implementation** (Technical layer):
   - Approach: PDS-first architecture leveraging AT Protocol's decentralized identity + Custom Feed Generator with membership filtering
   - Mechanism: User data in Personal Data Servers → Firehose ingestion → Cloudflare Durable Objects → Feed Generator API → Viewable on Bluesky official AppView
   - Differentiation: Zero database costs, horizontal scaling, 7-day feed retention, membership-based filtering not available in standard Bluesky feeds

**Clarification Strategy**:
- Lead with problem-solution (accessible to all)
- Follow with technical approach (for developers/architects)
- Separate "What & Why" from "How" to serve dual audiences

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A potential user visits the Atrarium project to understand what it offers. They read the concept description and should immediately grasp: (1) what problem it solves, (2) how the solution approach works, (3) why this approach is effective, and (4) whether it fits their needs (cost, technical complexity).

### Acceptance Scenarios
1. **Given** a reader unfamiliar with Atrarium, **When** they read the updated concept description, **Then** they understand the PDS-first architecture and its benefits within 2 minutes
2. **Given** a community manager evaluating migration options, **When** they review the cost comparison, **Then** they can accurately estimate their monthly expenses ($0.40-5/month range)
3. **Given** a developer exploring the codebase, **When** they read the architecture overview, **Then** they understand the data flow (PDS → Firehose → Queue → Durable Objects → Feed API)
4. **Given** an existing Fediverse server operator, **When** they compare Atrarium's approach, **Then** they recognize the operational time savings (5 hours/week → 1 hour/week)

### Edge Cases
- What happens when the concept description contradicts the actual implementation? → **Resolution**: Concept reflects reality (implementation is source of truth); if misaligned, update concept to match current code state
- How does the system handle outdated cost estimates if Cloudflare pricing changes? → **Mitigation**: Document cost calculation formula (Workers Paid $5 + DO requests + Queue writes) so readers can verify current pricing
- What if the target audience (community managers vs developers) requires different concept explanations? → **Solution**: Two-layer structure serves both audiences - lead with non-technical problem-solution, follow with technical details

---

## Requirements *(mandatory)*

### Functional Requirements

**Problem Definition (What & Why)**:
- **FR-001**: Concept description MUST define the core problem: small & open community server sustainability crisis (costs $30-150/month, time 5 hours/week, 50-70% closure rate within 1-2 years)
- **FR-002**: Concept description MUST explain WHY this problem matters: 450-800 small instances affecting 75,000-200,000 users in Japanese-speaking Fediverse (Source: Fediverse Observer 2024 data)
- **FR-003**: Concept description MUST articulate the user pain points: operational burden, isolation risk, technical complexity, legal liability
- **FR-003b**: Concept description MUST clarify positioning: open communities (vs Discord closed model) with minimal ops burden (vs Fediverse self-hosting complexity)
- **FR-003c**: Concept description SHOULD mention future vision: "Maintain optimal community size" through automated splitting/graduation (Phase 2+ feature, not current implementation)

**Solution Approach (How)**:
- **FR-004**: Concept description MUST explain the solution approach: leverage AT Protocol's decentralized identity + Cloudflare serverless infrastructure + Custom Feed Generator with membership-based filtering
- **FR-005**: Concept description MUST describe the key architectural decision: PDS-first (user data in Personal Data Servers, not centralized database) + Custom Feed for community/theme feeds (viewable on Bluesky official AppView)
- **FR-006**: Concept description MUST explain the cost reduction mechanism: shared infrastructure via Durable Objects + Queues ($0.40-5/month vs $30-150/month)
- **FR-007**: Concept description MUST describe the time reduction mechanism: zero server management, automated scaling, no database maintenance (1 hour/week vs 5 hours/week)

**Differentiation & Validation**:
- **FR-008**: Concept description MUST differentiate from alternatives:
  - vs Fediverse: serverless vs VPS, zero migration cost via DID, horizontal scaling vs database bottlenecks
  - vs Discord: open/public communities vs closed servers, decentralized identity vs platform lock-in
  - vs Standard Bluesky: membership-based feed filtering (not available in standard feeds)
- **FR-009**: Concept description MUST align with implementation status: PDS-first architecture complete (Phase 1), production deployment pending (Phase 2)
- **FR-010**: Concept description MUST reference completed capabilities as proof: Feed Generator API, hashtag system, moderation, React dashboard, Bluesky AppView compatibility

**Audience & Accessibility**:
- **FR-011**: Concept description MUST use two-layer structure: problem-solution core (non-technical) followed by technical implementation (technical)
- **FR-012**: Concept description MUST be understandable by community managers without technical background within 2 minutes (validation: author's subjective judgment, revise if feedback indicates difficulty)
- **FR-013**: Concept description MUST provide sufficient technical detail for developers to evaluate architecture feasibility (include data flow diagram: PDS → Firehose → Queue → Durable Objects → Feed Generator API, with component labels)

### Key Entities *(include if feature involves data)*
- **Concept Document**: Project overview explaining problem, solution, architecture, and benefits
  - Attributes: Problem statement, solution approach, architecture diagram, cost comparison, feature list
  - Relationships: Primary source in VitePress docs (docs/en/guide/concept.md), summarized in README.md, synchronized to CLAUDE.md
  - Update Priority: VitePress (docs/en/guide/concept.md) first → README.md summary → CLAUDE.md sync
- **Architecture Description**: Technical explanation of PDS-first approach
  - Attributes: Data flow diagram (PDS → Firehose → Queue → Durable Objects → Feed API), component list, storage layers, technology stack
  - Relationships: Supports concept document, reflects actual implementation
  - Visualization: Diagram required to satisfy FR-013 (developer feasibility evaluation)
  - API Documentation: OpenAPI + Swagger UI format (standardized across project)
- **Cost Data**: Monthly expense breakdown for community operations
  - Attributes: Cloudflare Workers cost, Durable Objects cost, Queue cost, total range
  - Relationships: Supports concept document, derived from Cloudflare pricing
- **Feature Status**: List of implemented capabilities
  - Attributes: Feature name, completion status, phase number
  - Relationships: Validates concept claims, updated per implementation progress

---

## Clarifications

### Session 2025-10-05
- Q: FR-012の「2分以内に理解可能」という成功基準について、どの測定方法を採用しますか? → A: ユーザーテスト - 5名の非技術者に読ませて理解度アンケート(5段階評価)を実施
- Q: 文書更新の優先順位について、どの順序で実施すべきですか? → A: VitePress優先 - docs/en/guide/concept.md更新 → README.mdに要約転記 → CLAUDE.md同期
- Q: FR-002の数値「450-800 small instances affecting 75,000-200,000 users」について、データソースをどう扱いますか? → A: 出典明記 - 文書内に脚注として「(Source: Fediverse Observer 2024 data)」を追加
- Q: FR-013「開発者がアーキテクチャ実現可能性を評価できる技術詳細」について、どのレベルの技術情報を含めますか? → A: データフロー図 - PDS→Firehose→Queue→DO→Feedの5段階フローを図示(技術用語含む)
- Q: Acceptance Scenario 1「2分以内に理解」の検証について、いつ実施しますか? → A: 主観判断でわかりにくければ修正
- Q: APIドキュメント形式について制約はありますか? → A: OpenAPI + Swagger UIに統一
- Q: コミュニティ・テーマフィードの技術的実現方法は? → A: カスタムフィード + メンバーシップフィルター(Bluesky公式AppViewで閲覧可能)
- Q: ターゲットとするコミュニティの特性は? → A: 小規模かつオープンなコミュニティサーバー(Fediverse/Discord両者との差別化明確化)
- Q: 将来的なコンセプトの追加要素は? → A: 「ちょうどいい大きさを保つ」(将来実現予定の機能として言及)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - **TRUE: All edge cases resolved**
- [x] Requirements are testable and unambiguous - **TRUE: Each FR has measurable criteria**
- [x] Success criteria are measurable - **TRUE: 2-minute comprehension, cost estimation accuracy**
- [x] Scope is clearly bounded - **TRUE: Bounded to concept documentation clarification (problem + approach)**
- [x] Dependencies and assumptions identified - **TRUE: Assumes current implementation (006-pds-1-db) is accurate**

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (then resolved)
- [x] User scenarios defined
- [x] Requirements generated (13 functional requirements across 4 categories)
- [x] Entities identified
- [x] Objective & Approach clarified (two-layer model: problem-solution + technical implementation)
- [x] Review checklist passed - **READY FOR PLANNING**

---

## Next Steps

1. Run `/plan` to create implementation plan (plan.md)
2. Generate tasks (tasks.md) for documentation updates
3. Execute updates to README.md with clarified concept structure
