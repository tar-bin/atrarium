# Atrarium DevContainer with Local PDS

This DevContainer configuration includes a local Bluesky PDS (Personal Data Server) for testing AT Protocol integration.

## What's Included

### Services

1. **Development Container** (`app`)
   - Ubuntu Noble base image
   - Node.js LTS
   - Docker-in-Docker support
   - All Atrarium dependencies

2. **Bluesky PDS** (`pds`)
   - Official PDS image (ghcr.io/bluesky-social/pds:0.4)
   - Runs on port 3000
   - Pre-configured for local testing
   - Persistent storage via Docker volume

### Features

- ✅ Automatic PDS startup with DevContainer
- ✅ Port forwarding (PDS accessible on localhost:3000)
- ✅ Health check monitoring
- ✅ Test account creation script
- ✅ Environment variables pre-configured

## Getting Started

### 1. Rebuild DevContainer

After pulling these changes:

```bash
# In VS Code
# 1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
# 2. Run: "Dev Containers: Rebuild Container"
```

This will:
- Build the development container
- Start the PDS service
- Install npm dependencies
- Forward port 3000

### 2. Setup PDS Test Accounts

Once the DevContainer is running:

```bash
bash .devcontainer/setup-pds.sh
```

This creates three test accounts:
- `alice.test` / `test123`
- `bob.test` / `test123`
- `moderator.test` / `test123`

### 3. Verify PDS is Running

```bash
# Health check (from DevContainer)
curl http://pds:3000/xrpc/_health

# Server description (from DevContainer)
curl http://pds:3000/xrpc/com.atproto.server.describeServer

# From host machine (if port forwarding is working)
curl http://localhost:3000/xrpc/_health
```

Expected response: `{"version":"0.4.x",...}`

## Using the PDS

### PDS Access URLs

**Important**: The PDS URL differs depending on where you're accessing from:

- **From DevContainer** (tests, scripts): `http://pds:3000`
- **From host machine** (browser): `http://localhost:3000` (if port forwarding works)

### In Integration Tests

Tests automatically use the local PDS via `PDS_URL` environment variable:

```bash
# Run PDS integration tests
npx vitest run --config vitest.pds.config.ts
```

### In Development

The environment variable `PDS_URL=http://pds:3000` is set automatically in the DevContainer.

Use it in your code:

```typescript
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({
  service: process.env.PDS_URL || 'http://pds:3000'
});

await agent.login({
  identifier: 'alice.test',
  password: 'test123'
});

const post = await agent.post({
  text: 'Hello from Atrarium! #atr_testfeed',
  createdAt: new Date().toISOString()
});
```

### Creating Additional Test Accounts

**Note**: Account creation via API (not docker exec, as PDS runs in a separate Docker daemon):

```bash
# Use the setup script (recommended)
bash .devcontainer/setup-pds.sh

# Or create manually via API
curl -X POST http://pds:3000/xrpc/com.atproto.server.createAccount \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.local",
    "handle": "yourhandle.test",
    "password": "yourpassword"
  }'
```

### Viewing PDS Logs

**Note**: PDS runs in host Docker daemon, access from outside DevContainer:

```bash
# From host machine (outside DevContainer)
docker logs atrarium-pds-test -f
```

### Resetting PDS Data

```bash
# From host machine (outside DevContainer)
cd .devcontainer
docker compose down -v

# Then rebuild DevContainer in VS Code
# Command Palette: "Dev Containers: Rebuild Container"
```

## Troubleshooting

### PDS Not Starting

Check container status:
```bash
docker ps -a | grep pds
docker logs atrarium-pds-test
```

### Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Or check if another PDS instance is running
docker ps | grep pds
```

### Test Account Login Fails

Re-run setup script to recreate accounts:
```bash
bash .devcontainer/setup-pds.sh
```

**Note**: `pdsadmin` CLI is not available from DevContainer (Docker-in-Docker limitation). Use the API instead.

### PDS Health Check Fails

Wait 30 seconds for PDS to fully start, then retry:
```bash
# Wait for health check (from DevContainer)
timeout 30 bash -c 'until curl -sf http://pds:3000/xrpc/_health; do sleep 2; done'

# From host
timeout 30 bash -c 'until curl -sf http://localhost:3000/xrpc/_health; do sleep 2; done'
```

## Architecture

```
┌─────────────────────────────────────┐
│   DevContainer (app)                │
│   ├─ Node.js LTS                    │
│   ├─ Atrarium codebase              │
│   ├─ @atproto/api package           │
│   └─ PDS_URL=http://pds:3000       │
│                                     │
│   Network: atrarium-network         │
└─────────────────────────────────────┘
              ↓ (service name: pds)
┌─────────────────────────────────────┐
│   Bluesky PDS (pds)                 │
│   ├─ Port 3000 (API)                │
│   ├─ SQLite database                │
│   ├─ Blob storage                   │
│   ├─ Test accounts (via API)        │
│   └─ Invite-free mode (dev)         │
│                                     │
│   Volume: pds-data (persistent)     │
│   Network: atrarium-network         │
└─────────────────────────────────────┘
              ↑ (port forwarding)
         Host: localhost:3000
```

## Configuration Files

- **devcontainer.json**: DevContainer configuration
- **docker-compose.yml**: Multi-service setup (app + PDS)
- **setup-pds.sh**: Test account creation script

## Environment Variables

Auto-configured in DevContainer:

| Variable | Value | Description |
|----------|-------|-------------|
| `PDS_URL` | `http://pds:3000` | PDS API endpoint (service name) |
| `NODE_ENV` | `development` | Environment mode |

## Related Documentation

- [PDS Integration Guide](../specs/003-id/PDS_INTEGRATION.md)
- [Feature 003-id Spec](../specs/003-id/spec.md)
- [Bluesky PDS Repository](https://github.com/bluesky-social/pds)
- [AT Protocol Docs](https://atproto.com/)

## Next Steps

After PDS setup:

1. ✅ Run integration tests: `npx vitest run --config vitest.pds.config.ts`
2. 🔧 Implement Firehose subscription for real-time indexing
3. 🚀 Test complete feed posting workflow with hashtags
4. 🛡️ Test moderation features (hide posts, block users)

## Support

For issues with:
- **DevContainer**: Check VS Code DevContainers documentation
- **PDS**: Check [Bluesky PDS Issues](https://github.com/bluesky-social/pds/issues)
- **Atrarium**: Check project documentation or team chat
