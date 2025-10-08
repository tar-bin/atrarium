# Quickstart Guide: Client Use Case Implementation

**Feature**: `013-` | **Date**: 2025-10-07
**Prerequisite**: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

## Overview

This guide provides step-by-step instructions for implementing general user and community administrator use cases in the Atrarium client. Follow the TDD (Test-Driven Development) approach: write tests first, then implement features to make tests pass.

**Key Clarifications** (from `/clarify` session):
- Join requests use `status: 'pending'` in existing `net.atrarium.community.membership` schema
- Community statistics limited to member count only (no activity metrics due to PDS-only storage constraint)

## Prerequisites

### Development Environment

1. **DevContainer Setup**:
   ```bash
   # Open project in VS Code DevContainer
   # This automatically starts a local Bluesky PDS for testing

   # Setup test accounts
   .devcontainer/setup-pds.sh

   # PDS available at http://localhost:3000 (or http://pds:3000 from container)
   ```

2. **Install Dependencies**:
   ```bash
   # Install all workspace dependencies
   pnpm install

   # Verify installations
   pnpm --filter @atrarium/contracts typecheck
   pnpm --filter server typecheck
   pnpm --filter client typecheck
   ```

3. **Environment Variables**:
   ```bash
   # Server (.env in server/)
   PDS_URL=http://pds:3000
   JWT_SECRET=your-secret-here

   # Client (.env in client/)
   VITE_API_URL=http://localhost:8787
   VITE_PDS_URL=http://localhost:3000
   ```

## Implementation Workflow

### Phase 1: Shared Contracts (oRPC)

**Critical**: Contracts MUST be completed before any server or client implementation.

1. **Add Zod Schemas** (`shared/contracts/src/schemas.ts`):
   ```bash
   # Define validation schemas for:
   # - Membership operations (join, leave, list, change role, remove)
   # - Join requests (list, approve, reject)
   # - Moderation (hide/unhide posts, block/unblock users, history)
   # - Feeds (get feed, get stats)

   # Example: JoinCommunitySchema
   export const JoinCommunitySchema = z.object({
     communityId: z.string(),
     accessType: z.enum(['open', 'invite-only']),
   });
   ```

2. **Define Router Contracts** (`shared/contracts/src/router.ts`):
   ```bash
   # Add router definitions:
   # - membershipsContract (6 endpoints)
   # - joinRequestsContract (3 endpoints)
   # - moderationContract (5 endpoints)
   # - feedsContract (2 endpoints)

   # Example: membershipsContract
   export const membershipsContract = {
     join: route({
       input: JoinCommunitySchema,
       output: MembershipResponseSchema,
     }),
     // ... other endpoints
   };
   ```

3. **Type Check Contracts**:
   ```bash
   pnpm --filter @atrarium/contracts typecheck
   ```

### Phase 2: Server Implementation

1. **Add PDS Service Methods** (`server/src/services/atproto.ts`):
   ```bash
   # Implement PDS write/read operations:
   # - createMembership(did, communityId, role, status)
   # - deleteMembership(did, communityId)
   # - listMemberships(did)
   # - updateMembershipRole(did, communityId, newRole)
   # - createModerationAction(moderatorDid, action, target, reason)
   # - listModerationActions(communityId)

   # Example: createMembership
   async createMembership(
     did: string,
     communityId: string,
     role: 'owner' | 'moderator' | 'member',
     status: 'active' | 'pending' = 'active'
   ): Promise<void> {
     const agent = await this.getAgent(did);
     await agent.com.atproto.repo.createRecord({
       repo: did,
       collection: 'net.atrarium.community.membership',
       record: {
         did,
         community: communityId,
         role,
         status,
         joinedAt: new Date().toISOString(),
         active: status === 'active',
       },
     });
   }
   ```

2. **Implement Server Routes** (`server/src/routes/`):
   ```bash
   # Implement HTTP handlers:
   # - memberships.ts (join, leave, list members, change role, remove)
   # - moderation.ts (hide/unhide, block/unblock, history)
   # - feed-generator.ts (proxy to CommunityFeedGenerator DO)

   # Example: POST /api/memberships (join community)
   router.post('/api/memberships', async (c) => {
     const { communityId, accessType } = await c.req.json();
     const userDid = c.get('userDid'); // from authMiddleware

     // Check for duplicate membership
     const existing = await atprotoService.getMembership(userDid, communityId);
     if (existing) {
       return c.json({ error: 'Already a member' }, 409);
     }

     // Create membership record
     const status = accessType === 'open' ? 'active' : 'pending';
     await atprotoService.createMembership(userDid, communityId, 'member', status);

     return c.json({ success: true, status });
   });
   ```

3. **Write Server Tests** (`server/tests/`):
   ```bash
   # Contract tests (tests/contract/):
   # - memberships/join.test.ts
   # - memberships/leave.test.ts
   # - moderation/hide-post.test.ts
   # - etc.

   # Integration tests (tests/integration/):
   # - join-request-flow.test.ts
   # - moderation-flow.test.ts
   # - ownership-transfer.test.ts

   # Run tests
   pnpm --filter server test
   ```

### Phase 3: Client Implementation

1. **Create React Components** (`client/src/components/`):
   ```bash
   # Community components:
   # - CommunityBrowser.tsx (discovery page)
   # - CommunityCard.tsx (individual community card)
   # - CommunityDetail.tsx (detail page with feed)
   # - JoinCommunityButton.tsx (join/request join action)
   # - MembershipStatusBadge.tsx (user's membership status)

   # Feed components:
   # - CommunityFeed.tsx (feed view with polling)
   # - FeedPost.tsx (individual post card)
   # - FeedPagination.tsx (pagination controls, 20/page)

   # Moderation components:
   # - MemberManagementTable.tsx (member list with TanStack Table)
   # - ModerationActionsPanel.tsx (hide/block controls)
   # - ModerationHistory.tsx (log display)
   # - JoinRequestList.tsx (pending requests)
   # - CommunityStatsPanel.tsx (member count, pending requests)

   # Example: JoinCommunityButton.tsx
   export function JoinCommunityButton({ communityId, accessType }: Props) {
     const joinMutation = useJoinCommunity();

     const handleJoin = () => {
       joinMutation.mutate({ communityId, accessType });
     };

     return (
       <Button onClick={handleJoin} disabled={joinMutation.isPending}>
         {accessType === 'open' ? 'Join Community' : 'Request to Join'}
       </Button>
     );
   }
   ```

2. **Add TanStack Query Hooks** (`client/src/lib/api.ts`):
   ```bash
   # Query hooks (data fetching):
   # - useCommunities() - list all communities
   # - useCommunity(id) - single community
   # - useMyMemberships() - user's memberships
   # - useCommunityMembers(id) - member list (admin only)
   # - useCommunityFeed(id) - feed with pagination + polling
   # - useCommunityStats(id) - statistics with polling
   # - useJoinRequests(id) - pending requests (admin only)
   # - useModerationHistory(id) - moderation log

   # Mutation hooks (data modification):
   # - useJoinCommunity() - join or request join
   # - useLeaveCommunity() - leave community
   # - useChangeMemberRole() - promote/demote
   # - useRemoveMember() - remove member
   # - useApproveJoinRequest() - approve request
   # - useRejectJoinRequest() - reject request
   # - useHidePost() - hide post
   # - useUnhidePost() - unhide post
   # - useBlockUser() - block user
   # - useUnblockUser() - unblock user

   # Example: useCommunityStats with polling
   export function useCommunityStats(communityId: string) {
     return useQuery({
       queryKey: ['communityStats', communityId],
       queryFn: () => apiClient.feeds.stats({ communityId }),
       refetchInterval: 10000, // 10s polling (dynamic data)
       refetchOnWindowFocus: false, // disable for inactive tabs
     });
   }
   ```

3. **Add TanStack Router Routes** (`client/src/routes/communities/`):
   ```bash
   # Routes:
   # - index.tsx - Community browser page
   # - $communityId.tsx - Community detail page with feed
   # - $communityId.manage.tsx - Admin management page (protected)

   # Example: $communityId.tsx
   export const Route = createFileRoute('/communities/$communityId')({
     component: CommunityDetailPage,
     loader: ({ params }) => queryClient.ensureQueryData({
       queryKey: ['community', params.communityId],
       queryFn: () => apiClient.communities.get({ id: params.communityId }),
     }),
   });
   ```

4. **Add i18n Translations** (`client/src/i18n/locales/`):
   ```bash
   # EN translations (en/translation.json):
   {
     "communities": {
       "join": "Join Community",
       "requestJoin": "Request to Join",
       "leave": "Leave Community",
       "memberCount": "{{count}} members",
       "pendingRequests": "{{count}} pending requests"
     },
     "moderation": {
       "hidePost": "Hide Post",
       "blockUser": "Block User",
       "reason": "Reason (required)"
     }
   }

   # JA translations (ja/translation.json):
   {
     "communities": {
       "join": "コミュニティに参加",
       "requestJoin": "参加リクエスト",
       "leave": "コミュニティを退会",
       "memberCount": "{{count}}人のメンバー",
       "pendingRequests": "{{count}}件の保留中リクエスト"
     },
     "moderation": {
       "hidePost": "投稿を非表示",
       "blockUser": "ユーザーをブロック",
       "reason": "理由（必須）"
     }
   }
   ```

5. **Write Component Tests** (`client/tests/components/`):
   ```bash
   # Component tests with Vitest + Testing Library:
   # - CommunityBrowser.test.tsx
   # - CommunityCard.test.tsx
   # - JoinCommunityButton.test.tsx
   # - CommunityFeed.test.tsx
   # - MemberManagementTable.test.tsx
   # - JoinRequestList.test.tsx

   # Run tests
   pnpm --filter client test
   ```

6. **Write E2E Tests** (`client/tests/e2e/`):
   ```bash
   # Playwright E2E tests:
   # - join-open-community.spec.ts
   # - join-invite-only-community.spec.ts
   # - view-community-feed.spec.ts
   # - admin-member-management.spec.ts
   # - admin-moderation.spec.ts
   # - ownership-transfer.spec.ts

   # Run E2E tests
   pnpm --filter client exec playwright test
   ```

### Phase 4: Lexicon Schema Updates

**Required Updates** (per /clarify session):

1. **Update `net.atrarium.community.membership`**:
   ```bash
   # Edit lexicons/net.atrarium.community.membership.json
   # Add 'status' field to properties:
   {
     "status": {
       "type": "string",
       "enum": ["active", "pending"],
       "description": "Membership status: 'active' for approved members, 'pending' for join requests awaiting approval"
     }
   }

   # Regenerate TypeScript types
   pnpm --filter server codegen
   ```

2. **Update `net.atrarium.community.config`**:
   ```bash
   # Edit lexicons/net.atrarium.community.config.json
   # Add 'accessType' field to properties:
   {
     "accessType": {
       "type": "string",
       "enum": ["open", "invite-only"],
       "description": "Community access control: 'open' allows immediate join, 'invite-only' requires admin approval"
     }
   }

   # Regenerate TypeScript types
   pnpm --filter server codegen
   ```

### Phase 5: Integration Testing

1. **Test with Local PDS**:
   ```bash
   # Ensure DevContainer PDS is running
   docker ps | grep pds

   # Run PDS integration tests
   pnpm --filter server test:pds

   # Test scenarios:
   # 1. Alice joins open community → membership created with status='active'
   # 2. Bob requests join invite-only community → membership created with status='pending'
   # 3. Admin approves Bob's request → status changed to 'active'
   # 4. Admin views community stats → memberCount reflects active memberships only
   ```

2. **Test Full Workflow**:
   ```bash
   # Start server and client in parallel
   ./start-dev.sh
   # OR manually:
   # pnpm --filter server dev &
   # pnpm --filter client dev

   # Open browser: http://localhost:5173
   # 1. Login with PDS account
   # 2. Browse communities
   # 3. Join open community (immediate access)
   # 4. Request join invite-only community (pending approval)
   # 5. Admin approves request (change status to active)
   # 6. View community feed
   # 7. Admin moderates content (hide post)
   # 8. View moderation history
   # 9. View community statistics (member count, pending requests)
   ```

### Phase 6: Quality Checks

1. **Linting & Formatting**:
   ```bash
   # Run Biome checks
   pnpm biome check --write
   ```

2. **Type Checking**:
   ```bash
   # Type check all workspaces
   pnpm -r typecheck
   ```

3. **All Tests**:
   ```bash
   # Run all test suites
   pnpm -r test
   ```

4. **Performance Validation**:
   ```bash
   # Verify performance targets:
   # - Community list load: <3 seconds (FR-032)
   # - Feed polling: 10-30s intervals (FR-026)
   # - Cache policy: Static 5min, dynamic 10-30s (FR-034)

   # Use browser DevTools Network tab to verify:
   # - TanStack Query cache headers
   # - Polling intervals
   # - Request counts
   ```

5. **Accessibility Audit**:
   ```bash
   # Use Lighthouse or axe DevTools
   # Verify:
   # - Keyboard navigation
   # - Screen reader support
   # - ARIA labels
   # - Color contrast
   ```

6. **Mobile Responsiveness**:
   ```bash
   # Test on mobile viewports:
   # - iPhone (375x667)
   # - iPad (768x1024)
   # - Android (360x640)

   # Verify:
   # - Layouts adapt to small screens
   # - Touch targets ≥44x44px
   # - No horizontal scroll
   ```

## Common Issues & Solutions

### Issue: "PDS connection failed"
**Solution**: Verify PDS_URL is correct and PDS container is running
```bash
docker ps | grep pds
curl http://localhost:3000/xrpc/_health
```

### Issue: "Duplicate membership error"
**Solution**: Check for existing membership before creating new record
```typescript
const existing = await atprotoService.getMembership(userDid, communityId);
if (existing) {
  return c.json({ error: 'Already a member' }, 409);
}
```

### Issue: "Statistics show wrong member count"
**Solution**: Ensure COUNT query filters by `status='active'` AND `active=true`
```typescript
const memberCount = memberships.filter(
  m => m.status === 'active' && m.active === true
).length;
```

### Issue: "Ownership transfer fails"
**Solution**: Verify exactly one owner constraint before/after transfer
```typescript
// Before transfer: validate new owner is existing member
// After transfer: old owner → role='member', new owner → role='owner'
```

### Issue: "Polling not working in background tabs"
**Solution**: Set `refetchOnWindowFocus: false` in TanStack Query config
```typescript
useQuery({
  queryKey: ['stats'],
  queryFn: fetchStats,
  refetchInterval: 10000,
  refetchOnWindowFocus: false, // Disable for inactive tabs
});
```

## Acceptance Criteria Validation

Match each acceptance scenario from [spec.md](./spec.md):

- ✅ **General User #1**: Browse communities → CommunityBrowser component shows list
- ✅ **General User #2**: Join open community → Immediate access, `status='active'`
- ✅ **General User #2a**: Request join invite-only → `status='pending'`, awaits approval
- ✅ **General User #2b**: Admin approves request → `status='pending'` → `'active'`
- ✅ **General User #3**: View community feed → CommunityFeed component with pagination
- ✅ **General User #4**: Leave community → `active=false`, no longer see posts
- ✅ **General User #5**: Unauthenticated access → Redirect to PDS login
- ✅ **Admin #1**: View management page → MemberManagementTable, ModerationActionsPanel
- ✅ **Admin #2**: Owner promotes member → `role='member'` → `'moderator'`
- ✅ **Admin #2a**: Owner demotes moderator → `role='moderator'` → `'member'`
- ✅ **Admin #2b**: Moderator removes regular member → `active=false` (moderators cannot change roles)
- ✅ **Admin #3**: Hide policy-violating post → Moderation action created, post hidden
- ✅ **Admin #4**: Review moderation history → ModerationHistory component shows log
- ✅ **Admin #5**: Block disruptive user → All user's posts hidden, cannot post new content
- ✅ **Admin #6**: View community statistics → Member count + pending request count (PDS-feasible only)

## Next Steps

After completing this quickstart:

1. **Update Documentation**:
   - Add usage examples to [client/README.md](../../client/README.md)
   - Document API endpoints in [server/API.md](../../server/API.md)

2. **Deploy to Production**:
   ```bash
   # Server deployment
   pnpm --filter server deploy

   # Client deployment (Cloudflare Pages)
   pnpm --filter client build
   wrangler pages deploy client/dist --project-name=atrarium-dashboard
   ```

3. **Monitor Performance**:
   - Check Cloudflare Workers analytics
   - Monitor PDS query performance
   - Verify polling intervals are optimized

## References

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [data-model.md](./data-model.md) - Data entities
- [contracts/](./contracts/) - oRPC contracts
- [CLAUDE.md](../../CLAUDE.md) - Project documentation
- [AT Protocol Docs](https://atproto.com/docs)
- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
