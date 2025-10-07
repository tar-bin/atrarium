# Data Model: VitePress Documentation Migration

**Feature**: 012-vitepress-lexicons-server
**Date**: 2025-10-07

## Overview

This data model describes the file system entities involved in removing VitePress hosting and reorganizing documentation to component directories. This is a **file manipulation** feature, not a traditional data model with entities/relationships.

## File System Entities

### Entity 1: VitePress Workspace
**Type**: Directory to be deleted
**Location**: `/workspaces/atrarium/docs/`

**Attributes**:
- **path**: Absolute filesystem path
- **type**: "directory"
- **deletion_strategy**: "recursive"
- **contains**:
  - VitePress configuration (`.vitepress/`)
  - English documentation (`en/` or root `*.md` files)
  - Japanese documentation (`ja/`)
  - VitePress-specific assets (`public/`, `images/`)

**Lifecycle**:
1. **Analysis**: Scan directory structure, identify files to migrate
2. **Migration**: Extract English docs, copy to component directories
3. **Deletion**: Remove entire directory after migration complete

**Validation Rules**:
- MUST exist before migration starts
- MUST be completely deleted (no residual files)
- MUST NOT be deleted before file migration completes

---

### Entity 2: Documentation File
**Type**: Markdown file to be migrated
**Locations**: Source: `docs/**/*.md`, Destination: Component roots

**Attributes**:
- **source_path**: Original path in VitePress workspace (e.g., `docs/architecture/api.md`)
- **destination_path**: Target path in component directory (e.g., `server/API.md`)
- **migration_type**: "move" | "copy" | "delete" | "transform"
- **content_modifications**: List of link/image updates required
- **language**: "en" | "ja" (ja files will be skipped)

**Relationships**:
- **belongs_to**: One component (lexicons, server, client, root)
- **references**: Other documentation files (via markdown links)
- **contains_assets**: Images/diagrams to be removed

**Lifecycle States**:
1. **Source**: Original file in `docs/` directory
2. **Analyzed**: Content scanned for links/images
3. **Transformed**: Links updated, images removed
4. **Migrated**: Written to destination path
5. **Verified**: Destination file exists and readable

**Validation Rules**:
- Source file MUST exist and be readable
- Destination file MUST NOT exist (prevent overwrite)
- Content MUST preserve heading structure (no data loss)
- Links MUST be updated to absolute repo paths
- Image references MUST be removed

**File Classification**:
| Source Pattern | Destination | Migration Type |
|----------------|-------------|----------------|
| `docs/architecture/api.md` | `server/API.md` | transform (update links) |
| `docs/architecture/database.md` | `server/DATABASE.md` | transform |
| `docs/architecture/system-design.md` | `server/ARCHITECTURE.md` | transform |
| `docs/reference/api-reference.md` | `server/API_REFERENCE.md` | transform |
| `docs/reference/implementation.md` | `server/IMPLEMENTATION.md` | transform |
| `docs/reference/moderation-reasons.md` | `server/MODERATION.md` | transform |
| `docs/guide/concept.md` | `CONCEPT.md` (root) | transform |
| `docs/CONTRIBUTING.md` | `CONTRIBUTING.md` (root) | transform |
| `docs/guide/quickstart.md` | Multi-component split | transform (complex) |
| `docs/guide/setup.md` | Multi-component split | transform (complex) |
| `docs/DEPLOYMENT.md` | `server/DEPLOYMENT.md` | transform |
| `docs/index.md` | N/A | delete (VitePress homepage) |
| `docs/README.md` | N/A | delete (VitePress meta) |
| `docs/ja/**/*.md` | N/A | delete (Japanese translations) |

---

### Entity 3: Workspace Configuration
**Type**: Configuration file to be modified
**Locations**:
- `/workspaces/atrarium/pnpm-workspace.yaml`
- `/workspaces/atrarium/package.json`

**Attributes**:
- **file_path**: Absolute path to config file
- **modification_type**: "remove_line" | "remove_script"
- **target_content**: Specific line/key to remove

**Modifications Required**:

**pnpm-workspace.yaml**:
```yaml
# BEFORE
packages:
  - 'shared/contracts'
  - 'server'
  - 'client'
  - 'docs'  # ← REMOVE THIS LINE

# AFTER
packages:
  - 'shared/contracts'
  - 'server'
  - 'client'
```

**package.json** (root):
```json
// BEFORE
{
  "scripts": {
    "dev": "pnpm --filter server dev",
    "test": "pnpm -r test",
    "test:docs": "pnpm --filter docs test"  // ← REMOVE THIS LINE
  }
}

// AFTER
{
  "scripts": {
    "dev": "pnpm --filter server dev",
    "test": "pnpm -r test"
  }
}
```

**Validation Rules**:
- Backup original file before modification
- Preserve file format (YAML indentation, JSON formatting)
- Verify syntax after modification (no parse errors)
- Run `pnpm install` to refresh workspace after changes

---

### Entity 4: Documentation Reference
**Type**: Link/reference to VitePress documentation
**Locations**:
- `README.md` (root)
- `CLAUDE.md` (root)
- Component READMEs (`server/README.md`, `client/README.md`, etc.)
- Other markdown files

**Attributes**:
- **file_path**: File containing the reference
- **reference_type**: "external_url" | "internal_link" | "documentation_section"
- **old_value**: Original VitePress URL/path
- **new_value**: Updated component documentation path

**Reference Patterns to Update**:

**External URLs** (README.md):
```markdown
# BEFORE
📖 **[Documentation](https://docs.atrarium.net)** | [日本語](https://docs.atrarium.net/ja/)

# AFTER
📖 **Documentation**: Component-specific docs are located in respective directories:
- [Lexicons](/lexicons/README.md)
- [Server](/server/README.md)
- [Client](/client/README.md)
- [Project Concept](/CONCEPT.md)
```

**Internal Links** (CLAUDE.md):
```markdown
# BEFORE
For detailed data flow visualization, see [VitePress Concept Documentation](https://docs.atrarium.net/en/guide/concept.html#how-it-works).

# AFTER
For detailed data flow visualization, see [Project Concept](/CONCEPT.md).
```

**Documentation Sections** (CLAUDE.md):
```markdown
# BEFORE
**Documentation**:
- **[Documentation Site](https://docs.atrarium.net)** - VitePress documentation (EN/JA) - **primary reference**

# AFTER
**Documentation**:
- Component documentation is located in respective directories (lexicons/, server/, client/)
- Project-level documentation (CONCEPT.md, CONTRIBUTING.md) is in repository root
```

**Validation Rules**:
- All VitePress URLs (`docs.atrarium.net`) MUST be updated or removed
- Internal links MUST use absolute repo paths (e.g., `/server/API.md`)
- No broken links (all referenced files MUST exist after migration)

---

## File Operation Contracts

### Contract 1: Documentation File Migration
**Operation**: `migrate_documentation_file(source_path, destination_path)`

**Preconditions**:
- Source file exists and is readable
- Destination file does not exist
- Destination directory exists

**Steps**:
1. Read source file content
2. Transform content:
   - Update internal links to absolute repo paths
   - Remove image references (`![alt](path)`)
   - Preserve all other markdown content
3. Write transformed content to destination
4. Verify destination file created successfully

**Postconditions**:
- Destination file exists with correct content
- Source file remains unchanged (until workspace deletion)
- No data loss (heading structure preserved)

---

### Contract 2: Workspace Configuration Update
**Operation**: `update_workspace_config(config_type)`

**Preconditions**:
- Config file exists and is valid syntax
- Backup created

**Steps** (config_type = "pnpm-workspace"):
1. Read `pnpm-workspace.yaml`
2. Remove line `  - 'docs'` from packages array
3. Write updated YAML
4. Verify YAML syntax valid

**Steps** (config_type = "root-package"):
1. Read root `package.json`
2. Remove `"test:docs"` key from scripts object
3. Write updated JSON
4. Verify JSON syntax valid

**Postconditions**:
- Config file updated correctly
- No syntax errors
- `pnpm install` runs successfully

---

### Contract 3: VitePress Workspace Deletion
**Operation**: `delete_vitepress_workspace()`

**Preconditions**:
- All documentation files migrated successfully
- Workspace configuration updated
- Confirmation received (dry-run mode available)

**Steps**:
1. Verify all required files extracted from `docs/`
2. Delete `docs/` directory recursively
3. Verify directory no longer exists

**Postconditions**:
- `docs/` directory completely removed
- No residual VitePress files
- pnpm workspace still valid

---

### Contract 4: Documentation Reference Update
**Operation**: `update_documentation_references(file_path)`

**Preconditions**:
- File exists and is readable
- New documentation structure in place

**Steps**:
1. Read file content
2. Search for VitePress references:
   - External URLs: `https://docs.atrarium.net/...`
   - Internal relative paths: `docs/.../*.md`
   - Documentation site mentions
3. Replace with new references:
   - Component documentation paths: `/server/API.md`
   - Documentation index in README.md
4. Write updated content

**Postconditions**:
- No VitePress URLs remain
- All internal links use absolute repo paths
- Documentation structure clearly documented

---

## State Transitions

### Migration Workflow State Machine

```
[Initial State]
    ↓
[Analysis] ← Scan docs/ directory, classify files
    ↓
[Transformation] ← Update links, remove images
    ↓
[Migration] ← Write files to component directories
    ↓
[Configuration Update] ← Update pnpm-workspace.yaml, package.json
    ↓
[Reference Update] ← Update README.md, CLAUDE.md, etc.
    ↓
[Verification] ← Check all files migrated, links valid
    ↓
[Workspace Deletion] ← Remove docs/ directory
    ↓
[Cleanup] ← Run pnpm install, verify workspace
    ↓
[Complete]
```

**State Validation**:
- **Analysis → Transformation**: All source files identified
- **Transformation → Migration**: Content transformations applied
- **Migration → Configuration Update**: All files written successfully
- **Configuration Update → Reference Update**: Workspace configs updated
- **Reference Update → Verification**: All references updated
- **Verification → Workspace Deletion**: Migration verified complete
- **Workspace Deletion → Cleanup**: docs/ removed successfully
- **Cleanup → Complete**: pnpm install succeeds, workspace valid

---

## Validation Rules Summary

### Pre-Migration Validation
- [ ] `docs/` directory exists
- [ ] VitePress configuration (`docs/.vitepress/config.ts`) exists
- [ ] English documentation files identified (at least 5 files)
- [ ] Component directories exist (lexicons/, server/, client/)

### Post-Migration Validation
- [ ] All target component documentation files created
- [ ] No VitePress URLs in root README.md
- [ ] No VitePress URLs in CLAUDE.md
- [ ] `docs/` directory completely deleted
- [ ] `pnpm-workspace.yaml` does not contain `'docs'`
- [ ] Root `package.json` does not contain `test:docs` script
- [ ] `pnpm install` completes without errors
- [ ] All internal links use absolute repo paths (format: `/component/FILE.md`)

### Content Integrity Validation
- [ ] No data loss (all heading structures preserved)
- [ ] No image references remain (`![alt](...)`)
- [ ] Cross-component links functional
- [ ] Markdown syntax valid in all migrated files
