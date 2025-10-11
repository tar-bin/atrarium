# Research: Project File Organization

**Feature**: 020- | **Date**: 2025-10-11
**Purpose**: Research best practices for TypeScript/React monorepo file organization and domain-driven design splitting strategies

---

## Research Questions

Based on Technical Context analysis, all technical details are clarified (no NEEDS CLARIFICATION markers). This research focuses on best practices and patterns.

---

## R1: TypeScript Monorepo File Organization Patterns

**Question**: What are the best practices for organizing TypeScript code in a pnpm workspace monorepo with server/client/shared structure?

**Decision**: Feature-based organization with barrel exports

**Rationale**:
- **Feature cohesion**: Group related functionality (e.g., all emoji-related code together) improves discoverability and maintainability
- **Barrel exports (index.ts)**: Re-export modules to provide clean import paths (`import { foo } from './services/atproto'` instead of `./services/atproto/communities`)
- **Shared utilities**: Common code in `shared/` workspace prevents duplication and ensures consistent behavior
- **Breaking changes acceptable**: Per clarification, no backward compatibility required for internal code

**Alternatives considered**:
- **Flat structure**: All files in single directory - rejected due to poor scalability (already 1606-line files)
- **Technical organization**: Group by layer (controllers/, models/, views/) - rejected as it separates related business logic
- **Barrel exports with compatibility layer**: Keep old paths working - rejected per clarification (breaking changes allowed)

**References**:
- pnpm workspaces best practices: https://pnpm.io/workspaces
- TypeScript project references: https://www.typescriptlang.org/docs/handbook/project-references.html

---

## R2: Domain-Driven Design (DDD) File Splitting Strategy

**Question**: How should large files (>500 lines) be split according to domain-driven design principles?

**Decision**: Split by bounded context (domain boundaries), not by line count

**Rationale**:
- **Bounded contexts**: Each domain (Communities, Memberships, Emoji, Moderation) has clear boundaries and responsibilities
- **Single Responsibility Principle**: Each module focuses on one domain concept
- **500-line guideline**: Used as trigger for review, not strict rule - per clarification, DDD boundaries take precedence
- **Example**: `atproto.ts` (1606 lines) contains methods for communities, memberships, emoji, and moderation - split into separate files

**Alternatives considered**:
- **Strict line count splitting**: Split at exactly 500 lines regardless of domain boundaries - rejected as it would break cohesion
- **No splitting**: Keep large files intact - rejected due to poor maintainability and navigation difficulty
- **Class-based splitting**: One class per file - rejected as current codebase uses service classes with multiple related methods

**Domain boundaries identified**:
1. **Communities**: Creation, configuration, hierarchy, stage transitions
2. **Memberships**: Join requests, role management, member lists
3. **Emoji**: Custom emoji upload, approval, validation
4. **Moderation**: Actions, reporting, moderation history
5. **Reactions**: Reaction aggregation, addition, removal (Note: Already well-organized in current codebase)

**References**:
- Domain-Driven Design principles: https://martinfowler.com/bliki/DomainDrivenDesign.html
- Bounded Context pattern: https://martinfowler.com/bliki/BoundedContext.html

---

## R3: React Hooks Organization Patterns

**Question**: What are the best practices for organizing custom React hooks in a large application?

**Decision**: Feature-based hooks with barrel exports and query key namespacing

**Rationale**:
- **Feature-based organization**: Group hooks by feature domain (communities, memberships, moderation) improves discoverability
- **Barrel export pattern**: `hooks/index.ts` re-exports all hooks for clean imports
- **TanStack Query integration**: Existing hooks use `@tanstack/react-query` - maintain consistency
- **Query key namespacing**: Use feature-based query keys (e.g., `['communities']`, `['members', communityId]`)

**Alternatives considered**:
- **Single hooks file**: Keep all hooks in `hooks.ts` - rejected due to current size (433 lines) and poor discoverability
- **Technical organization**: Separate by hook type (useQuery/, useMutation/) - rejected as it separates related business logic
- **Co-location with components**: Place hooks next to components - rejected as hooks are reused across multiple components

**Hook organization pattern**:
```typescript
// hooks/useCommunities.ts
export function useCommunities() { ... }
export function useCommunity(id: string) { ... }
export function useCreateCommunity() { ... }

// hooks/index.ts (barrel export)
export * from './useCommunities';
export * from './useMemberships';
export * from './useModeration';
```

**References**:
- React Hooks best practices: https://react.dev/learn/reusing-logic-with-custom-hooks
- TanStack Query patterns: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys

---

## R4: Import Path Management During Refactoring

**Question**: How should import paths be updated during file reorganization to minimize errors?

**Decision**: Automated import path updates using TypeScript Language Service + manual verification

**Rationale**:
- **TypeScript LSP**: VS Code's "Update imports" refactoring automatically fixes most import paths
- **Compiler validation**: `pnpm -r typecheck` validates all import paths after refactoring
- **Manual verification**: Critical imports (e.g., external package imports) require manual review
- **Breaking changes acceptable**: Per clarification, no need to maintain old import paths

**Alternatives considered**:
- **Barrel exports for compatibility**: Maintain old paths via re-exports - rejected per clarification (breaking changes allowed)
- **Manual find-replace**: Use search-replace for import paths - rejected due to error-proneness
- **codemod/jscodeshift**: Automated migration scripts - rejected as overkill for one-time refactoring

**Workflow**:
1. Create new file structure
2. Move code to new locations
3. Use VS Code "Update imports" refactoring
4. Run `pnpm -r typecheck` to catch missed imports
5. Fix remaining errors manually
6. Run `pnpm -r test` to validate behavior

**References**:
- VS Code refactoring: https://code.visualstudio.com/docs/typescript/typescript-refactoring
- TypeScript compiler API: https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API

---

## R5: Shared Utilities Extraction Pattern

**Question**: How should duplicate utility functions be identified and extracted to a shared workspace?

**Decision**: Create `shared/utils/` workspace with feature-specific utility modules

**Rationale**:
- **Code deduplication**: Eliminates maintenance burden of keeping server/client utilities in sync
- **Single source of truth**: One implementation ensures consistent behavior
- **TypeScript project references**: pnpm workspace references enable type-safe cross-workspace imports
- **Feature-based modules**: Organize utilities by domain (emoji.ts, hashtag.ts) rather than technical type

**Alternatives considered**:
- **Keep duplicates**: Maintain separate server/client utilities - rejected due to maintenance burden and risk of divergence
- **Server as source**: Reference server utilities from client - rejected due to circular dependency risk and deployment separation
- **Monolithic utils file**: Single `shared/utils/index.ts` - rejected due to poor scalability

**Duplicate utilities identified**:
1. **Emoji validation**: `emoji-validator.ts` (server), emoji utilities (client) - consolidate to `shared/utils/emoji.ts`
2. **Hashtag validation**: `hashtag.ts` (server), `hashtag.ts` (client) - consolidate to `shared/utils/hashtag.ts`
3. **DID validation**: `did.ts` (server) - potential future consolidation (client may need it)

**Workspace configuration**:
```json
// shared/utils/package.json
{
  "name": "@atrarium/utils",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./emoji": "./src/emoji.ts",
    "./hashtag": "./src/hashtag.ts",
    "./validation": "./src/validation.ts"
  }
}
```

**References**:
- pnpm workspace protocol: https://pnpm.io/workspaces#workspace-protocol-workspace
- TypeScript project references: https://www.typescriptlang.org/docs/handbook/project-references.html

---

## R6: Test File Organization During Refactoring

**Question**: How should test files be organized when source files are reorganized?

**Decision**: Mirror source file structure in test directories

**Rationale**:
- **Discoverability**: Tests next to source (in mirror structure) are easy to find
- **Maintainability**: When source files move, tests move to matching location
- **Existing pattern**: Current codebase already uses this pattern (tests/contract/, tests/integration/, tests/unit/)
- **No test changes required**: Tests import from public APIs (services/atproto), not internal modules - refactoring doesn't break tests

**Alternatives considered**:
- **Co-location**: Place tests next to source files - rejected as current codebase uses separate tests/ directory
- **Flat test structure**: All tests in single directory - rejected due to poor scalability
- **No reorganization**: Keep test structure unchanged - acceptable as tests import from public APIs

**Pattern**:
```
server/src/services/atproto/communities.ts
server/tests/unit/services/atproto/communities.test.ts
```

**References**:
- Vitest organization: https://vitest.dev/guide/test-context.html
- Testing Library best practices: https://testing-library.com/docs/react-testing-library/example-intro

---

## R7: Orphaned Files and Incorrect Directory Placement

**Question**: How should orphaned or misplaced files (e.g., `client/@/components/`) be identified and cleaned up?

**Decision**: Identify orphaned files via directory structure analysis, delete or move to correct locations

**Rationale**:
- **Path alias confusion**: Vite configures `@` to resolve to `./src`, but physical `@/` directory exists at wrong location
- **Duplicate files**: `client/@/components/ui/popover.tsx` duplicates `client/src/components/ui/popover.tsx` (with minor differences)
- **Build confusion**: Physical `@/` directory can cause confusion between path alias and actual directory
- **Maintenance burden**: Orphaned files may contain outdated code that diverges from canonical version

**Alternatives considered**:
- **Keep both files**: Maintain duplicate - rejected due to maintenance burden and confusion
- **Merge differences**: Consolidate changes from both files - requires manual diff review
- **Delete without review**: Remove orphaned file immediately - rejected as potentially unsafe (may have unique changes)

**Orphaned files identified**:
1. **`client/@/components/ui/popover.tsx`**: Misplaced UI component (canonical version: `client/src/components/ui/popover.tsx`)
   - Difference: Minor export order and className attribute changes
   - Action: Review diff, merge any unique changes to canonical file, delete orphaned file

**Cleanup workflow**:
1. Find all files under physical `@/` directory: `find client/@ -type f`
2. For each file, locate canonical version in `client/src/`
3. Diff files: `diff client/@/path client/src/path`
4. If identical: Delete orphaned file
5. If different: Review diff, merge unique changes to canonical file, then delete orphaned
6. Remove empty `client/@/` directory tree
7. Verify no imports reference physical `@/` path (all should use path alias)

**Validation**:
```bash
# Verify no physical @ directory remains
test ! -d client/@

# Verify @ alias still works
grep -r "from '@/" client/src | head -5  # Should find imports

# Verify TypeScript compilation
pnpm --filter client typecheck
```

**References**:
- Vite path aliases: https://vitejs.dev/config/shared-options.html#resolve-alias
- TypeScript path mapping: https://www.typescriptlang.org/tsconfig#paths

---

## Summary

All research questions resolved. Key decisions:
1. **Feature-based organization** with barrel exports (domain-driven design)
2. **DDD boundaries over line counts** (split by bounded context)
3. **Feature-based React hooks** with TanStack Query patterns
4. **TypeScript LSP + compiler validation** for import path updates
5. **Shared utilities workspace** for code deduplication
6. **Mirror test structure** to match source organization
7. **Orphaned file cleanup** via diff review and deletion (client/@/ directory)

**Orphaned files discovered**: 1 file (`client/@/components/ui/popover.tsx`) - requires diff review before deletion

No technical blockers identified. Ready for Phase 1 (Design & Contracts).
