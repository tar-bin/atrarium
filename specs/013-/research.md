# Research: Client Use Case Implementation

**Feature**: 013- Client Use Case Implementation for General Users and Community Administrators
**Date**: 2025-10-07
**Phase**: 0 (Research)

## Objective

Analyze existing Atrarium codebase to identify reusable patterns, dependencies, and implementation strategies for adding general user and administrator use cases to the web client.

## Existing Architecture Analysis

### Frontend Stack (client/)

**Framework**: React 19 with TypeScript 5.7
**Router**: TanStack Router v1 (file-based routing with type safety)
**State Management**: TanStack Query v5 (server state), React Context (client state)
**UI Library**: shadcn/ui (Radix UI primitives + Tailwind CSS)
**Styling**: Tailwind CSS
**Internationalization**: i18next (EN/JA translations)
**Build Tool**: Vite

**Key Files**:
- `client/src/main.tsx` - Entry point with router provider
- `client/src/router.tsx` - TanStack Router configuration
- `client/src/App.tsx` - Root app component
- `client/src/contexts/PDSContext.tsx` - PDS authentication state
- `client/src/lib/api.ts` - oRPC API client
- `client/src/lib/queryClient.ts` - TanStack Query configuration

### Backend Stack (server/)

**Runtime**: Cloudflare Workers (Node.js compatibility via nodejs_compat)
**Framework**: Hono ^4.6.14 (routing)
**Type Safety**: oRPC ^1.9.3 (type-safe RPC)
**AT Protocol**: @atproto/api ^0.13.35 (PDS integration)
**Storage**: Durable Objects (ephemeral cache), PDS (persistent storage)

**Key Files**:
- `server/src/index.ts` - Main Workers entry point
- `server/src/routes/communities.ts` - Community CRUD endpoints
- `server/src/routes/memberships.ts` - Membership endpoints (minimal implementation)
- `server/src/routes/moderation.ts` - Moderation endpoints (minimal implementation)
- `server/src/services/atproto.ts` - PDS service layer
- `server/src/durable-objects/community-feed-generator.ts` - Feed cache

### Shared Contracts (shared/contracts/)

**Purpose**: Type-safe API contract shared between client and server
**Technology**: oRPC ^1.9.3 + Zod validation

**Current Contracts** (`shared/contracts/src/router.ts`):
```typescript
export const contract = {
  communities: {
    list: authed.route({ method: 'GET', path: '/api/communities' }).output(...),
    create: authed.route({ method: 'POST', path: '/api/communities' }).input(...).output(...),
    get: authed.route({ method: 'GET', path: '/api/communities/:id' }).input(...).output(...),
  },
};
```

**Schema Definitions** (`shared/contracts/src/schemas.ts`):
- `CommunityListOutputSchema`: Array of community objects
- `CommunityOutputSchema`: Single community object
- `CreateCommunitySchema`: Community creation input
- `GetCommunityInputSchema`: Community ID parameter

## Existing Components Inventory

### Component Structure

```
client/src/components/
├── communities/
│   ├── CreateCommunity.tsx         ✅ Exists (community creation form)
│   ├── CommunityList.tsx           ✅ Exists (basic list view)
│   └── CommunityExample.tsx        ✅ Exists (example component)
├── feeds/
│   ├── FeedList.tsx                ✅ Exists (basic feed list)
│   └── FeedExample.tsx             ✅ Exists (example component)
├── moderation/
│   ├── ModerationLog.tsx           ✅ Exists (basic moderation log)
│   └── ModerationExample.tsx       ✅ Exists (example component)
├── pds/
│   └── PDSLogin.tsx                ✅ Exists (PDS authentication)
├── layout/
│   ├── Header.tsx                  ✅ Exists (app header)
│   ├── Sidebar.tsx                 ✅ Exists (navigation sidebar)
│   └── Layout.tsx                  ✅ Exists (page layout wrapper)
└── ui/                             ✅ shadcn/ui components library
    ├── button.tsx
    ├── card.tsx
    ├── table.tsx
    ├── input.tsx
    └── ... (30+ components)
```

### Existing Routes

```
client/src/routes/
├── __root.tsx                      ✅ Root layout with Header + Sidebar
├── index.tsx                       ✅ Home page (dashboard)
├── communities/
│   └── index.tsx                   ✅ Community list page (basic)
└── moderation.tsx                  ✅ Global moderation log page
```

**Missing Routes**:
- `communities/$communityId.tsx` - Community detail page
- `communities/$communityId.manage.tsx` - Admin management page
- Feed viewing routes
- Join request management routes

## Reusable Patterns Identified

### 1. PDS Authentication Pattern

**File**: `client/src/contexts/PDSContext.tsx`

**Pattern**:
```typescript
const PDSContext = createContext<PDSContextValue | null>(null);

export const PDSProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<PDSSession | null>(null);
  const [agent, setAgent] = useState<AtpAgent | null>(null);

  // Login, logout, session persistence logic

  return <PDSContext.Provider value={{ session, agent, ... }}>{children}</PDSContext.Provider>;
};

export const usePDS = () => {
  const context = useContext(PDSContext);
  if (!context) throw new Error('usePDS must be used within PDSProvider');
  return context;
};
```

**Usage**: Wrap app in `<PDSProvider>`, access via `usePDS()` hook

### 2. oRPC API Client Pattern

**File**: `client/src/lib/api.ts`

**Pattern**:
```typescript
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ClientRouter } from '@atrarium/contracts';

const link = new RPCLink({
  url: baseURL,
  headers: () => ({ Authorization: `Bearer ${token}` }),
});

export const apiClient: ClientRouter = createORPCClient(link);
```

**Usage**: `apiClient.communities.list()` - type-safe, auto-validated

### 3. TanStack Query Integration Pattern

**Example** (from existing code):
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Query hook
export const useCommunities = () => {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => apiClient.communities.list(),
  });
};

// Mutation hook
export const useCreateCommunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommunityInput) => apiClient.communities.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
};
```

### 4. TanStack Router Routing Pattern

**File-based routing**:
```typescript
// client/src/routes/communities/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/communities/')({
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const { data: communities } = useCommunities();
  return <CommunityList communities={communities} />;
}
```

**Dynamic routes**:
```typescript
// client/src/routes/communities/$communityId.tsx
export const Route = createFileRoute('/communities/$communityId')({
  component: CommunityDetailPage,
});

function CommunityDetailPage() {
  const { communityId } = Route.useParams();
  const { data: community } = useCommunity(communityId);
  return <CommunityDetail community={community} />;
}
```

### 5. i18next Localization Pattern

**Files**:
- `client/src/i18n/index.ts` - i18next configuration
- `client/src/i18n/locales/en/translation.json` - English translations
- `client/src/i18n/locales/ja/translation.json` - Japanese translations

**Usage**:
```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('communities.title')}</h1>;
}
```

### 6. shadcn/ui Component Pattern

**Usage**:
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';

function Component() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>...</TableHeader>
          <TableBody>...</TableBody>
        </Table>
        <Button onClick={handleAction}>{t('action')}</Button>
      </CardContent>
    </Card>
  );
}
```

## Backend API Endpoint Patterns

### Current Endpoint Structure

```typescript
// server/src/routes/communities.ts
import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/communities', async (c) => {
  // List communities logic
  return c.json({ communities: [] });
});

app.post('/api/communities', async (c) => {
  // Create community logic
  const body = await c.req.json();
  return c.json({ community: {} });
});

export default app;
```

### PDS Integration Pattern

```typescript
// server/src/services/atproto.ts
import { AtpAgent } from '@atproto/api';

export class AtProtoService {
  private agent: AtpAgent;

  constructor(serviceUrl: string) {
    this.agent = new AtpAgent({ service: serviceUrl });
  }

  async createRecord(did: string, collection: string, record: any) {
    // Write to PDS using Lexicon schema
    await this.agent.api.com.atproto.repo.createRecord({
      repo: did,
      collection,
      record,
    });
  }

  async listRecords(did: string, collection: string) {
    // Read from PDS
    const response = await this.agent.api.com.atproto.repo.listRecords({
      repo: did,
      collection,
    });
    return response.data.records;
  }
}
```

## AT Protocol Lexicon Schemas

**Existing Schemas** (`lexicons/`):

1. **`net.atrarium.community.config`** - Community configuration
2. **`net.atrarium.community.membership`** - User memberships
3. **`net.atrarium.moderation.action`** - Moderation actions

**Storage Architecture**:
- **PDS**: Persistent storage via AT Protocol Lexicon records
- **Durable Objects**: 7-day ephemeral cache for feed index
- **Firehose**: Event stream for indexing PDS changes

## Dependencies Analysis

### Existing Dependencies (No Changes Required)

**Frontend**:
- `react` ^19.0.0
- `react-dom` ^19.0.0
- `@tanstack/react-router` ^1.0.0
- `@tanstack/react-query` ^5.0.0
- `@tanstack/react-table` ^8.0.0
- `@orpc/client` ^1.9.3
- `@radix-ui/react-*` (shadcn/ui dependencies)
- `tailwindcss` ^3.4.0
- `i18next` ^23.0.0
- `react-i18next` ^15.0.0
- `react-hook-form` ^7.0.0
- `zod` ^4.1.11

**Backend**:
- `hono` ^4.6.14
- `@atproto/api` ^0.13.35
- `@orpc/server` ^1.9.3
- `zod` ^4.1.11

**Shared**:
- `@orpc/zod` ^1.9.3
- `zod` ^4.1.11

### New Dependencies (None Required)

All required functionality can be implemented using existing dependencies.

## Technical Constraints

### PDS-First Architecture (Principle 8)

**Constraint**: All persistent data must be stored in PDS using Lexicon schemas.

**Implications**:
- Join requests → Store in requester's PDS (`net.atrarium.community.joinRequest`)
- Moderation actions → Store in moderator's PDS (`net.atrarium.moderation.action`)
- Memberships → Store in user's PDS (`net.atrarium.community.membership`)

**Implementation Strategy**:
1. Client submits action to backend API
2. Backend writes to user's PDS via `@atproto/api`
3. Firehose picks up change and updates Durable Object cache
4. Client polls backend API for updated data (10-30s interval)

### Economic Efficiency (Principle 3)

**Constraint**: <$5/month total infrastructure cost

**Implications**:
- No WebSocket connections (use polling instead)
- Leverage Cloudflare Workers free tier (1M requests/day)
- Minimize Durable Object read/writes
- Use TanStack Query caching to reduce API calls

### Operational Simplicity (Principle 2)

**Constraint**: No new databases, services, or frameworks

**Implications**:
- Reuse existing React 19 + TanStack stack
- Extend existing oRPC contracts (no new API framework)
- Use existing Durable Objects (no new storage layer)

## Implementation Risks & Mitigation

### Risk 1: PDS Latency

**Risk**: Writing to user PDSs may be slow (500ms-2s)

**Mitigation**:
- Use optimistic UI updates (TanStack Query `onMutate`)
- Show loading indicators during PDS operations
- Implement retry logic for failed PDS writes

### Risk 2: Polling Overhead

**Risk**: 10-30s polling may increase API call volume

**Mitigation**:
- Use TanStack Query `refetchInterval` for background polling
- Stop polling when tab is inactive (`refetchOnWindowFocus`)
- Cache aggressively (5-minute stale time for static data)

### Risk 3: Join Request Notification

**Risk**: Admins may miss join requests without real-time notifications

**Mitigation**:
- Display badge count on admin panel sidebar
- Highlight pending requests in admin UI
- Consider email notifications (future phase)

### Risk 4: Lexicon Schema Changes

**Risk**: Adding `accessType` field to `net.atrarium.community.config` may break existing communities

**Mitigation**:
- Make `accessType` optional (default to `open`)
- Implement migration script for existing communities
- Test with local PDS in DevContainer

## Testing Strategy

### Unit Testing

**Tool**: Vitest
**Scope**: Individual components, hooks, utilities

**Example**:
```typescript
// client/src/components/communities/CommunityCard.test.tsx
import { render, screen } from '@testing-library/react';
import { CommunityCard } from './CommunityCard';

test('renders community name', () => {
  render(<CommunityCard community={{ name: 'Test Community' }} />);
  expect(screen.getByText('Test Community')).toBeInTheDocument();
});
```

### Integration Testing

**Tool**: Vitest + @cloudflare/vitest-pool-workers (server), Testing Library (client)
**Scope**: API endpoints, PDS integration, oRPC contracts

**Example**:
```typescript
// server/tests/integration/memberships.test.ts
import { describe, test, expect } from 'vitest';
import { apiClient } from '../helpers/test-client';

test('join community creates membership in PDS', async () => {
  const response = await apiClient.memberships.join({ communityId: 'test' });
  expect(response.membership.active).toBe(true);
});
```

### E2E Testing

**Tool**: Playwright
**Scope**: User flows (join community, moderate post, etc.)

**Example**:
```typescript
// client/tests/e2e/join-community.spec.ts
import { test, expect } from '@playwright/test';

test('user can join open community', async ({ page }) => {
  await page.goto('/communities');
  await page.click('button:has-text("Join")');
  await expect(page.locator('text=Joined')).toBeVisible();
});
```

### PDS Integration Testing

**Tool**: Local PDS in DevContainer
**Scope**: Validate Lexicon schema writes and Firehose indexing

**Setup**:
```bash
# Start local PDS (DevContainer auto-starts)
.devcontainer/setup-pds.sh

# Run PDS integration tests
pnpm --filter server test:pds
```

## Recommended Implementation Order

1. **Phase 1: Contracts & Server** (Foundation)
   - Define oRPC contracts for memberships, moderation, feeds
   - Implement server-side endpoints
   - Add PDS service methods
   - Write contract tests

2. **Phase 2: Client Components** (UI)
   - Create community browsing components
   - Create feed viewing components
   - Create admin management components
   - Add i18n translations

3. **Phase 3: Client Routes** (Navigation)
   - Add TanStack Router routes
   - Integrate components with routes
   - Configure TanStack Query hooks

4. **Phase 4: Testing & Polish** (Quality)
   - Write component tests
   - Write E2E tests
   - Performance optimization
   - Documentation updates

## Key Takeaways

1. **Existing Infrastructure is Sufficient**: No new dependencies, frameworks, or services required
2. **PDS-First Architecture is Enforced**: All writes go to PDS, backend indexes via Firehose
3. **Polling-Based Updates**: Use TanStack Query `refetchInterval` for 10-30s polling
4. **Reusable Patterns Established**: PDS auth, oRPC client, TanStack Router, shadcn/ui
5. **Type Safety Throughout**: oRPC contracts ensure type safety from client to server
6. **Lexicon Schema Extension**: Add `accessType` field to `net.atrarium.community.config`
7. **Join Requests in PDS**: Store in requester's PDS (`net.atrarium.community.joinRequest`)
8. **Testing Strategy Defined**: Unit (Vitest), Integration (@cloudflare/vitest-pool-workers), E2E (Playwright)

## Next Steps (Phase 1: Design)

1. Define detailed oRPC contract schemas for memberships, moderation, feeds
2. Design data model with AT Protocol Lexicon schemas
3. Create quickstart guide for implementation workflow
