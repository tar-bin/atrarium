# Implementation Plan: Direct Feed Posting by Feed ID

**Branch**: `003-id` | **Date**: 2025-10-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/003-id/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context (scan for NEEDS CLARIFICATION) - in progress
3. Fill Constitution Check section
4. Evaluate Constitution Check
5. Execute Phase 0 → research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent context
7. Re-evaluate Constitution Check
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution

## Summary

Enable community members to post directly to specific feeds within Atrarium communities using system-generated unique hashtags (#atr_xxxxx). Posts are saved to user's PDS with embedded hashtags, discovered via AT Protocol Firehose monitoring, and indexed in D1 with membership validation. This approach maintains AT Protocol standard compliance while enabling community-managed access control through dual verification (hashtag + membership).

## Technical Context

**Language/Version**: TypeScript (existing codebase standard)
**Primary Dependencies**:
- @atproto/api (AT Protocol SDK)
- Hono (existing HTTP router)
- Cloudflare Workers SDK (D1, KV, Durable Objects)
- Zod (validation)

**Storage**:
- Cloudflare D1 (SQLite) - feed definitions, hashtag mappings, membership, post indexes, moderation data
- User PDS - post content with embedded hashtags
- Cloudflare KV - post content cache (7 days TTL)

**Testing**: Vitest + @cloudflare/vitest-pool-workers (existing test setup)

**Target Platform**: Cloudflare Workers (serverless, existing deployment)

**Project Type**: Single backend project (Cloudflare Workers)

**Performance Goals**:
- Feed generation < 200ms (p95)
- Hashtag generation uniqueness: >99.999% (8-char hex = 4.3B combinations)
- Firehose processing throughput: sustain full Bluesky network firehose

**Constraints**:
- AT Protocol standard compliance (no custom PDS metadata)
- Hashtag prefix #atr_ reserved (avoid user hashtag pollution)
- Membership verification required before indexing
- PDS as source of truth for post content

**Scale/Scope**:
- Support existing D1 schema (communities, theme_feeds, memberships, post_index tables)
- Extend post_index with moderation_status column
- Add feed_blocklist table for user-level blocks
- Add moderation_logs table for audit trail

**Unresolved (FR-010 Spam Prevention)**:
Decision: Implement basic rate limiting (10 posts/minute per user per community) + defer advanced spam detection to Phase 2

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is template-only (no project-specific rules enforced). Proceeding with Atrarium project standards:
- ✅ Test-first development (existing Vitest setup)
- ✅ Contract tests for API changes
- ✅ D1 schema migrations documented
- ✅ No breaking changes to existing Feed Generator API

## Project Structure

### Documentation (this feature)
```
specs/003-id/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── post-to-feed.yaml          # POST /api/posts (with hashtag appending)
│   ├── get-feed-skeleton.yaml     # GET /xrpc/app.bsky.feed.getFeedSkeleton (updated)
│   └── moderation.yaml            # Moderation endpoints
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── models/
│   ├── theme-feed.ts              # Add hashtag generation/lookup
│   ├── post-index.ts              # Add moderation_status, membership checks
│   ├── feed-blocklist.ts          # New: blocked users per feed/community
│   └── moderation-log.ts          # New: audit trail
├── services/
│   ├── feed-hashtag-generator.ts  # New: generate #atr_xxxxx
│   ├── firehose-indexer.ts        # New: Durable Object for Firehose monitoring
│   └── moderation.ts              # New: hide posts, block users
├── routes/
│   ├── posts.ts                   # Update: add hashtag appending logic
│   ├── feed-generator.ts          # Update: filter by moderation_status + membership
│   └── moderation.ts              # New: moderation API endpoints
└── durable-objects/
    └── firehose-subscription.ts   # New: WebSocket connection to Firehose

tests/
├── contract/
│   ├── feed-generator/
│   │   └── get-feed-skeleton-with-hashtags.test.ts  # New
│   ├── dashboard/
│   │   ├── post-to-feed-with-hashtag.test.ts        # New
│   │   └── moderation.test.ts                        # New
├── integration/
│   ├── hashtag-indexing-flow.test.ts        # New: end-to-end hashtag flow
│   └── moderation-flow.test.ts              # New: hide/block workflow
└── unit/
    ├── feed-hashtag-generator.test.ts       # New
    └── membership-validation.test.ts        # New

schema.sql                        # Update: add moderation columns/tables
migrations/
└── 003-add-feed-hashtags.sql    # New: migration script
```

**Structure Decision**: Single backend project following existing Atrarium structure (Cloudflare Workers with Hono router, D1 database, Vitest tests).

## Phase 0: Outline & Research

**Unknowns to Research**:
1. ~~Spam prevention approach~~ → Resolved: Basic rate limiting (10 posts/min/user/community)
2. Hashtag uniqueness strategy → Research: collision probability, generation algorithm
3. Firehose subscription patterns → Research: Durable Objects best practices, backpressure handling
4. Moderation event propagation → Research: eventual consistency patterns in D1

**Research Tasks** (output to research.md):
1. **Hashtag Generation Algorithm**:
   - Decision: crypto.randomUUID().slice(0,8) vs timestamp-based
   - Collision probability analysis (8 hex chars = 4.3B space)
   - Hashtag validation regex

2. **Firehose Integration Patterns**:
   - Durable Objects lifecycle management
   - WebSocket reconnection strategy
   - Backpressure handling when D1 writes slow down
   - CAR file parsing for post records

3. **Membership + Hashtag Dual Validation**:
   - Query optimization: JOIN memberships on post_index
   - Index strategy for fast membership lookups
   - Cache invalidation when user removed from community

4. **Moderation State Management**:
   - Eventual consistency: user banned → posts disappear timeline
   - Bulk invalidation when user removed (UPDATE post_index WHERE author_did)
   - Audit log retention policy

**Output**: research.md with decisions documented

## Phase 1: Design & Contracts

**Entities Extracted** (→ data-model.md):
1. **FeedHashtag** (extend theme_feeds table):
   - hashtag: TEXT UNIQUE NOT NULL (format: #atr_[8-hex])
   - Index: UNIQUE idx_theme_feeds_hashtag

2. **Post IndexEntry** (extend post_index table):
   - moderation_status: TEXT DEFAULT 'approved' CHECK IN ('approved', 'hidden', 'reported')
   - indexed_at: INTEGER NOT NULL (Firehose detection time)
   - Index: idx_post_index_moderation (feed_id, moderation_status, created_at DESC)

3. **FeedBlocklist** (new table):
   - feed_id: TEXT NOT NULL
   - blocked_user_did: TEXT NOT NULL
   - reason: TEXT
   - blocked_by_did: TEXT NOT NULL
   - blocked_at: INTEGER NOT NULL
   - PRIMARY KEY (feed_id, blocked_user_did)

4. **ModerationLog** (new table):
   - id: INTEGER PRIMARY KEY AUTOINCREMENT
   - action: TEXT NOT NULL CHECK IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user')
   - target_uri: TEXT (post URI or user DID)
   - feed_id: TEXT
   - moderator_did: TEXT NOT NULL
   - reason: TEXT
   - performed_at: INTEGER NOT NULL

**API Contracts** (→ /contracts/):

1. **POST /api/posts** (updated):
   ```yaml
   # contracts/post-to-feed.yaml
   requestBody:
     feedId: string (feed ID to post to)
     text: string (user's post text)
     media?: array (optional attachments)

   response (201):
     postUri: string (at://... URI from PDS)
     hashtags: array<string> (appended #atr_xxxxx)

   errors:
     400: Feed not found
     403: User not a member of community
     429: Rate limit exceeded (10 posts/min)
   ```

2. **GET /xrpc/app.bsky.feed.getFeedSkeleton** (updated):
   ```yaml
   # contracts/get-feed-skeleton.yaml
   query:
     feed: string (at://... feed URI)
     limit?: number (default 50)
     cursor?: string

   response (200):
     feed: array<{post: string}> # Filtered by moderation_status='approved' + membership
     cursor?: string

   # New behavior: Excludes hidden posts and blocked users
   ```

3. **POST /api/moderation/hide-post** (new):
   ```yaml
   # contracts/moderation.yaml
   requestBody:
     postUri: string
     reason?: string

   response (200):
     success: boolean

   errors:
     403: Insufficient permissions (requires moderator role)
     404: Post not in feed index
   ```

4. **POST /api/moderation/block-user** (new):
   ```yaml
   requestBody:
     userDid: string
     feedId: string (or communityId for all feeds)
     reason?: string

   response (200):
     success: boolean
     affectedPosts: number (count of posts removed from index)
   ```

**Contract Tests** (must fail initially):
- `tests/contract/dashboard/post-to-feed-with-hashtag.test.ts`
- `tests/contract/feed-generator/get-feed-skeleton-with-moderation.test.ts`
- `tests/contract/moderation/hide-post.test.ts`
- `tests/contract/moderation/block-user.test.ts`

**Integration Test Scenarios** (→ quickstart.md):
1. User posts to feed → hashtag appended → appears in feed
2. Non-member attempts post → rejected
3. Moderator hides post → disappears from feed skeleton
4. User removed from community → all posts disappear
5. Manual hashtag added by external client → indexed if member

**Agent Context Update**:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Output**: data-model.md, contracts/*.yaml, failing contract tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md`
2. Generate from Phase 1 artifacts:
   - Schema migration task (003-add-feed-hashtags.sql)
   - Model updates (theme-feed, post-index, new models)
   - Service implementations (hashtag generator, Firehose indexer, moderation)
   - Route updates (posts.ts, feed-generator.ts, new moderation.ts)
   - Durable Object implementation (Firehose subscription)
   - Contract tests (one per endpoint)
   - Integration tests (user stories)

**Ordering Strategy** (TDD + dependency order):
1. Schema migration [P]
2. Hashtag generator unit tests [P]
3. Hashtag generator implementation [P]
4. Model updates (add hashtag column) [P]
5. Contract test: POST /api/posts with hashtag
6. Implement hashtag appending in routes/posts.ts
7. Firehose Durable Object contract test
8. Implement Firehose subscription + indexing
9. Membership validation unit tests
10. Integrate membership check in indexing
11. Contract test: moderation endpoints
12. Implement moderation service
13. Integration tests (user stories 1-5)

**Estimated Output**: ~25-30 tasks in dependency order

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md)
**Phase 5**: Validation (run tests, execute quickstart.md, performance checks)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | Constitution is template-only | Following existing project patterns |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (template-only constitution)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (FR-010 decided: basic rate limiting)
- [x] Complexity deviations documented (N/A)

**Generated Artifacts**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/post-to-feed.yaml (Phase 1)
- [x] contracts/get-feed-skeleton.yaml (Phase 1)
- [x] contracts/moderation.yaml (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)

---
*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
