# Research: Reorganize Implementation into Lexicons, Server, and Client

**Feature**: 011-lexicons-server-client
**Date**: 2025-10-06
**Status**: Complete

## Research Questions

### 1. Client Scope

**Question**: Does "client" include dashboard only, or docs as well?

**Research**:
- Analyzed current structure: `dashboard/` and `docs/` are separate directories at root
- Dashboard is React web UI for community management (TanStack Router, shadcn/ui)
- Docs is VitePress documentation site (EN/JA, deployed to Cloudflare Pages)
- Both are frontend artifacts consumed by end users
- Neither contains backend logic or server-side code

**Decision**: Include both dashboard and docs under `client/`

**Rationale**:
- Both are frontend artifacts consumed by end users
- Dashboard: Developers using the web UI
- Docs: Users reading documentation
- Grouping them maintains protocol/backend/frontend distinction
- Aligns with web application pattern (backend/ + frontend/)

**Alternatives Considered**:
1. Keep docs at root (rejected: breaks clean separation, docs are still "client" facing)
2. Move docs to server (rejected: docs are consumer-facing, not implementation)
3. Create separate `docs/` at root (rejected: ambiguous, doesn't clarify role)

**References**:
- VitePress docs: https://vitepress.dev/
- Monorepo best practices: Keep related artifacts together

---

### 2. Shared Code Location

**Question**: Where should types/utilities used by both server and client reside?

**Research**:
- Current structure: `src/types.ts` contains shared types
- Some types are used by both server (Workers) and client (Dashboard)
- AT Protocol Lexicon schemas in `lexicons/` define the protocol contract
- TypeScript types can be generated from Lexicon schemas (see `src/schemas/generated/`)

**Decision**: Each implementation maintains its own types. Lexicon schemas are the shared contract.

**Rationale**:
- **Aligns with Principle 1 (Protocol-First Architecture)**: Lexicons define the API contract, implementations are independent
- **Reduces coupling**: Server and client don't share code, only protocol definitions
- **Enables independent evolution**: Server and client can be developed/deployed independently
- **Small duplication acceptable**: Type definitions are small, duplication is manageable

**Alternatives Considered**:
1. Create `/shared/` or `/common/` directory (rejected: violates Principle 2 simplicity, adds another layer)
2. Create `@atrarium/types` npm package (rejected: overkill for current scale, adds complexity)
3. Generate types from Lexicons in both places (accepted: aligns with protocol-first design)

**Implementation Note**:
- Server will reference lexicon schemas from `../lexicons/`
- Client will reference lexicon schemas from `../../lexicons/`
- Both can generate TypeScript types from Lexicons if needed (see `npm run codegen` in CLAUDE.md)

**References**:
- AT Protocol Lexicon docs: https://atproto.com/specs/lexicon
- Monorepo shared code patterns: Prefer protocol definitions over shared implementation

---

### 3. Configuration File Organization

**Question**: Should wrangler.toml, package.json remain at root or move with server?

**Research**:
- `wrangler.toml`: Cloudflare Workers configuration (server-specific)
- Root `package.json`: Coordinates dependencies and scripts
- `vitest.config.ts`: Server test configuration
- `vitest.docs.config.ts`: Docs test configuration (client-specific)
- Dashboard and docs already have their own `package.json`

**Decision**: Move `wrangler.toml` to `server/`, keep root `package.json` as workspace coordinator

**Rationale**:
- **wrangler.toml is server-specific**: Only used for Cloudflare Workers deployment
- **Root package.json coordinates monorepo**: Standard npm workspaces pattern
- **Each workspace has own package.json**: server/, client/dashboard/, client/docs/
- **Clear ownership**: Each directory owns its configuration

**Workspace Structure**:
```json
// Root package.json
{
  "workspaces": [
    "server",
    "client/dashboard",
    "client/docs"
  ],
  "scripts": {
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces"
  }
}
```

**Alternatives Considered**:
1. Keep all configs at root (rejected: mixes concerns, unclear ownership)
2. No workspaces, separate repos (rejected: violates Principle 2, too complex)
3. Lerna/Turborepo (rejected: adds dependencies, Principle 2)

**References**:
- npm workspaces docs: https://docs.npmjs.com/cli/v7/using-npm/workspaces
- Cloudflare Workers monorepo guide: https://developers.cloudflare.com/workers/

---

### 4. Migration Strategy

**Question**: Should this be gradual or all-at-once?

**Research**:
- Gradual migration: Move files incrementally, maintain dual structure during transition
- All-at-once migration: Move all files in single commit, update all references atomically
- Git history preservation: `git mv` preserves blame history
- Test suite: 40+ tests validate functionality (contract, integration, unit, docs)

**Decision**: All-at-once migration using `git mv` for history preservation

**Rationale**:
- **Atomic change**: Single commit is easier to review, test, and rollback
- **No ambiguous intermediate states**: Clear before/after structure
- **Preserves git history**: `git mv` maintains blame history for code archaeology
- **Test validation**: Full test suite runs after migration to verify functionality preserved

**Migration Steps**:
1. Create `server/` and `client/` directories
2. Move all files using `git mv` (preserves history)
3. Update configurations (tsconfig.json, package.json, wrangler.toml)
4. Update imports (find/replace or TypeScript compiler API)
5. Run full test suite to verify (contract + integration + unit + docs)
6. Single commit with descriptive message

**Alternatives Considered**:
1. Feature-by-feature migration (rejected: too complex, breaks tests intermittently)
2. Copy + delete (rejected: loses git history)
3. Branch per directory (rejected: merge conflicts, coordination overhead)

**Risk Mitigation**:
- Pre-migration validation: `npm test` passes, `git status` clean
- Post-migration validation: Full test suite must pass
- Rollback plan: `git revert` single commit if issues

**References**:
- Git mv documentation: https://git-scm.com/docs/git-mv
- Large-scale refactoring best practices: Atomic changes over gradual

---

### 5. Build System Changes

**Question**: How should build processes be updated?

**Research**:
- Current build: Single `package.json` at root with build scripts
- Server: `wrangler deploy` (Cloudflare Workers)
- Dashboard: `vite build` (React SPA)
- Docs: `vitepress build` (static site)
- No complex build orchestration currently needed

**Decision**: Monorepo workspaces with npm workspaces. Root `package.json` coordinates builds.

**Rationale**:
- **Principle 2 (Simplicity)**: Use built-in npm workspaces before adding dependencies
- **Standard Node.js pattern**: Widely understood, well-documented
- **Minimal tooling changes**: No new tools required (npm >= 7 has workspaces)
- **Independent builds**: Each workspace can build independently
- **Coordinated commands**: Root can run all workspace commands (--workspaces flag)

**Build Script Structure**:
```json
// Root package.json
{
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "dev": "npm run dev --workspace=server",
    "dev:dashboard": "npm run dev --workspace=client/dashboard",
    "dev:docs": "npm run dev --workspace=client/docs"
  }
}

// server/package.json
{
  "scripts": {
    "build": "wrangler deploy --dry-run",
    "dev": "wrangler dev",
    "test": "vitest run"
  }
}

// client/dashboard/package.json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "test": "vitest run && playwright test"
  }
}

// client/docs/package.json
{
  "scripts": {
    "build": "vitepress build",
    "dev": "vitepress dev",
    "test": "vitest run"
  }
}
```

**TypeScript Configuration**:
- Root `tsconfig.json`: Project references to server, client/dashboard
- Each workspace has own `tsconfig.json` extending root
- Paths updated for new structure

**Alternatives Considered**:
1. **Lerna** (rejected: overkill, adds dependency, violates Principle 2)
2. **Turborepo** (rejected: adds complexity, caching not critical at current scale)
3. **Make/Makefile** (rejected: not Node.js idiomatic, harder for JS developers)
4. **pnpm workspaces** (considered: slightly faster, but requires pnpm installation)
5. **Yarn workspaces** (considered: no significant advantage over npm)

**CI/CD Impact**:
- GitHub Actions: Update workflow to use `npm install` (installs all workspaces)
- Deployment: Each workspace deploys independently (Cloudflare Workers, Pages)
- No changes to deployment targets (Workers for server, Pages for dashboard/docs)

**References**:
- npm workspaces: https://docs.npmjs.com/cli/v7/using-npm/workspaces
- TypeScript project references: https://www.typescriptlang.org/docs/handbook/project-references.html
- Monorepo tooling comparison: https://monorepo.tools/

---

## Technology Decisions

### Monorepo Tooling

**Decision**: npm workspaces (built-in, zero new dependencies)

**Rationale**:
- **Principle 2 (Simplicity)**: Use built-in tools before adding dependencies
- **npm >= 7 has workspaces**: Already available in project
- **Zero configuration overhead**: Works out of the box
- **Standard Node.js ecosystem**: Widely used, well-documented

**Trade-offs**:
- Slower than pnpm (acceptable: build time not critical)
- No built-in caching like Turborepo (acceptable: caching not needed at current scale)

---

### Import Path Strategy

**Decision**: Update all imports atomically using find/replace with validation

**Rationale**:
- **Automated updates reduce human error**: Find/replace is faster than manual
- **Validation via TypeScript**: `npm run typecheck` catches broken imports
- **Validation via tests**: Full test suite catches runtime issues

**Implementation**:
```bash
# Example: Update server imports
find server/src -name "*.ts" -exec sed -i 's|from "../|from "../../|g' {} +
find server/tests -name "*.ts" -exec sed -i 's|from "../src/|from "../../src/|g' {} +

# Validate
npm run typecheck    # TypeScript validation
npm test             # Runtime validation
```

**Alternatives Considered**:
1. TypeScript compiler API (considered: more robust, but overkill for simple path updates)
2. ESLint plugin (rejected: adds complexity)
3. Manual update (rejected: error-prone, time-consuming)

---

### Git History Preservation

**Decision**: Use `git mv` for all file moves

**Rationale**:
- **Preserves blame history**: Code archaeology remains possible
- **Git detects renames**: `git log --follow` works correctly
- **Standard practice**: Recommended for large refactorings

**Implementation**:
```bash
git mv src/ server/src/
git mv tests/ server/tests/
# ... etc
```

**Verification**:
```bash
# Verify git detected rename
git status
# Should show "renamed: src/index.ts -> server/src/index.ts"

# Verify blame history preserved
git log --follow server/src/index.ts
```

---

### Testing Strategy

**Decision**: Update test configs to new paths, run full test suite to verify

**Rationale**:
- **Existing tests validate functionality**: 40+ tests (contract, integration, unit, docs)
- **FR-004 requirement**: Must maintain all existing functionality
- **Acceptance criteria**: All tests must pass after reorganization

**Test Updates Required**:
1. Update `vitest.config.ts` paths (server)
2. Update `vitest.docs.config.ts` paths (client/docs)
3. Update import statements in tests
4. Update test helper paths
5. Run full suite: `npm test`

**Success Criteria**:
- All contract tests pass (API functionality preserved)
- All integration tests pass (end-to-end flows preserved)
- All unit tests pass (logic preserved)
- All docs tests pass (documentation valid)

---

## Summary

All research questions have been resolved with clear decisions:

1. ✅ **Client scope**: Both dashboard and docs under `client/`
2. ✅ **Shared code**: Each implementation maintains own types, Lexicons are shared contract
3. ✅ **Configuration**: Move `wrangler.toml` to `server/`, root coordinates workspaces
4. ✅ **Migration**: All-at-once using `git mv`, atomic commit
5. ✅ **Build system**: npm workspaces, coordinated via root `package.json`

**Constitutional Compliance**:
- ✅ Principle 1: Protocol-first architecture **strengthened** (lexicons/ explicit)
- ✅ Principle 2: Simplicity maintained (no new projects/databases/services)
- ✅ Principle 3-6: All preserved (no infrastructure/data flow changes)

**Ready for Phase 1**: Design & Contracts
