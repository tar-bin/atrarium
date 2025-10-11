# Quickstart: Project File Organization

**Feature**: 020- | **Date**: 2025-10-11
**Purpose**: Step-by-step validation guide for code reorganization

---

## Prerequisites

Before starting, ensure baseline validation passes:

```bash
# Navigate to repository root
cd /workspaces/atrarium

# Verify baseline (all must succeed)
pnpm -r typecheck
pnpm -r test
pnpm lint
pnpm format:check
```

**Expected output**: All commands exit with code 0

**If baseline fails**: Fix existing issues before refactoring

---

## Step 1: Identify Refactoring Candidates

**Goal**: Identify large files (>500 lines) and duplicate utilities

```bash
# Find large server files
find server/src -name "*.ts" -exec wc -l {} + | sort -rn | head -10

# Find large client files
find client/src -name "*.ts" -o -name "*.tsx" -exec wc -l {} + | sort -rn | head -10

# Search for duplicate utilities
echo "=== Emoji validation ==="
grep -r "validateEmoji" server/src/utils/ client/src/lib/

echo "=== Hashtag generation ==="
grep -r "Hashtag" server/src/utils/ client/src/lib/
```

**Expected findings**:
- `server/src/services/atproto.ts`: ~1606 lines
- `server/src/durable-objects/community-feed-generator.ts`: ~1369 lines
- `client/src/lib/hooks.ts`: ~433 lines
- `client/src/lib/api.ts`: ~352 lines
- Duplicate emoji/hashtag utilities

**Validation**: ✅ At least 4 files exceed 500 lines, duplicates identified

---

## Step 2: Create Shared Utilities Workspace

**Goal**: Set up `shared/utils/` workspace for consolidated utilities

```bash
# Create shared utilities workspace
mkdir -p shared/utils/src

# Create package.json
cat > shared/utils/package.json << 'EOF'
{
  "name": "@atrarium/utils",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./emoji": "./src/emoji.ts",
    "./hashtag": "./src/hashtag.ts",
    "./validation": "./src/validation.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
EOF

# Create tsconfig.json
cat > shared/utils/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# Add to pnpm-workspace.yaml (if not already present)
grep -q "shared/utils" pnpm-workspace.yaml || echo "  - 'shared/utils'" >> pnpm-workspace.yaml

# Install dependencies
pnpm install
```

**Validation**: ✅ `shared/utils/` directory created with package.json and tsconfig.json

---

## Step 3: Consolidate Duplicate Utilities

**Goal**: Move emoji and hashtag utilities to `shared/utils/`

```bash
# Extract emoji validation from server (example - adjust paths as needed)
# Manual step: Copy `validateCustomEmoji` function to shared/utils/src/emoji.ts

# Extract hashtag generation from server
# Manual step: Copy `generateCommunityHashtag` function to shared/utils/src/hashtag.ts

# Update imports in server and client
# Example: Replace `import { validateCustomEmoji } from '../utils/emoji-validator'`
# with `import { validateCustomEmoji } from '@atrarium/utils/emoji'`

# Verify shared utilities compile
pnpm --filter @atrarium/utils typecheck
```

**Manual actions required**:
1. Create `shared/utils/src/emoji.ts` with emoji validation functions
2. Create `shared/utils/src/hashtag.ts` with hashtag functions
3. Update imports in server/client to use `@atrarium/utils/*`
4. Delete old utility files: `server/src/utils/emoji-validator.ts`, `server/src/utils/hashtag.ts`

**Validation**: ✅ `pnpm --filter @atrarium/utils typecheck` passes

---

## Step 4: Split Server `atproto.ts`

**Goal**: Split 1606-line file into domain-specific modules

```bash
# Create target directory
mkdir -p server/src/services/atproto

# Split domains (manual step - example structure):
# 1. Create server/src/services/atproto/index.ts (barrel export)
# 2. Extract community methods to server/src/services/atproto/communities.ts
# 3. Extract membership methods to server/src/services/atproto/memberships.ts
# 4. Extract emoji methods to server/src/services/atproto/emoji.ts
# 5. Extract moderation methods to server/src/services/atproto/moderation.ts

# Example barrel export (index.ts):
cat > server/src/services/atproto/index.ts << 'EOF'
export { ATProtoService } from './base';
export * from './communities';
export * from './memberships';
export * from './emoji';
export * from './moderation';
EOF

# Verify server compiles
pnpm --filter server typecheck
```

**Manual actions required**:
1. Create `server/src/services/atproto/base.ts` with `ATProtoService` class (agent initialization)
2. Create domain-specific files (communities.ts, memberships.ts, emoji.ts, moderation.ts)
3. Update imports in routes (e.g., `routes/communities.ts` now imports from `services/atproto/communities`)
4. Delete old file: `server/src/services/atproto.ts` (after verification)

**Validation**: ✅ `pnpm --filter server typecheck` passes

---

## Step 5: Split Client `hooks.ts`

**Goal**: Split 433-line file into feature-specific hooks

```bash
# Create target directory
mkdir -p client/src/lib/hooks

# Split hooks by feature (manual step - example structure):
# 1. Create client/src/lib/hooks/index.ts (barrel export)
# 2. Extract community hooks to client/src/lib/hooks/useCommunities.ts
# 3. Extract membership hooks to client/src/lib/hooks/useMemberships.ts
# 4. Extract moderation hooks to client/src/lib/hooks/useModeration.ts

# Example barrel export (index.ts):
cat > client/src/lib/hooks/index.ts << 'EOF'
export * from './useCommunities';
export * from './useMemberships';
export * from './useModeration';
EOF

# Verify client compiles
pnpm --filter client typecheck
```

**Manual actions required**:
1. Create feature-specific hook files (useCommunities.ts, useMemberships.ts, useModeration.ts)
2. Update imports in components (can use barrel export: `from '@/lib/hooks'`)
3. Delete old file: `client/src/lib/hooks.ts` (after verification)

**Validation**: ✅ `pnpm --filter client typecheck` passes

---

## Step 6: Update All Import Paths

**Goal**: Ensure all imports use new paths

```bash
# Search for old import patterns (should return no results after update)
echo "=== Checking for old server imports ==="
grep -r "from '../services/atproto'" server/src/routes/ server/src/durable-objects/

echo "=== Checking for old client imports ==="
grep -r "from '../lib/hooks'" client/src/components/

# Verify new import patterns exist
echo "=== Verifying new server imports ==="
grep -r "from '../services/atproto/communities'" server/src/routes/

echo "=== Verifying new client imports ==="
grep -r "from '@/lib/hooks'" client/src/components/

echo "=== Verifying shared utilities imports ==="
grep -r "from '@atrarium/utils" server/src/ client/src/
```

**Manual actions required**:
1. Use VS Code "Find and Replace" to update import paths
2. Use TypeScript "Update imports" refactoring where possible
3. Fix any remaining import errors flagged by `pnpm -r typecheck`

**Validation**: ✅ No old import patterns found, new patterns used

---

## Step 7: Run Full Validation Suite

**Goal**: Verify all quality checks pass

```bash
# TypeScript compilation (all workspaces)
pnpm -r typecheck

# Test suite (all workspaces)
pnpm -r test

# Linting and formatting
pnpm lint
pnpm format:check
```

**Expected output**:
- ✅ `pnpm -r typecheck`: Exit code 0 (no type errors)
- ✅ `pnpm -r test`: All tests pass
- ✅ `pnpm lint`: No linting errors
- ✅ `pnpm format:check`: No formatting errors

**If validation fails**:
1. **TypeScript errors**: Fix import paths or type issues
2. **Test failures**: Update test imports if needed
3. **Linting errors**: Run `pnpm lint:fix` to auto-fix
4. **Formatting errors**: Run `pnpm format` to auto-fix

---

## Step 8: Verify File Organization

**Goal**: Confirm target structure matches design

```bash
# Verify server structure
echo "=== Server structure ==="
ls -la server/src/services/atproto/
# Expected files: index.ts, base.ts, communities.ts, memberships.ts, emoji.ts, moderation.ts

# Verify client structure
echo "=== Client structure ==="
ls -la client/src/lib/hooks/
# Expected files: index.ts, useCommunities.ts, useMemberships.ts, useModeration.ts

# Verify shared utilities
echo "=== Shared utilities ==="
ls -la shared/utils/src/
# Expected files: emoji.ts, hashtag.ts, validation.ts

# Verify line counts
echo "=== Server line counts ==="
wc -l server/src/services/atproto/*.ts

echo "=== Client line counts ==="
wc -l client/src/lib/hooks/*.ts
```

**Validation**:
- ✅ All expected files exist
- ✅ All split files <500 lines
- ✅ Old large files deleted

---

## Step 9: Update Documentation

**Goal**: Document new structure in README files

```bash
# Update server/README.md
echo "
## File Organization

- \`src/services/atproto/\` - AT Protocol service (split by domain)
  - \`communities.ts\` - Community management methods
  - \`memberships.ts\` - Membership management methods
  - \`emoji.ts\` - Custom emoji methods
  - \`moderation.ts\` - Moderation methods
" >> server/README.md

# Update client/README.md
echo "
## File Organization

- \`src/lib/hooks/\` - React Query hooks (split by feature)
  - \`useCommunities.ts\` - Community hooks
  - \`useMemberships.ts\` - Membership hooks
  - \`useModeration.ts\` - Moderation hooks
" >> client/README.md

# Update root README.md
echo "
## Shared Utilities

- \`shared/utils/\` - Shared utilities across server and client
  - \`emoji.ts\` - Emoji validation functions
  - \`hashtag.ts\` - Hashtag generation functions
  - \`validation.ts\` - Common validation utilities
" >> README.md
```

**Validation**: ✅ README files updated with new structure

---

## Step 10: Commit Changes

**Goal**: Create atomic commit with all refactoring changes

```bash
# Stage all changes
git add .

# Verify changes
git status

# Run pre-commit validation (Biome + TypeScript)
# This happens automatically via husky hooks

# Commit with descriptive message
git commit -m "refactor: reorganize codebase by domain-driven design

Split large files (>500 lines) into domain-specific modules:
- server/services/atproto.ts (1606 lines) → atproto/{communities,memberships,emoji,moderation}.ts
- client/lib/hooks.ts (433 lines) → hooks/{useCommunities,useMemberships,useModeration}.ts

Consolidate duplicate utilities:
- Moved emoji/hashtag validation to shared/utils/

Breaking changes:
- Updated import paths across server and client
- Git history loss accepted per spec clarification

Validation:
- pnpm -r typecheck: PASS
- pnpm -r test: PASS
- pnpm lint: PASS

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"
```

**Validation**: ✅ Commit created successfully, pre-commit hooks passed

---

## Success Criteria

All steps completed:
- ✅ Step 1: Refactoring candidates identified
- ✅ Step 2: Shared utilities workspace created
- ✅ Step 3: Duplicate utilities consolidated
- ✅ Step 4: Server `atproto.ts` split by domain
- ✅ Step 5: Client `hooks.ts` split by feature
- ✅ Step 6: All import paths updated
- ✅ Step 7: Full validation suite passed
- ✅ Step 8: File organization verified
- ✅ Step 9: Documentation updated
- ✅ Step 10: Changes committed

**Final validation**:
```bash
# One final check
pnpm -r typecheck && pnpm -r test && pnpm lint && echo "✅ SUCCESS"
```

---

## Troubleshooting

### Issue: TypeScript Import Errors

**Symptom**: `pnpm -r typecheck` fails with "Cannot find module"

**Solution**:
1. Verify new files exist at expected paths
2. Check barrel exports (index.ts) re-export all symbols
3. Use VS Code "Go to Definition" to verify import resolution
4. Run `pnpm install` to refresh workspace references

### Issue: Test Failures

**Symptom**: `pnpm -r test` fails after refactoring

**Solution**:
1. Check if tests import from old paths - update to new paths
2. Verify test files match new source structure
3. Run tests individually: `pnpm --filter server test -- tests/unit/services/atproto/communities.test.ts`
4. Check test snapshots if using snapshot testing

### Issue: Linting/Formatting Errors

**Symptom**: `pnpm lint` or `pnpm format:check` fails

**Solution**:
```bash
# Auto-fix linting issues
pnpm lint:fix

# Auto-fix formatting issues
pnpm format

# Re-run validation
pnpm lint && pnpm format:check
```

### Issue: Circular Dependencies

**Symptom**: TypeScript error "Circular dependency detected"

**Solution**:
1. Review barrel exports (index.ts) - avoid re-exporting files that import from the barrel
2. Use direct imports instead of barrel exports for internal module communication
3. Refactor to remove circular dependencies (extract shared types to separate file)

---

## Rollback Procedure

If refactoring fails validation:

```bash
# Option 1: Rollback uncommitted changes
git reset --hard HEAD
git clean -fd

# Option 2: Rollback committed changes
git reset --hard HEAD~1

# Option 3: Restore from backup branch (if created)
git checkout backup-branch
git branch -D 020-
git checkout -b 020- backup-branch

# Verify baseline restored
pnpm -r typecheck && pnpm -r test
```

---

## Next Steps

After successful refactoring:
1. Create pull request: `gh pr create --title "refactor: reorganize codebase by DDD" --body "See commit message"`
2. Request code review from maintainers
3. Merge to master after approval
4. Update project documentation (CLAUDE.md, CONTRIBUTING.md) to reflect new structure
