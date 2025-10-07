# Documentation Consolidation Strategy

**Feature**: 012-vitepress-lexicons-server
**Date**: 2025-10-07
**Purpose**: Identify redundant/overlapping documentation and define consolidation approach

## Documentation Inventory Analysis

### File Size and Content Overview

| File | Lines | Status | Action |
|------|-------|--------|--------|
| `reference/moderation-reasons.md` | 742 | Current, feature-specific | Keep as `server/MODERATION_REASONS.md` |
| `reference/development-spec.md` | 637 | **OUTDATED** (Phase 0 Week 1-16) | **DELETE** |
| `reference/implementation.md` | 481 | **OUTDATED** (2025-10-02 roadmap) | **DELETE** |
| `reference/api-reference.md` | 329 | Current, endpoint reference | Merge into `server/API.md` |
| `architecture/system-design.md` | 316 | Current, architecture overview | Merge into `server/ARCHITECTURE.md` |
| `architecture/database.md` | 315 | Current, database schema | Merge into `server/ARCHITECTURE.md` |
| `guide/concept.md` | 213 | Current, project concept | Keep as `CONCEPT.md` (root) |
| `guide/quickstart.md` | 205 | Current, getting started | Keep as `QUICKSTART.md` (root) |
| `guide/setup.md` | 175 | Current, dev environment | Keep as `SETUP.md` (root) |
| `architecture/api.md` | 168 | Current, API design principles | Merge into `server/API.md` |
| `CONTRIBUTING.md` | 155 | Current, contribution guide | Keep as `CONTRIBUTING.md` (root) |
| `DEPLOYMENT.md` | 78 | Current, deployment guide | Keep as `server/DEPLOYMENT.md` |

**Total**: 3,814 lines → **Target**: ~2,200 lines (42% reduction via deletion + consolidation)

---

## Consolidation Opportunities

### 1. DELETE Outdated Implementation Documentation (1,118 lines deleted)

**Files to Delete**:
- `reference/development-spec.md` (637 lines)
- `reference/implementation.md` (481 lines)

**Rationale**:
- **development-spec.md** contains Phase 0 implementation timeline (Week 1-16), outdated tech stack references
  - Content: "Phase 0 (Week 1-16): Basic Custom Feed implementation"
  - References old architecture: "Database: Cloudflare D1 (SQLite)" (now Durable Objects Storage)
  - Overlaps with CLAUDE.md "Implementation Status" section
- **implementation.md** contains implementation roadmap from 2025-10-02, superseded by CLAUDE.md
  - Content: "Phase 0: MVP Implementation (Week 1-16)"
  - Overlaps 100% with development-spec.md and CLAUDE.md

**Replacement**: CLAUDE.md "Implementation Status" section provides current status (not historical roadmap)

---

### 2. Consolidate Architecture Documentation (631 lines → ~400 lines)

**Source Files**:
- `architecture/system-design.md` (316 lines) - Architecture overview, component diagrams
- `architecture/database.md` (315 lines) - Database schema, Durable Objects Storage details

**Target File**: `server/ARCHITECTURE.md` (~400 lines after consolidation)

**Consolidation Strategy**:
1. **Section 1: Architecture Overview** (from system-design.md)
   - Tech stack summary
   - Component architecture diagram
   - Data flow diagram

2. **Section 2: Storage Architecture** (from database.md)
   - Durable Objects Storage schema
   - Key naming conventions
   - State transitions

3. **Section 3: Feed Generator Architecture** (merge both)
   - CommunityFeedGenerator Durable Object design
   - Firehose ingestion pipeline
   - Queue-based processing

**Duplicate Content to Remove**:
- Both files have "Architecture Diagram" sections (keep system-design.md version)
- Both files explain Durable Objects concept (keep database.md technical version)
- Both files describe PDS-first architecture (consolidate into Section 1)

**Estimated Reduction**: 631 lines → 400 lines (36% reduction)

---

### 3. Consolidate API Documentation (497 lines → ~350 lines)

**Source Files**:
- `architecture/api.md` (168 lines) - API design principles, patterns
- `reference/api-reference.md` (329 lines) - Endpoint reference (routes, parameters, responses)

**Target File**: `server/API.md` (~350 lines after consolidation)

**Consolidation Strategy**:
1. **Section 1: API Design Principles** (from api.md)
   - RESTful conventions
   - Error handling patterns
   - Authentication flow

2. **Section 2: Endpoint Reference** (from api-reference.md)
   - Feed Generator API (`GET /xrpc/app.bsky.feed.getFeedSkeleton`)
   - Dashboard API (communities, memberships, moderation)
   - Request/response examples

3. **Section 3: Integration Examples** (merge both)
   - Client integration code
   - Error handling examples

**Duplicate Content to Remove**:
- Both files explain authentication (keep api.md principles + api-reference.md implementation)
- Both files describe error responses (consolidate into Section 1)

**Estimated Reduction**: 497 lines → 350 lines (30% reduction)

---

## Final File Mapping

### Server Documentation (server/)
| Target File | Source Files | Lines | Status |
|-------------|--------------|-------|--------|
| `ARCHITECTURE.md` | system-design.md + database.md | ~400 | Consolidated |
| `API.md` | api.md + api-reference.md | ~350 | Consolidated |
| `MODERATION_REASONS.md` | moderation-reasons.md | 742 | Keep as-is |
| `DEPLOYMENT.md` | DEPLOYMENT.md | 78 | Keep as-is |

**Subtotal**: 1,570 lines (server documentation)

### Root Documentation
| Target File | Source Files | Lines | Status |
|-------------|--------------|-------|--------|
| `CONCEPT.md` | concept.md | 213 | Keep as-is |
| `QUICKSTART.md` | quickstart.md | 205 | Keep as-is |
| `SETUP.md` | setup.md | 175 | Keep as-is |
| `CONTRIBUTING.md` | CONTRIBUTING.md | 155 | Keep as-is |

**Subtotal**: 748 lines (root documentation)

### Deleted Files
- `development-spec.md` (637 lines) - Outdated
- `implementation.md` (481 lines) - Outdated

**Total Deleted**: 1,118 lines

---

## Consolidation Process

### Step 1: Analyze Content Overlap
For each consolidation target:
1. Read both source files completely
2. Identify duplicate sections (same headings, same content)
3. Identify complementary sections (different aspects of same topic)
4. Identify outdated sections (references to old architecture)

### Step 2: Create Consolidated Outline
1. Define section hierarchy for target file
2. Map source sections to target sections
3. Mark duplicates for removal
4. Mark sections needing rewrite

### Step 3: Execute Consolidation
1. Create target file with new structure
2. Copy/paste sections from sources (preserving attribution if needed)
3. Rewrite duplicate sections (keep best version)
4. Update cross-references to use new file paths

### Step 4: Verify Content Integrity
1. Check all headings are preserved
2. Check all code examples are included
3. Check no essential information lost
4. Check markdown syntax valid

---

## Implementation in Migration Script

### Content Transformation Functions

**transformDocumentationContent()** (from contracts/migration-api.md):
- Add new parameter: `consolidate: boolean`
- Add new parameter: `mergeSource?: string` (path to file to merge with)

**New Function**: `consolidateDocumentation()`
```typescript
interface ConsolidationRule {
  sources: string[];        // Files to merge
  destination: string;      // Target file path
  strategy: 'merge' | 'delete';
}

const CONSOLIDATION_RULES: ConsolidationRule[] = [
  {
    sources: ['docs/architecture/system-design.md', 'docs/architecture/database.md'],
    destination: 'server/ARCHITECTURE.md',
    strategy: 'merge'
  },
  {
    sources: ['docs/architecture/api.md', 'docs/reference/api-reference.md'],
    destination: 'server/API.md',
    strategy: 'merge'
  },
  {
    sources: ['docs/reference/development-spec.md', 'docs/reference/implementation.md'],
    destination: null,
    strategy: 'delete'
  }
];
```

### Consolidation Algorithm

```typescript
async function consolidateDocumentation(rule: ConsolidationRule): Promise<void> {
  if (rule.strategy === 'delete') {
    // Skip copying, mark for deletion
    console.log(`[INFO] Skipping outdated files: ${rule.sources.join(', ')}`);
    return;
  }

  if (rule.strategy === 'merge') {
    // Read all source files
    const contents = await Promise.all(
      rule.sources.map(src => fs.readFile(src, 'utf-8'))
    );

    // Extract sections from each file
    const sections = contents.map(content => extractSections(content));

    // Merge sections according to outline
    const merged = mergeSections(sections, rule.destination);

    // Write consolidated file
    await fs.writeFile(rule.destination, merged, 'utf-8');
    console.log(`[INFO] Consolidated ${rule.sources.length} files → ${rule.destination}`);
  }
}
```

---

## Verification Checklist

### Content Completeness
- [ ] All architecture diagrams preserved
- [ ] All API endpoint documentation preserved
- [ ] All code examples preserved
- [ ] All moderation reasons preserved

### No Information Loss
- [ ] Cross-reference all headings from source files
- [ ] Verify no orphaned sections
- [ ] Verify all links updated to new structure

### Quality Checks
- [ ] No duplicate content in consolidated files
- [ ] Consistent heading hierarchy (H1 → H2 → H3)
- [ ] No broken internal links
- [ ] Markdown syntax valid

---

## Risk Mitigation

### Risk 1: Loss of Historical Context
**Mitigation**: Archive outdated files in `.specify/archives/012-vitepress/` before deletion

### Risk 2: Over-Aggressive Consolidation
**Mitigation**: Preserve section headings from both sources, even if content is similar

### Risk 3: Inconsistent Terminology
**Mitigation**: Use terminology from CLAUDE.md as canonical (e.g., "Durable Objects Storage" not "D1 database")

---

## Success Metrics

- **Documentation Size**: 3,814 lines → 2,318 lines (39% reduction)
- **Outdated Content**: 1,118 lines deleted (29% of original)
- **Consolidated Files**: 4 files merged into 2 files
- **Maintained Files**: 8 files preserved as-is

**Result**: Leaner, more maintainable documentation structure aligned with current architecture.
