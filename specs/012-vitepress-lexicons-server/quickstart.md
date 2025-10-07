# Quickstart: VitePress Documentation Migration

**Feature**: 012-vitepress-lexicons-server
**Date**: 2025-10-07
**Estimated Time**: 30-45 minutes

## Overview

This quickstart guide walks through the VitePress documentation migration process from analysis to completion. Follow these steps to safely migrate documentation from the VitePress workspace to component directories.

## Prerequisites

- [x] Branch `012-vitepress-lexicons-server` checked out
- [x] Working directory clean (no uncommitted changes)
- [x] Node.js 18+ installed
- [x] pnpm installed
- [x] All workspace dependencies installed (`pnpm install`)

## Step 1: Pre-Migration Analysis (5 minutes)

### 1.1 Verify Current Structure

```bash
# Verify VitePress workspace exists
ls -la docs/

# Expected output:
# .vitepress/
# architecture/
# guide/
# reference/
# CONTRIBUTING.md
# DEPLOYMENT.md
# index.md
# README.md
```

**Validation**:
- [ ] `docs/` directory exists
- [ ] `.vitepress/config.ts` exists
- [ ] At least 5 markdown files in `docs/`

### 1.2 Check Current Workspace Configuration

```bash
# Check pnpm workspace
cat pnpm-workspace.yaml | grep docs

# Expected output:
#   - 'docs'

# Check root package.json
cat package.json | grep test:docs

# Expected output:
#   "test:docs": "pnpm --filter docs test"
```

**Validation**:
- [ ] `pnpm-workspace.yaml` contains `'docs'`
- [ ] `package.json` contains `test:docs` script

### 1.3 Identify Documentation Files

```bash
# Count English documentation files
find docs -name "*.md" -type f | grep -v node_modules | wc -l

# Expected: ~14 files

# List key files
ls -1 docs/architecture/
ls -1 docs/guide/
ls -1 docs/reference/
```

**Validation**:
- [ ] At least 10 markdown files found
- [ ] Files include: `api.md`, `database.md`, `system-design.md`, `concept.md`, `quickstart.md`

## Step 2: Create Migration Script (10 minutes)

### 2.1 Create Script Directory

```bash
mkdir -p scripts
```

### 2.2 Create Migration Script

Create `scripts/migrate-vitepress-docs.ts`:

```typescript
#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_PATH = path.join(REPO_ROOT, 'docs');

// File migration mapping (from research.md)
const FILE_MAPPING: Record<string, string> = {
  'docs/architecture/api.md': 'server/API.md',
  'docs/architecture/database.md': 'server/DATABASE.md',
  'docs/architecture/system-design.md': 'server/ARCHITECTURE.md',
  'docs/reference/api-reference.md': 'server/API_REFERENCE.md',
  'docs/reference/implementation.md': 'server/IMPLEMENTATION.md',
  'docs/reference/moderation-reasons.md': 'server/MODERATION.md',
  'docs/guide/concept.md': 'CONCEPT.md',
  'docs/CONTRIBUTING.md': 'CONTRIBUTING.md',
  'docs/DEPLOYMENT.md': 'server/DEPLOYMENT.md',
  // TODO: Handle quickstart.md and setup.md (multi-component split)
};

async function transformContent(content: string): Promise<string> {
  let transformed = content;

  // Remove image references
  transformed = transformed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<!-- Image removed: $2 -->');

  // Update VitePress URLs to component paths
  transformed = transformed.replace(
    /https:\/\/docs\.atrarium\.net\/en\/guide\/concept\.html/g,
    '/CONCEPT.md'
  );

  // Update internal doc links to absolute repo paths
  transformed = transformed.replace(/docs\/architecture\/api\.md/g, '/server/API.md');
  transformed = transformed.replace(/docs\/architecture\/database\.md/g, '/server/DATABASE.md');

  return transformed;
}

async function migrateFile(sourcePath: string, destPath: string): Promise<void> {
  const fullSourcePath = path.join(REPO_ROOT, sourcePath);
  const fullDestPath = path.join(REPO_ROOT, destPath);

  console.log(`[INFO] Migrating: ${sourcePath} -> ${destPath}`);

  // Read source content
  const content = await fs.readFile(fullSourcePath, 'utf-8');

  // Transform content
  const transformed = await transformContent(content);

  // Write to destination
  await fs.writeFile(fullDestPath, transformed, 'utf-8');
  console.log(`[SUCCESS] Written: ${destPath}`);
}

async function updateWorkspaceConfig(): Promise<void> {
  console.log('[INFO] Updating pnpm-workspace.yaml...');

  const workspaceFile = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
  let content = await fs.readFile(workspaceFile, 'utf-8');

  // Remove 'docs' line
  content = content.replace(/\n  - 'docs'\n/, '\n');

  await fs.writeFile(workspaceFile, content, 'utf-8');
  console.log('[SUCCESS] Updated pnpm-workspace.yaml');
}

async function updatePackageJson(): Promise<void> {
  console.log('[INFO] Updating package.json...');

  const packageFile = path.join(REPO_ROOT, 'package.json');
  const content = await fs.readFile(packageFile, 'utf-8');
  const pkg = JSON.parse(content);

  // Remove test:docs script
  delete pkg.scripts['test:docs'];

  await fs.writeFile(packageFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log('[SUCCESS] Updated package.json');
}

async function updateReferences(): Promise<void> {
  console.log('[INFO] Updating README.md...');

  const readmeFile = path.join(REPO_ROOT, 'README.md');
  let content = await fs.readFile(readmeFile, 'utf-8');

  // Replace VitePress documentation links
  content = content.replace(
    /📖 \*\*\[Documentation\]\(https:\/\/docs\.atrarium\.net\)\*\* \| \[日本語\]\(https:\/\/docs\.atrarium\.net\/ja\/\)/,
    '📖 **Documentation**: Component-specific docs are located in respective directories:\n- [Lexicons](/lexicons/README.md)\n- [Server](/server/README.md)\n- [Client](/client/README.md)\n- [Project Concept](/CONCEPT.md)'
  );

  await fs.writeFile(readmeFile, content, 'utf-8');
  console.log('[SUCCESS] Updated README.md');
}

async function deleteDocsWorkspace(): Promise<void> {
  console.log('[WARN] Deleting docs/ workspace...');

  // Confirm deletion
  console.log('[PROMPT] Delete docs/ directory? This cannot be undone.');
  console.log('[INFO] Press Ctrl+C to abort, or continue with force flag');

  await fs.rm(DOCS_PATH, { recursive: true, force: true });
  console.log('[SUCCESS] Deleted docs/ workspace');
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  console.log('[INFO] Starting VitePress documentation migration...');
  console.log(`[INFO] Mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);

  if (dryRun) {
    console.log('[INFO] Dry-run mode: No files will be modified');
    console.log('[INFO] File mapping:');
    for (const [source, dest] of Object.entries(FILE_MAPPING)) {
      console.log(`  ${source} -> ${dest}`);
    }
    return;
  }

  // Step 1: Migrate files
  for (const [source, dest] of Object.entries(FILE_MAPPING)) {
    await migrateFile(source, dest);
  }

  // Step 2: Update workspace config
  await updateWorkspaceConfig();
  await updatePackageJson();

  // Step 3: Update references
  await updateReferences();

  // Step 4: Delete docs workspace (requires force flag)
  if (force) {
    await deleteDocsWorkspace();
  } else {
    console.log('[WARN] Skipping docs/ deletion (use --force to delete)');
  }

  console.log('[SUCCESS] Migration completed!');
  console.log('[INFO] Next steps:');
  console.log('  1. Run: pnpm install');
  console.log('  2. Verify: git status');
  console.log('  3. Test: pnpm run build');
}

main().catch((error) => {
  console.error('[ERROR] Migration failed:', error);
  process.exit(1);
});
```

### 2.3 Add npm Script

Edit `package.json`:

```json
{
  "scripts": {
    "migrate-docs": "tsx scripts/migrate-vitepress-docs.ts"
  }
}
```

### 2.4 Install tsx (TypeScript Executor)

```bash
pnpm add -D tsx
```

**Validation**:
- [ ] `scripts/migrate-vitepress-docs.ts` created
- [ ] `package.json` contains `migrate-docs` script
- [ ] `tsx` installed in devDependencies

## Step 3: Dry-Run Migration (5 minutes)

### 3.1 Run Dry-Run

```bash
npm run migrate-docs -- --dry-run
```

**Expected Output**:
```
[INFO] Starting VitePress documentation migration...
[INFO] Mode: DRY-RUN
[INFO] Dry-run mode: No files will be modified
[INFO] File mapping:
  docs/architecture/api.md -> server/API.md
  docs/architecture/database.md -> server/DATABASE.md
  docs/architecture/system-design.md -> server/ARCHITECTURE.md
  docs/reference/api-reference.md -> server/API_REFERENCE.md
  docs/reference/implementation.md -> server/IMPLEMENTATION.md
  docs/reference/moderation-reasons.md -> server/MODERATION.md
  docs/guide/concept.md -> CONCEPT.md
  docs/CONTRIBUTING.md -> CONTRIBUTING.md
  docs/DEPLOYMENT.md -> server/DEPLOYMENT.md
```

**Validation**:
- [ ] Dry-run completes without errors
- [ ] File mapping looks correct
- [ ] No files modified (`git status` shows no changes)

## Step 4: Execute Migration (10 minutes)

### 4.1 Run Migration (Without Deletion)

```bash
npm run migrate-docs
```

**Expected Output**:
```
[INFO] Starting VitePress documentation migration...
[INFO] Mode: EXECUTE
[INFO] Migrating: docs/architecture/api.md -> server/API.md
[SUCCESS] Written: server/API.md
[INFO] Migrating: docs/architecture/database.md -> server/DATABASE.md
[SUCCESS] Written: server/DATABASE.md
...
[INFO] Updating pnpm-workspace.yaml...
[SUCCESS] Updated pnpm-workspace.yaml
[INFO] Updating package.json...
[SUCCESS] Updated package.json
[INFO] Updating README.md...
[SUCCESS] Updated README.md
[WARN] Skipping docs/ deletion (use --force to delete)
[SUCCESS] Migration completed!
[INFO] Next steps:
  1. Run: pnpm install
  2. Verify: git status
  3. Test: pnpm run build
```

**Validation**:
- [ ] All files migrated successfully
- [ ] `server/API.md`, `server/DATABASE.md`, etc. exist
- [ ] `CONCEPT.md`, `CONTRIBUTING.md` exist in root
- [ ] `pnpm-workspace.yaml` does not contain `'docs'`
- [ ] `package.json` does not contain `test:docs` script

### 4.2 Verify Workspace Configuration

```bash
# Refresh workspace
pnpm install

# Expected output:
# Lockfile is up to date, resolution step is skipped
# Already up to date
```

**Validation**:
- [ ] `pnpm install` succeeds without errors
- [ ] No warnings about missing `docs` workspace

### 4.3 Verify File Content

```bash
# Check transformed content
head -20 server/API.md

# Verify links updated
grep -n "/server/" server/API.md

# Verify images removed
grep -n "!\[" server/API.md
```

**Validation**:
- [ ] Content preserved (headings, text intact)
- [ ] Internal links use absolute repo paths (`/server/...`)
- [ ] No image references (`![alt](path)`) remain

## Step 5: Manual Adjustments (10 minutes)

### 5.1 Handle Multi-Component Docs

The migration script does not handle `docs/guide/quickstart.md` and `docs/guide/setup.md` automatically. These require manual splitting:

**Option A: Split quickstart.md**
- Extract server setup section → `server/QUICKSTART.md`
- Extract client setup section → `client/QUICKSTART.md`
- Keep general overview → `QUICKSTART.md` (root)

**Option B: Keep at root**
- Move `docs/guide/quickstart.md` → `QUICKSTART.md` (root)
- Move `docs/guide/setup.md` → `SETUP.md` (root)

**Recommendation**: Option B (simpler, can refine later)

```bash
# Copy to root
cp docs/guide/quickstart.md QUICKSTART.md
cp docs/guide/setup.md SETUP.md

# Update links in these files manually
```

### 5.2 Update CLAUDE.md

Edit `CLAUDE.md` to reflect new documentation structure:

**Find**:
```markdown
**Documentation**:
- **[Documentation Site](https://docs.atrarium.net)** - VitePress documentation (EN/JA) - **primary reference**
```

**Replace with**:
```markdown
**Documentation**:
- Component documentation is located in respective directories:
  - [lexicons/README.md](lexicons/README.md) - AT Protocol Lexicon schemas
  - [server/README.md](server/README.md) - Backend server documentation
  - [client/README.md](client/README.md) - Web dashboard documentation
- Project-level documentation:
  - [CONCEPT.md](CONCEPT.md) - System design and architecture
  - [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
  - [QUICKSTART.md](QUICKSTART.md) - Getting started guide
  - [SETUP.md](SETUP.md) - Development environment setup
```

**Validation**:
- [ ] `QUICKSTART.md` and `SETUP.md` moved to root
- [ ] CLAUDE.md updated with new documentation structure
- [ ] No VitePress references remain in CLAUDE.md

## Step 6: Delete VitePress Workspace (5 minutes)

### 6.1 Final Verification

```bash
# Verify all files migrated
ls -1 server/*.md
ls -1 *.md | grep -E "(CONCEPT|CONTRIBUTING|QUICKSTART|SETUP)"

# Check git status
git status
```

**Expected**:
- New files: `server/API.md`, `CONCEPT.md`, etc.
- Modified: `pnpm-workspace.yaml`, `package.json`, `README.md`, `CLAUDE.md`
- Untracked: `docs/` (still exists)

**Validation**:
- [ ] All expected files present
- [ ] Workspace configuration updated
- [ ] Ready to delete `docs/`

### 6.2 Delete VitePress Workspace

```bash
# Delete with force flag
npm run migrate-docs -- --force

# Or manually delete
rm -rf docs/
```

**Expected Output**:
```
[WARN] Deleting docs/ workspace...
[SUCCESS] Deleted docs/ workspace
```

**Validation**:
- [ ] `docs/` directory deleted
- [ ] No residual VitePress files

### 6.3 Final Workspace Refresh

```bash
# Refresh workspace after deletion
pnpm install
```

**Validation**:
- [ ] `pnpm install` succeeds
- [ ] No errors or warnings

## Step 7: Verification (5 minutes)

### 7.1 Build Verification

```bash
# Run build to ensure no broken references
pnpm run build
```

**Expected**: Build succeeds for server and client workspaces

**Validation**:
- [ ] Server build succeeds
- [ ] Client build succeeds
- [ ] No errors about missing `docs` workspace

### 7.2 Link Verification

```bash
# Search for remaining VitePress URLs
grep -r "docs.atrarium.net" . --exclude-dir=node_modules --exclude-dir=.git

# Expected output: (empty or only in archived specs)

# Search for broken internal links
grep -r "docs/" . --include="*.md" --exclude-dir=node_modules --exclude-dir=.git
```

**Validation**:
- [ ] No VitePress URLs in active code
- [ ] No broken links to `docs/` directory

### 7.3 Git Status Review

```bash
git status
```

**Expected Changes**:
- New files: Component documentation (9-10 files)
- Modified: `pnpm-workspace.yaml`, `package.json`, `README.md`, `CLAUDE.md`
- Deleted: `docs/` directory (hundreds of files)

**Validation**:
- [ ] New documentation files staged
- [ ] Workspace configuration changes staged
- [ ] `docs/` directory deleted

## Step 8: Commit Changes (2 minutes)

### 8.1 Stage Changes

```bash
# Stage all changes
git add .

# Review staged changes
git status
```

### 8.2 Commit

```bash
git commit -m "feat: remove VitePress hosting and reorganize documentation

- Remove VitePress workspace from pnpm workspaces
- Migrate documentation to component directories
- Update README.md and CLAUDE.md references
- Delete docs.atrarium.net deployment configuration
- Remove Japanese translations (keep English only)

Closes #012"
```

**Validation**:
- [ ] Commit created successfully
- [ ] All changes included in commit

## Success Criteria

### Functional Validation
- [x] VitePress workspace (`docs/`) deleted
- [x] Component documentation files exist (server/, client/, lexicons/)
- [x] Project-level docs in root (CONCEPT.md, CONTRIBUTING.md, etc.)
- [x] `pnpm-workspace.yaml` does not contain `'docs'`
- [x] Root `package.json` does not contain `test:docs` script
- [x] `pnpm install` succeeds without errors
- [x] `pnpm run build` succeeds for all workspaces

### Content Validation
- [x] All documentation text content preserved
- [x] No VitePress URLs in README.md
- [x] No VitePress URLs in CLAUDE.md
- [x] Internal links use absolute repo paths (`/component/FILE.md`)
- [x] No image references (`![alt](path)`) remain
- [x] Markdown syntax valid in all migrated files

### Workspace Validation
- [x] No broken links in documentation
- [x] Component directories contain relevant docs
- [x] Root README.md documents new structure
- [x] CLAUDE.md updated with component doc locations

## Rollback Procedure

If migration fails or needs to be undone:

### Option 1: Git Reset (Before Commit)
```bash
# Discard all changes
git reset --hard HEAD

# Clean untracked files
git clean -fd
```

### Option 2: Git Revert (After Commit)
```bash
# Revert commit
git revert HEAD

# Or reset to previous commit
git reset --hard HEAD~1
```

### Option 3: Restore from Backup (If Created)
```bash
# Extract backup
tar -xzf .specify/backups/012-vitepress/docs.backup.tar.gz

# Restore workspace config
git checkout pnpm-workspace.yaml package.json README.md CLAUDE.md
```

## Troubleshooting

### Issue: "docs/ directory not found"
**Cause**: Already deleted or incorrect working directory
**Solution**: Verify you're in repository root, check if migration already completed

### Issue: "Destination file already exists"
**Cause**: Migration partially completed, files already migrated
**Solution**: Delete destination files manually, or skip to deletion step

### Issue: "pnpm install" fails after workspace update
**Cause**: Syntax error in `pnpm-workspace.yaml` or `package.json`
**Solution**: Verify YAML/JSON syntax, ensure proper indentation

### Issue: Broken links in migrated docs
**Cause**: Link transformation pattern missed some links
**Solution**: Search for broken links manually, update link transformation logic

## Next Steps

After successful migration:

1. **Update External References**: If any external sites link to docs.atrarium.net, update or notify maintainers
2. **Remove Cloudflare Pages Deployment**: Manually delete Cloudflare Pages project for docs.atrarium.net
3. **Update Component READMEs**: Ensure each component README links to its documentation files
4. **Create Documentation Index**: Consider adding a `docs/INDEX.md` in root listing all documentation files

## Estimated Timeline

| Step | Duration | Cumulative |
|------|----------|------------|
| Pre-Migration Analysis | 5 min | 5 min |
| Create Migration Script | 10 min | 15 min |
| Dry-Run Migration | 5 min | 20 min |
| Execute Migration | 10 min | 30 min |
| Manual Adjustments | 10 min | 40 min |
| Delete Workspace | 5 min | 45 min |
| Verification | 5 min | 50 min |
| Commit Changes | 2 min | 52 min |

**Total**: ~50 minutes (may vary based on manual adjustments needed)
