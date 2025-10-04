# Research: Web Dashboard Technologies (TanStack Edition)

**Feature**: 005-pds-web-atrarim
**Date**: 2025-10-04
**Updated**: TanStack ecosystem decision

## 1. React 18 + Vite Setup for Cloudflare Pages

**Decision**: Use `npm create vite@latest` with `react-ts` template

**Rationale**:
- Vite provides fast HMR and optimized builds
- Official React template includes TypeScript by default
- Cloudflare Pages supports static site deployment out-of-the-box
- No custom build configuration needed

**Implementation Notes**:
- Use `vite build` to generate static assets in `dist/`
- Deploy `dist/` to Cloudflare Pages
- Environment variables via `.env.development` and Cloudflare Pages dashboard

---

## 2. TanStack Query v5 for Server State Management

**Decision**: Use **TanStack Query v5** for all server data fetching/caching/mutations

**Rationale**:
- Automatic caching with smart invalidation
- Built-in loading/error states
- Optimistic updates for better UX
- Request deduplication (multiple components fetch same data → 1 request)
- Works seamlessly with Cloudflare Pages (no SSR required)
- Industry standard (Vercel, Expo, GitHub, Twitch)

**Key Benefits for Atrarium**:
- Auto-refetch communities list when creating new community
- Background updates for post list
- Mutation callbacks for user feedback

---

## 3. TanStack Router v1 for Type-Safe File-Based Routing

**Decision**: Use **TanStack Router v1** for routing

**Rationale**:
- Type-safe routes (TypeScript errors on invalid params)
- File-based routing (automatic route generation)
- Built-in data loading (colocated with routes)
- Code splitting (lazy load routes)
- First-class TanStack Query integration

**File Structure**:
```
src/routes/
├── __root.tsx
├── index.tsx
├── communities/
│   ├── index.tsx
│   └── $communityId/
│       ├── index.tsx
│       └── feeds.$feedId.tsx
└── moderation.tsx
```

---

## 4. TanStack Table v8 for Tables

**Decision**: Use **TanStack Table v8** for moderation log and post lists

**Rationale**:
- Headless UI (works with Tailwind CSS)
- Built-in sorting/filtering/pagination
- Virtualization for 10k+ rows
- Fully typed column definitions
- ARIA-compliant

**Use Cases**:
- Moderation Log: Sort by time, filter by action
- Post List: Sort by timestamp, show/hide columns
- Hidden Posts Tab: Filter by moderation status

---

## 5. @atproto/api for PDS Integration

**Decision**: Use `BskyAgent` from `@atproto/api`

**Rationale**:
- Official Bluesky SDK
- Already used in backend
- Handles auth, session, posting

**Integration with TanStack Query**:
```typescript
const loginMutation = useMutation({
  mutationFn: async ({ handle, password }) => {
    const agent = new BskyAgent({ service: PDS_URL });
    await agent.login({ identifier: handle, password });
    return agent;
  }
});
```

---

## 6. Tailwind CSS v3

**Decision**: Use Tailwind CSS v3 with JIT

**Setup**:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 7. shadcn/ui for UI Components

**Decision**: Use **shadcn/ui** for accessible, customizable components

**Rationale**:
- Copy/paste approach (no runtime dependency bloat)
- Built on Radix UI (ARIA-compliant, accessible)
- Fully customizable with Tailwind CSS
- TypeScript-first
- Works seamlessly with TanStack ecosystem
- No prop drilling (Radix handles context)

**Key Benefits for Atrarium**:
- Dialog component for moderation confirmations
- Form components for community/feed creation
- Table component (can be combined with TanStack Table for data logic)
- Toast for success/error notifications
- Card, Button, Badge for consistent UI

**Implementation Pattern**:
```bash
# Install shadcn/ui CLI
npx shadcn-ui@latest init

# Add components as needed (copied to src/components/ui/)
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add button
npx shadcn-ui@latest add form
npx shadcn-ui@latest add card
npx shadcn-ui@latest add toast
```

**Component Structure**:
```
src/components/
├── ui/              # shadcn/ui components (copied, customizable)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── card.tsx
│   └── toast.tsx
└── communities/     # Feature components (use ui/ components)
    └── CreateCommunityModal.tsx  # Uses Dialog from ui/
```

**Example Usage**:
```typescript
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function CreateCommunityModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Community</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Community</DialogTitle>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  );
}
```

**Alternatives Considered**:
- **Chakra UI**: Runtime CSS-in-JS (slower, larger bundle)
- **Material UI**: Opinionated design, hard to customize
- **Headless UI**: Good, but less comprehensive than Radix + shadcn/ui
- **Ant Design**: Too heavy, not Tailwind-native

---

## 8. react-i18next for Internationalization

**Decision**: Use **react-i18next** for English/Japanese support

**Rationale**:
- Lightweight (50KB), React-optimized
- Works seamlessly with TanStack Router (route-level language switching)
- Browser language auto-detection
- JSON-based translations (easy maintenance)
- Plural forms, interpolation, context support
- Used by major projects (Docusaurus, Strapi)

**Alternatives Considered**:
- **FormatJS (react-intl)**: Heavier, more complex API
- **i18next vanilla**: react-i18next is React wrapper, better DX
- **Lingui**: Requires Babel setup, not compatible with Vite out-of-the-box

**Implementation Pattern**:
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ja from './locales/ja.json';

i18n
  .use(LanguageDetector) // Auto-detect browser language
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ja: { translation: ja } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

// Usage in components
const { t, i18n } = useTranslation();
<h1>{t('community.title')}</h1>
<button onClick={() => i18n.changeLanguage('ja')}>日本語</button>
```

**Translation File Structure**:
```json
// src/i18n/locales/en.json
{
  "community": {
    "title": "Communities",
    "create": "Create Community",
    "members": "{{count}} member",
    "members_plural": "{{count}} members"
  },
  "feed": {
    "hashtag": "Feed Hashtag",
    "copyHashtag": "Copy Hashtag"
  }
}

// src/i18n/locales/ja.json
{
  "community": {
    "title": "コミュニティ",
    "create": "コミュニティを作成",
    "members": "{{count}}人のメンバー"
  },
  "feed": {
    "hashtag": "フィードハッシュタグ",
    "copyHashtag": "ハッシュタグをコピー"
  }
}
```

**Language Toggle Component**:
```typescript
function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </select>
  );
}
```

**Benefits for Atrarium**:
- Aligns with VitePress docs (already EN/JA)
- Japanese developer community support
- International Bluesky users

---

## 9. Form Validation with React Hook Form + Zod

**Decision**: Use **react-hook-form** with **Zod** resolver for form validation

**Rationale**:
- Zod already used in backend (share validation schemas)
- React Hook Form: Minimal re-renders, excellent performance
- Type-safe validation (TypeScript + Zod)
- Works seamlessly with shadcn/ui Form components

**Implementation Pattern**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const communitySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional()
});

function CreateCommunityForm() {
  const form = useForm({
    resolver: zodResolver(communitySchema)
  });

  return (
    <Form {...form}>
      <FormField name="name" render={({ field }) => (
        <Input {...field} />
      )} />
    </Form>
  );
}
```

**Benefits**:
- ✅ Reuse backend validation schemas
- ✅ Client-side validation before API call
- ✅ Built-in error messages with i18n support

---

## 10. Icon Library with Lucide React

**Decision**: Use **lucide-react** for icons

**Rationale**:
- Official recommendation from shadcn/ui
- Tree-shakeable (only import used icons)
- Consistent design system
- TypeScript definitions included
- 1000+ icons available

**Usage**:
```typescript
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

<Button><Plus className="mr-2 h-4 w-4" />Create</Button>
<Button><Trash2 className="h-4 w-4" /></Button>
```

**Common Icons for Atrarium**:
- `Plus` - Create community/feed
- `Trash2` - Delete actions
- `Eye`/`EyeOff` - Hide/unhide posts
- `Ban` - Block users
- `Copy` - Copy hashtag
- `Settings` - Settings menu

---

## 11. Date Formatting with date-fns

**Decision**: Use **date-fns** for date/time formatting

**Rationale**:
- Lightweight (17KB minified + gzip with tree-shaking)
- Immutable functions (no mutating Date objects)
- i18n support (locales for EN/JA)
- TypeScript-first

**Usage**:
```typescript
import { formatDistanceToNow, format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

// Unix timestamp (seconds) to relative time
const createdAt = 1704067200; // Unix epoch
formatDistanceToNow(createdAt * 1000, { addSuffix: true, locale: ja });
// → "3日前"

// Absolute format
format(createdAt * 1000, 'PPpp', { locale: enUS });
// → "Jan 1, 2025, 12:00:00 AM"
```

**Use Cases**:
- Post timestamps ("2 hours ago")
- Moderation log timestamps
- Community creation date

---

## 12. Error Handling with react-error-boundary

**Decision**: Use **react-error-boundary** for error boundaries

**Rationale**:
- Hook-based API (no class components)
- Reset error state functionality
- Customizable fallback UI
- Small bundle size (5KB)

**Implementation**:
```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

**Placement**:
- Root level (catch all errors)
- Route level (isolate page errors)
- Component level (critical components)

---

## 13. API Type Safety with oRPC

**Decision**: Use **oRPC** for end-to-end type-safe API communication

**Rationale**:
- Shares TypeScript types between backend (Hono) and frontend (React)
- No code generation (types inferred automatically)
- Works with existing Hono routes
- Lightweight runtime overhead
- Built for Cloudflare Workers

**Architecture**:
```
Backend (Hono Router)          Frontend (React + TanStack Query)
├── routes/communities.ts   →  ├── Inferred types (automatic)
│   └── export type AppType    │   └── useMutation<CreateCommunityInput>
└── index.ts                   └── oRPC client setup
    └── const app = new Hono()
```

**Implementation Pattern**:

**Backend** (`src/index.ts`):
```typescript
import { Hono } from 'hono';
import communitiesRoute from './routes/communities';

const app = new Hono()
  .route('/api/communities', communitiesRoute);

export type AppType = typeof app;
export default app;
```

**Frontend** (`dashboard/src/lib/api.ts`):
```typescript
import { createClient } from 'orpc/client';
import type { AppType } from '../../../src/index'; // Import backend types

export const api = createClient<AppType>({
  baseURL: import.meta.env.VITE_API_URL
});

// Usage with TanStack Query
import { useMutation } from '@tanstack/react-query';

const createCommunity = useMutation({
  mutationFn: (data) => api.communities.$post({ json: data })
  // TypeScript knows `data` shape from backend route!
});
```

**Benefits**:
- ✅ Type errors if backend API changes
- ✅ Auto-completion for API endpoints
- ✅ No manual type definitions
- ✅ Works with existing Hono codebase

**Alternatives Considered**:
- **tRPC**: Requires server refactoring (not compatible with existing Hono routes)
- **OpenAPI codegen**: Manual schema maintenance, slow workflow
- **Manual types**: Error-prone, no sync guarantee

---

## 14. Frontend Testing Strategy

**Decision**: Use **Vitest + @testing-library/react + MSW** for frontend testing

**Three-Layer Testing Approach**:

### Unit Tests (50% of tests)
- Target: Utility functions, custom hooks, business logic
- Tools: Vitest
- Fast execution, narrow scope

**Example**:
```typescript
// dashboard/tests/unit/hashtag-formatter.test.ts
import { formatHashtag } from '@/lib/hashtag';

describe('formatHashtag', () => {
  it('should add # prefix', () => {
    expect(formatHashtag('atr_abc123')).toBe('#atr_abc123');
  });
});
```

### Component Tests (30% of tests)
- Target: Individual React components with mocked APIs
- Tools: Vitest + @testing-library/react + @testing-library/user-event
- Tests UI behavior, form validation, user interactions

**Example**:
```typescript
// dashboard/tests/components/CreateCommunityModal.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('CreateCommunityModal', () => {
  it('should validate 50-char limit', async () => {
    const user = userEvent.setup();
    render(<CreateCommunityModal />);

    const input = screen.getByLabelText(/community name/i);
    await user.type(input, 'a'.repeat(51)); // 51 chars

    await waitFor(() => {
      expect(screen.getByText(/maximum 50 characters/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Tests (20% of tests)
- Target: User stories with multiple components + API interactions
- Tools: Vitest + @testing-library/react + MSW (Mock Service Worker)
- Tests end-to-end flows with mocked backend APIs

**Example**:
```typescript
// dashboard/tests/integration/create-community-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import App from '@/App';

const server = setupServer(
  http.post('http://localhost:8787/api/communities', () => {
    return HttpResponse.json({
      id: 'comm_123',
      name: 'Test Community',
      memberCount: 1
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Create Community Flow', () => {
  it('should create community and show in list', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText(/create community/i));
    await user.type(screen.getByLabelText(/name/i), 'Test Community');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });
  });
});
```

**Test File Structure**:
```
dashboard/tests/
├── unit/                      # Unit tests
│   ├── hashtag-formatter.test.ts
│   └── date-formatter.test.ts
├── components/                # Component tests
│   ├── communities/
│   │   ├── CommunityList.test.tsx
│   │   └── CreateCommunityModal.test.tsx
│   ├── feeds/
│   │   └── FeedCard.test.tsx
│   └── posts/
│       └── CreatePostForm.test.tsx
├── integration/               # Integration tests
│   ├── create-community-flow.test.tsx
│   ├── pds-posting-flow.test.tsx
│   └── moderation-flow.test.tsx
├── setup.ts                   # Global test setup
└── mocks/
    └── handlers.ts            # MSW API handlers
```

**Vitest Configuration** (`dashboard/vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // DOM environment for React
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
});
```

**MSW Setup** (`dashboard/tests/setup.ts`):
```typescript
import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Required Testing Dependencies**:
```json
{
  "@testing-library/react": "^14.1.0",
  "@testing-library/user-event": "^14.5.1",
  "@testing-library/jest-dom": "^6.1.5",
  "@vitejs/plugin-react": "^4.2.1",
  "jsdom": "^23.0.1",
  "msw": "^2.0.11",
  "vitest": "^1.0.4"
}
```

**Test Commands**:
```bash
cd dashboard
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Integration with Backend Tests**:
- Backend: `npm test` (Workers environment, existing setup)
- Frontend: `cd dashboard && npm test` (jsdom environment)
- Both: `npm test && cd dashboard && npm test`

**Benefits**:
- ✅ Same tool (Vitest) for backend + frontend
- ✅ Fast feedback loop
- ✅ API mocking with MSW (realistic HTTP requests)
- ✅ TDD-friendly (write tests first)

---

## 15. Cloudflare Pages Deployment

**Configuration**:
- Build command: `cd dashboard && npm install && npm run build`
- Output directory: `dashboard/dist`
- Environment variables: `VITE_API_URL`, `VITE_PDS_URL`

---

## Summary

**Complete Tech Stack**:
- ✅ TanStack Query: Server state management
- ✅ TanStack Router: Type-safe routing
- ✅ TanStack Table: Headless tables
- ✅ shadcn/ui: Accessible components
- ✅ react-hook-form + Zod: Form validation
- ✅ lucide-react: Icons
- ✅ date-fns: Date formatting
- ✅ react-error-boundary: Error handling
- ✅ oRPC: End-to-end type safety
- ✅ react-i18next: Internationalization (EN/JA)
- ✅ Vitest + Testing Library + MSW: Testing
- ✅ Cloudflare Pages compatible

**Ready for Phase 1**.
