# Quickstart Guide: Dashboard Development

**Feature**: 005-pds-web-atrarim
**Purpose**: Step-by-step guide to set up, develop, and test the Atrarium dashboard locally

---

## Prerequisites

Before starting, ensure you have:

1. ✅ **Node.js 18+** installed
2. ✅ **npm 9+** installed
3. ✅ **Local PDS running** on `http://localhost:3000` (via DevContainer)
4. ✅ **Workers backend running** on `http://localhost:8787` (via `npm run dev` in repo root)
5. ✅ **Test accounts created** in local PDS (alice.test, bob.test, moderator.test)

---

## Step 1: Project Setup (5 minutes)

### 1.1 Initialize Vite + React Project

```bash
# From repository root
npm create vite@latest dashboard -- --template react-ts
cd dashboard
npm install
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install hono react-router-dom @atproto/api

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 1.3 Configure Tailwind CSS

Edit `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edit `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 1.4 Create Environment File

Create `.env.development`:

```env
VITE_API_URL=http://localhost:8787
VITE_PDS_URL=http://localhost:3000
```

---

## Step 2: Type Definitions (10 minutes)

### 2.1 Create `src/types/index.ts`

Copy type definitions from [data-model.md](./data-model.md):

```typescript
export interface UserSession {
  agent: BskyAgent | null;
  did: string | null;
  handle: string | null;
  isAuthenticated: boolean;
}

export type CommunityStage = 'theme' | 'community' | 'graduated';
// ... (copy all type definitions)
```

---

## Step 3: API Client Setup (15 minutes)

### 3.1 Create `src/lib/api.ts`

```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../../src/index'; // Import backend types

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const apiClient = hc<AppType>(API_URL);
```

### 3.2 Create `src/lib/pds.ts`

```typescript
import { BskyAgent } from '@atproto/api';

const PDS_URL = import.meta.env.VITE_PDS_URL || 'http://localhost:3000';

export function createPDSAgent() {
  return new BskyAgent({ service: PDS_URL });
}

export async function loginToPDS(handle: string, password: string) {
  const agent = createPDSAgent();
  await agent.login({ identifier: handle, password });
  return agent;
}

export async function postToPDS(agent: BskyAgent, text: string) {
  const response = await agent.post({
    text,
    createdAt: new Date().toISOString()
  });
  return response;
}
```

---

## Step 4: Run Development Server (2 minutes)

### 4.1 Start Dashboard Dev Server

```bash
cd dashboard
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 4.2 Verify Environment Variables

Open browser console at `http://localhost:5173` and check:

```javascript
console.log(import.meta.env.VITE_API_URL); // http://localhost:8787
console.log(import.meta.env.VITE_PDS_URL); // http://localhost:3000
```

---

## Step 5: Test PDS Integration (10 minutes)

### 5.1 Create Test Component

Create `src/components/pds/PDSTest.tsx`:

```typescript
import { useState } from 'react';
import { loginToPDS } from '../../lib/pds';

export function PDSTest() {
  const [status, setStatus] = useState('');

  const testLogin = async () => {
    try {
      setStatus('Logging in...');
      const agent = await loginToPDS('alice.test', 'test123');
      setStatus(`✅ Logged in as ${agent.session?.handle} (${agent.session?.did})`);
    } catch (error) {
      setStatus(`❌ Login failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">PDS Connection Test</h2>
      <button
        onClick={testLogin}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test PDS Login
      </button>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}
```

### 5.2 Add to App Component

Edit `src/App.tsx`:

```typescript
import { PDSTest } from './components/pds/PDSTest';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <PDSTest />
    </div>
  );
}

export default App;
```

### 5.3 Verify in Browser

1. Open `http://localhost:5173`
2. Click "Test PDS Login" button
3. Expected result: `✅ Logged in as alice.test (did:plc:xxx)`

---

## Step 6: Test API Integration (10 minutes)

### 6.1 Create API Test Component

Create `src/components/api/APITest.tsx`:

```typescript
import { useState } from 'react';
import { apiClient } from '../../lib/api';

export function APITest() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  const fetchCommunities = async () => {
    try {
      setStatus('Fetching communities...');
      const res = await apiClient.api.communities.$get();
      const data = await res.json();
      setCommunities(data as any[]);
      setStatus(`✅ Fetched ${data.length} communities`);
    } catch (error) {
      setStatus(`❌ API call failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Workers API Test</h2>
      <button
        onClick={fetchCommunities}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Fetch Communities
      </button>
      {status && <p className="mt-4">{status}</p>}
      {communities.length > 0 && (
        <pre className="mt-4 p-4 bg-white rounded">
          {JSON.stringify(communities, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

### 6.2 Add to App Component

```typescript
import { PDSTest } from './components/pds/PDSTest';
import { APITest } from './components/api/APITest';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <PDSTest />
      <APITest />
    </div>
  );
}
```

### 6.3 Verify in Browser

1. Ensure Workers backend is running (`npm run dev` in repo root)
2. Click "Fetch Communities" button
3. Expected result: `✅ Fetched N communities` (may be 0 if database is empty)

---

## Step 7: End-to-End Test Scenario (20 minutes)

### Test Complete User Flow

This validates the entire stack: Dashboard → Workers API → PDS

#### 7.1 Create Test Community

```bash
# Via curl (or use API test component)
curl -X POST http://localhost:8787/api/communities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Community",
    "description": "Created for dashboard testing",
    "ownerDid": "did:plc:qp7pfe6ddpvqoizwg5hlywou"
  }'
```

Expected response: `{ "id": "xxx", "name": "Test Community", ... }`

#### 7.2 Create Test Feed

```bash
# Replace {community_id} with ID from previous step
curl -X POST http://localhost:8787/api/communities/{community_id}/feeds \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Feed",
    "description": "For testing dashboard"
  }'
```

Expected response: `{ "id": "yyy", "hashtag": "#atr_xxxxx", ... }`

#### 7.3 Post to PDS with Hashtag

```typescript
// In browser console or test component
import { loginToPDS, postToPDS } from './lib/pds';

const agent = await loginToPDS('alice.test', 'test123');
const hashtag = '#atr_xxxxx'; // Use hashtag from step 7.2
const result = await postToPDS(agent, `Testing dashboard! ${hashtag}`);
console.log('Post URI:', result.uri);
```

Expected result: Post URI displayed in console

#### 7.4 Verify Post Appears in Feed

```bash
# Fetch posts for the feed
curl "http://localhost:8787/api/posts?feedId={feed_id}"
```

Expected response: Array containing the post created in step 7.3

---

## Step 8: Component Development Workflow

Follow TDD (Test-Driven Development):

### 8.1 Write Component Test

Create `src/components/communities/CommunityCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunityCard } from './CommunityCard';

describe('CommunityCard', () => {
  it('renders community name', () => {
    const community = {
      id: '1',
      name: 'Test Community',
      memberCount: 5,
      postCount: 10,
      // ... other required fields
    };

    render(<CommunityCard community={community} onClick={() => {}} />);
    expect(screen.getByText('Test Community')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
  });
});
```

### 8.2 Run Test (Should Fail)

```bash
npm test
```

Expected: Test fails because `CommunityCard` component doesn't exist yet

### 8.3 Implement Component

Create `src/components/communities/CommunityCard.tsx`:

```typescript
import type { Community } from '../../types';

interface Props {
  community: Community;
  onClick: () => void;
}

export function CommunityCard({ community, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white rounded shadow cursor-pointer hover:shadow-lg"
    >
      <h3 className="text-lg font-bold">{community.name}</h3>
      <p className="text-gray-600">{community.memberCount} members</p>
      <p className="text-gray-600">{community.postCount} posts</p>
    </div>
  );
}
```

### 8.4 Run Test Again (Should Pass)

```bash
npm test
```

Expected: Test passes ✅

---

## Step 9: Build for Production (5 minutes)

### 9.1 Build Static Assets

```bash
npm run build
```

Expected output:
```
vite v5.x.x building for production...
✓ xxx modules transformed.
dist/index.html                  x.xx kB
dist/assets/index-xxx.js        xx.xx kB │ gzip: xx.xx kB
✓ built in xxxs
```

### 9.2 Preview Production Build

```bash
npm run preview
```

Open `http://localhost:4173` to verify production build

---

## Step 10: Deployment to Cloudflare Pages (Future)

**Note**: This step is for production deployment (not Phase 0)

### 10.1 Connect GitHub Repository

1. Go to Cloudflare Pages dashboard
2. Click "Create a project"
3. Connect GitHub account
4. Select `atrarium` repository
5. Select branch: `005-pds-web-atrarim` (or `main` after merge)

### 10.2 Configure Build Settings

- **Build command**: `cd dashboard && npm install && npm run build`
- **Build output directory**: `dashboard/dist`
- **Root directory**: `/` (repository root)

### 10.3 Set Environment Variables

In Cloudflare Pages dashboard:

- `VITE_API_URL`: `https://atrarium-api.{subdomain}.workers.dev`
- `VITE_PDS_URL`: `https://bsky.social` (or production PDS URL)

### 10.4 Deploy

Push to `main` branch → Cloudflare Pages auto-deploys

---

## Troubleshooting

### Issue: "PDS connection refused"

**Solution**: Ensure local PDS is running (`docker ps | grep pds`)

### Issue: "API 404 not found"

**Solution**: Ensure Workers backend is running (`npm run dev` in repo root)

### Issue: "CORS error in browser console"

**Solution**: Backend should already have CORS enabled. If not, add CORS middleware to Workers.

### Issue: "Vite build fails with type errors"

**Solution**: Run `npm run typecheck` to see detailed errors. Fix TypeScript issues.

---

## Summary

**Time to complete**: ~90 minutes

**What you built**:
- ✅ React + Vite dashboard
- ✅ Type-safe API client (Hono)
- ✅ PDS integration (@atproto/api)
- ✅ Tailwind CSS styling
- ✅ End-to-end test scenario

**Next steps**:
1. Run `/tasks` to generate detailed implementation tasks
2. Follow TDD workflow for each component
3. Implement all features from contracts/components.yaml
4. Run integration tests with local PDS + Workers
5. Deploy to Cloudflare Pages (production)

---

**Ready for implementation!** 🚀
