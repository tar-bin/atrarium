# Data Model: Project File Organization

**Feature**: 020- | **Date**: 2025-10-11
**Purpose**: Define the structure of files, modules, and dependencies for code reorganization

---

## Overview

This refactoring does not introduce new data entities in the traditional sense (no database models). Instead, it defines the **organizational structure** of source code files, modules, and their relationships.

---

## Entity 1: SourceFile

**Purpose**: Represents a TypeScript source file in the codebase

### Attributes

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `path` | `string` | Required, unique | Absolute file path (e.g., `/workspaces/atrarium/server/src/services/atproto.ts`) |
| `lineCount` | `number` | Required, ≥ 0 | Number of lines in the file |
| `workspace` | `'server' \| 'client' \| 'shared'` | Required | pnpm workspace containing the file |
| `domain` | `string[]` | Optional | Feature domains present in the file (e.g., `['communities', 'memberships']`) |
| `exports` | `ExportedSymbol[]` | Optional | Public API exports from the file |
| `imports` | `ImportedSymbol[]` | Optional | External dependencies imported by the file |

### Relationships
- **Contains**: Multiple `ExportedSymbol` entities
- **Depends on**: Multiple `ImportedSymbol` entities via imports

### Validation Rules
- **FR-001**: Files with `lineCount > 500` AND multiple `domain` values are candidates for splitting
- **FR-002**: Files should have cohesive `domain` values (single bounded context)
- **FR-008**: All `imports` must resolve to valid `SourceFile.path` after refactoring

### State Transitions
1. **Identified**: File marked as candidate for refactoring (based on size or domain multiplicity)
2. **Split**: File content distributed to multiple new files
3. **Validated**: TypeScript compiler confirms imports resolve (`pnpm -r typecheck`)
4. **Tested**: Test suite passes (`pnpm -r test`)

---

## Entity 2: Module

**Purpose**: Represents a logical grouping of related source files (e.g., a directory or barrel export)

### Attributes

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `name` | `string` | Required, unique per workspace | Module name (e.g., `services/atproto`, `lib/hooks`) |
| `workspace` | `'server' \| 'client' \| 'shared'` | Required | pnpm workspace containing the module |
| `domain` | `string` | Required | Feature domain (e.g., `communities`, `emoji`, `moderation`) |
| `files` | `SourceFile[]` | Required, ≥ 1 | Files belonging to this module |
| `publicAPI` | `ExportedSymbol[]` | Optional | Symbols re-exported via barrel export (index.ts) |

### Relationships
- **Contains**: Multiple `SourceFile` entities
- **Exports**: Multiple `ExportedSymbol` entities via barrel export
- **Depends on**: Other `Module` entities via file imports

### Validation Rules
- **FR-002**: Module must have cohesive `domain` (all files belong to same domain)
- **FR-004**: Public API (`publicAPI`) must be accessible via barrel export (index.ts)
- **FR-007**: Client hooks module must group hooks by feature domain

### Example Instances

#### Server: `services/atproto` module
```typescript
{
  name: "services/atproto",
  workspace: "server",
  domain: "atproto-integration",
  files: [
    { path: "server/src/services/atproto/index.ts", lineCount: 50 },
    { path: "server/src/services/atproto/communities.ts", lineCount: 300 },
    { path: "server/src/services/atproto/memberships.ts", lineCount: 250 },
    { path: "server/src/services/atproto/emoji.ts", lineCount: 200 },
    { path: "server/src/services/atproto/moderation.ts", lineCount: 180 }
  ],
  publicAPI: [
    { name: "ATProtoService", type: "class" }
  ]
}
```

#### Client: `lib/hooks` module
```typescript
{
  name: "lib/hooks",
  workspace: "client",
  domain: "react-query-hooks",
  files: [
    { path: "client/src/lib/hooks/index.ts", lineCount: 30 },
    { path: "client/src/lib/hooks/useCommunities.ts", lineCount: 120 },
    { path: "client/src/lib/hooks/useMemberships.ts", lineCount: 80 },
    { path: "client/src/lib/hooks/useModeration.ts", lineCount: 60 }
  ],
  publicAPI: [
    { name: "useCommunities", type: "function" },
    { name: "useCommunity", type: "function" },
    { name: "useCreateCommunity", type: "function" }
    // ... other hooks
  ]
}
```

---

## Entity 3: SharedUtility

**Purpose**: Represents utility functions duplicated across server/client, to be consolidated in `shared/` workspace

### Attributes

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `name` | `string` | Required | Function name (e.g., `validateEmoji`, `generateHashtag`) |
| `domain` | `string` | Required | Feature domain (e.g., `emoji`, `hashtag`) |
| `serverLocation` | `string \| null` | Optional | Current server file path (if exists) |
| `clientLocation` | `string \| null` | Optional | Current client file path (if exists) |
| `targetLocation` | `string` | Required | Target path in shared workspace |
| `signature` | `string` | Required | TypeScript function signature |

### Relationships
- **Replaces**: Server `SourceFile` export (if `serverLocation` exists)
- **Replaces**: Client `SourceFile` export (if `clientLocation` exists)
- **Exported by**: Shared `Module` entity

### Validation Rules
- **FR-011**: Must have both `serverLocation` AND `clientLocation` (duplicated code) OR strong candidate for sharing
- **FR-008**: All imports of old locations must be updated to `targetLocation`
- **FR-009**: Tests importing old locations must pass after refactoring

### Example Instances

#### Emoji validation utility
```typescript
{
  name: "validateCustomEmoji",
  domain: "emoji",
  serverLocation: "server/src/utils/emoji-validator.ts",
  clientLocation: "client/src/lib/emoji.ts",
  targetLocation: "shared/utils/src/emoji.ts",
  signature: "export function validateCustomEmoji(emoji: CustomEmojiInput): ValidationResult"
}
```

#### Hashtag generation utility
```typescript
{
  name: "generateCommunityHashtag",
  domain: "hashtag",
  serverLocation: "server/src/utils/hashtag.ts",
  clientLocation: "client/src/lib/hashtag.ts",
  targetLocation: "shared/utils/src/hashtag.ts",
  signature: "export function generateCommunityHashtag(communityId: string): string"
}
```

---

## Entity 4: OrphanedFile

**Purpose**: Represents a file located outside the standard directory structure (e.g., `client/@/` when `@` is a path alias)

### Attributes

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `orphanedPath` | `string` | Required, unique | Absolute path to orphaned file (e.g., `/workspaces/atrarium/client/@/components/ui/popover.tsx`) |
| `canonicalPath` | `string \| null` | Optional | Expected canonical location (e.g., `client/src/components/ui/popover.tsx`) |
| `hasDifferences` | `boolean` | Required | Whether orphaned file differs from canonical version |
| `diffSummary` | `string \| null` | Optional | Summary of differences (if `hasDifferences = true`) |
| `action` | `'delete' \| 'merge' \| 'review'` | Required | Cleanup action to take |

### Relationships
- **Duplicates**: Canonical `SourceFile` entity (if `canonicalPath` exists)
- **Belongs to**: Incorrect directory structure

### Validation Rules
- **FR-011**: Orphaned files must be identified and cleaned up
- If `hasDifferences = true`: Requires manual diff review before deletion
- If `hasDifferences = false`: Safe to delete immediately
- After cleanup: `test ! -d client/@` must pass (directory removed)

### State Transitions
1. **Discovered**: File identified via directory structure analysis
2. **Reviewed**: Diff comparison completed (if canonical version exists)
3. **Merged**: Unique changes incorporated into canonical file (if applicable)
4. **Deleted**: Orphaned file and empty directory removed

### Example Instance

#### `client/@/components/ui/popover.tsx`
```typescript
{
  orphanedPath: "/workspaces/atrarium/client/@/components/ui/popover.tsx",
  canonicalPath: "client/src/components/ui/popover.tsx",
  hasDifferences: true,
  diffSummary: "Minor export order change (line 29) and className attribute removal (line 20)",
  action: "merge"
}
```

**Cleanup workflow**:
1. Diff comparison: `diff client/@/components/ui/popover.tsx client/src/components/ui/popover.tsx`
2. Review differences: Export order + className attribute
3. Merge changes: Update canonical file if needed (in this case, canonical version is newer)
4. Delete orphaned: `rm -rf client/@/`
5. Validate: `test ! -d client/@` && `pnpm --filter client typecheck`

---

## Entity 5: ImportDependency

**Purpose**: Represents an import relationship between source files

### Attributes

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `importer` | `string` | Required | Source file path importing the symbol |
| `importedPath` | `string` | Required | Imported module path (may be relative or absolute) |
| `symbols` | `string[]` | Required | Imported symbols (e.g., `['ATProtoService', 'validateEmoji']`) |
| `importType` | `'default' \| 'named' \| 'namespace'` | Required | Import statement type |

### Relationships
- **Source**: `SourceFile` entity (importer)
- **Target**: `SourceFile` or `Module` entity (imported path)

### Validation Rules
- **FR-004**: All `importedPath` values must resolve to valid files after refactoring
- **FR-008**: TypeScript compiler must validate all imports (`pnpm -r typecheck`)
- **Edge Case**: Circular dependencies detected via TypeScript compiler

### State Transitions
1. **Identified**: Import extracted from source file AST
2. **Updated**: `importedPath` rewritten to new location
3. **Validated**: TypeScript compiler confirms resolution

---

## Entity 6: RefactoringTask

**Purpose**: Represents a single atomic refactoring operation

### Attributes

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `id` | `string` | Required, unique | Task identifier (e.g., `T001`) |
| `type` | `'split' \| 'move' \| 'consolidate' \| 'cleanup_orphaned' \| 'update_imports'` | Required | Refactoring operation type |
| `sourceFiles` | `string[]` | Required | Input file paths |
| `targetFiles` | `string[]` | Required | Output file paths |
| `dependencies` | `string[]` | Optional | Task IDs that must complete first |
| `status` | `'pending' \| 'in_progress' \| 'completed'` | Required | Task execution status |

### Relationships
- **Operates on**: Multiple `SourceFile` entities
- **Depends on**: Other `RefactoringTask` entities (via `dependencies`)

### Validation Rules
- **FR-004**: `targetFiles` must not conflict with existing files (unless intentional replacement)
- **FR-012**: Git history loss acceptable (no `git mv` required)
- **Ordering**: Tasks with `dependencies` must execute after dependency tasks

### Example Instances

#### Split atproto.ts
```typescript
{
  id: "T001",
  type: "split",
  sourceFiles: ["server/src/services/atproto.ts"],
  targetFiles: [
    "server/src/services/atproto/index.ts",
    "server/src/services/atproto/communities.ts",
    "server/src/services/atproto/memberships.ts",
    "server/src/services/atproto/emoji.ts",
    "server/src/services/atproto/moderation.ts"
  ],
  dependencies: [],
  status: "pending"
}
```

#### Consolidate emoji utilities
```typescript
{
  id: "T005",
  type: "consolidate",
  sourceFiles: [
    "server/src/utils/emoji-validator.ts",
    "client/src/lib/emoji.ts"
  ],
  targetFiles: ["shared/utils/src/emoji.ts"],
  dependencies: [],
  status: "pending"
}
```

#### Update imports after split
```typescript
{
  id: "T002",
  type: "update_imports",
  sourceFiles: ["server/src/routes/communities.ts", "server/src/routes/memberships.ts"],
  targetFiles: ["server/src/routes/communities.ts", "server/src/routes/memberships.ts"],
  dependencies: ["T001"],  // Must run after split
  status: "pending"
}
```

#### Cleanup orphaned files
```typescript
{
  id: "T003",
  type: "cleanup_orphaned",
  sourceFiles: ["client/@/components/ui/popover.tsx"],
  targetFiles: [],  // File will be deleted
  dependencies: [],
  status: "pending"
}
```

---

## Relationships Diagram

```
┌─────────────┐
│ SourceFile  │
│  (Large)    │──────┐
└─────────────┘      │ Split
                     ▼
┌─────────────────────────────────────┐
│ Module (services/atproto)           │
│  ├─ index.ts (barrel export)        │
│  ├─ communities.ts                  │
│  ├─ memberships.ts                  │
│  └─ emoji.ts                        │
└─────────────────────────────────────┘
        │
        │ Exports
        ▼
┌─────────────────┐
│ ExportedSymbol  │
│ (Public API)    │
└─────────────────┘
        ▲
        │ Imports
        │
┌─────────────────┐
│ ImportDependency│
│ (Routes, Tests) │
└─────────────────┘

┌──────────────────┐       ┌──────────────────┐
│ SharedUtility    │       │ RefactoringTask  │
│ (Duplicate code) │       │ (Operations)     │
└──────────────────┘       └──────────────────┘
        │                           │
        │ Consolidates              │ Executes
        ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ shared/utils/   │         │ New Structure   │
│ emoji.ts        │         │ (Validated)     │
└─────────────────┘         └─────────────────┘
```

---

## Validation Summary

All entities must satisfy:
1. **TypeScript compilation**: `pnpm -r typecheck` passes (FR-008)
2. **Test suite**: `pnpm -r test` passes (FR-009)
3. **Biome linting**: `pnpm lint` passes (Principle 7)
4. **Biome formatting**: `pnpm format:check` passes (Principle 7)
5. **Documentation**: README files updated (FR-010)

---

## Notes

- **No runtime data**: This refactoring only changes source code organization, not runtime behavior
- **No database changes**: No AT Protocol Lexicon schemas, PDS records, or Durable Object Storage affected (Principle 8 N/A)
- **Git history**: Acceptable to lose file history per clarification (FR-012)
- **Breaking changes**: Acceptable for internal code per clarification (FR-003)
