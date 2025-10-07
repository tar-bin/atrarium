# Migration API Contracts

**Feature**: 012-vitepress-lexicons-server
**Date**: 2025-10-07

## Overview

This document defines the programmatic interface for VitePress documentation migration operations. These are file system operations, not HTTP APIs.

## File Operations API

### Operation 1: Analyze Documentation Structure

**Function Signature**:
```typescript
interface AnalysisResult {
  englishFiles: DocumentationFile[];
  japaneseFiles: DocumentationFile[];
  vitepressAssets: AssetFile[];
  totalFilesFound: number;
}

function analyzeDocumentationStructure(
  docsPath: string
): Promise<AnalysisResult>
```

**Input**:
- `docsPath`: Absolute path to `docs/` directory

**Output**:
- `englishFiles`: List of English documentation files with metadata
- `japaneseFiles`: List of Japanese files to be deleted
- `vitepressAssets`: List of VitePress-specific assets (images, configs)
- `totalFilesFound`: Total count for verification

**Preconditions**:
- `docsPath` directory must exist
- Must be readable by process

**Postconditions**:
- Returns complete file inventory
- No files modified

**Error Conditions**:
- `ENOENT`: docs/ directory not found
- `EACCES`: Permission denied

---

### Operation 2: Transform Documentation Content

**Function Signature**:
```typescript
interface TransformOptions {
  removeImages: boolean;
  updateLinks: boolean;
  linkFormat: 'absolute' | 'relative';
}

interface TransformResult {
  originalContent: string;
  transformedContent: string;
  linksUpdated: number;
  imagesRemoved: number;
}

function transformDocumentationContent(
  content: string,
  options: TransformOptions
): TransformResult
```

**Input**:
- `content`: Original markdown content
- `options.removeImages`: If true, remove all `![alt](path)` references
- `options.updateLinks`: If true, convert links to absolute repo paths
- `options.linkFormat`: 'absolute' (default, e.g., `/server/API.md`)

**Output**:
- `originalContent`: Unchanged original (for backup/rollback)
- `transformedContent`: Modified markdown content
- `linksUpdated`: Count of links updated
- `imagesRemoved`: Count of image references removed

**Transformation Rules**:
1. **Link Updates**:
   - `docs/architecture/api.md` → `/server/API.md`
   - `https://docs.atrarium.net/en/guide/concept.html` → `/CONCEPT.md`
   - Preserve external links (not docs.atrarium.net)

2. **Image Removal**:
   - Match pattern: `!\[([^\]]*)\]\(([^)]+)\)`
   - Replace with: `<!-- Image removed: $2 -->`

**Preconditions**:
- `content` is valid UTF-8 string

**Postconditions**:
- Returns modified content
- Original content unchanged

**Error Conditions**:
- Invalid markdown syntax (warn but continue)

---

### Operation 3: Migrate Documentation File

**Function Signature**:
```typescript
interface MigrationOptions {
  sourcePath: string;
  destinationPath: string;
  transform: boolean;
  dryRun: boolean;
}

interface MigrationResult {
  success: boolean;
  sourcePath: string;
  destinationPath: string;
  bytesWritten: number;
  error?: string;
}

function migrateDocumentationFile(
  options: MigrationOptions
): Promise<MigrationResult>
```

**Input**:
- `sourcePath`: Source file in `docs/` directory
- `destinationPath`: Target path in component directory
- `transform`: If true, apply content transformations
- `dryRun`: If true, simulate without writing

**Output**:
- `success`: True if migration completed
- `sourcePath`: Confirmed source path
- `destinationPath`: Confirmed destination path
- `bytesWritten`: Size of written file (0 if dryRun)
- `error`: Error message if failed

**Workflow**:
1. Read source file content
2. If `transform` is true, apply transformations
3. Ensure destination directory exists
4. If `dryRun` is false, write to destination
5. Verify write successful

**Preconditions**:
- Source file exists and readable
- Destination directory exists
- Destination file does not exist (prevent overwrite)

**Postconditions**:
- Destination file created (if not dryRun)
- Source file unchanged
- Content integrity preserved

**Error Conditions**:
- `ENOENT`: Source file not found
- `EEXIST`: Destination file already exists
- `ENOSPC`: Disk full
- `EACCES`: Permission denied

---

### Operation 4: Update Workspace Configuration

**Function Signature**:
```typescript
interface WorkspaceUpdateOptions {
  configType: 'pnpm-workspace' | 'root-package';
  dryRun: boolean;
}

interface WorkspaceUpdateResult {
  success: boolean;
  configPath: string;
  lineRemoved?: string;
  scriptRemoved?: string;
  error?: string;
}

function updateWorkspaceConfiguration(
  options: WorkspaceUpdateOptions
): Promise<WorkspaceUpdateResult>
```

**Input**:
- `configType`: Type of config file to update
- `dryRun`: If true, simulate without writing

**Output**:
- `success`: True if update completed
- `configPath`: Path to updated config file
- `lineRemoved`: Content removed (for verification)
- `scriptRemoved`: Script key removed (for package.json)
- `error`: Error message if failed

**Update Specifications**:

**pnpm-workspace.yaml**:
- Remove line: `  - 'docs'`
- Preserve indentation (2 spaces)
- Preserve other packages

**package.json**:
- Remove key: `"test:docs": "pnpm --filter docs test"`
- Preserve JSON formatting
- Preserve other scripts

**Preconditions**:
- Config file exists and readable
- Valid YAML/JSON syntax

**Postconditions**:
- Config file updated correctly
- Syntax remains valid
- Other content preserved

**Error Conditions**:
- `ENOENT`: Config file not found
- `YAML_PARSE_ERROR`: Invalid YAML syntax
- `JSON_PARSE_ERROR`: Invalid JSON syntax
- `EACCES`: Permission denied

---

### Operation 5: Update Documentation References

**Function Signature**:
```typescript
interface ReferenceUpdateOptions {
  filePath: string;
  dryRun: boolean;
}

interface ReferenceUpdateResult {
  success: boolean;
  filePath: string;
  urlsUpdated: number;
  linksUpdated: number;
  sectionsUpdated: number;
  error?: string;
}

function updateDocumentationReferences(
  options: ReferenceUpdateOptions
): Promise<ReferenceUpdateResult>
```

**Input**:
- `filePath`: File containing VitePress references
- `dryRun`: If true, simulate without writing

**Output**:
- `success`: True if update completed
- `filePath`: Confirmed file path
- `urlsUpdated`: Count of URLs updated
- `linksUpdated`: Count of internal links updated
- `sectionsUpdated`: Count of documentation sections rewritten
- `error`: Error message if failed

**Reference Update Patterns**:

1. **External URLs**:
   - Match: `https://docs.atrarium.net/en/guide/concept.html`
   - Replace with: `/CONCEPT.md`
   - Match: `[Documentation](https://docs.atrarium.net)`
   - Replace with: Component documentation index

2. **Internal Links**:
   - Match: `docs/architecture/api.md`
   - Replace with: `/server/API.md`

3. **Documentation Sections** (CLAUDE.md):
   - Remove VitePress documentation site references
   - Add component documentation structure

**Preconditions**:
- File exists and readable
- UTF-8 encoding

**Postconditions**:
- File updated with new references
- No VitePress URLs remain
- Markdown syntax valid

**Error Conditions**:
- `ENOENT`: File not found
- `EACCES`: Permission denied

---

### Operation 6: Delete VitePress Workspace

**Function Signature**:
```typescript
interface DeletionOptions {
  docsPath: string;
  dryRun: boolean;
  force: boolean; // If true, skip confirmation
}

interface DeletionResult {
  success: boolean;
  docsPath: string;
  filesDeleted: number;
  bytesFreed: number;
  error?: string;
}

function deleteVitepressWorkspace(
  options: DeletionOptions
): Promise<DeletionResult>
```

**Input**:
- `docsPath`: Path to `docs/` directory
- `dryRun`: If true, simulate without deleting
- `force`: If true, skip confirmation prompt

**Output**:
- `success`: True if deletion completed
- `docsPath`: Confirmed path deleted
- `filesDeleted`: Count of files removed
- `bytesFreed`: Disk space freed (bytes)
- `error`: Error message if failed

**Workflow**:
1. If not `force`, prompt for confirmation
2. Calculate total files/size
3. If `dryRun`, return simulated result
4. Otherwise, recursively delete directory
5. Verify directory no longer exists

**Preconditions**:
- All documentation files migrated
- Workspace configuration updated
- User confirmation (if not force)

**Postconditions**:
- `docs/` directory completely removed
- No residual files

**Error Conditions**:
- `ENOENT`: Directory not found (already deleted)
- `EACCES`: Permission denied
- `ENOTEMPTY`: Directory not empty (unexpected files)

---

### Operation 7: Verify Migration Completeness

**Function Signature**:
```typescript
interface VerificationOptions {
  expectedFiles: string[]; // Expected destination paths
  checkLinks: boolean; // If true, verify all links
}

interface VerificationResult {
  success: boolean;
  filesVerified: number;
  missingFiles: string[];
  brokenLinks: string[];
  vitepressUrlsFound: string[]; // Should be empty
  error?: string;
}

function verifyMigrationCompleteness(
  options: VerificationOptions
): Promise<VerificationResult>
```

**Input**:
- `expectedFiles`: List of expected destination file paths
- `checkLinks`: If true, verify all markdown links resolve

**Output**:
- `success`: True if all checks passed
- `filesVerified`: Count of verified files
- `missingFiles`: Files that should exist but don't
- `brokenLinks`: Links that don't resolve
- `vitepressUrlsFound`: VitePress URLs still present (should be empty)
- `error`: Error message if verification failed

**Verification Checks**:
1. All expected destination files exist
2. No VitePress URLs in root README.md
3. No VitePress URLs in CLAUDE.md
4. `docs/` directory deleted
5. `pnpm-workspace.yaml` does not contain `'docs'`
6. Root `package.json` does not contain `test:docs`
7. All internal links use absolute repo paths
8. All internal links resolve to existing files

**Preconditions**:
- Migration completed
- Workspace configuration updated

**Postconditions**:
- Returns comprehensive verification report
- No side effects (read-only)

**Error Conditions**:
- None (returns failure in result, not error)

---

## CLI Script Interface

### Command: `migrate-vitepress-docs`

**Usage**:
```bash
# Dry-run (preview changes)
npm run migrate-docs -- --dry-run

# Execute migration
npm run migrate-docs

# Skip confirmation prompts
npm run migrate-docs -- --force

# Verify migration
npm run migrate-docs -- --verify-only
```

**Options**:
- `--dry-run`: Preview operations without modifying files
- `--force`: Skip confirmation prompts
- `--verify-only`: Run verification checks only
- `--verbose`: Detailed logging

**Exit Codes**:
- `0`: Success
- `1`: Migration failed
- `2`: Verification failed
- `3`: Pre-migration validation failed

**Output Format**:
```
[INFO] Analyzing documentation structure...
[INFO] Found 14 English documentation files
[INFO] Found 10 Japanese translation files (will be deleted)
[INFO] Found 3 VitePress asset directories

[INFO] Transforming content...
[INFO] docs/architecture/api.md -> server/API.md (5 links updated, 2 images removed)
[INFO] docs/guide/concept.md -> CONCEPT.md (3 links updated, 1 image removed)

[INFO] Updating workspace configuration...
[INFO] Updated pnpm-workspace.yaml (removed 'docs' package)
[INFO] Updated package.json (removed 'test:docs' script)

[INFO] Updating documentation references...
[INFO] README.md: 2 URLs updated, 1 section rewritten
[INFO] CLAUDE.md: 5 URLs updated, 1 section rewritten

[WARN] Deleting VitePress workspace...
[PROMPT] Delete /workspaces/atrarium/docs/ and all contents? (y/N): y
[INFO] Deleted 125 files (4.5 MB freed)

[INFO] Running verification...
[SUCCESS] Migration completed successfully!
[SUCCESS] All 14 files verified
[SUCCESS] 0 broken links found
[SUCCESS] 0 VitePress URLs remaining
```

---

## Testing Contract

### Test: Migration Dry-Run
**Preconditions**:
- VitePress workspace exists

**Steps**:
1. Run `npm run migrate-docs -- --dry-run`
2. Verify output shows planned operations
3. Verify no files modified

**Expected Results**:
- Exit code 0
- Output lists all planned file operations
- `docs/` directory unchanged
- Component directories unchanged

---

### Test: End-to-End Migration
**Preconditions**:
- VitePress workspace exists
- No destination files exist

**Steps**:
1. Run `npm run migrate-docs -- --force`
2. Run `npm run migrate-docs -- --verify-only`

**Expected Results**:
- Migration exit code 0
- Verification exit code 0
- All documentation files in component directories
- `docs/` directory deleted
- No VitePress URLs in README.md or CLAUDE.md
- `pnpm install` succeeds

---

### Test: Idempotency Check
**Preconditions**:
- Migration already completed

**Steps**:
1. Run `npm run migrate-docs -- --verify-only`
2. Should succeed without errors

**Expected Results**:
- Exit code 0
- Verification passes
- No operations performed (already migrated)

---

## Error Handling

### Error: Destination File Already Exists
**Trigger**: `migrateDocumentationFile()` finds existing destination

**Response**:
- Abort migration
- Log error: `ERROR: Destination file already exists: ${destinationPath}`
- Suggest: `--force-overwrite` flag or manual cleanup

### Error: VitePress URLs Remain After Update
**Trigger**: `verifyMigrationCompleteness()` finds VitePress URLs

**Response**:
- Mark verification as failed
- Log: `ERROR: VitePress URLs still found in: ${filePath}`
- List URLs found
- Suggest manual review

### Error: Broken Links After Migration
**Trigger**: `verifyMigrationCompleteness()` finds unresolved links

**Response**:
- Mark verification as failed
- Log: `ERROR: Broken link in ${filePath}: ${link} -> target not found`
- List all broken links
- Suggest manual fix

---

## Implementation Notes

### Technology Choices
- **Language**: TypeScript (Node.js runtime)
- **File Operations**: `fs/promises` (Node.js standard library)
- **Markdown Parsing**: `remark` + `remark-gfm` (for link extraction)
- **YAML Parsing**: `js-yaml`
- **JSON Parsing**: `JSON.parse` / `JSON.stringify` (native)

### Script Location
- Create migration script at: `scripts/migrate-vitepress-docs.ts`
- Add npm script: `"migrate-docs": "tsx scripts/migrate-vitepress-docs.ts"`

### Rollback Strategy
- Create backup before deletion: `docs.backup.tar.gz`
- Store in `.specify/backups/012-vitepress/`
- Document rollback procedure in quickstart.md
