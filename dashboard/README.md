# Atrarium Dashboard

Web-based management interface for Atrarium communities, feeds, and moderation built with React, TanStack Router, and TanStack Query.

## Overview

The Atrarium Dashboard provides a user-friendly interface to:
- Manage communities and theme feeds
- Post content to feeds via local Bluesky PDS
- Monitor and moderate community activity
- View moderation logs and statistics

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
- oRPC for type-safe API calls (Hono backend)
- @atproto/api for Bluesky PDS integration
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
- Local Bluesky PDS instance (optional, for posting)
- Atrarium backend running (Cloudflare Workers)

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
# Backend API URL
VITE_API_URL=http://localhost:8787

# Local PDS URL (for posting content)
VITE_PDS_URL=http://localhost:3000
```

## Development

### Start Development Server

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173`

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
3. Enter handle (e.g., `alice.test`) and password
4. Session persists in localStorage

### Create Community

1. Navigate to Communities (`/communities`)
2. Click "Create Community" button
3. Fill in name and description
4. Community appears in list

### Create Feed

1. Navigate to community detail page (`/communities/:id`)
2. Click "Create Feed" button
3. Fill in name and description
4. System generates unique hashtag (e.g., `#atr_abc12345`)
5. Copy hashtag for posting

### Post to Feed

1. Navigate to feed detail page (`/communities/:id/feeds/:feedId`)
2. Enter post text in form
3. System automatically appends feed hashtag
4. Submit post to PDS
5. Post appears in feed after indexing

### Moderate Content

1. Navigate to feed detail page (as moderator/owner)
2. Click "Hide" button on a post
3. Confirm action in dialog
4. Post is hidden from public view
5. View moderation log at `/moderation`

## Testing Strategy

**Component Tests (TDD):**
- Written before implementation (Phase 3.3)
- Test rendering, user interactions, validation
- Use Testing Library + Vitest
- Located in `tests/components/`

**Integration Tests:**
- Test end-to-end user flows
- Use MSW to mock backend API
- Located in `tests/integration/`

**MSW Mocking:**
- Mock handlers in `tests/mocks/handlers.ts`
- Intercept API calls during tests
- No real backend required

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

## Links

- [Main README](../README.md) - Project overview
- [Quickstart Guide](../specs/005-pds-web-atrarim/quickstart.md) - Step-by-step setup
- [Component Contracts](../specs/005-pds-web-atrarim/contracts/components.yaml) - Component specifications
- [Backend Documentation](../CLAUDE.md) - Backend development guide

## Contributing

See [CLAUDE.md](../CLAUDE.md) for development guidelines and project conventions.

## License

Same as main project (see root LICENSE).
