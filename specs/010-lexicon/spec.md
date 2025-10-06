# Feature Specification: AT Protocol Lexicon Publication

**Feature Branch**: `010-lexicon`
**Created**: 2025-10-06
**Status**: Draft
**Input**: User description: "Lexiconの公開に必要な準備を実施"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Publish AT Protocol Lexicon schemas for external validation
2. Extract key concepts from description
   → Actors: PDS servers, AT Protocol clients, Atrarium dashboard
   → Actions: Publish Lexicon JSON schemas, serve via HTTP endpoints
   → Data: 3 Lexicon schemas (community.config, community.membership, moderation.action)
   → Constraints: Must follow AT Protocol Lexicon discovery conventions
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Should Lexicon files be versioned? (e.g., v1/net.atrarium.community.config.json)]
   → [NEEDS CLARIFICATION: Are there schema update/migration policies needed?]
4. Fill User Scenarios & Testing section
   → User flow: PDS attempts to validate custom record → fetches Lexicon → validates successfully
5. Generate Functional Requirements
   → Each requirement must be testable
6. Identify Key Entities (if data involved)
   → Lexicon schemas (existing JSON definitions)
7. Run Review Checklist
   → WARN "Spec has uncertainties around versioning and migration"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Strategic Context

**Core Value Proposition**: Atrarium's true value lies in AT Protocol Lexicon schemas (`net.atrarium.*`), which define community data structures as an open standard. All implementations (client/server) are reference implementations and fully replaceable.

**Why This Matters**:
- Lexicon schemas are the API contract; infrastructure is interchangeable
- Publishing schemas enables third-party implementations
- No vendor lock-in: communities can migrate to any AT Protocol-compatible server
- Interoperability: official Bluesky apps can interact with Atrarium communities via published schemas

## User Scenarios & Testing *(mandatory)*

### Primary User Story
When a user creates a community record in their Personal Data Server (PDS), the PDS needs to validate the record against Atrarium's custom Lexicon schema. The PDS server fetches the Lexicon schema from Atrarium's published endpoint and successfully validates the community configuration before storing it.

### Acceptance Scenarios
1. **Given** a PDS server receiving a `net.atrarium.community.config` record, **When** the PDS fetches the Lexicon schema from Atrarium's public endpoint, **Then** the schema is successfully retrieved and used for validation
2. **Given** an AT Protocol client creating a membership record, **When** the client validates the record structure, **Then** the Lexicon schema is accessible and defines all required fields correctly
3. **Given** Atrarium dashboard creating a moderation action, **When** the PDS validates the record, **Then** the schema correctly validates all moderation action types (hide_post, unhide_post, block_user, unblock_user)

### Edge Cases
- What happens when a PDS cannot reach the Lexicon endpoint (network failure)?
  - PDS servers should cache schemas locally; Atrarium endpoint must have high availability
- How does the system handle Lexicon schema updates after records are already created?
  - Follow AT Protocol rules: only additive changes allowed (new optional fields), ensuring old records remain valid
- What happens if a client uses an outdated Lexicon schema?
  - Backwards compatibility guaranteed during beta period; breaking changes require new namespace migration path

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST publish Lexicon JSON schemas at publicly accessible HTTP endpoints
- **FR-002**: System MUST serve the following 3 Lexicon schemas:
  - `net.atrarium.community.config` (community metadata)
  - `net.atrarium.community.membership` (user memberships)
  - `net.atrarium.moderation.action` (moderation actions)
- **FR-003**: Lexicon endpoints MUST follow AT Protocol discovery conventions for custom namespaces
- **FR-004**: Lexicon schemas MUST be accessible without authentication (publicly readable)
- **FR-005**: System MUST serve Lexicon files with correct MIME type (`application/json`)
- **FR-006**: System MUST use Lexicon JSON files in `lexicons/` as the single source of truth
- **FR-007**: System MUST generate TypeScript type definitions from Lexicon JSON files using `@atproto/lexicon` tooling (e.g., `lex-cli`)
- **FR-012**: System MUST include generated TypeScript types in version control for build reproducibility
- **FR-008**: Lexicon endpoints MUST support CORS headers for cross-origin access from PDS servers
- **FR-009**: System MUST provide stable URLs for Lexicon schemas (no breaking changes to existing URLs)
- **FR-010**: System MUST follow AT Protocol Lexicon versioning rules: additive-only changes allowed (new optional fields), breaking changes require new namespace (e.g., `net.atrarium.v2.*`)
- **FR-011**: System MUST document beta status of current schemas, indicating breaking changes are possible before third-party adoption milestone

### Non-Functional Requirements
- **NFR-001**: Lexicon endpoint availability relies on Cloudflare Workers default SLA (best-effort, no additional monitoring required)
- **NFR-002**: Response time for Lexicon schema requests SHOULD be under 100ms (p95)
- **NFR-003**: Endpoint MUST support HTTP caching headers:
  - Beta period: `Cache-Control: public, max-age=3600` + `ETag` header for conditional requests
  - Post-stabilization: `Cache-Control: public, max-age=86400, immutable` (24-hour cache)
- **NFR-004**: Endpoint MUST respond with `304 Not Modified` when `If-None-Match` matches current `ETag`

### Key Entities *(include if feature involves data)*
- **Lexicon Schema**: JSON file defining record structure for AT Protocol custom records
  - Contains: schema ID, field definitions, validation rules, type constraints
  - 3 schemas exist: community.config, community.membership, moderation.action
  - Source location: `lexicons/` (top-level directory, single source of truth)
  - TypeScript types auto-generated from JSON using `@atproto/lexicon` tooling
- **Publication Endpoint**: HTTP endpoint serving Lexicon schemas to external systems
  - Must be publicly accessible (no authentication)
  - Must follow AT Protocol conventions (simple HTTP endpoint: `/xrpc/net.atrarium.lexicon.get`)
  - Serves JSON files from `lexicons/` directory

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (5 questions answered)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Clarifications

### Session 2025-10-06
- Q: 現在のLexiconスキーマ（`net.atrarium.*`）は本番公開準備完了ですか、それとも実験的ステータスですか？ → A: ベータステータス - 現在の名前空間を維持するが、初期フィードバック後に破壊的変更の可能性あり（第三者採用前）
- Q: Lexiconエンドポイントの可用性目標は？ → A: ベストエフォート - Cloudflare Workersのデフォルト可用性に依存（特別な監視なし）
- Q: Lexiconスキーマ配信時のHTTPキャッシュ戦略は？ → A: 条件付きキャッシュ（ベータ期間中） - `Cache-Control: public, max-age=3600` + `ETag`ヘッダー、安定後は長期キャッシュ（24時間 immutable）に移行
- Q: Lexicon JSONファイルの配置場所は？ → A: `lexicons/` - トップレベルディレクトリ（実装非依存のプロトコル定義として、ソースコードから分離）
- Q: JSON定義とTypeScript型定義の整合性をどう保証する？ → A: 単一ソース - JSON定義からTypeScriptコードを自動生成（`@atproto/lexicon`の`lex-cli`使用）
