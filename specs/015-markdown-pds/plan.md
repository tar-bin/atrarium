# Implementation Plan: Markdown Formatting and Custom Emoji Support

**Branch**: `015-markdown-pds` | **Date**: 2025-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/015-markdown-pds/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ COMPLETE
2. Fill Technical Context → 🔄 IN PROGRESS
3. Fill Constitution Check section → ⏳ PENDING
4. Evaluate Constitution Check → ⏳ PENDING
5. Execute Phase 0 → research.md → ⏳ PENDING
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update → ⏳ PENDING
7. Re-evaluate Constitution Check → ⏳ PENDING
8. Plan Phase 2 → Describe task generation approach → ⏳ PENDING
9. STOP - Ready for /tasks command → ⏳ PENDING
```

**IMPORTANT**: The /plan command STOPS at step 8. Phase 2 is executed by /tasks command.

## Summary

This feature enables extended Markdown formatting (basic + tables, strikethrough, task lists) for posts and introduces a custom emoji system where users upload emoji to their personal PDS and community owners approve them for community-wide use. The system enforces per-community emoji namespaces with owner approval, stores all data in PDS using AT Protocol Lexicon schemas, and gracefully handles deleted/revoked emoji by displaying shortcodes as plain text.

## Technical Context

**Language/Version**: TypeScript 5.7 (server + client), Node.js via nodejs_compat (Cloudflare Workers)
**Primary Dependencies**:
- Server: Hono ^4.6.14, Zod ^4.1.11, @atproto/api ^0.13.35, oRPC ^1.9.3
- Client: React 19, TanStack Router v1, TanStack Query v5, shadcn/ui, react-hook-form + Zod
- Markdown: *To be determined in Phase 0 research* (candidates: remark, marked, markdown-it)
- Image validation: *To be determined in Phase 0 research* (candidates: sharp, image-size, native Web APIs)

**Storage**:
- PDS (AT Protocol Personal Data Servers) - permanent storage for emoji metadata and approval records
- User PDS blob storage - emoji image files (PNG/GIF/WEBP, max 500KB, max 256×256px)
- Durable Objects Storage - 7-day ephemeral cache for approved emoji lookups (per-community)
- Post content stored in user PDS using `net.atrarium.community.post` Lexicon (extended with Markdown field)

**Testing**:
- Server: Vitest + @cloudflare/vitest-pool-workers (contract, integration, unit tests)
- Client: Vitest + Testing Library (component tests), Playwright (E2E tests)

**Target Platform**:
- Server: Cloudflare Workers (Durable Objects + Queues)
- Client: Cloudflare Pages (static hosting)

**Project Type**: Web application (server + client monorepo with pnpm workspaces)

**Performance Goals**:
- Markdown rendering: <50ms for typical post (<5000 chars)
- Emoji image upload: <2s for 500KB file
- Emoji approval lookup: <10ms (Durable Objects cache hit)
- Post rendering with emoji: <100ms (p95)

**Constraints**:
- Emoji file size: ≤500KB
- Emoji dimensions: ≤256×256px
- Supported formats: PNG, GIF (animated allowed), WEBP only
- Markdown HTML passthrough: MUST be blocked (XSS prevention)
- Shortcode uniqueness: per-community namespace
- Approval workflow: pending → approved/rejected/revoked

**Scale/Scope**:
- Target: 1000 communities, 200 members/community, 10-50 custom emoji/community
- Storage impact: ~50MB emoji storage per community (50 emoji × 500KB worst case, actual ~100KB avg)
- Durable Objects operations: +2 emoji lookups per post render (emoji registry + approval check)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (extends existing server/ and client/ workspaces)
- ✅ No new databases (uses PDS + Durable Objects Storage ephemeral cache)
- ✅ No new services (extends existing Cloudflare Workers + Dashboard)
- ✅ Minimal dependencies (adds Markdown library + image validation utility only)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (new Lexicon schemas: `net.atrarium.emoji.custom`, `net.atrarium.emoji.approval`)
- ✅ Economic efficiency preserved (Durable Objects cache adds ~$0.10/month for 1000 communities, blob storage included in PDS costs)
- ✅ No framework proliferation (reuses Hono, React 19, TanStack stack)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (emoji metadata in user PDS, approval records in community owner PDS)
- ✅ Durable Objects used only as 7-day cache (emoji approval registry cache per community)
- ✅ No centralized user database created (all data in PDS, indexed via Firehose)

**Code Quality** (Principle 7):
- ✅ Biome linter checks configured and enforced (existing pre-commit hooks)
- ✅ Biome formatter checks configured and enforced (existing pre-commit hooks)
- ✅ TypeScript type checks configured and enforced (existing tsconfig strict mode)
- ✅ Pre-commit validation automated (existing CI/CD quality gates in package.json)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ Feature implementable using AT Protocol + PDS + Lexicon schemas only
  - Custom emoji metadata: `net.atrarium.emoji.custom` Lexicon (shortcode, blob ref, creator DID, format, dimensions, animated flag)
  - Emoji approval: `net.atrarium.emoji.approval` Lexicon (shortcode, emoji ref, community ID, status, approver DID, timestamp)
  - Post Markdown content: Extend `net.atrarium.community.post` with `markdown` field (optional, falls back to `text`)
- ✅ No separate databases (SQL/NoSQL/KV) introduced beyond Durable Objects cache
  - Emoji approval registry cached in Durable Objects Storage (shortcode → emoji URI mapping per community)
- ✅ All persistent state resides in PDS using `net.atrarium.*` Lexicon records
- ✅ Durable Objects Storage used only as 7-day ephemeral cache
  - Cache key: `emoji_registry:<communityId>` → Map<shortcode, emojiURI>
  - Rebuilt from PDS approval records on cache miss
- ✅ No feature requires additional database infrastructure

**Git Workflow and Commit Integrity** (Principle 9):
- ✅ Implementation plan includes complete commit strategy (no partial merges)
  - Commit 1: Lexicon schemas + PDS service methods
  - Commit 2: Server API endpoints + Durable Objects emoji cache
  - Commit 3: Client emoji upload UI + approval UI
  - Commit 4: Client Markdown editor + renderer
  - Commit 5: Tests + documentation
- ✅ Pre-commit hooks will validate all changes (no --no-verify planned)
- ✅ Emergency bypass procedures not applicable (standard feature development)
- ✅ CI/CD validation independent of local hooks (existing GitHub Actions)

**Conclusion**: ✅ PASS - Feature complies with all constitution principles

## Project Structure

### Documentation (this feature)
```
specs/015-markdown-pds/
├── spec.md              # Feature specification (/specify output)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) - TO BE CREATED
├── data-model.md        # Phase 1 output (/plan command) - TO BE CREATED
├── quickstart.md        # Phase 1 output (/plan command) - TO BE CREATED
├── contracts/           # Phase 1 output (/plan command) - TO BE CREATED
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

**Monorepo structure** (pnpm workspaces):

```
lexicons/                          # AT Protocol Lexicon schemas
├── net.atrarium.emoji.custom.json       # NEW: Custom emoji metadata
├── net.atrarium.emoji.approval.json     # NEW: Emoji approval records
└── net.atrarium.community.post.json     # MODIFIED: Add markdown field

shared/contracts/                  # oRPC API contracts
├── src/
│   ├── router.ts                        # MODIFIED: Add emoji routes
│   ├── schemas.ts                       # MODIFIED: Add emoji schemas
│   └── types.ts                         # MODIFIED: Add emoji types

server/                            # Cloudflare Workers backend
├── src/
│   ├── schemas/
│   │   ├── generated/                   # AUTO-GENERATED from lexicons/
│   │   ├── lexicon.ts                   # MODIFIED: Add emoji Lexicon types
│   │   └── validation.ts                # MODIFIED: Add emoji validation schemas
│   ├── services/
│   │   ├── atproto.ts                   # MODIFIED: Add emoji PDS operations
│   │   └── emoji-validation.ts          # NEW: Image format/size validation
│   ├── durable-objects/
│   │   └── community-feed-generator.ts  # MODIFIED: Add emoji registry cache
│   ├── routes/
│   │   ├── emoji.ts                     # NEW: Emoji upload/approval API
│   │   └── posts.ts                     # MODIFIED: Markdown rendering
│   └── utils/
│       └── markdown.ts                  # NEW: Markdown sanitization
└── tests/
    ├── contract/
    │   └── emoji/                       # NEW: Emoji API contract tests
    ├── integration/
    │   └── emoji-approval-flow.test.ts  # NEW: End-to-end emoji flow
    └── unit/
        ├── emoji-validation.test.ts     # NEW: Image validation tests
        └── markdown-sanitization.test.ts # NEW: Markdown XSS tests

client/                            # React dashboard
├── src/
│   ├── components/
│   │   ├── emoji/                       # NEW: Emoji components
│   │   │   ├── EmojiUploadForm.tsx
│   │   │   ├── EmojiApprovalList.tsx
│   │   │   └── EmojiPicker.tsx
│   │   ├── posts/
│   │   │   ├── MarkdownEditor.tsx       # NEW: Markdown editor with preview
│   │   │   └── PostRenderer.tsx         # MODIFIED: Add Markdown + emoji rendering
│   │   └── ui/                          # shadcn/ui components
│   ├── routes/
│   │   └── communities/
│   │       └── $id/
│   │           └── emoji.tsx            # NEW: Emoji management page
│   ├── lib/
│   │   ├── api.ts                       # MODIFIED: Add emoji API calls
│   │   └── markdown.ts                  # NEW: Client-side Markdown renderer
│   └── types.ts                         # MODIFIED: Add emoji types
└── tests/
    ├── components/
    │   └── emoji/                       # NEW: Emoji component tests
    └── integration/
        └── emoji-workflow.spec.ts       # NEW: E2E emoji tests (Playwright)
```

**Structure Decision**: Web application with server + client monorepo. Server extends existing Cloudflare Workers (Durable Objects + oRPC API), client extends React dashboard (TanStack Router). New Lexicon schemas define protocol-level contracts.

## Phase 0: Outline & Research
*Status: ⏳ PENDING*

### Research Tasks

1. **Markdown Library Selection**
   - **Unknown**: Best Markdown library for extended syntax (tables, strikethrough, task lists) with XSS protection
   - **Research scope**:
     - Compare: remark (unified ecosystem), marked (performance), markdown-it (extensibility)
     - Evaluate: Sanitization capabilities, bundle size, CommonMark + GFM compliance
     - Constraint: Must support safe HTML escaping (no raw HTML passthrough per FR-002)
   - **Decision criteria**: Security (built-in sanitization) > Bundle size < 50KB > API simplicity

2. **Image Validation Strategy**
   - **Unknown**: Best approach for validating emoji uploads (format, size, dimensions) in Cloudflare Workers
   - **Research scope**:
     - Option A: Sharp library (full-featured, may have Worker compatibility issues)
     - Option B: image-size (lightweight, format detection only, no validation)
     - Option C: Native Web APIs (Response.blob(), FileReader, Canvas API in Workers)
   - **Decision criteria**: Cloudflare Workers compatibility > Format detection (PNG/GIF/WEBP) > Dimensions extraction > Size validation

3. **PDS Blob Storage Best Practices**
   - **Unknown**: AT Protocol blob upload patterns (chunk size, error handling, blob ref format)
   - **Research scope**:
     - @atproto/api blob upload methods (AtpAgent.uploadBlob)
     - Blob reference format (CID-based URIs)
     - Error handling for upload failures, storage limits
   - **Decision criteria**: Official @atproto/api patterns > Retry strategy for failed uploads > Blob cleanup on emoji deletion

4. **Emoji Shortcode Rendering Performance**
   - **Unknown**: Efficient regex pattern for replacing emoji shortcodes in post text (`:emoji_name:` → `<img>`)
   - **Research scope**:
     - Regex patterns for shortcode matching (balanced for safety vs performance)
     - Rendering strategies: server-side vs client-side replacement
     - Caching strategies for emoji URI lookups
   - **Decision criteria**: XSS-safe regex (no ReDoS vulnerabilities) > <100ms rendering for 5000-char posts > Client-side caching

5. **Markdown + Emoji Integration**
   - **Unknown**: Order of operations for rendering (Markdown first → emoji replacement, or vice versa?)
   - **Research scope**:
     - Test: Parse Markdown → render HTML → replace emoji shortcodes
     - Test: Replace emoji shortcodes → parse Markdown (risk of emoji breaking Markdown syntax)
     - Edge cases: Emoji in code blocks (should NOT render), emoji in links
   - **Decision criteria**: Correctness (emoji in code blocks stay as text) > Simplicity

### Research Output Format

For each research task, document in `research.md`:
- **Decision**: [Chosen library/pattern]
- **Rationale**: [Why chosen based on decision criteria]
- **Alternatives considered**: [Other options evaluated and why rejected]
- **Implementation notes**: [Key patterns, gotchas, example code snippets]

**Output**: `/workspaces/atrarium/specs/015-markdown-pds/research.md`

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)

Extract entities from feature spec and research decisions:

**Entity: CustomEmoji** (stored in user PDS as `net.atrarium.emoji.custom` Lexicon record)
- `shortcode: string` - Unique identifier (e.g., `:my_emoji:`)
- `blob: BlobRef` - AT Protocol blob reference (CID-based URI)
- `creator: DID` - User who uploaded the emoji
- `uploadedAt: string` - ISO 8601 timestamp
- `format: 'png' | 'gif' | 'webp'` - Image format
- `size: number` - File size in bytes (≤500KB)
- `dimensions: { width: number, height: number }` - Image dimensions (≤256×256px)
- `animated: boolean` - True for animated GIFs

**Entity: EmojiApproval** (stored in community owner PDS as `net.atrarium.emoji.approval` Lexicon record)
- `shortcode: string` - Registered shortcode in community namespace
- `emojiRef: string` - AT URI of CustomEmoji (e.g., `at://did:plc:xxx/net.atrarium.emoji.custom/yyy`)
- `communityId: string` - Community ID (community hashtag without `#`)
- `status: 'approved' | 'rejected' | 'revoked'` - Approval status
- `approver: DID` - Community owner who made decision
- `decidedAt: string` - ISO 8601 timestamp
- `reason?: string` - Optional rejection/revocation reason

**Entity: Post (extended)** (stored in user PDS as `net.atrarium.community.post` Lexicon record)
- Existing fields: `text`, `communityId`, `createdAt`
- **NEW**: `markdown?: string` - Markdown-formatted content (optional, falls back to `text` if absent)
- **NEW**: `emojiShortcodes?: string[]` - Array of emoji shortcodes used in post (for indexing/caching)

**Durable Objects Cache Schema** (CommunityFeedGenerator per-community cache)
- Key: `emoji_registry:<communityId>`
- Value: `Map<shortcode, { emojiURI: string, blobURI: string, animated: boolean }>`
- TTL: 7 days (rebuilt from PDS approval records on miss)

### 2. API Contracts (`contracts/`)

Generate oRPC contracts from functional requirements:

**Emoji Management API** (extends `shared/contracts/src/router.ts`):

```typescript
// POST /api/emoji/upload
{
  input: { file: Blob, shortcode: string }
  output: { emojiURI: string, blob: BlobRef }
  errors: { InvalidFormat, FileTooLarge, DimensionsExceeded }
}

// GET /api/emoji/list (user's own emoji)
{
  input: { did: DID }
  output: { emoji: CustomEmoji[] }
}

// POST /api/communities/:id/emoji/submit (submit for approval)
{
  input: { communityId: string, emojiURI: string }
  output: { submissionId: string, status: 'pending' }
}

// GET /api/communities/:id/emoji/pending (owner only)
{
  input: { communityId: string }
  output: { submissions: EmojiSubmission[] }
  auth: Required (owner/moderator role)
}

// POST /api/communities/:id/emoji/approve
{
  input: { communityId: string, emojiURI: string, approve: boolean, reason?: string }
  output: { approvalURI: string, status: 'approved' | 'rejected' }
  auth: Required (owner/moderator role)
}

// POST /api/communities/:id/emoji/revoke
{
  input: { communityId: string, shortcode: string, reason?: string }
  output: { success: boolean }
  auth: Required (owner/moderator role)
}

// GET /api/communities/:id/emoji/registry (approved emoji for rendering)
{
  input: { communityId: string }
  output: { emoji: Map<shortcode, EmojiMetadata> }
  cache: Durable Objects (7-day TTL)
}
```

**Post Rendering API** (extends existing `/api/communities/:id/posts`):

```typescript
// Markdown rendering is client-side only (security + bundle size)
// Server provides raw markdown field, client renders with emoji replacement
```

### 3. Contract Tests (`tests/contract/emoji/`)

Generate failing tests (TDD approach):

- `emoji-upload.test.ts`: Test file validation (format, size, dimensions)
- `emoji-approval.test.ts`: Test approval workflow (pending → approved/rejected)
- `emoji-registry-cache.test.ts`: Test Durable Objects cache hit/miss
- `emoji-revocation.test.ts`: Test revoke flow + post fallback

### 4. Quickstart Scenario (`quickstart.md`)

**Title**: Upload and approve custom emoji

**Scenario**:
1. Alice uploads custom emoji `:alice_wave:` (PNG, 128×128px, 50KB) to her PDS
2. Alice submits `:alice_wave:` for approval in Community A
3. Bob (Community A owner) approves the emoji
4. Alice creates a post with Markdown: `**Hello!** :alice_wave:`
5. Post renders with bold "Hello!" and Alice's custom emoji image

**Expected outcomes**:
- `:alice_wave:` visible in Community A emoji picker
- Post shows formatted Markdown + emoji image
- Other communities don't see `:alice_wave:` (per-community namespace)

### 5. Update CLAUDE.md

Run agent context update script:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Updates**:
- Add Markdown library to "Primary Dependencies"
- Add custom emoji Lexicon schemas to "Data Storage (PDS-First Architecture)"
- Add emoji approval workflow to "Core Components"
- Update "Implementation Status" with 015-markdown-pds progress

**Output**: Updated `/workspaces/atrarium/CLAUDE.md`

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base template
2. Generate tasks from Phase 1 artifacts:
   - Lexicon schemas → Lexicon definition tasks
   - Data model → PDS service method tasks
   - Contracts → API endpoint implementation tasks
   - Quickstart → Integration test tasks
3. Apply TDD ordering: Tests before implementation
4. Mark [P] for parallel execution (independent files/modules)

**Task Categories**:

**A. Lexicon Schemas** (6 tasks):
1. Define `net.atrarium.emoji.custom` Lexicon schema
2. Define `net.atrarium.emoji.approval` Lexicon schema
3. Extend `net.atrarium.community.post` with `markdown` field
4. Generate TypeScript types from Lexicon schemas
5. Validate Lexicon schemas against AT Protocol spec
6. Update Lexicon publication endpoint with new schemas

**B. Server: PDS Integration** (8 tasks):
7. Implement emoji blob upload to PDS (AtpAgent.uploadBlob) [P]
8. Implement emoji metadata write to PDS (`net.atrarium.emoji.custom` record) [P]
9. Implement emoji approval write to PDS (`net.atrarium.emoji.approval` record)
10. Implement emoji listing from PDS (query user's emoji records)
11. Implement approval listing from PDS (query community's approval records)
12. Implement post Markdown field write to PDS (extend existing post creation)
13. Unit tests for PDS emoji operations [P]
14. Integration test: Upload emoji → submit → approve → list approved

**C. Server: Image Validation** (4 tasks):
15. Implement image format validation (PNG/GIF/WEBP detection)
16. Implement image size validation (≤500KB)
17. Implement image dimensions validation (≤256×256px)
18. Unit tests for image validation (valid/invalid cases)

**D. Server: Durable Objects Emoji Cache** (5 tasks):
19. Extend CommunityFeedGenerator with emoji registry cache
20. Implement cache rebuild from PDS approval records (on miss)
21. Implement cache invalidation on approval/revocation
22. Unit tests for emoji registry cache [P]
23. Contract test: Registry cache hit/miss performance

**E. Server: API Endpoints** (8 tasks):
24. Implement POST /api/emoji/upload (oRPC route)
25. Implement GET /api/emoji/list (oRPC route) [P]
26. Implement POST /api/communities/:id/emoji/submit (oRPC route)
27. Implement GET /api/communities/:id/emoji/pending (oRPC route, auth required) [P]
28. Implement POST /api/communities/:id/emoji/approve (oRPC route, auth required)
29. Implement POST /api/communities/:id/emoji/revoke (oRPC route, auth required)
30. Implement GET /api/communities/:id/emoji/registry (oRPC route, cached)
31. Contract tests for all emoji API endpoints

**F. Client: Markdown Rendering** (6 tasks):
32. Implement Markdown parser (selected library from research)
33. Implement Markdown sanitization (block raw HTML)
34. Implement emoji shortcode replacement in rendered Markdown
35. Component: MarkdownEditor with live preview
36. Component: PostRenderer with Markdown + emoji
37. Unit tests for Markdown rendering + XSS protection

**G. Client: Emoji Management UI** (7 tasks):
38. Component: EmojiUploadForm (file picker, shortcode input, validation feedback)
39. Component: EmojiApprovalList (pending submissions with approve/reject actions)
40. Component: EmojiPicker (approved emoji selector for post editor)
41. Route: /communities/:id/emoji (emoji management page, owner only)
42. API client methods (upload, list, approve, revoke)
43. Component tests for emoji UI [P]
44. E2E test: Upload → submit → approve → use in post (Playwright)

**H. Integration & Documentation** (6 tasks):
45. Integration test: Quickstart scenario (Alice uploads → Bob approves → Alice posts)
46. Integration test: Edge case - deleted emoji fallback (shortcode as text)
47. Integration test: Edge case - revoked emoji fallback
48. Update API documentation with emoji endpoints
49. Update user guide with emoji upload/approval workflow
50. Update CHANGELOG with 015-markdown-pds feature

**Estimated Total**: 50 tasks

**Ordering Constraints**:
- Lexicon schemas (1-6) → PDS integration (7-14) → API endpoints (24-31)
- Image validation (15-18) can run in parallel with PDS integration
- Durable Objects cache (19-23) depends on PDS approval listing (11)
- Client tasks (32-44) can start after API contracts defined (Phase 1)
- Integration tests (45-47) depend on both server and client completion

**Parallel Execution Opportunities** (marked [P]):
- Tasks 7-8 (PDS emoji upload + metadata write)
- Tasks 13, 22, 25, 27, 43 (independent test suites)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations - this section is empty*

## Progress Tracking
*Updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research approach defined (to be executed: research.md generation)
- [x] Phase 1: Design approach defined (to be executed: contracts, data-model.md, quickstart.md, CLAUDE.md update)
- [x] Phase 2: Task planning approach described (execution deferred to /tasks command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS (to be re-evaluated after Phase 1)
- [ ] All NEEDS CLARIFICATION resolved (to be verified in Phase 0)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.4.0 - See `.specify/memory/constitution.md`*
