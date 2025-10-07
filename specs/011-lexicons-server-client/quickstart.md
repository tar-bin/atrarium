# Quickstart: Reorganize Implementation into Lexicons, Server, and Client

**Feature**: 011-lexicons-server-client
**Date**: 2025-10-06
**Status**: Ready for execution

## Goal

Verify that the codebase reorganization (lexicons, server, client) preserves all existing functionality with zero breaking changes.

## Prerequisites

- Clean git working directory (`git status` shows no uncommitted changes)
- All tests passing before reorganization (`npm test`)
- Node.js >= 18 installed
- npm >= 7 (for workspaces support)

## Pre-Migration Validation

```bash
# 1. Verify clean state
git status
# Expected: "nothing to commit, working tree clean"

# 2. Verify all tests pass
npm test
# Expected: All tests pass (contract + integration + unit + docs)

# 3. Verify build succeeds
npm run build
# Expected: Build succeeds with no errors

# 4. Verify typecheck passes
npm run typecheck
# Expected: No TypeScript errors

# 5. Record current structure
tree -L 2 -d . > /tmp/structure-before.txt
```

## Post-Migration Validation

After executing tasks.md, run these validation steps:

### Step 1: Verify New Structure

```bash
# Check new directory structure
ls -la
# Expected: lexicons/, server/, client/ directories exist
# Expected: src/, tests/, dashboard/, docs/ moved

# Verify files moved correctly
ls -la server/src/
ls -la server/tests/
ls -la client/dashboard/
ls -la client/docs/

# Compare structure
tree -L 2 -d . > /tmp/structure-after.txt
diff /tmp/structure-before.txt /tmp/structure-after.txt
# Expected: Shows lexicons/ unchanged, src→server/src, etc.
```

### Step 2: Verify Git History Preserved

```bash
# Check git detected renames
git status
# Expected: Shows "renamed: src/index.ts -> server/src/index.ts" etc.

# Verify blame history preserved
git log --follow server/src/index.ts
# Expected: Shows full commit history from when it was src/index.ts

# Verify no files lost
git status | grep "deleted:"
# Expected: No output (all files should be renamed, not deleted)
```

### Step 3: Install Workspace Dependencies

```bash
# Install all workspace dependencies
npm install
# Expected: Installs root + server + client/dashboard + client/docs

# Verify workspace structure
npm ls --workspaces
# Expected: Lists all workspace packages
```

### Step 4: TypeScript Validation

```bash
# Run typecheck on all workspaces
npm run typecheck
# Expected: No TypeScript errors

# Run typecheck per workspace
npm run typecheck --workspace=server
npm run typecheck --workspace=client/dashboard
npm run typecheck --workspace=client/docs
# Expected: Each passes independently
```

### Step 5: Test Suite Validation

```bash
# Run all tests
npm test
# Expected: All tests pass (contract + integration + unit + docs)

# Run tests per workspace
npm test --workspace=server
# Expected: Server tests pass (contract, integration, unit, PDS)

npm test --workspace=client/dashboard
# Expected: Dashboard tests pass (component, E2E)

npm test --workspace=client/docs
# Expected: Docs tests pass (navigation, i18n, links, build)
```

### Step 6: Build Validation

```bash
# Build all workspaces
npm run build --workspaces
# Expected: All builds succeed

# Build server (Cloudflare Workers)
npm run build --workspace=server
# Expected: Wrangler build succeeds

# Build dashboard (React SPA)
npm run build --workspace=client/dashboard
# Expected: Vite build succeeds, creates dist/

# Build docs (VitePress)
npm run build --workspace=client/docs
# Expected: VitePress build succeeds, creates .vitepress/dist/
```

### Step 7: Development Mode Validation

```bash
# Test server dev mode
npm run dev --workspace=server &
SERVER_PID=$!
sleep 5
curl http://localhost:8787/.well-known/did.json
# Expected: Returns DID document

kill $SERVER_PID

# Test dashboard dev mode
npm run dev --workspace=client/dashboard &
DASHBOARD_PID=$!
sleep 5
curl http://localhost:5173
# Expected: Returns HTML (React app)

kill $DASHBOARD_PID

# Test docs dev mode
npm run dev --workspace=client/docs &
DOCS_PID=$!
sleep 5
curl http://localhost:5173
# Expected: Returns HTML (VitePress site)

kill $DOCS_PID
```

### Step 8: Documentation Validation

```bash
# Verify README.md updated
grep "server/" README.md
grep "client/" README.md
# Expected: Both found

# Verify CLAUDE.md updated
grep "server/" CLAUDE.md
grep "client/" CLAUDE.md
# Expected: Both found

# Verify docs content updated (if needed)
grep -r "src/" client/docs/en/
# Expected: No references to old structure (or minimal references in historical context)
```

## Success Criteria

All of the following must be true:

- ✅ Git history preserved (`git log --follow` works for moved files)
- ✅ No files lost (`git status` shows only renames)
- ✅ All TypeScript checks pass (`npm run typecheck`)
- ✅ All tests pass (`npm test`)
- ✅ All builds succeed (`npm run build --workspaces`)
- ✅ Development mode works for all workspaces
- ✅ Documentation updated (README.md, CLAUDE.md)

## Rollback Procedure

If any validation fails:

```bash
# Rollback to pre-migration state
git reset --hard HEAD~1

# Verify rollback successful
git status
# Expected: "nothing to commit, working tree clean"

# Verify functionality restored
npm test
# Expected: All tests pass (back to original state)
```

## Acceptance Test Scenarios

From [spec.md](./spec.md):

### Scenario 1: Lexicon Schema Navigation
**Given** a developer needs to modify a Lexicon schema
**When** they navigate the repository
**Then** they find all schema files in `lexicons/` directory

```bash
# Validation
ls lexicons/
# Expected: net.atrarium.community.config.json, net.atrarium.community.membership.json, net.atrarium.moderation.action.json
```

### Scenario 2: Backend API Work
**Given** a developer needs to work on backend API logic
**When** they access the server directory
**Then** they see all server-side code isolated from client code

```bash
# Validation
ls server/src/
# Expected: index.ts, router.ts, durable-objects/, routes/, services/, utils/, workers/

ls server/src/ | grep -i client
# Expected: No output (no client code in server/)
```

### Scenario 3: Frontend UI Work
**Given** a developer needs to update the frontend UI
**When** they access the client directory
**Then** they can work on client code without encountering server logic

```bash
# Validation
ls client/dashboard/src/
# Expected: App.tsx, components/, routes/, etc.

ls client/dashboard/src/ | grep -i worker
# Expected: No output (no worker code in client/)
```

### Scenario 4: CI/CD Pipeline
**Given** the repository is reorganized
**When** CI/CD pipelines run
**Then** all existing tests pass without modification

```bash
# Validation (run in CI)
npm test
# Expected: All tests pass (0 failures)
```

### Scenario 5: Deployment
**Given** the repository is reorganized
**When** deployment occurs
**Then** the application functions identically to before

```bash
# Validation (manual or CI)
npm run build --workspaces
wrangler deploy --workspace=server
# Expected: Deployment succeeds, application functions normally
```

## Next Steps

After successful validation:

1. ✅ Commit changes: `git commit -m "feat: reorganize implementation into lexicons, server, and client (011)"`
2. ✅ Push to branch: `git push origin 011-lexicons-server-client`
3. ✅ Create PR with validation results
4. ✅ Update project documentation if needed

## Troubleshooting

### TypeScript Errors After Reorganization

```bash
# Check tsconfig.json paths
cat server/tsconfig.json
cat client/dashboard/tsconfig.json

# Verify project references
cat tsconfig.json | grep "references"

# Clear TypeScript cache
rm -rf server/node_modules/.cache
rm -rf client/dashboard/node_modules/.cache
npm run typecheck
```

### Test Failures After Reorganization

```bash
# Check test config paths
cat server/vitest.config.ts
cat client/docs/vitest.docs.config.ts

# Run specific test to debug
npx vitest run server/tests/contract/feed-generator/get-feed-skeleton.test.ts --reporter=verbose

# Check import paths in tests
grep -r "from '../" server/tests/
```

### Build Failures

```bash
# Build each workspace separately to isolate issues
npm run build --workspace=server
npm run build --workspace=client/dashboard
npm run build --workspace=client/docs

# Check wrangler.toml entry point
cat server/wrangler.toml | grep "main"

# Check vite.config.ts paths
cat client/dashboard/vite.config.ts
```

## Reference

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Research Notes](./research.md)
- [Data Model](./data-model.md)
