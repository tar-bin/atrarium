# Atrarium Dashboard

Web-based management interface for Atrarium communities, feeds, and moderation built with React, TanStack Router, and TanStack Query.

## Overview

The Atrarium Dashboard provides a user-friendly interface to:
- Manage communities and theme feeds (PDS-first architecture)
- Authenticate via Bluesky PDS (AtpAgent integration)
- Post content to feeds with automatic hashtag inclusion
- Monitor and moderate community activity
- View moderation logs and statistics

**Current Status**: Phase 1 Complete (PDS-first architecture, production-ready frontend)

## Tech Stack

**Frontend Framework:**
- React 19 with TypeScript
- Vite for build tooling
- TanStack Router v1 (file-based routing)
- TanStack Query v5 (server state management)
- TanStack Table v8 (data tables)

**UI Components:**
- shadcn/ui (Radix UI + Tailwind CSS)
- lucide-react icons
- react-hook-form + Zod validation

**Backend Integration:**
- oRPC for type-safe API calls (Hono backend on Cloudflare Workers)
- @atproto/api v0.13.35+ with AtpAgent (PDS read/write operations)
- PDS-first architecture (all data stored in user PDSs via AT Protocol Lexicon)
- MSW (Mock Service Worker) for testing

**Testing:**
- Vitest with @cloudflare/vitest-pool-workers
- Testing Library for component tests
- MSW for API mocking

## Project Structure

```
dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── layout/          # Layout, Sidebar, Header
│   │   ├── communities/     # Community management
│   │   ├── feeds/           # Feed management
│   │   ├── posts/           # Post display and creation
│   │   ├── moderation/      # Moderation actions and logs
│   │   ├── pds/             # PDS login form
│   │   └── ui/              # shadcn/ui components
│   ├── routes/              # TanStack Router routes
│   │   ├── __root.tsx       # Root layout with ErrorBoundary
│   │   ├── index.tsx        # Home page
│   │   ├── communities/     # Community routes
│   │   └── moderation.tsx   # Moderation log
│   ├── contexts/            # React contexts
│   │   └── PDSContext.tsx   # PDS session management
│   ├── lib/                 # Utilities and clients
│   │   ├── api.ts           # oRPC API client
│   │   ├── pds.ts           # PDS utilities
│   │   ├── hashtag.ts       # Hashtag formatting
│   │   ├── date.ts          # Date formatting (i18n)
│   │   └── queryClient.ts   # TanStack Query config
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Entity types and enums
│   ├── i18n/                # Internationalization (EN/JA)
│   │   └── locales/         # Translation files
│   └── main.tsx             # App entry point
├── tests/
│   ├── components/          # Component tests (TDD)
│   ├── integration/         # Integration tests
│   ├── mocks/               # MSW handlers
│   │   └── handlers.ts      # API mocks
│   └── setup.ts             # Test environment setup
├── public/                  # Static assets
├── .env.development         # Development environment variables
├── .env.production          # Production environment variables
├── .env.example             # Example environment file
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
├── tsr.config.json          # TanStack Router config
└── package.json             # Dependencies and scripts
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Atrarium backend running (Cloudflare Workers + Durable Objects)
- Bluesky PDS account (for authentication and posting)
  - Local PDS instance for development (see DevContainer setup)
  - Or production Bluesky account (bsky.social)

### Installation

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install
```

### Environment Variables

Create `.env.development` and `.env.production` files (see `.env.example`):

```env
# Backend API URL (Cloudflare Workers)
VITE_API_URL=http://localhost:8787

# PDS URL (for authentication and posting)
# Development: Local PDS instance
VITE_PDS_URL=http://localhost:3000
# Production: Bluesky PDS
# VITE_PDS_URL=https://bsky.social
```

### Load Test Data (Development)

**Note**: Test data loading is currently for D1 development environment. In PDS-first architecture, community and membership data is stored in user PDSs.

For local development with D1 (before full PDS migration):

```bash
# From the root directory
./scripts/load-test-data.sh
```

This creates:
- 5 test communities (anime, tech, games, manga, web3)
- 9 theme feeds with hashtags (#atr_xxxxxxxx format)
- 20 sample posts
- 17 user memberships

See [../seeds/README.md](../seeds/README.md) for details on test users and data.

**PDS-first architecture**: In production, data is created via PDS write operations (see [../docs/en/architecture/database.md](../docs/en/architecture/database.md)).

## Development

### Start Development Server

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173`

**Note for DevContainer users**: Hot module replacement (HMR) uses polling to detect file changes. If you notice that changes aren't being reflected automatically:
1. Save the file (Ctrl+S / Cmd+S)
2. Wait 1-2 seconds for the polling interval
3. The browser should auto-reload

The polling interval is set to 1000ms (1 second) in `vite.config.ts`.

### Generate Route Tree

TanStack Router uses file-based routing with auto-generated route tree:

```bash
npx tsr generate
```

This is automatically run on file changes during `npm run dev`.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Type Checking

```bash
# TypeScript type checking (no emit)
npx tsc --noEmit
```

## Build & Deployment

### Build for Production

```bash
npm run build
```

Outputs to `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deploy to Cloudflare Pages

**Automatic Deployment (Recommended):**

1. Connect GitHub repository to Cloudflare Pages
2. Set build settings:
   - **Build command**: `cd dashboard && npm install && npm run build`
   - **Build output directory**: `dashboard/dist`
   - **Root directory**: leave empty (repo root)
3. Set environment variables:
   - `VITE_API_URL`: Your production backend URL
   - `VITE_PDS_URL`: Your production PDS URL (if applicable)

**Manual Deployment:**

```bash
# Build first
npm run build

# Deploy with Wrangler
npx wrangler pages deploy dist --project-name=atrarium-dashboard
```

## Usage

### Login to PDS

1. Navigate to home page (`/`)
2. If not authenticated, PDS login form appears
3. Enter handle (e.g., `alice.test` for local PDS, or `your-handle.bsky.social` for production)
4. Enter app password (PDS credentials)
5. Session persists in localStorage via PDSContext
6. AtpAgent authenticates with PDS and manages session

**Authentication Flow**:
- Dashboard → AtpAgent → PDS (bsky.social or local)
- JWT token stored in localStorage
- Automatic session restoration on page reload

### Create Community (PDS-First)

**Current Implementation** (Hybrid - transitioning to PDS-first):

1. Navigate to Communities (`/communities`)
2. Click "Create Community" button
3. Fill in name, description, and access type:
   - **Open**: Anyone can join immediately (status='active')
   - **Invite-only**: Requires owner/moderator approval (status='pending')
4. Backend creates:
   - **PDS record**: `net.atrarium.community.config` in owner's PDS (with accessType field)
   - **Durable Object**: `CommunityFeedGenerator` instance
5. Community appears in list with access type badge

**Data Flow**:
```
Dashboard → Workers API → ATProtoService.createCommunityConfig()
         → PDS (AT-URI: at://did:plc:owner/net.atrarium.community.config/rkey)
         → Durable Object initialization
```

### Join Community Workflows

**Open Community (Immediate Join)**:

1. Navigate to Communities Browser (`/communities`)
2. Find open community (displays "Open" badge)
3. Click "Join Community" button
4. Backend creates membership with `status='active'`:
   - **PDS record**: `net.atrarium.community.membership` in user's PDS
   - Immediately added to community member list
5. User can view community feed and posts

**Invite-Only Community (Join Request)**:

1. Navigate to Communities Browser (`/communities`)
2. Find invite-only community (displays "Invite-only" badge)
3. Click "Request to Join" button
4. Backend creates membership with `status='pending'`:
   - **PDS record**: `net.atrarium.community.membership` in user's PDS
   - Badge shows "Pending Approval"
5. User waits for admin approval

**Admin Approval (Owner/Moderator)**:

1. Navigate to Community Management (`/communities/:id/manage`)
2. Click "Join Requests" tab
3. View list of pending join requests (memberships with `status='pending'`)
4. Click "Approve" to grant access:
   - Updates membership record: `status='pending'` → `status='active'`
   - User can now access community
5. Or click "Reject" to deny access:
   - Deletes membership record from PDS

**Data Flow**:
```
# Join Request (Invite-only)
Dashboard → Workers API → ATProtoService.createMembership({ status: 'pending' })
         → PDS (at://did:plc:user/net.atrarium.community.membership/rkey)

# Admin Approval
Dashboard → Workers API → ATProtoService.updateMembershipStatus({ status: 'active' })
         → PDS (updates existing membership record)
         → Durable Object (user added to member cache)
```

### Create Feed (PDS-First)

1. Navigate to community detail page (`/communities/:id`)
2. Click "Create Feed" button
3. Fill in name and description
4. System generates unique hashtag (e.g., `#atr_a1b2c3d4` - 8-char hex)
5. Backend creates:
   - **Feed config** in Durable Objects Storage
   - **Hashtag association** for post filtering
6. Copy hashtag for posting

**Hashtag Format**: `#atr_[0-9a-f]{8}` (system-generated, unique per feed)

### Post to Feed (via PDS)

1. Navigate to feed detail page (`/communities/:id/feeds/:feedId`)
2. Enter post text in form
3. System automatically appends feed hashtag
4. Submit post via AtpAgent → PDS
5. Post published to your PDS with hashtag
6. Firehose picks up post → Queue → FirehoseProcessor → CommunityFeedGenerator DO
7. Post appears in feed after indexing (~1-2 seconds)

**Data Flow**:
```
Dashboard → AtpAgent.post({ text: "Content #atr_xxxxxxxx" })
         → PDS (at://did:plc:user/app.bsky.feed.post/rkey)
         → Bluesky Firehose (Jetstream WebSocket)
         → FirehoseReceiver DO (lightweight filter)
         → Cloudflare Queue (batched)
         → FirehoseProcessor Worker (heavyweight regex filter)
         → CommunityFeedGenerator DO (Durable Objects Storage)
         → getFeedSkeleton API (returns post URIs)
```

### Moderate Content

**Moderation Actions** (PDS-First):

1. Navigate to feed detail page (as moderator/owner)
2. Click "Hide" button on a post
3. Confirm action in dialog
4. Backend creates:
   - **PDS record**: `net.atrarium.moderation.action` in moderator's PDS
   - **Durable Object update**: Post marked as `hidden` in Storage
5. Post is hidden from public view
6. View moderation log at `/moderation`

**Supported Actions**:
- Hide post (`hide_post`)
- Unhide post (`unhide_post`)
- Block user (`block_user`)
- Unblock user (`unblock_user`)

**Data Flow**:
```
Dashboard → Workers API → ATProtoService.createModerationAction()
         → PDS (at://did:plc:moderator/net.atrarium.moderation.action/rkey)
         → Firehose → CommunityFeedGenerator DO (update moderation status)
         → getFeedSkeleton excludes hidden posts
```

## Testing Strategy

**Prerequisites:**
- Vitest configured in `vitest.config.ts`
- Testing Library (@testing-library/react) installed
- MSW (Mock Service Worker) v2.x configured in `tests/setup.ts`
- Playwright installed for E2E tests (`npx playwright install`)

**Component Tests (TDD):**
- Written before implementation (Phase 3.3)
- Test rendering, user interactions, validation
- Use Testing Library + Vitest
- Located in `tests/components/`
- Run: `npm test`

**Integration Tests:**
- Test end-to-end user flows
- Use MSW to mock backend API
- Located in `tests/integration/`
- Run: `npm test tests/integration/`

**E2E Tests (Playwright):**
- Test full user workflows in real browser
- Located in `tests/e2e/`
- Run: `npx playwright test`
- Target: 6 scenarios (join open/invite-only, member management, moderation, ownership transfer)

**Performance Tests:**
- **Load Time** (FR-032): Verify community list loads within 3 seconds
  - Tool: Lighthouse CI (`npm run lighthouse`)
  - Target: FCP <1.5s, LCP <3s
- **Feed Latency** (FR-033): Verify feed updates appear within 5 seconds
  - Measured in E2E tests with timestamp comparison
  - Target: <5s from post creation to feed appearance

**MSW Mocking:**
- Mock handlers in `tests/mocks/handlers.ts`
- Intercept API calls during tests
- No real backend required

## Features Implemented

**Phase 1 Complete** (PDS-first architecture + 013-join-leave-workflow):
- ✅ PDS authentication via AtpAgent
- ✅ Community management UI (create, list, view)
  - ✅ Access type support (open, invite-only)
  - ✅ Community browser with filters (stage, accessType)
- ✅ Membership workflows
  - ✅ Join community (immediate for open, request for invite-only)
  - ✅ Leave community
  - ✅ Join request approval/rejection (admin)
  - ✅ Member management (role changes, removal)
  - ✅ Ownership transfer
- ✅ Feed management UI (create, list, view with hashtags)
- ✅ Post creation with automatic hashtag inclusion
- ✅ Moderation UI
  - ✅ Hide/unhide posts with reason selection
  - ✅ Block/unblock users
  - ✅ Moderation history log
  - ✅ Community statistics (member count, pending requests)
- ✅ PDS session management (localStorage persistence)
- ✅ i18n support (EN/JA translations)
  - ✅ Community, membership, moderation translations
  - ✅ 16 moderation reason types
- ✅ Responsive layout (mobile-friendly)
- ✅ Type-safe API integration (oRPC + TanStack Query)
- ✅ Component tests (TDD framework ready)
- ✅ Production build (<500KB gzip)

**Architecture Highlights**:
- PDS-first data flow (all writes go to user PDSs)
- AtpAgent for PDS operations (@atproto/api v0.13.35+)
- Durable Objects Storage for 7-day feed cache
- Cloudflare Queues for Firehose processing
- Two-stage filtering (lightweight + heavyweight)

**Pending Features**:
- ⏳ Dashboard API integration (currently placeholder client)
- ⏳ Real-time feed updates (WebSocket from Firehose)
- ⏳ Production deployment to Cloudflare Pages

## Troubleshooting

### Route tree generation fails

Run from dashboard directory:
```bash
cd dashboard
npx tsr generate
```

### Tests hang or timeout

MSW interceptor setup may be slow. Check `tests/setup.ts` configuration.

### Types not recognized

Ensure `@/` path alias is configured in `tsconfig.json` and `vite.config.ts`.

### PDS connection fails

Verify `VITE_PDS_URL` is set correctly and PDS is running.

**Common PDS issues**:
- Local PDS: Ensure DevContainer is running (`docker ps` should show `pds` container)
- Production PDS: Use `https://bsky.social` (not `http://`)
- App password: Generate app password at Bluesky settings (not your main password)

### Backend API connection fails

Verify `VITE_API_URL` points to running Workers instance:
- Development: `http://localhost:8787` (run `npm run dev` in root directory)
- Production: Your deployed Workers URL (e.g., `https://atrarium.workers.dev`)

### Hashtag not recognized in feed

- Ensure hashtag format is `#atr_[0-9a-f]{8}` (8-character hex)
- Check that post was published to PDS successfully
- Wait 1-2 seconds for Firehose indexing
- Verify FirehoseProcessor is running (check Workers logs)

## Design System

For UI component guidelines and button variants, see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Links

**Documentation**:
- [Main README](../README.md) - Project overview (PDS-first architecture)
- [CLAUDE.md](../CLAUDE.md) - Development guidelines and project conventions

**AT Protocol**:
- [AT Protocol Documentation](https://atproto.com/docs) - Official AT Protocol docs
- [Bluesky Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds) - Feed generator setup
- [@atproto/api Documentation](https://github.com/bluesky-social/atproto/tree/main/packages/api) - AtpAgent API reference

## Contributing

See [CLAUDE.md](../CLAUDE.md) for development guidelines and project conventions.

## License

Same as main project (see root LICENSE).
