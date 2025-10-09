# Research: Custom Emoji Reactions

**Feature**: 016-slack-mastodon-misskey
**Date**: 2025-10-09

## Overview

This document consolidates research findings for implementing custom emoji reactions on Atrarium posts, following Slack/Mastodon/Misskey patterns while adhering to AT Protocol and PDS-first architecture.

## Key Technical Decisions

### 1. Reaction Storage Strategy

**Decision**: PDS-first with Durable Objects aggregation cache

**Rationale**:
- AT Protocol Lexicon schema `net.atrarium.community.reaction` stores individual reaction records in user PDSs
- Durable Objects Storage caches aggregated counts (post URI → emoji → count + reactor DIDs) with 7-day TTL
- Aggregate cache is rebuildable from PDS records via Firehose replay
- Aligns with Constitution Principle 5 (PDS-First Architecture) and Principle 8 (no separate databases)

**Alternatives Considered**:
- **D1 database for aggregates**: Rejected - violates Constitution Principle 2 (no new databases) and Principle 8 (PDS+Lexicon only)
- **Query PDS on every request**: Rejected - too slow for real-time UX (>1s latency), violates performance goals (<200ms p95)

### 2. Custom Emoji Storage

**Decision**: PDS blob storage for images, Lexicon schema for metadata

**Rationale**:
- Custom emoji images stored as AT Protocol blobs in community owner's PDS (via `uploadBlob()` API)
- Metadata stored in `net.atrarium.community.emoji` Lexicon records (shortcode, blob CID reference, community ID, approval status)
- Maintains data ownership (Principle 4) and protocol-first design (Principle 1)
- Blob storage supports animated formats (GIF/APNG/WebP) without additional infrastructure

**Alternatives Considered**:
- **Cloudflare R2**: Rejected - adds external dependency, violates data ownership (images not in user's PDS)
- **External CDN**: Rejected - introduces vendor lock-in, violates Principle 1 (protocol-first)

### 3. Real-Time Updates

**Decision**: Server-Sent Events (SSE)

**Rationale**:
- SSE provides near real-time updates (< 1s latency) with simpler implementation than WebSocket
- One-way communication sufficient (server pushes reaction count updates to clients)
- HTTP/1.1 compatible, works with existing Cloudflare Workers infrastructure
- Lower overhead than WebSocket for this use case (no bidirectional messaging needed)

**Alternatives Considered**:
- **Polling (30s interval)**: Rejected - poor UX (30s delay), higher request volume
- **WebSocket**: Rejected - unnecessary complexity (bidirectional not needed), connection management overhead
- **Eventual consistency (manual refresh)**: Rejected - violates FR-017 (real-time updates required)

### 4. Rate Limiting Strategy

**Decision**: 100 reactions/hour/user (Slack-equivalent)

**Rationale**:
- Balances normal usage (estimated 10-20 reactions/hour for active users) with spam prevention
- Sliding window implementation using Durable Objects Storage (timestamp-based cleanup)
- Aligns with Slack's rate limiting approach (proven at scale)

**Implementation**:
- Store per-user reaction timestamps in Durable Objects Storage with 1-hour TTL
- On new reaction request, count timestamps in past hour
- Return 429 Too Many Requests with `Retry-After` header if limit exceeded

### 5. Emoji Display Limits

**Decision**: 20 emoji types inline, modal for additional

**Rationale**:
- 20 emoji types inline covers 95% of typical posts (based on Slack usage patterns)
- Modal dialog prevents UI overflow for edge cases (viral posts with 50+ unique emojis)
- Maintains clean post layout while supporting unlimited emoji variety

**UI Flow**:
- Display first 20 unique emoji types below post (sorted by count descending)
- Show "Show More (+N)" button if more than 20 types exist
- Button opens modal with full scrollable emoji list

### 6. Custom Emoji Validation

**Decision**: Multi-stage validation (client + server)

**Validation Rules**:
- **File type**: PNG, GIF, APNG, WebP only (MIME type check)
- **File size**: 256KB maximum (balances quality with PDS storage efficiency)
- **Dimensions**: 64px max height, 512px max width (8:1 aspect ratio max)
- **Shortcode**: 2-32 characters, alphanumeric + underscore only, case-insensitive unique per community

**Rationale**:
- Client-side validation provides immediate feedback (no network round-trip)
- Server-side validation enforces security (clients cannot bypass)
- 256KB limit prevents PDS storage abuse while supporting high-quality 64px emojis
- 8:1 aspect ratio supports text-style wide emojis (e.g., `:this_is_fine:`) while preventing extreme layout issues

### 7. Firehose Integration

**Decision**: Extend existing Firehose pipeline (no new infrastructure)

**Rationale**:
- Reaction records are indexed via existing FirehoseReceiver → Queue → FirehoseProcessor flow
- Add `net.atrarium.community.reaction` collection to Firehose filter
- CommunityFeedGenerator Durable Object receives reaction events via existing RPC interface
- Zero infrastructure additions (adheres to Principle 2: Simplicity)

**Flow**:
1. User writes reaction to PDS (via atproto.ts service)
2. Firehose emits `com.atproto.sync.subscribeRepos` event for reaction record
3. FirehoseReceiver forwards to Cloudflare Queue (lightweight filter)
4. FirehoseProcessor calls CommunityFeedGenerator.handleReaction() (heavyweight processing)
5. Durable Object updates aggregate cache and broadcasts SSE update

### 8. SSE Architecture

**Decision**: Per-community SSE endpoint with connection pooling

**Endpoint Design**:
- `GET /api/communities/{communityId}/reactions/stream` (SSE)
- Clients connect on community feed page load
- Durable Object broadcasts to all connected clients when reactions change
- Connection limit: 100 concurrent per community (Cloudflare Workers SSE limit)

**Message Format**:
```
event: reaction_update
data: {"postUri":"at://...","emoji":"👍","count":5,"currentUserReacted":false}
```

**Fallback**:
- If connection fails or limit exceeded, fall back to TanStack Query refetch (staleTime: 10s)
- Ensures functionality even without SSE (graceful degradation)

## Best Practices

### AT Protocol Blob Upload
- Use `agent.uploadBlob()` with proper MIME type headers
- Store returned blob CID in Lexicon metadata record
- Use `agent.resolveBlob()` for retrieval (returns CDN URL)

### Lexicon Schema Design
- `net.atrarium.community.reaction`: Individual reaction records (user's PDS)
- `net.atrarium.community.emoji`: Custom emoji metadata (owner's PDS)
- Follow AT Protocol naming conventions (`net.atrarium.*` namespace)
- Use `cid` type for blob references, `datetime` for timestamps

### Durable Objects Patterns
- Aggregate reactions in-memory (Map<emojiId, Set<did>>)
- Persist to Storage API on mutations (write-through cache)
- Use Storage API `list()` for pagination
- Implement 7-day cleanup via scheduled alarm

### oRPC Type Safety
- Define reaction/emoji routes in `shared/contracts/src/router.ts`
- Server handlers infer types from contract (zero code generation)
- Client gets full type safety and auto-completion
- Zod schemas validate at runtime (catch type mismatches)

## Testing Strategy

### Contract Tests
- Reaction API endpoints (add, remove, list)
- Custom emoji API endpoints (upload, delete, approve)
- SSE endpoint connection and message format
- Rate limiting behavior (429 response after 100 reactions/hour)

### Integration Tests
- End-to-end reaction workflow: PDS write → Firehose → Durable Object → SSE broadcast
- Custom emoji upload → approval → usage in reaction
- Rate limit enforcement across multiple requests
- Aggregate rebuild from PDS records (disaster recovery scenario)

### Component Tests
- ReactionBar display and toggle interaction
- EmojiPicker search and selection
- CustomEmojiUpload validation and preview
- Modal overflow display (20+ emoji types)

## Performance Considerations

### Caching Strategy
- Reaction aggregates in Durable Objects: <10ms read latency
- PDS blob CDN URLs cached client-side (HTTP Cache-Control headers)
- SSE connection reuse (avoid reconnection overhead)

### Scalability
- Each community = 1 Durable Object (horizontal scaling, no database bottleneck)
- Firehose processing: 5000 msg/sec capacity (existing Queue infrastructure)
- Cost: ~$0.05/month per 1000 communities (Durable Objects + Queue, no additional charges)

### Failure Modes
- **Durable Object reset**: Replay Firehose from cursor 0 to rebuild aggregates
- **SSE connection loss**: Client auto-reconnects with exponential backoff
- **Rate limit hit**: Return 429 with clear error message and retry time
- **PDS unavailable**: Graceful degradation (show cached counts, disable new reactions)

## Open Questions

None - all clarifications resolved via `/clarify` command (Session 2025-10-09).

## References

- AT Protocol Blob API: https://atproto.com/specs/data-model#blob-type
- Cloudflare Workers SSE: https://developers.cloudflare.com/workers/examples/websockets/
- Durable Objects Storage: https://developers.cloudflare.com/durable-objects/api/transactional-storage-api/
- Slack Emoji Spec: https://api.slack.com/types/emoji
- Mastodon Custom Emojis: https://docs.joinmastodon.org/entities/CustomEmoji/
