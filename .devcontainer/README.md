# Atrarium DevContainer with Local PDS

DevContainer configuration with local Bluesky PDS for AT Protocol testing.

## Architecture

```
┌─────────────────────────────────────┐
│   DevContainer (app)                │
│   ├─ Node.js LTS                    │
│   ├─ Atrarium codebase              │
│   └─ PDS_URL=http://pds:3000       │
│                                     │
│   Network: atrarium-network         │
└─────────────────────────────────────┘
              ↓ (service name: pds)
┌─────────────────────────────────────┐
│   Bluesky PDS (pds)                 │
│   ├─ Port 3000 (API)                │
│   ├─ SQLite database                │
│   ├─ Test accounts (via API)        │
│   └─ Invite-free mode (dev)         │
│                                     │
│   Volume: pds-data (persistent)     │
└─────────────────────────────────────┘
              ↑ (port forwarding)
         Host: localhost:3000
```

## Quick Start

### 1. Rebuild DevContainer

```bash
# In VS Code: Ctrl+Shift+P → "Dev Containers: Rebuild Container"
```

### 2. Load Test Data

```bash
./scripts/load-test-data.sh
```

Creates test accounts, communities, and posts. See [CLAUDE.md](../CLAUDE.md) for details.

### 3. Verify PDS

```bash
# From DevContainer
curl http://pds:3000/xrpc/_health

# From host
curl http://localhost:3000/xrpc/_health
```

## Key Differences

### PDS URL varies by context

- **From DevContainer** (tests, scripts): `http://pds:3000` (service name)
- **From host machine** (browser): `http://localhost:3000` (port forwarding)

Environment variable `PDS_URL=http://pds:3000` is auto-configured in DevContainer.

### Docker-in-Docker Limitations

- PDS runs in **host Docker daemon**, not inside DevContainer
- `pdsadmin` CLI not available (use AT Protocol API instead)
- View logs from host: `docker logs atrarium-pds-test -f`

## Troubleshooting

### PDS Not Starting

```bash
docker ps -a | grep pds
docker logs atrarium-pds-test
```

### Port 3000 Conflict

```bash
lsof -i :3000
docker ps | grep pds
```

### Test Account Issues

Re-run load-test-data.sh:
```bash
./scripts/load-test-data.sh
```

### Reset PDS Data

```bash
# From host machine
cd .devcontainer
docker compose down -v

# Rebuild DevContainer in VS Code
```

## Configuration Files

- `devcontainer.json`: DevContainer settings
- `docker-compose.yml`: Multi-service setup (app + PDS)
- `../scripts/load-test-data.sh`: Test data loader

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `PDS_URL` | `http://pds:3000` | PDS endpoint (auto-configured) |
| `NODE_ENV` | `development` | Environment mode |

## Additional API Examples

### Create Account Manually

```bash
curl -X POST http://pds:3000/xrpc/com.atproto.server.createAccount \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.local",
    "handle": "yourhandle.test",
    "password": "yourpassword"
  }'
```

### Login and Post

```typescript
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({
  service: process.env.PDS_URL || 'http://pds:3000'
});

await agent.login({
  identifier: 'alice.test',
  password: 'test123'
});

await agent.post({
  text: 'Hello from Atrarium! #atrarium_12345678',
  createdAt: new Date().toISOString()
});
```

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [Bluesky PDS Repository](https://github.com/bluesky-social/pds)
- [AT Protocol Docs](https://atproto.com/)
