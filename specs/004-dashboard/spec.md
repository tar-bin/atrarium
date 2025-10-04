# Feature 004: React Dashboard with Local PDS Integration

**Status**: Planning
**Priority**: High
**Branch**: `004-dashboard`
**Dependencies**: 003-id (Direct Feed Posting with Hashtags + Moderation)

## Overview

Implement a React-based management dashboard that allows users to interact with Atrarium via a web interface, including integration with the local PDS for testing AT Protocol posting workflows.

## Goals

1. **Visual Community Management**: Create, view, and manage communities via web UI
2. **Feed Management**: Create theme feeds with auto-generated hashtags
3. **PDS Integration**: Post directly to local PDS with feed hashtags
4. **Post Visibility**: View indexed posts per feed
5. **Moderation UI**: Hide posts, block users via dashboard

## Non-Goals

- Production deployment (focus on local development)
- Advanced analytics/charts
- Real-time updates (polling is sufficient)
- Mobile app

## Technical Approach

### Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **HTTP Client**: Hono Client (type-safe API calls)
- **AT Protocol**: @atproto/api (for PDS posting)
- **Deployment**: Cloudflare Pages

### Architecture

```
┌─────────────────────────────────────────┐
│   Browser (http://localhost:5173)      │
│   ┌─────────────────────────────────┐   │
│   │  React Dashboard (Vite)         │   │
│   │  - Community CRUD UI            │   │
│   │  - Feed Management              │   │
│   │  - Post Creation Form           │   │
│   │  - Moderation Panel             │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
         │                       │
         │ (Atrarium API)        │ (AT Protocol)
         ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│ Workers API      │    │ Local PDS        │
│ (Port 8787)      │    │ (Port 3000)      │
│ - Communities    │    │ - User Auth      │
│ - Feeds          │    │ - Post Creation  │
│ - Moderation     │    │ - Post Retrieval │
└──────────────────┘    └──────────────────┘
```

## User Stories

### US-001: Community Management
**As a** community owner
**I want to** create and manage communities via web UI
**So that** I can organize my community without using API tools

**Acceptance Criteria**:
- [ ] Dashboard shows list of communities
- [ ] "Create Community" form with name/description fields
- [ ] Click community to view details (members, feeds, stats)
- [ ] Update community settings

### US-002: Feed Creation with Hashtag
**As a** community owner
**I want to** create a theme feed and see its hashtag
**So that** I can share the hashtag with members

**Acceptance Criteria**:
- [ ] "Create Feed" button in community detail page
- [ ] Form shows feed name/description
- [ ] After creation, display system-generated hashtag (#atr_xxxxx)
- [ ] Copy-to-clipboard button for hashtag

### US-003: Post to PDS with Hashtag
**As a** community member
**I want to** post to PDS via dashboard
**So that** I can test feed posting workflow

**Acceptance Criteria**:
- [ ] "Create Post" form in feed detail page
- [ ] Text input (max 300 chars)
- [ ] Login with local PDS account (alice.test)
- [ ] Automatically append feed hashtag
- [ ] Show success message with post URI

### US-004: View Feed Posts
**As a** community member
**I want to** see posts indexed in a feed
**So that** I can verify feed functionality

**Acceptance Criteria**:
- [ ] Feed detail page shows list of posts
- [ ] Display post text, author, timestamp
- [ ] Refresh button to fetch latest posts
- [ ] Empty state when no posts

### US-005: Moderation Actions
**As a** moderator
**I want to** hide posts and block users
**So that** I can maintain feed quality

**Acceptance Criteria**:
- [ ] "Hide" button on each post
- [ ] "Block User" button on each post
- [ ] Confirmation dialog for destructive actions
- [ ] Hidden posts show in separate tab
- [ ] Moderation log view

## Implementation Plan

### Phase 1: Project Setup (2 hours)

1. **Initialize Vite + React**
   ```bash
   npm create vite@latest dashboard -- --template react-ts
   cd dashboard
   npm install
   ```

2. **Install Dependencies**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npm install hono @atproto/api
   npm install react-router-dom
   ```

3. **Configure Tailwind CSS**
   - `tailwind.config.js`
   - `postcss.config.js`
   - Import in `src/index.css`

4. **Environment Setup**
   - `.env.development` with API URLs
   - Type-safe env variables

### Phase 2: Core UI Structure (3 hours)

1. **Layout Components**
   - `Layout.tsx`: Main layout with sidebar
   - `Sidebar.tsx`: Navigation menu
   - `Header.tsx`: Top bar with user info

2. **Routing Setup**
   - `/`: Dashboard home
   - `/communities`: Community list
   - `/communities/:id`: Community detail
   - `/communities/:id/feeds/:feedId`: Feed detail

3. **Basic Styling**
   - Tailwind utility classes
   - Responsive design (mobile-first)

### Phase 3: Community Management (4 hours)

1. **Community List Page**
   - Component: `CommunityList.tsx`
   - Fetch: `GET /api/communities`
   - Display: Card grid layout

2. **Create Community Form**
   - Component: `CreateCommunityModal.tsx`
   - API: `POST /api/communities`
   - Validation: Zod schema

3. **Community Detail Page**
   - Component: `CommunityDetail.tsx`
   - Fetch: `GET /api/communities/:id`
   - Display: Stats, member list, feed list

### Phase 4: Feed Management (4 hours)

1. **Feed List in Community**
   - Component: `FeedList.tsx`
   - Fetch: `GET /api/communities/:id/feeds`
   - Display: Feed cards with hashtags

2. **Create Feed Form**
   - Component: `CreateFeedModal.tsx`
   - API: `POST /api/communities/:id/feeds`
   - Show generated hashtag after creation

3. **Feed Detail Page**
   - Component: `FeedDetail.tsx`
   - Display: Hashtag, stats, post list

### Phase 5: PDS Integration (5 hours)

1. **PDS Login Component**
   - Component: `PDSLogin.tsx`
   - Use `@atproto/api` BskyAgent
   - Login with alice.test / bob.test
   - Store session in localStorage

2. **Post Creation Form**
   - Component: `CreatePostForm.tsx`
   - Text input with character counter
   - Auto-append feed hashtag
   - Call `agent.post()` to create post in PDS

3. **Post Display**
   - Component: `PostCard.tsx`
   - Fetch: `GET /api/posts?feedId=...`
   - Display: Author DID, text, timestamp

### Phase 6: Moderation UI (3 hours)

1. **Hide Post Action**
   - Button in `PostCard.tsx`
   - API: `POST /api/moderation/posts/:uri/hide`
   - Confirmation dialog

2. **Block User Action**
   - Button in `PostCard.tsx`
   - API: `POST /api/moderation/feeds/:feedId/blocklist`
   - Confirmation dialog

3. **Moderation Log View**
   - Component: `ModerationLog.tsx`
   - Fetch: `GET /api/moderation/logs`
   - Display: Action history table

## File Structure

```
dashboard/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── communities/
│   │   │   ├── CommunityList.tsx
│   │   │   ├── CommunityCard.tsx
│   │   │   ├── CommunityDetail.tsx
│   │   │   └── CreateCommunityModal.tsx
│   │   ├── feeds/
│   │   │   ├── FeedList.tsx
│   │   │   ├── FeedCard.tsx
│   │   │   ├── FeedDetail.tsx
│   │   │   └── CreateFeedModal.tsx
│   │   ├── posts/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   └── CreatePostForm.tsx
│   │   ├── moderation/
│   │   │   ├── ModerationLog.tsx
│   │   │   └── HidePostButton.tsx
│   │   └── pds/
│   │       └── PDSLogin.tsx
│   ├── lib/
│   │   ├── api.ts         # Hono client setup
│   │   └── pds.ts         # @atproto/api client
│   ├── types/
│   │   └── index.ts       # Shared TypeScript types
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Communities.tsx
│   │   ├── CommunityDetailPage.tsx
│   │   └── FeedDetailPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Testing Strategy

1. **Manual Testing**: Use local Workers + PDS
2. **Component Testing**: Vitest + React Testing Library (future)
3. **E2E Testing**: Playwright (future)

## Environment Variables

```env
# .env.development
VITE_API_URL=http://localhost:8787
VITE_PDS_URL=http://localhost:3000
```

## Success Metrics

- [ ] Dashboard loads without errors
- [ ] Can create community and see it in list
- [ ] Can create feed and copy hashtag
- [ ] Can login to PDS and create post
- [ ] Post appears in feed detail page
- [ ] Can hide post via moderation UI

## Timeline

- Phase 1: 2 hours
- Phase 2: 3 hours
- Phase 3: 4 hours
- Phase 4: 4 hours
- Phase 5: 5 hours
- Phase 6: 3 hours

**Total**: 21 hours (~3 days)

## Next Steps

1. Create branch `004-dashboard`
2. Initialize Vite + React project in `dashboard/`
3. Implement Phase 1-3 (core UI)
4. Test with local Workers API
5. Implement Phase 4-6 (PDS integration + moderation)
