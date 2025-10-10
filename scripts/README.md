# Scripts

Utility scripts for Atrarium development and maintenance.

## load-test-data.sh

Load sample test data into local development environment.

**Usage:**
```bash
./scripts/load-test-data.sh
```

**Prerequisites:**
- Local PDS running at `http://localhost:3000` (start with `./start-dev.sh pds`)
- Atrarium server running at `http://localhost:8787` (start with `pnpm --filter server dev`)
- Test accounts created in PDS (alice.test, bob.test, moderator.test)

**What it does:**
1. Verifies PDS and Server are running
2. Logs in as test accounts
3. Creates 3 communities:
   - **Design Community** (owner: alice.test)
   - **Tech Community** (owner: alice.test)
   - **Game Community** (owner: bob.test)
4. Adds members with roles:
   - alice.test: Owner of Design & Tech, member of Game
   - bob.test: Owner of Game, member of Design & Tech
   - moderator.test: Moderator of Design
5. Creates ~7 sample posts across communities

**Environment variables:**
- `PDS_URL`: PDS endpoint (default: `http://localhost:3000`)
- `API_URL`: Atrarium API endpoint (default: `http://localhost:8787`)

**Access the dashboard:**
```bash
# URL: http://localhost:5173
# Login: alice.test / test123 (or bob.test, moderator.test)
```

**Reset data:**
```bash
# 1. Restart PDS
docker compose -f .devcontainer/docker-compose.yml restart pds

# 2. Restart server (Ctrl+C and re-run)
pnpm --filter server dev

# 3. Run script again
./scripts/load-test-data.sh
```

## Other Scripts

### generate-openapi.ts

Generate OpenAPI specification from Atrarium API (planned).

### migrate-vitepress-docs.ts

Utility script for migrating VitePress documentation (legacy).
