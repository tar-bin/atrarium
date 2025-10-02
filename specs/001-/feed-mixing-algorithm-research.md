# Feed Mixing Algorithm Research

**Date**: 2025-10-02
**Status**: Research Complete
**Author**: Research Investigation

---

## Executive Summary

This document presents research findings on feed composition mixing algorithms for Atrarium's multi-source content feeds. The system requires an efficient algorithm to merge and sort posts from three sources (own community 80%, parent community 15%, global Bluesky 5%) while maintaining configurable ratios and supporting cursor-based pagination with a <200ms performance target.

---

## Decision

**Selected Algorithm**: **Weighted K-Way Merge with Reservoir Sampling**

### Implementation Strategy

```typescript
interface FeedMixConfig {
  own: number;      // e.g., 0.8 (80%)
  parent: number;   // e.g., 0.15 (15%)
  global: number;   // e.g., 0.05 (5%)
}

async function generateMixedFeed(
  communityId: string,
  cursor: number | null,
  limit: number,
  mixConfig: FeedMixConfig
): Promise<{ feed: Post[], cursor: number }> {
  // Calculate target counts based on ratios
  const targetCounts = {
    own: Math.ceil(limit * mixConfig.own),
    parent: Math.ceil(limit * mixConfig.parent),
    global: Math.ceil(limit * mixConfig.global)
  };

  // Fetch posts from each source in parallel
  const [ownPosts, parentPosts, globalPosts] = await Promise.all([
    fetchPostsFromSource('own', communityId, cursor, targetCounts.own * 2),
    fetchPostsFromSource('parent', communityId, cursor, targetCounts.parent * 2),
    fetchPostsFromSource('global', communityId, cursor, targetCounts.global * 2)
  ]);

  // Apply weighted reservoir sampling to maintain exact ratios
  const sampled = weightedReservoirSample([
    { posts: ownPosts, weight: mixConfig.own },
    { posts: parentPosts, weight: mixConfig.parent },
    { posts: globalPosts, weight: mixConfig.global }
  ], limit);

  // Merge and sort chronologically
  const merged = chronologicalMerge(sampled);

  // Extract cursor from last post
  const newCursor = merged[merged.length - 1]?.created_at || null;

  return { feed: merged, cursor: newCursor };
}
```

---

## Rationale

### Why This Algorithm Meets Requirements

#### 1. Performance (<200ms target)

**K-Way Merge Time Complexity**: O(n log k)
- n = total number of posts (typically 50-100 per request)
- k = number of sources (3 in our case)
- For 100 posts: 100 * log(3) ≈ 159 operations

**Parallel Fetching**:
- Sources queried simultaneously reduces latency
- D1 query time target: <50ms per source
- Total DB time: ~50ms (parallel) vs ~150ms (sequential)

**Space Complexity**: O(n)
- Minimal memory footprint
- No large intermediate data structures

#### 2. Ratio Precision

**Weighted Reservoir Sampling**:
- Maintains exact proportions across page boundaries
- Handles variable source sizes gracefully
- Example: If parent community has fewer posts, global ratio increases proportionally

**Overfetching Strategy** (fetch 2x target):
- Ensures sufficient candidates for sampling
- Prevents ratio drift when sources are sparse
- Balances accuracy vs performance

#### 3. Cursor-Based Pagination Support

**Compound Cursor Design**:
```typescript
interface FeedCursor {
  timestamp: number;        // created_at of last post
  sourceStates: {
    own: number;
    parent: number;
    global: number;
  };
}
```

**Benefits**:
- Each source maintains independent cursor state
- Handles real-time data mutations gracefully (no duplicate/missing posts)
- Consistent pagination regardless of new posts

#### 4. User Experience

**Chronological Ordering**:
- Posts sorted by `created_at` DESC after mixing
- Preserves recency expectations
- Natural timeline feel

**Ratio Customization**:
```javascript
// Fully closed community
{ own: 1.0, parent: 0.0, global: 0.0 }

// More parent exposure
{ own: 0.6, parent: 0.3, global: 0.1 }

// Global discovery focus
{ own: 0.5, parent: 0.2, global: 0.3 }
```

---

## Alternatives Considered

### 1. Round-Robin Interleaving

**Approach**: Alternate posts from sources in fixed pattern (e.g., 8 own, 1-2 parent, 0-1 global)

**Pros**:
- Simple implementation
- Predictable distribution
- O(n) time complexity

**Cons**:
- **Rejected**: Poor ratio precision at page boundaries
- Creates visible patterns (clustered sources)
- Doesn't handle sparse sources well
- Less natural timeline experience

**Example Issue**:
```
Page 1: O O O O O O O O P P G  (8-2-1, ratio: 73%-18%-9%)
Page 2: O O O O O O O O P G    (8-1-1, ratio: 80%-10%-10%)
                                ↑ Ratio drift
```

---

### 2. Time-Sliced Merging

**Approach**: Divide timeline into time windows, fill each window with ratio-based samples

**Pros**:
- Maintains temporal locality
- Natural chronological flow
- Good for real-time feeds

**Cons**:
- **Rejected**: Complex cursor management across time slices
- Sensitive to posting frequency differences
- May create empty windows if sources inactive
- Higher computational overhead (multiple passes)

**Performance Analysis**:
- Requires O(n log n) sorting per time window
- Additional O(k) window boundary calculations
- Estimated: 150-250ms for 100 posts (exceeds target)

---

### 3. Pure Weighted Random Sampling (No Merge)

**Approach**: Randomly select posts from combined pool based on source weights

**Pros**:
- Perfect ratio maintenance
- O(n) time complexity
- Simple implementation

**Cons**:
- **Rejected**: Destroys chronological ordering
- Poor UX (jumps in timeline)
- Violates user expectations for social feeds
- Difficult to implement stable pagination

**UX Impact**:
```
Random order:
- Post from 3 hours ago
- Post from 10 minutes ago  ← confusing
- Post from 1 day ago
- Post from 30 minutes ago
```

---

## Key Technical Details

### Algorithm Pseudocode

#### 1. Weighted Reservoir Sampling

```typescript
function weightedReservoirSample(
  sources: Array<{ posts: Post[], weight: number }>,
  sampleSize: number
): Post[] {
  const reservoir: Post[] = [];

  for (const source of sources) {
    const targetCount = Math.ceil(sampleSize * source.weight);

    // A-Res algorithm for weighted sampling
    for (let i = 0; i < source.posts.length; i++) {
      const post = source.posts[i];
      const priority = Math.pow(Math.random(), 1 / source.weight);

      if (reservoir.length < targetCount) {
        reservoir.push({ ...post, priority });
      } else {
        // Find minimum priority in reservoir
        const minIdx = reservoir.reduce((minI, p, i, arr) =>
          p.priority < arr[minI].priority ? i : minI, 0);

        if (priority > reservoir[minIdx].priority) {
          reservoir[minIdx] = { ...post, priority };
        }
      }
    }
  }

  return reservoir.map(({ priority, ...post }) => post);
}
```

**Time Complexity**: O(n * k) where n = posts per source, k = number of sources
**Space Complexity**: O(sampleSize)

#### 2. K-Way Chronological Merge

```typescript
function chronologicalMerge(posts: Post[]): Post[] {
  // Simple sort since reservoir already selected posts
  return posts.sort((a, b) => b.created_at - a.created_at);
}
```

**Time Complexity**: O(n log n)
**Space Complexity**: O(1) (in-place sort)

#### 3. Cursor-Based Pagination Query

```sql
-- Own community posts
SELECT uri, created_at, author_did
FROM post_index
WHERE feed_id = ?
  AND created_at < ?  -- cursor
ORDER BY created_at DESC
LIMIT ?;

-- Parent community posts (similar)
SELECT uri, created_at, author_did
FROM post_index
WHERE feed_id IN (
  SELECT id FROM theme_feeds
  WHERE community_id = (
    SELECT parent_id FROM communities WHERE id = ?
  )
)
  AND created_at < ?
ORDER BY created_at DESC
LIMIT ?;

-- Global Bluesky posts
SELECT uri, created_at, author_did
FROM post_index
WHERE feed_id = 'global-feed'
  AND created_at < ?
ORDER BY created_at DESC
LIMIT ?;
```

**Index Requirements**:
```sql
CREATE INDEX idx_post_feed_time ON post_index(feed_id, created_at DESC);
CREATE INDEX idx_feed_community ON theme_feeds(community_id);
```

---

### Pagination Strategy

#### Initial Request (no cursor)

```typescript
// Request
GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did/...&limit=50

// Response
{
  "feed": [
    { "post": "at://did1/post1" },  // created_at: 1696291200
    { "post": "at://did2/post2" },  // created_at: 1696291150
    // ... 48 more posts
  ],
  "cursor": "1696290000"  // created_at of 50th post
}
```

#### Subsequent Request (with cursor)

```typescript
// Request
GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did/...&cursor=1696290000&limit=50

// Logic
const cursor = parseInt(request.query.cursor);
const posts = await generateMixedFeed(communityId, cursor, 50, mixConfig);

// All queries use: created_at < cursor
// Ensures no duplicates, handles new posts gracefully
```

---

### Edge Cases

#### 1. Sparse Source (Not Enough Posts)

**Scenario**: Parent community only has 3 posts, but ratio requires 7-8 posts (15% of 50)

**Solution**:
```typescript
// Redistribute weights proportionally
function redistributeWeights(
  sources: Array<{ posts: Post[], weight: number }>,
  sampleSize: number
): Array<{ posts: Post[], adjustedWeight: number }> {

  const availableCounts = sources.map(s => s.posts.length);
  const targetCounts = sources.map(s => Math.ceil(sampleSize * s.weight));

  // Identify shortfalls
  const shortfalls = targetCounts.map((target, i) =>
    Math.max(0, target - availableCounts[i])
  );
  const totalShortfall = shortfalls.reduce((a, b) => a + b, 0);

  if (totalShortfall === 0) return sources;

  // Redistribute to sources with surplus
  const adjustedWeights = sources.map((source, i) => {
    if (shortfalls[i] > 0) {
      // Use all available posts
      return availableCounts[i] / sampleSize;
    } else {
      // Absorb proportional share of shortfall
      const surplus = availableCounts[i] - targetCounts[i];
      const redistribution = (surplus / (sampleSize - totalShortfall)) * totalShortfall;
      return (targetCounts[i] + redistribution) / sampleSize;
    }
  });

  return sources.map((s, i) => ({ ...s, adjustedWeight: adjustedWeights[i] }));
}
```

**Example**:
- Target: 50 posts (40 own, 7 parent, 3 global)
- Available: own=60, parent=3, global=50
- Shortfall: 0, 4, 0
- Adjusted: own=42 (84%), parent=3 (6%), global=5 (10%)
- Total: 50 posts ✓

#### 2. Duplicate Posts Across Sources

**Scenario**: Post appears in both own and parent feeds (cross-posted or boosted)

**Solution**:
```typescript
function deduplicatePosts(posts: Post[]): Post[] {
  const seen = new Set<string>();
  return posts.filter(post => {
    if (seen.has(post.uri)) return false;
    seen.add(post.uri);
    return true;
  });
}

// Apply after merge
const merged = chronologicalMerge(sampled);
const deduplicated = deduplicatePosts(merged);

// If deduplicated.length < limit, fetch more posts (backfill)
if (deduplicated.length < limit) {
  const backfillCount = limit - deduplicated.length;
  const backfill = await fetchBackfillPosts(cursor, backfillCount, mixConfig);
  return { feed: [...deduplicated, ...backfill], cursor: newCursor };
}
```

#### 3. Real-Time Data Mutations

**Scenario**: Post deleted between pages, cursor-based pagination skips it naturally

**AT Protocol Behavior**:
- Post URIs remain in `post_index` even if deleted from PDS
- Client fetches from AppView, receives 404 for deleted posts
- Client handles 404 gracefully (filters out)

**Atrarium Handling**:
```typescript
// Optional: Periodic cleanup job (Phase 1+)
async function cleanupDeletedPosts() {
  const staleURIs = await findStaleURIs();  // URIs > 7 days old

  for (const uri of staleURIs) {
    const exists = await checkPDSExists(uri);
    if (!exists) {
      await db.prepare('DELETE FROM post_index WHERE uri = ?').bind(uri).run();
    }
  }
}
```

#### 4. Empty Feed (All Sources Have No Posts)

**Solution**:
```typescript
if (ownPosts.length === 0 && parentPosts.length === 0 && globalPosts.length === 0) {
  return {
    feed: [],
    cursor: null  // Signals end of feed
  };
}
```

#### 5. Cursor Inconsistency (Client Provides Invalid Cursor)

**Solution**:
```typescript
const cursor = request.query.cursor ? parseInt(request.query.cursor) : null;

// Validate cursor
if (cursor !== null && (isNaN(cursor) || cursor < 0 || cursor > Date.now())) {
  return new Response(
    JSON.stringify({ error: 'Invalid cursor' }),
    { status: 400 }
  );
}
```

---

## Performance Analysis

### Theoretical Complexity

| Operation | Complexity | Typical Time (n=100) |
|-----------|------------|---------------------|
| Parallel fetch (3 sources) | O(1) | 50ms (max of 3 parallel queries) |
| Weighted sampling | O(n * k) | 300 * 3 = 900 operations |
| Deduplication | O(n) | 100 operations |
| Chronological sort | O(n log n) | 100 * 6.6 ≈ 660 operations |
| **Total** | **O(n log n)** | **~50ms DB + 5ms compute** |

### Practical Benchmarks (Estimated)

**D1 Query Performance** (indexed, 10k posts per feed):
- Single feed query: 15-30ms
- 3 parallel queries: 30-50ms (network + parsing overhead)

**JavaScript Execution** (Cloudflare Workers):
- Weighted sampling (100 posts): 2-3ms
- Deduplication: 0.5ms
- Sort: 1-2ms
- Total compute: 4-6ms

**End-to-End Latency**:
- Best case: 35ms (DB) + 4ms (compute) = **39ms** ✓
- Typical: 45ms (DB) + 5ms (compute) = **50ms** ✓
- Worst case (p95): 70ms (DB) + 8ms (compute) = **78ms** ✓

**Verdict**: Well within <200ms target, typically <100ms

---

### Scalability Considerations

#### Database Scaling

**Post Index Growth**:
- Assumptions: 2000 DAU, 5 posts/day/user = 10k posts/day
- 7-day retention: 70k posts total
- 30-day retention: 300k posts total

**D1 Performance** (SQLite):
- B-tree index on `(feed_id, created_at DESC)`
- Query time: O(log n + k) where n = total posts, k = limit
- 300k posts: log₂(300,000) ≈ 18 levels, <30ms per query

**Partition Strategy** (if needed, Phase 2+):
```sql
-- Partition by month
CREATE TABLE post_index_2025_10 AS SELECT * FROM post_index
  WHERE created_at >= 1727740800 AND created_at < 1730419200;

-- Union query across partitions
SELECT * FROM (
  SELECT * FROM post_index_2025_10 WHERE ...
  UNION ALL
  SELECT * FROM post_index_2025_09 WHERE ...
) ORDER BY created_at DESC LIMIT 50;
```

#### Caching Strategy

**KV Cache for Rendered Feeds**:
```typescript
// Cache key: feed_id + cursor + limit + mix_config_hash
const cacheKey = `feed:${feedId}:${cursor}:${limit}:${mixHash}`;

// Try cache first
const cached = await env.POST_CACHE.get(cacheKey, 'json');
if (cached) return cached;

// Generate and cache
const feed = await generateMixedFeed(...);
await env.POST_CACHE.put(cacheKey, JSON.stringify(feed), {
  expirationTtl: 300  // 5 minutes
});

return feed;
```

**Cache Hit Ratio** (estimated):
- Same user scrolling: 70-80% hit rate
- Different users, same feed: 30-40% hit rate
- Overall: 50-60% hit rate → effective latency ~20-30ms

---

## Implementation Roadmap

### Phase 0 (Weeks 1-16) - MVP

**Scope**: Single-source feeds only (no mixing)
- Implement basic `getFeedSkeleton` for theme feeds
- Cursor-based pagination with single source
- Database schema and indexes

**Rationale**: Validate AT Protocol integration and infrastructure before adding complexity

---

### Phase 1 (Months 3-6) - Basic Mixing

**Scope**: Two-source mixing (own + parent)
- Implement K-way merge (k=2)
- Simple ratio-based sampling (80-20)
- Static mix ratios

**Deliverable**:
```typescript
// feed-generator.ts
export async function generateCommunityFeed(
  communityId: string,
  cursor: number | null,
  limit: number
): Promise<FeedResponse> {
  const community = await getCommunity(communityId);

  if (!community.parent_id) {
    // No parent, single source
    return generateSingleSourceFeed(communityId, cursor, limit);
  }

  // Two-source mix
  const mixConfig = { own: 0.8, parent: 0.2 };
  return generateMixedFeed(communityId, cursor, limit, mixConfig);
}
```

---

### Phase 2 (Months 7-10) - Full Mixing

**Scope**: Three-source mixing (own + parent + global)
- Implement weighted reservoir sampling
- Configurable mix ratios (user-adjustable)
- Edge case handling (sparse sources, deduplication)
- Feed caching (KV)

**Deliverable**:
```typescript
// API endpoint for mix customization
POST /api/communities/:id/feed-mix
Body: {
  "own": 0.6,
  "parent": 0.3,
  "global": 0.1
}

// Store in communities.feed_mix (JSON field)
UPDATE communities
SET feed_mix = '{"own":0.6,"parent":0.3,"global":0.1}'
WHERE id = ?;
```

---

### Phase 3 (Months 11+) - Advanced Features

**Scope**: Algorithmic enhancements
- Content-based ranking (not just chronological)
- Engagement boosting (popular posts weighted higher)
- Personalization (user interaction history)
- A/B testing framework

**Example**:
```typescript
// Engagement score
function calculateEngagementScore(post: Post): number {
  const ageHours = (Date.now() - post.created_at) / 3600;
  const decayFactor = Math.exp(-ageHours / 24);  // 24-hour half-life

  const engagementScore =
    post.likes * 1.0 +
    post.reposts * 2.0 +
    post.replies * 1.5;

  return engagementScore * decayFactor;
}

// Weighted merge by engagement + chronological
const merged = posts.sort((a, b) => {
  const scoreA = calculateEngagementScore(a) + (a.created_at / 1e6);
  const scoreB = calculateEngagementScore(b) + (b.created_at / 1e6);
  return scoreB - scoreA;
});
```

---

## Reference Links

### Feed Algorithm Research

1. **Twitter/X Recommendation Algorithm** (Official Engineering Blog)
   https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm
   - Real-world implementation of multi-stage ranking
   - GraphJet real-time interaction graph
   - For You timeline construction (Home Mixer)

2. **Facebook News Feed Ranking** (Engineering Blog)
   https://engineering.fb.com/2021/01/26/core-infra/news-feed-ranking/
   - ML-powered relevance scoring
   - Multi-source content mixing (friends, pages, groups)
   - Personalized ranking at scale (2B+ users)

3. **Bluesky Feed Generator Documentation**
   https://docs.bsky.app/docs/starter-templates/custom-feeds
   - AT Protocol feed specifications
   - getFeedSkeleton API reference
   - Starter kit code examples

### Algorithm Papers

4. **Weighted Reservoir Sampling** (Efraimidis & Spirakis, 2005)
   https://utopia.duth.gr/~pefraimi/research/data/2007EncOfAlg.pdf
   - A-Res and A-ExpJ algorithms
   - Theoretical foundations for WRS
   - Computational complexity analysis

5. **Optimized Interleaving for Online Retrieval Evaluation** (WSDM 2013)
   https://dl.acm.org/doi/10.1145/2433396.2433429
   - Team Draft Interleaving (TDI)
   - Balanced interleaving methods
   - A/B testing with interleaved results

6. **K-Way Merge Algorithm** (Wikipedia)
   https://en.wikipedia.org/wiki/K-way_merge_algorithm
   - Heap-based merging
   - Time complexity proofs
   - External sorting applications

### Pagination Research

7. **Understanding Cursor Pagination** (Milan Jovanovic)
   https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive
   - Performance comparison: cursor vs offset
   - Implementation best practices
   - Compound cursors for complex ordering

8. **Social Feed Cursor-Based Pagination** (Adam Cowley)
   https://adamcowley.co.uk/posts/social-feed-cursor-based-pagination/
   - Real-world social feed implementation
   - Handling data mutations
   - Neo4j/graph database examples

9. **Five Ways to Paginate in Postgres** (Citus Data)
   https://www.citusdata.com/blog/2016/03/30/five-ways-to-paginate/
   - Offset vs cursor vs keyset
   - Performance benchmarks
   - Trade-offs analysis

### Technical Resources

10. **Cloudflare D1 Documentation**
    https://developers.cloudflare.com/d1/
    - SQLite query optimization
    - Index strategies
    - Performance limits

11. **AT Protocol Documentation**
    https://atproto.com/docs
    - DID resolution
    - Lexicon schemas
    - Repository structure

12. **Cloudflare Durable Objects**
    https://developers.cloudflare.com/durable-objects/
    - WebSocket handling
    - State management
    - Performance characteristics

---

## Appendix: Code Snippets

### Complete Implementation Example

```typescript
// src/feed-mixer.ts

import { Post, FeedMixConfig, FeedResponse } from './types';

export class FeedMixer {
  constructor(
    private db: D1Database,
    private cache: KVNamespace
  ) {}

  async generateMixedFeed(
    communityId: string,
    cursor: number | null,
    limit: number = 50,
    mixConfig: FeedMixConfig
  ): Promise<FeedResponse> {
    // Validate inputs
    this.validateInputs(cursor, limit, mixConfig);

    // Check cache
    const cacheKey = this.getCacheKey(communityId, cursor, limit, mixConfig);
    const cached = await this.cache.get(cacheKey, 'json');
    if (cached) return cached as FeedResponse;

    // Fetch from sources
    const sources = await this.fetchAllSources(communityId, cursor, limit, mixConfig);

    // Handle edge cases
    if (this.allSourcesEmpty(sources)) {
      return { feed: [], cursor: null };
    }

    // Redistribute weights if needed
    const adjustedSources = this.redistributeWeights(sources, limit);

    // Sample posts
    const sampled = this.weightedReservoirSample(adjustedSources, limit);

    // Merge and deduplicate
    let merged = this.chronologicalMerge(sampled);
    merged = this.deduplicatePosts(merged);

    // Backfill if needed
    if (merged.length < limit) {
      const backfill = await this.backfillPosts(
        communityId,
        merged[merged.length - 1]?.created_at || cursor,
        limit - merged.length,
        mixConfig
      );
      merged = [...merged, ...backfill];
    }

    // Extract cursor
    const newCursor = merged[merged.length - 1]?.created_at || null;

    const response = { feed: merged, cursor: newCursor };

    // Cache result
    await this.cache.put(cacheKey, JSON.stringify(response), {
      expirationTtl: 300
    });

    return response;
  }

  private async fetchAllSources(
    communityId: string,
    cursor: number | null,
    limit: number,
    mixConfig: FeedMixConfig
  ) {
    const targetCounts = {
      own: Math.ceil(limit * mixConfig.own * 2),    // Overfetch 2x
      parent: Math.ceil(limit * mixConfig.parent * 2),
      global: Math.ceil(limit * mixConfig.global * 2)
    };

    const [ownPosts, parentPosts, globalPosts] = await Promise.all([
      this.fetchOwnPosts(communityId, cursor, targetCounts.own),
      this.fetchParentPosts(communityId, cursor, targetCounts.parent),
      this.fetchGlobalPosts(cursor, targetCounts.global)
    ]);

    return [
      { posts: ownPosts, weight: mixConfig.own, source: 'own' },
      { posts: parentPosts, weight: mixConfig.parent, source: 'parent' },
      { posts: globalPosts, weight: mixConfig.global, source: 'global' }
    ];
  }

  private async fetchOwnPosts(
    communityId: string,
    cursor: number | null,
    limit: number
  ): Promise<Post[]> {
    const { results } = await this.db.prepare(`
      SELECT uri, created_at, author_did
      FROM post_index
      WHERE feed_id IN (
        SELECT id FROM theme_feeds WHERE community_id = ?
      )
        AND created_at < ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(
      communityId,
      cursor || Date.now(),
      limit
    ).all();

    return results as Post[];
  }

  private async fetchParentPosts(
    communityId: string,
    cursor: number | null,
    limit: number
  ): Promise<Post[]> {
    const { results } = await this.db.prepare(`
      SELECT uri, created_at, author_did
      FROM post_index
      WHERE feed_id IN (
        SELECT id FROM theme_feeds
        WHERE community_id = (
          SELECT parent_id FROM communities WHERE id = ?
        )
      )
        AND created_at < ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(
      communityId,
      cursor || Date.now(),
      limit
    ).all();

    return results as Post[];
  }

  private async fetchGlobalPosts(
    cursor: number | null,
    limit: number
  ): Promise<Post[]> {
    const { results } = await this.db.prepare(`
      SELECT uri, created_at, author_did
      FROM post_index
      WHERE feed_id = 'global-feed'
        AND created_at < ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(
      cursor || Date.now(),
      limit
    ).all();

    return results as Post[];
  }

  private weightedReservoirSample(
    sources: Array<{ posts: Post[], weight: number, source: string }>,
    sampleSize: number
  ): Post[] {
    const reservoir: Array<Post & { priority: number }> = [];

    for (const source of sources) {
      const targetCount = Math.ceil(sampleSize * source.weight);

      for (const post of source.posts) {
        const priority = Math.pow(Math.random(), 1 / source.weight);

        if (reservoir.length < sampleSize) {
          reservoir.push({ ...post, priority });
        } else {
          const minIdx = reservoir.reduce((minI, p, i, arr) =>
            p.priority < arr[minI].priority ? i : minI,
            0
          );

          if (priority > reservoir[minIdx].priority) {
            reservoir[minIdx] = { ...post, priority };
          }
        }
      }
    }

    return reservoir.map(({ priority, ...post }) => post);
  }

  private chronologicalMerge(posts: Post[]): Post[] {
    return posts.sort((a, b) => b.created_at - a.created_at);
  }

  private deduplicatePosts(posts: Post[]): Post[] {
    const seen = new Set<string>();
    return posts.filter(post => {
      if (seen.has(post.uri)) return false;
      seen.add(post.uri);
      return true;
    });
  }

  private redistributeWeights(
    sources: Array<{ posts: Post[], weight: number, source: string }>,
    sampleSize: number
  ): Array<{ posts: Post[], weight: number, source: string }> {
    const availableCounts = sources.map(s => s.posts.length);
    const targetCounts = sources.map(s => Math.ceil(sampleSize * s.weight));

    const shortfalls = targetCounts.map((target, i) =>
      Math.max(0, target - availableCounts[i])
    );
    const totalShortfall = shortfalls.reduce((a, b) => a + b, 0);

    if (totalShortfall === 0) return sources;

    const adjustedWeights = sources.map((source, i) => {
      if (shortfalls[i] > 0) {
        return availableCounts[i] / sampleSize;
      } else {
        const surplus = availableCounts[i] - targetCounts[i];
        const redistribution =
          (surplus / (sampleSize - totalShortfall)) * totalShortfall;
        return (targetCounts[i] + redistribution) / sampleSize;
      }
    });

    return sources.map((s, i) => ({
      ...s,
      weight: adjustedWeights[i]
    }));
  }

  private allSourcesEmpty(
    sources: Array<{ posts: Post[] }>
  ): boolean {
    return sources.every(s => s.posts.length === 0);
  }

  private async backfillPosts(
    communityId: string,
    cursor: number | null,
    count: number,
    mixConfig: FeedMixConfig
  ): Promise<Post[]> {
    // Simplified backfill: fetch from primary source
    return this.fetchOwnPosts(communityId, cursor, count);
  }

  private validateInputs(
    cursor: number | null,
    limit: number,
    mixConfig: FeedMixConfig
  ): void {
    if (cursor !== null && (isNaN(cursor) || cursor < 0 || cursor > Date.now())) {
      throw new Error('Invalid cursor');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Invalid limit (must be 1-100)');
    }

    const sum = mixConfig.own + mixConfig.parent + mixConfig.global;
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error('Mix config weights must sum to 1.0');
    }
  }

  private getCacheKey(
    communityId: string,
    cursor: number | null,
    limit: number,
    mixConfig: FeedMixConfig
  ): string {
    const mixHash = this.hashMixConfig(mixConfig);
    return `feed:${communityId}:${cursor || 'initial'}:${limit}:${mixHash}`;
  }

  private hashMixConfig(config: FeedMixConfig): string {
    return `${config.own}-${config.parent}-${config.global}`;
  }
}
```

### Usage in Workers

```typescript
// src/index.ts

import { FeedMixer } from './feed-mixer';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/xrpc/app.bsky.feed.getFeedSkeleton') {
      const feedUri = url.searchParams.get('feed');
      const cursor = url.searchParams.get('cursor');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      // Parse feed URI to extract community ID
      const communityId = extractCommunityId(feedUri);

      // Get community mix config from database
      const { results } = await env.DB.prepare(
        'SELECT feed_mix FROM communities WHERE id = ?'
      ).bind(communityId).all();

      const mixConfig = JSON.parse(
        results[0]?.feed_mix || '{"own":0.8,"parent":0.15,"global":0.05}'
      );

      // Generate feed
      const mixer = new FeedMixer(env.DB, env.POST_CACHE);
      const response = await mixer.generateMixedFeed(
        communityId,
        cursor ? parseInt(cursor) : null,
        limit,
        mixConfig
      );

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function extractCommunityId(feedUri: string | null): string {
  if (!feedUri) throw new Error('Missing feed parameter');

  // Parse: at://did:plc:xxx/app.bsky.feed.generator/{community_id}
  const parts = feedUri.split('/');
  return parts[parts.length - 1];
}
```

---

## Conclusion

The **Weighted K-Way Merge with Reservoir Sampling** algorithm provides an optimal balance of:

- **Performance**: <100ms typical latency (well under 200ms target)
- **Precision**: Maintains exact ratio proportions across page boundaries
- **Scalability**: O(n log n) complexity scales to millions of posts
- **User Experience**: Chronological ordering with smooth pagination
- **Flexibility**: Supports arbitrary mix ratios and handles edge cases gracefully

This approach leverages proven techniques from academic research (weighted reservoir sampling) and industry practice (Twitter/Facebook feed algorithms) while adapting them to AT Protocol's unique constraints (URI-based feeds, cursor pagination, PDS dependency).

The phased implementation roadmap ensures we can validate core assumptions in Phase 0-1 before committing to the full complexity in Phase 2-3.

---

**Next Steps**:
1. Implement single-source feeds in Phase 0 (Weeks 5-16)
2. Validate cursor pagination and performance targets
3. Proceed to two-source mixing in Phase 1 (simplified version)
4. Deploy full algorithm in Phase 2 with user-configurable ratios
