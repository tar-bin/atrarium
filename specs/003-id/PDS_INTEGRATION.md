# Local PDS Integration Guide for Feature 003-id

**Status**: Ready for Implementation
**Dependencies**: Docker, @atproto/api (installed)
**Last Updated**: 2025-10-04

---

## Overview

This guide explains how to set up a local Bluesky PDS (Personal Data Server) for testing the direct feed posting feature (003-id). The local PDS allows complete offline development and testing of AT Protocol integration.

## Prerequisites

### Required Software
- Docker & Docker Compose
- Node.js 18+ (already installed)
- @atproto/api package (✅ installed)

### Repository
```bash
git clone https://github.com/bluesky-social/pds.git ~/bluesky-pds
cd ~/bluesky-pds
```

---

## Local PDS Setup

### 1. Docker Compose Configuration

Create `compose.dev.yaml` for local development:

```yaml
version: '3.9'
services:
  pds:
    container_name: pds-dev
    image: ghcr.io/bluesky-social/pds:0.4
    ports:
      - "3000:3000"
    environment:
      PDS_HOSTNAME: localhost
      PDS_PORT: 3000
      PDS_DATA_DIRECTORY: /pds
      PDS_BLOBSTORE_DISK_LOCATION: /pds/blocks
      PDS_DID_PLC_URL: https://plc.directory
      PDS_BSKY_APP_VIEW_URL: https://api.bsky.app
      PDS_BSKY_APP_VIEW_DID: did:web:api.bsky.app
      PDS_REPORT_SERVICE_URL: https://mod.bsky.app
      PDS_REPORT_SERVICE_DID: did:plc:ar7c4by46qjdydhdevvrndac
      PDS_CRAWLERS: https://bsky.network
      PDS_JWT_SECRET: dev-secret-change-in-production
      PDS_ADMIN_PASSWORD: admin-password-dev
      PDS_DB_SQLITE_LOCATION: /pds/pds.sqlite
      LOG_LEVEL: debug
    volumes:
      - pds-data:/pds
    restart: unless-stopped

volumes:
  pds-data:
```

### 2. Start PDS

```bash
cd ~/bluesky-pds
docker compose -f compose.dev.yaml up -d

# Check status
docker compose -f compose.dev.yaml ps

# View logs
docker compose -f compose.dev.yaml logs -f pds
```

### 3. Create Test Accounts

```bash
# Using pdsadmin tool
docker exec pds-dev pdsadmin create-account \
  --handle alice.test \
  --email alice@localhost \
  --password test123

docker exec pds-dev pdsadmin create-account \
  --handle bob.test \
  --email bob@localhost \
  --password test123
```

---

## Atrarium Integration

### 1. Update T017 Implementation

Replace mock AT-URI generation in `src/routes/posts.ts`:

```typescript
import { BskyAgent } from '@atproto/api';

// Current (Mock):
const postId = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
const postUri = `at://${userDid}/app.bsky.feed.post/${postId}`;

// Replace with (Real PDS):
const agent = new BskyAgent({
  service: c.env.PDS_URL || 'http://localhost:3000'
});

// Authenticate user (requires session management)
await agent.login({
  identifier: userHandle,
  password: userPassword // Or use existing session token
});

// Create real post in PDS
const response = await agent.post({
  text: finalText,
  createdAt: new Date().toISOString()
});

return c.json({
  postUri: response.uri, // Real AT-URI from PDS
  hashtags: [feed.hashtag],
  finalText
}, 201);
```

### 2. Environment Variables

Add to `wrangler.toml`:

```toml
[vars]
PDS_URL = "http://localhost:3000"  # Local development
# PDS_URL = "https://bsky.social"  # Production (user's PDS)
```

### 3. Session Management

Users need to authenticate with their PDS. Options:

**Option A: OAuth Flow** (Recommended for production)
```typescript
// Use AT Protocol OAuth
// See: https://atproto.com/specs/oauth
```

**Option B: Direct Login** (Development only)
```typescript
// Store session tokens in KV
const sessionKey = `pds_session:${userDid}`;
const session = await c.env.POST_CACHE.get(sessionKey);

if (!session) {
  // Redirect to login
  return c.json({ error: 'PDS authentication required' }, 401);
}

const agent = BskyAgent.configure({ session: JSON.parse(session) });
```

---

## Integration Tests

### Test File: `tests/integration/pds-posting.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { BskyAgent } from '@atproto/api';

describe('PDS Integration: Direct Posting', () => {
  let agent: BskyAgent;
  const PDS_URL = process.env.PDS_URL || 'http://localhost:3000';

  beforeAll(async () => {
    agent = new BskyAgent({ service: PDS_URL });

    // Login as test user
    await agent.login({
      identifier: 'alice.test',
      password: 'test123'
    });
  });

  it('should create post with feed hashtag', async () => {
    const testHashtag = '#atr_testfeed';
    const text = `Testing Atrarium integration! ${testHashtag}`;

    const response = await agent.post({
      text,
      createdAt: new Date().toISOString()
    });

    expect(response.uri).toMatch(/^at:\/\//);
    expect(response.cid).toBeDefined();
  });

  it('should retrieve created post from PDS', async () => {
    // Create post
    const response = await agent.post({
      text: 'Test post #atr_retrieve',
      createdAt: new Date().toISOString()
    });

    // Fetch post by URI
    const post = await agent.getPost({
      repo: agent.session.did,
      rkey: response.uri.split('/').pop()
    });

    expect(post.value.text).toContain('#atr_retrieve');
  });
});
```

### Run Tests

```bash
# Start local PDS first
cd ~/bluesky-pds
docker compose -f compose.dev.yaml up -d

# Run Atrarium tests
cd /workspaces/atrarium
PDS_URL=http://localhost:3000 npm test tests/integration/pds-posting.test.ts
```

---

## Firehose Integration (T016)

### WebSocket Connection

```typescript
// src/durable-objects/firehose-subscription.ts
import { Firehose } from '@atproto/sync';

class FirehoseSubscription {
  async connect() {
    const firehose = new Firehose({
      service: 'ws://localhost:3000', // Local PDS WebSocket
      handleEvent: this.handleEvent.bind(this)
    });

    await firehose.start();
  }

  async handleEvent(event) {
    if (event.$type === 'app.bsky.feed.post') {
      // Extract hashtags
      const hashtags = extractHashtags(event.text);

      // Check for #atr_ hashtags
      for (const tag of hashtags) {
        if (tag.startsWith('#atr_')) {
          await this.indexPost(event.uri, tag);
        }
      }
    }
  }
}
```

---

## Production Deployment Checklist

- [ ] Replace `PDS_URL=localhost:3000` with user's actual PDS endpoint
- [ ] Implement OAuth authentication flow
- [ ] Store PDS session tokens securely (KV with encryption)
- [ ] Handle PDS connection failures gracefully
- [ ] Test with multiple PDS providers (bsky.social, self-hosted, etc.)
- [ ] Implement Firehose subscription with reconnection logic
- [ ] Add rate limiting for PDS API calls
- [ ] Monitor PDS availability and failover

---

## Troubleshooting

### PDS Container Won't Start
```bash
# Check logs
docker compose -f compose.dev.yaml logs pds

# Common issue: Port 3000 already in use
lsof -i :3000
kill -9 <PID>
```

### Authentication Failures
```bash
# Reset test account password
docker exec pds-dev pdsadmin update-account \
  --handle alice.test \
  --password newpassword123
```

### Firehose Connection Issues
```bash
# Check WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3000/xrpc/com.atproto.sync.subscribeRepos
```

---

## References

- [Bluesky PDS Repository](https://github.com/bluesky-social/pds)
- [AT Protocol Documentation](https://atproto.com/)
- [@atproto/api Package](https://www.npmjs.com/package/@atproto/api)
- [PDS Self-Hosting Guide](https://atproto.com/guides/self-hosting)
- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)

---

**Next Steps**:
1. Set up Docker in development environment
2. Follow setup steps above
3. Implement real PDS integration in T017
4. Test with local accounts
5. Implement Firehose monitoring (T016)
