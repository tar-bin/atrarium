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
│   │   ├── hashtag.ts       # Hashtag formatting (re-exports @atrarium/utils)
│   │   ├── hooks/           # React Query hooks (split by feature)
│   │   │   ├── useCommunities.ts  # Community hooks
│   │   │   ├── useMemberships.ts  # Membership hooks
│   │   │   ├── useModeration.ts   # Moderation hooks
│   │   │   ├── useGroupHierarchy.ts # Hierarchy hooks
│   │   │   └── index.ts            # Barrel export
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

### Custom Emoji Management

**Feature**: Upload and manage custom emoji for communities (015-markdown-pds)

**Access**: Owner and moderator roles only

**Workflow**:

1. **Navigate to Emoji Management**:
   - Go to `/communities/:id/emoji` (owner/moderator only)
   - Two tabs: "Upload Emoji" and "Pending Approvals"

2. **Upload Custom Emoji**:
   - Click "Upload Emoji" tab
   - Fill in emoji shortcode (lowercase, numbers, underscores only, 2-32 chars)
     - Example: `wave`, `happy_face`, `rocket_ship`
   - Select image file:
     - **Formats**: PNG, GIF, WEBP
     - **Size**: ≤500KB
     - **Dimensions**: ≤256×256px
   - Preview appears after file selection
   - Click "Upload Emoji"
   - Backend creates:
     - **Blob upload**: Uploaded to PDS blob storage
     - **PDS record**: `net.atrarium.emoji.custom` in user's PDS
     - **Approval request**: `net.atrarium.emoji.approval` with `status='pending'`

3. **Approve/Reject Emoji** (Owner/Moderator):
   - Click "Pending Approvals" tab
   - View list of pending emoji submissions
   - Each submission shows:
     - Emoji preview image
     - Shortcode (e.g., `:wave:`)
     - Submitter handle and upload date
     - Format (PNG/GIF/WEBP) and animation status
   - Actions:
     - **Approve**: Emoji becomes available for use in posts
     - **Reject**: Optionally provide reason for rejection
   - Backend updates:
     - **PDS record**: `net.atrarium.emoji.approval` status → `approved` or `rejected`
     - **Durable Object**: Emoji added to community registry cache (7-day TTL)

4. **Use Emoji in Posts**:
   - Create new post in community
   - Click emoji picker button
   - Popover displays all approved emoji
   - Click emoji to insert shortcode (e.g., `:wave:`)
   - Post text includes shortcode
   - Backend stores:
     - **Post text**: Plain text with shortcodes
     - **Emoji metadata**: List of shortcodes used
   - Rendering:
     - Client fetches emoji registry from cache
     - Shortcodes replaced with `<img>` tags
     - Fallback: Missing emoji display as plain text

5. **Markdown + Emoji Rendering**:
   - Posts support Markdown formatting (GFM):
     - **Bold**: `**text**` → `<strong>text</strong>`
     - **Italic**: `*text*` → `<em>text</em>`
     - **Tables**: GitHub Flavored Markdown syntax
     - **Strikethrough**: `~~text~~` → `<del>text</del>`
   - Emoji shortcodes in Markdown:
     - `Hello :wave:` → `Hello <img src="..." alt="wave">`
     - Shortcodes in code blocks preserved: `` `code :wave:` `` → `:wave:` (not replaced)
   - XSS protection via DOMPurify sanitization
   - Bundle size: 17KB gzipped (marked 10KB + DOMPurify 7KB)

**Data Flow**:
```
# Upload
Dashboard → Workers API → ATProtoService.uploadEmojiBlob()
         → PDS blob storage
         → ATProtoService.createCustomEmoji()
         → PDS (at://did:plc:user/net.atrarium.emoji.custom/rkey)

# Approval
Dashboard → Workers API → ATProtoService.createEmojiApproval()
         → PDS (at://did:plc:owner/net.atrarium.emoji.approval/rkey)
         → Firehose → CommunityFeedGenerator DO (update emoji registry cache)

# Post with Emoji
Dashboard → Workers API → ATProtoService.createPost({ markdown, emojiShortcodes })
         → PDS (at://did:plc:user/net.atrarium.community.post/rkey)

# Rendering
Client → Workers API → GET /api/communities/:id/emoji/registry
      → CommunityFeedGenerator DO (emoji registry from cache)
      → renderMarkdown(text, emojiRegistry)
      → <img> tags with blob URLs
```

**Edge Cases**:
- **Deleted Emoji**: If emoji is deleted from PDS, shortcode displays as plain text (fallback)
- **Revoked Emoji**: If approval is revoked, emoji removed from registry, shortcode displays as plain text
- **Expired Cache**: Emoji registry cache expires after 7 days, auto-rebuilt from PDS on next request
- **Performance**: Emoji cache lookup <10ms (Durable Objects Storage)

**Validation**:
- Shortcode: `/^[a-z0-9_]{2,32}$/` (lowercase, numbers, underscores only)
- Image format: PNG, GIF, WEBP (detected via file header)
- Image size: ≤500KB (client + server validation)
- Image dimensions: ≤256×256px (client-side check via Image API)

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

### Hierarchical Group System (017-1-1)

**Feature**: 1-level hierarchical group structure with Dunbar number-based stage progression.

**Access**: Owner role only (create children, upgrade/downgrade stages)

**Workflow**:

1. **Stage Progression** (Theme → Community → Graduated):
   - Navigate to community detail page
   - View current stage and member count
   - **Theme → Community** (at ~15 members):
     - "Upgrade to Community" button appears when threshold met
     - Click to upgrade (owner only)
     - Moderation switches from inherited to independent
   - **Community → Graduated** (at ~50 members):
     - "Upgrade to Graduated" button appears when threshold met
     - Click to upgrade (owner only)
     - Unlocks ability to create child Theme groups

2. **Create Child Theme** (Graduated groups only):
   - Navigate to Graduated community detail page
   - Click "Create Child Theme" button
   - Fill in name and description
   - Backend creates:
     - **PDS record**: `net.atrarium.group.config` with `stage: 'theme'` and `parentGroup: <parent-AT-URI>`
     - **Durable Object**: Child group cache with parent reference
   - Child appears in "Child Themes" section

3. **View Hierarchy**:
   - **Parent view** (Graduated groups):
     - "Child Themes" section lists all child groups
     - Click child name to navigate to child detail page
     - Tree view with stage badges and member counts
   - **Child view** (Theme groups):
     - Parent link displayed at top: "[Parent Name] > [Current Group]"
     - Click parent name to navigate to parent detail page
     - Moderation indicator: "Moderated by: [Parent Name] (inherited)"

4. **Moderation Inheritance** (Theme groups):
   - Theme groups inherit moderation from parent Graduated group
   - Parent owner/moderators can moderate child Theme posts
   - When Theme upgrades to Community, moderation becomes independent
   - Inherited moderation indicator visible on Theme group pages

5. **Deletion Blocking**:
   - Graduated groups with children cannot be deleted
   - Attempt to delete shows error: "Cannot delete group with N active children"
   - Error message lists child names
   - Must delete all children first, then parent can be deleted

6. **Stage Downgrade** (Graduated → Community → Theme):
   - Navigate to community settings
   - Click "Downgrade Stage" button (owner only)
   - Select target stage
   - Confirm downgrade
   - **Note**: `parentGroup` field retained (immutable), but downgrading Graduated to Community prevents creating new children

**Data Flow**:
```
# Create Child
Dashboard → Workers API → ATProtoService.createChildGroup()
         → PDS (at://did:plc:owner/net.atrarium.group.config/rkey)
         → CommunityFeedGenerator DO (update parent's children list)

# Upgrade Stage
Dashboard → Workers API → ATProtoService.upgradeGroupStage()
         → PDS (update stage field)
         → Member count validation (~15 for Community, ~50 for Graduated)

# Hierarchy Query
Dashboard → Workers API → GET /api/communities/:id/children
         → CommunityFeedGenerator DO (children: cache key)
         → Return child group configs
```

**Components**:
- `GroupHierarchy.tsx` - Parent-child tree view with Radix UI Accordion
- `StageUpgradeButton.tsx` - Stage progression button with Dunbar threshold display
- `CreateChildTheme.tsx` - Child theme creation form (Graduated only)
- `ParentLink.tsx` - Breadcrumb navigation to parent group
- `InheritedModeration.tsx` - Moderation inheritance indicator for Theme groups

**Constraints**:
- **1-level hierarchy**: Only Graduated → Theme (no grandchildren)
- **Immutable parent**: `parentGroup` field cannot be changed after creation
- **Stage-specific rules**:
  - Theme: Can have parent, cannot create children, inherits moderation
  - Community: No parent, cannot create children, independent moderation
  - Graduated: No parent, can create children, independent moderation
- **Dunbar thresholds**: ~15 members for Community, ~50 members for Graduated

## Features Implemented

**Phase 1 Complete** (PDS-first architecture + 013-join-leave-workflow + 015-markdown-pds + 017-1-1):
- ✅ PDS authentication via AtpAgent
- ✅ Community management UI (create, list, view)
  - ✅ Access type support (open, invite-only)
  - ✅ Community browser with filters (stage, accessType)
- ✅ **Hierarchical Group System** (017-1-1)
  - ✅ Stage progression (Theme → Community → Graduated)
  - ✅ Dunbar threshold validation (~15 for Community, ~50 for Graduated)
  - ✅ Child Theme creation (Graduated groups only)
  - ✅ Parent-child tree view (GroupHierarchy component)
  - ✅ Stage upgrade/downgrade buttons
  - ✅ Moderation inheritance (Theme inherits from parent Graduated)
  - ✅ Deletion blocking (cannot delete parent with children)
  - ✅ 1-level hierarchy constraint (no grandchildren)
  - ✅ Immutable parent reference (parentGroup field)
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
- ✅ **Custom Emoji & Markdown** (015-markdown-pds)
  - ✅ Emoji upload UI (file picker, validation, preview)
  - ✅ Emoji approval workflow (owner/moderator only)
  - ✅ Emoji picker component (grid display, tooltip)
  - ✅ Markdown rendering (GFM support: tables, strikethrough, task lists)
  - ✅ Emoji shortcode replacement in Markdown
  - ✅ XSS protection (DOMPurify sanitization)
  - ✅ Image validation (PNG/GIF/WEBP, ≤500KB, ≤256×256px)
  - ✅ PDS blob storage integration
  - ✅ Durable Objects emoji registry cache (7-day TTL, <10ms lookup)
  - ✅ Edge case handling (deleted/revoked emoji fallback)
- ✅ PDS session management (localStorage persistence)
- ✅ i18n support (EN/JA translations)
  - ✅ Community, membership, moderation translations
  - ✅ 16 moderation reason types
- ✅ Responsive layout (mobile-friendly)
- ✅ Type-safe API integration (oRPC + TanStack Query)
- ✅ Component tests (TDD framework ready)
  - ✅ 27 Markdown rendering tests
  - ✅ 24 emoji component tests
  - ✅ 15 E2E emoji workflow tests
- ✅ Production build (<500KB gzip, +17KB for Markdown/emoji)

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
