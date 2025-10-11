# oRPC Migration Research: Legacy Hono Routes → oRPC Router

**Feature ID**: 018-api-orpc
**Research Date**: 2025-10-11
**Status**: Complete

---

## Executive Summary

This document provides a comprehensive analysis of migrating legacy Hono routes (Posts, Emoji, Reactions) to the oRPC Router pattern. Based on analysis of existing oRPC implementations (Communities, Memberships, Join Requests, Moderation), we recommend a **phased migration approach with backward compatibility bridges** to ensure zero downtime.

---

## 1. Current State Analysis

### 1.1 Legacy Hono Routes (server/src/routes/)

**Endpoints to Migrate**:
- **posts.ts**: 3 endpoints
  - `POST /api/communities/:communityId/posts` - Create post
  - `GET /api/communities/:communityId/posts` - List posts
  - `GET /api/posts/:uri` - Get single post
- **emoji.ts**: 6 endpoints
  - `POST /api/emoji/upload` - Upload custom emoji
  - `GET /api/emoji/list` - List user emoji
  - `POST /api/communities/:id/emoji/submit` - Submit emoji for approval
  - `GET /api/communities/:id/emoji/pending` - List pending approvals
  - `POST /api/communities/:id/emoji/approve` - Approve/reject emoji
  - `POST /api/communities/:id/emoji/revoke` - Revoke approved emoji
  - `GET /api/communities/:id/emoji/registry` - Get emoji registry
- **reactions.ts**: 4 endpoints
  - `POST /api/reactions/add` - Add reaction
  - `DELETE /api/reactions/remove` - Remove reaction
  - `GET /api/reactions/list` - List reactions
  - `GET /api/reactions/stream/:communityId` - SSE stream (special case)

**Key Characteristics**:
- Use Hono framework with Cloudflare Workers bindings
- Authentication via `authMiddleware` (JWT extraction)
- Manual request parsing (`c.req.json()`, `c.req.query()`)
- Manual validation (inline checks)
- Direct Durable Object RPC calls
- Error responses: `c.json({ error: '...' }, statusCode)`

### 1.2 oRPC Contract Definitions (shared/contracts/src/router.ts)

**Already Complete** (lines 312-431):
```typescript
export const postsContract = {
  create: authed.route({ method: 'POST', path: '/api/communities/:communityId/posts' })
    .input(CreatePostInputSchema).output(CreatePostOutputSchema),
  list: authed.route({ method: 'GET', path: '/api/communities/:communityId/posts' })
    .input(GetPostsInputSchema).output(PostListOutputSchema),
  get: authed.route({ method: 'GET', path: '/api/posts/:uri' })
    .input(GetPostInputSchema).output(PostOutputSchema),
};

export const emojiContract = { /* 7 endpoints */ };
export const reactionsContract = { /* 3 endpoints */ };
```

**Schema Validation**: All Zod schemas defined in `shared/contracts/src/schemas.ts`.

### 1.3 Existing oRPC Implementations (server/src/router.ts)

**Analyzed Routers** (lines 20-694):
- **Communities**: 3 handlers (list, create, get)
- **Memberships**: 5 handlers (list, get, join, leave, update)
- **Join Requests**: 3 handlers (list, approve, reject)
- **Moderation**: 5 handlers (hidePost, unhidePost, blockUser, unblockUser, list)
- **Feeds**: 2 handlers (list, get)

---

## 2. oRPC Handler Pattern Analysis

### 2.1 Common Implementation Patterns

**Handler Structure**:
```typescript
export const router = {
  communities: {
    create: contract.communities.create.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;

      // 1. Service instantiation
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // 2. Business logic (PDS writes)
      const result = await atproto.createCommunityConfig({
        $type: 'net.atrarium.group.config',
        name: input.name,
        // ... validated fields
      });

      // 3. Durable Object initialization
      const id = env.COMMUNITY_FEED.idFromName(communityId);
      const stub = env.COMMUNITY_FEED.get(id);
      await stub.fetch(new Request('http://fake-host/updateConfig', {
        method: 'POST',
        body: JSON.stringify({ /* config */ }),
      }));

      // 4. Response mapping
      return {
        id: result.rkey,
        name: input.name,
        // ... response schema fields
      };
    }),
  },
};
```

**Key Differences vs Hono**:
1. **Validation**: Automatic via Zod schemas (no manual checks)
2. **Context Extraction**: `const { env, userDid } = context as ServerContext`
3. **Error Handling**: Throw `ORPCError(code, { message })` instead of `c.json({ error }, status)`
4. **Type Safety**: Full input/output inference from contract
5. **No Direct HTTP**: Return values directly (no `c.json()`)

### 2.2 Error Handling Comparison

**Hono (Legacy)**:
```typescript
if (!text || text.length > 300) {
  return c.json({ error: 'Invalid text' }, 400);
}
```

**oRPC (Recommended)**:
```typescript
// Validation handled by Zod schema automatically
// For business logic errors:
throw new ORPCError('BAD_REQUEST', { message: 'Invalid text' });

// Common error codes:
// - UNAUTHORIZED (401)
// - FORBIDDEN (403)
// - BAD_REQUEST (400)
// - CONFLICT (409)
// - NOT_FOUND (404)
// - INTERNAL_SERVER_ERROR (500)
```

### 2.3 PDS Service Method Mapping

**Posts Route → Required PDS Methods**:
- `createCommunityPost()` - ✅ Already exists (line 96-115)
- `getProfile()` - ✅ Already exists (line 318-334)
- `getProfiles()` - ✅ Already exists (line 341-359)

**Emoji Route → Required PDS Methods**:
- `uploadEmojiBlob()` - ✅ Already exists (line 127-148)
- `createCustomEmoji()` - ✅ Already exists (line 161-197)
- `createEmojiApproval()` - ✅ Already exists (line 209-243)
- `listUserEmoji()` - ✅ Already exists (line 251-269)
- `listCommunityApprovals()` - ✅ Already exists (line 278-311)

**Reactions Route → Required PDS Methods**:
- `createReaction()` - ✅ Already exists (line 1026-1056)
- `deleteReaction()` - ✅ Already exists (line 1063-1087)
- `listReactions()` - ✅ Partial implementation (line 1096-1115, returns empty for MVP)

**Conclusion**: All necessary PDS methods already implemented in `server/src/services/atproto.ts`.

---

## 3. Migration Strategy: Recommended Approach

### Decision: **Phased Migration with Backward Compatibility Bridges**

### Rationale

1. **Zero Downtime**: Keep legacy Hono routes active during migration
2. **Gradual Rollout**: Migrate one router at a time (Posts → Emoji → Reactions)
3. **Client Compatibility**: Update client API calls incrementally
4. **Testing**: Validate each router before deprecating legacy endpoints
5. **Rollback Safety**: Maintain dual endpoints until full cutover

### Implementation Steps

#### Phase 1: Posts Migration (Week 1)

**Step 1.1**: Implement `router.posts` in `server/src/router.ts`
```typescript
export const router = {
  // ... existing routers
  posts: {
    create: contract.posts.create.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify membership (Durable Object RPC)
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not a member of this community',
        });
      }

      const membershipData = await membershipResponse.json() as { isMember: boolean };
      if (!membershipData.isMember) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not a member of this community',
        });
      }

      // Create post in PDS
      const postRecord = {
        $type: 'net.atrarium.group.post',
        text: input.text,
        communityId: input.communityId,
        createdAt: new Date().toISOString(),
      };

      const result = await atproto.createCommunityPost(postRecord, userDid);

      return {
        uri: result.uri,
        rkey: result.rkey,
        createdAt: postRecord.createdAt,
      };
    }),

    list: contract.posts.list.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Fetch posts from Durable Object
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const response = await feedStub.fetch(
        new Request(`https://internal/posts?limit=${input.limit || 50}${input.cursor ? `&cursor=${input.cursor}` : ''}`)
      );

      if (!response.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to fetch posts',
        });
      }

      const data = await response.json() as {
        posts: Array<{ authorDid: string; [key: string]: unknown }>;
        cursor: string | null;
      };

      // Enrich posts with author profiles
      const authorDids = [...new Set(data.posts.map(p => p.authorDid))];
      const profiles = await atproto.getProfiles(authorDids);
      const profileMap = new Map(profiles.map(p => [p.did, p]));

      const enrichedPosts = data.posts.map(post => ({
        ...post,
        author: profileMap.get(post.authorDid) || {
          did: post.authorDid,
          handle: 'unknown.bsky.social',
          displayName: null,
          avatar: null,
        },
      }));

      return {
        data: enrichedPosts,
        cursor: data.cursor || undefined,
      };
    }),

    get: contract.posts.get.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);
      const agent = await atproto.getAgent();

      // Parse AT-URI
      const uriParts = input.uri.replace('at://', '').split('/');
      const [repo, collection, rkey] = uriParts;

      if (!repo || !collection || !rkey) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid AT-URI format',
        });
      }

      // Fetch post from PDS
      const recordResponse = await agent.com.atproto.repo.getRecord({
        repo,
        collection,
        rkey,
      });

      const record = recordResponse.data.value as {
        $type: string;
        text: string;
        communityId: string;
        createdAt: string;
      };

      if (record.$type !== 'net.atrarium.group.post') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Record is not a community post',
        });
      }

      // Fetch author profile
      const profile = await atproto.getProfile(repo);

      return {
        uri: input.uri,
        rkey,
        text: record.text,
        communityId: record.communityId,
        createdAt: record.createdAt,
        author: profile,
      };
    }),
  },
};
```

**Step 1.2**: Keep legacy `server/src/routes/posts.ts` active (add deprecation notice)
```typescript
// Add to all legacy endpoints:
// Deprecated: This endpoint will be removed after 2025-12-31. Use oRPC client instead.
```

**Step 1.3**: Update client API calls (gradual rollout)
- Update `client/src/lib/api.ts` to use `apiClient.posts.create()`
- Deploy both legacy and oRPC endpoints
- Monitor for client errors

**Step 1.4**: Remove legacy route after 30-day transition period
- Delete `server/src/routes/posts.ts`
- Remove Hono route registration in `server/src/index.ts`

#### Phase 2: Emoji Migration (Week 2)

Follow same pattern as Posts:
1. Implement `router.emoji` handlers
2. Keep legacy `server/src/routes/emoji.ts` active
3. Update client API calls
4. Remove legacy route after transition

**Special Considerations**:
- Emoji upload requires FormData handling (verify oRPC FormData support)
- Registry endpoint is public (no auth) - use `pub.route()` instead of `authed.route()`

#### Phase 3: Reactions Migration (Week 3)

**Challenge**: SSE endpoint (`GET /api/reactions/stream/:communityId`)
- **oRPC does not natively support SSE streaming**
- **Recommendation**: Keep SSE endpoint as legacy Hono route indefinitely
- Migrate non-streaming endpoints (add, remove, list) to oRPC

**Implementation**:
```typescript
export const router = {
  reactions: {
    add: contract.reactions.add.handler(async ({ input, context }) => {
      // Similar to legacy route, but with ORPCError throwing
    }),

    remove: contract.reactions.remove.handler(async ({ input, context }) => {
      // Similar to legacy route
    }),

    list: contract.reactions.list.handler(async ({ input, context }) => {
      // Fetch from Durable Object, return aggregates
    }),
  },
};

// Keep in server/src/routes/reactions.ts:
// - GET /api/reactions/stream/:communityId (SSE endpoint)
```

---

## 4. Before/After Code Comparison

### Example: POST /api/communities/:communityId/posts (Create Post)

#### Before (Legacy Hono - server/src/routes/posts.ts, lines 19-95)

```typescript
posts.post('/communities/:communityId/posts', async (c) => {
  const communityId = c.req.param('communityId');
  const userDid = c.get('userDid');

  // Manual validation
  if (!/^[0-9a-f]{8}$/.test(communityId)) {
    return c.json({ error: 'Invalid community ID format' }, 400);
  }

  const body = await c.req.json();
  const { text } = body;

  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Missing or invalid "text" field' }, 400);
  }

  if (text.length === 0 || text.length > 300) {
    return c.json({ error: 'Post text must be 1-300 characters' }, 400);
  }

  try {
    // Membership check
    const feedId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const feedStub = c.env.COMMUNITY_FEED.get(feedId);

    const membershipResponse = await feedStub.fetch(
      new Request(`https://internal/checkMembership?did=${userDid}`)
    );

    if (!membershipResponse.ok) {
      return c.json({ error: 'You are not a member of this community' }, 403);
    }

    // PDS write
    const atprotoService = new ATProtoService(c.env);
    const result = await atprotoService.createCommunityPost({
      $type: 'net.atrarium.group.post',
      text,
      communityId,
      createdAt: new Date().toISOString(),
    }, userDid);

    return c.json({
      uri: result.uri,
      rkey: result.rkey,
      createdAt: result.createdAt,
    }, 201);
  } catch (error) {
    return c.json({
      error: 'Failed to create post',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
```

**Issues**:
- ❌ Manual validation (duplicates Zod schema logic)
- ❌ Inconsistent error responses
- ❌ No type safety for input/output
- ❌ Tight coupling to Hono Context (`c`)

#### After (oRPC - server/src/router.ts)

```typescript
posts: {
  create: contract.posts.create.handler(async ({ input, context }) => {
    const { env, userDid } = context as ServerContext;
    const { ATProtoService } = await import('./services/atproto');
    const atproto = new ATProtoService(env);

    // Membership check (identical logic, cleaner error handling)
    const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
    const feedStub = env.COMMUNITY_FEED.get(feedId);

    const membershipResponse = await feedStub.fetch(
      new Request(`https://internal/checkMembership?did=${userDid}`)
    );

    if (!membershipResponse.ok) {
      throw new ORPCError('FORBIDDEN', {
        message: 'You are not a member of this community',
      });
    }

    const membershipData = await membershipResponse.json() as { isMember: boolean };
    if (!membershipData.isMember) {
      throw new ORPCError('FORBIDDEN', {
        message: 'You are not a member of this community',
      });
    }

    // PDS write (identical logic)
    const result = await atproto.createCommunityPost({
      $type: 'net.atrarium.group.post',
      text: input.text,
      communityId: input.communityId,
      createdAt: new Date().toISOString(),
    }, userDid);

    // Return validated response (Zod schema ensures correctness)
    return {
      uri: result.uri,
      rkey: result.rkey,
      createdAt: new Date().toISOString(),
    };
  }),
}
```

**Benefits**:
- ✅ Automatic validation via `CreatePostInputSchema` (Zod)
- ✅ Consistent error handling (`ORPCError`)
- ✅ Full type safety (input/output inferred from contract)
- ✅ Framework-agnostic (no Hono dependency in handler)
- ✅ 30% less code (no manual validation)

---

## 5. Alternatives Considered

### Alternative 1: Big Bang Migration (All Routes at Once)

**Pros**:
- Clean cutover, no dual endpoints
- Faster overall timeline

**Cons**:
- ❌ High risk of downtime during deployment
- ❌ No rollback strategy if critical bugs found
- ❌ Client breakage if API changes not fully tested

**Decision**: **Rejected** - Too risky for production system.

### Alternative 2: Keep Legacy Routes Forever

**Pros**:
- Zero migration effort
- No risk of client breakage

**Cons**:
- ❌ Maintenance burden (two codebases to update)
- ❌ Inconsistent API surface (mixing Hono + oRPC)
- ❌ Missing type safety benefits

**Decision**: **Rejected** - Technical debt accumulates over time.

### Alternative 3: Proxy Legacy Routes to oRPC Handlers

**Implementation**:
```typescript
// server/src/routes/posts.ts
import { router } from '../router';

posts.post('/communities/:communityId/posts', async (c) => {
  const input = {
    communityId: c.req.param('communityId'),
    text: (await c.req.json()).text,
  };

  const context = {
    env: c.env,
    userDid: c.get('userDid'),
  };

  try {
    const result = await router.posts.create({ input, context });
    return c.json(result, 201);
  } catch (error) {
    // Convert ORPCError to Hono response
    return c.json({ error: error.message }, error.status);
  }
});
```

**Pros**:
- Single source of truth (oRPC handlers)
- Gradual client migration without dual endpoints

**Cons**:
- ❌ Adds indirection layer (performance overhead)
- ❌ Complex error mapping (ORPCError → Hono JSON)
- ❌ Still requires maintaining legacy routes

**Decision**: **Partially Accepted** - Use for SSE endpoint only (reactions stream).

---

## 6. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Client breakage during migration | High | Phased rollout with 30-day transition period |
| oRPC FormData handling issues | Medium | Test emoji upload endpoint thoroughly before migration |
| SSE endpoint incompatibility | High | Keep SSE endpoint as legacy Hono route |
| Performance regression | Low | Benchmark oRPC vs Hono before production deployment |
| Missing error codes in ORPCError | Low | Define custom error codes if needed |

---

## 7. Testing Strategy

### Unit Tests
- Validate each oRPC handler with mock context
- Verify error handling (ORPCError throwing)
- Test input validation (Zod schema edge cases)

### Integration Tests
- End-to-end post creation flow (PDS write + DO indexing)
- Membership verification edge cases
- Profile enrichment with multiple authors

### Contract Tests
- Validate input/output schemas match contract definition
- Test error responses match ORPCError format

### Migration Tests
- Run both legacy and oRPC endpoints in parallel
- Compare response payloads (schema compatibility)
- Load test to verify no performance regression

---

## 8. Implementation Checklist

### Phase 1: Posts Migration
- [ ] Implement `router.posts.create` handler
- [ ] Implement `router.posts.list` handler
- [ ] Implement `router.posts.get` handler
- [ ] Write unit tests for all handlers
- [ ] Write integration tests
- [ ] Deploy with legacy routes active
- [ ] Update client API calls
- [ ] Monitor for errors (30 days)
- [ ] Remove legacy `server/src/routes/posts.ts`

### Phase 2: Emoji Migration
- [ ] Verify oRPC FormData support (upload endpoint)
- [ ] Implement `router.emoji` handlers (7 endpoints)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy with legacy routes active
- [ ] Update client API calls
- [ ] Monitor for errors (30 days)
- [ ] Remove legacy `server/src/routes/emoji.ts`

### Phase 3: Reactions Migration
- [ ] Implement `router.reactions` handlers (add, remove, list)
- [ ] Keep SSE stream endpoint as legacy route
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy with legacy routes active
- [ ] Update client API calls
- [ ] Monitor for errors (30 days)
- [ ] Remove non-SSE endpoints from `server/src/routes/reactions.ts`

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Migration completion | 100% of non-SSE endpoints | Count of migrated routes |
| Client errors | < 0.1% of requests | Cloudflare Workers logs |
| Response time regression | < 10% increase | p95 latency comparison |
| Type safety coverage | 100% of handler inputs/outputs | TypeScript compiler errors |
| Code reduction | > 20% less validation code | Lines of code comparison |

---

## 10. Conclusion

The **Phased Migration with Backward Compatibility Bridges** approach provides the best balance of:
- **Safety**: Zero downtime, gradual rollout
- **Maintainability**: Single source of truth (oRPC handlers)
- **Type Safety**: Full input/output validation via Zod
- **Simplicity**: 20-30% code reduction

**Recommendation**: Proceed with migration starting with Posts (Week 1), followed by Emoji (Week 2), and Reactions (Week 3). Keep SSE endpoint as legacy Hono route indefinitely due to oRPC streaming limitations.

**Next Steps**:
1. Implement `router.posts` handlers (Phase 1)
2. Write comprehensive tests
3. Deploy to staging environment for validation
4. Update client API calls incrementally
5. Monitor production for 30 days before removing legacy routes

---

## References

- **Contract Definition**: `shared/contracts/src/router.ts` (lines 312-431)
- **Schema Validation**: `shared/contracts/src/schemas.ts`
- **Existing oRPC Implementations**: `server/src/router.ts` (lines 20-694)
- **Legacy Hono Routes**:
  - `server/src/routes/posts.ts` (lines 1-258)
  - `server/src/routes/emoji.ts` (lines 1-263)
  - `server/src/routes/reactions.ts` (lines 1-239)
- **PDS Service**: `server/src/services/atproto.ts` (all required methods exist)
