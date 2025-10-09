<!--
SYNC IMPACT REPORT (2025-10-09)
Version: 1.4.0 → 1.5.0 (MINOR - Principle 10 added)
Rationale: MINOR - Added new Principle 10 (Complete Implementation Over MVP Excuses) to prevent incomplete implementations from being accepted as "MVP". This establishes clear expectations for implementation completeness and prevents scope creep through deferred work.
Modified Principles: None (existing principles unchanged)
Added Sections: Principle 10 (Complete Implementation Over MVP Excuses)
Removed Sections: None
Templates Requiring Updates:
  - ✅ Constitution updated with Principle 10
  - ⚠ .specify/templates/plan-template.md (Constitution Check section needs Principle 10 validation)
  - ⚠ .specify/templates/tasks-template.md (Task completion criteria should reference Principle 10)
  - ⚠ CLAUDE.md and other agent-specific docs (Implementation Status sections should reflect Principle 10)
Follow-up TODOs:
  - Update plan-template.md Constitution Check with Principle 10 validation
  - Update tasks-template.md with explicit completion criteria
  - Review existing features marked as "MVP" for compliance with Principle 10
  - Update PR templates to include "Implementation Completeness" checklist item
Previous Version Reports:
  - 1.3.0 → 1.4.0 (2025-01-15): Principle 7 amended (relaxed test code type checking)
  - 1.2.0 → 1.3.0 (2025-10-08): Added Principle 9 (Git Workflow and Commit Integrity)
-->

# Atrarium Project Constitution

**Version**: 1.5.0
**Ratification Date**: 2025-10-06
**Last Amended**: 2025-10-09
**Project**: Atrarium - Small ecosystems on AT Protocol

---

## Preamble

This constitution establishes the non-negotiable architectural and operational principles governing the Atrarium project. These principles ensure alignment with the project's core mission: enabling sustainable, small-scale communities (10-200 people) on AT Protocol through serverless infrastructure, while preserving decentralization, protocol-first design, and economic efficiency.

All features, implementations, and technical decisions MUST comply with these principles. Violations require explicit constitutional amendment via the governance process outlined herein.

---

## Principle 1: Protocol-First Architecture

**Name**: Protocol-First Architecture

**Rules**:
- AT Protocol Lexicon schemas (\`net.atrarium.*\`) MUST define all community data structures
- Lexicon schemas are the single source of truth and API contract
- All implementations (client/server) are reference implementations and MUST be replaceable
- No proprietary data formats or vendor-specific APIs MAY be introduced
- Infrastructure choices (Cloudflare Workers, etc.) MUST NOT create lock-in

**Rationale**: The true value of Atrarium lies in open protocol definitions, not proprietary implementations. This ensures interoperability, third-party extensibility, and community data portability.

---

## Principle 2: Simplicity and Minimal Complexity

**Name**: Simplicity and Minimal Complexity

**Rules**:
- No new projects SHOULD be created unless absolutely necessary
- No new databases SHOULD be added (prefer Durable Objects Storage)
- No new services SHOULD be introduced (extend existing components)
- Minimal dependencies - reuse existing stack where possible
- No framework proliferation - stick to established tech stack (Hono, React 19, TanStack)

**Rationale**: Complexity increases maintenance burden and operational costs, undermining the project's 95% cost reduction goal. Simple architectures are easier to operate, debug, and transfer.

---

## Principle 3: Economic Efficiency

**Name**: Economic Efficiency

**Rules**:
- Total monthly cost MUST remain under $5 for communities with <200 members
- Infrastructure choices MUST prioritize serverless/pay-per-use models
- No dedicated servers or VPS SHOULD be introduced
- Scale economics: cost SHOULD grow sub-linearly with community count
- 95% cost reduction compared to Fediverse instances MUST be maintained

**Rationale**: Economic sustainability is a core value proposition. High operational costs (Mastodon: $30-150/month) lead to 50-70% of small instances closing within 1-2 years.

---

## Principle 4: Decentralized Identity and Data Ownership

**Name**: Decentralized Identity and Data Ownership

**Rules**:
- All user data MUST be stored in user-controlled Personal Data Servers (PDS)
- DIDs (Decentralized Identifiers) MUST be used for identity
- No centralized user database MAY be created (except 7-day feed cache in Durable Objects)
- Users MUST be able to migrate to alternative AT Protocol servers
- Community membership MUST be attestable independently of Atrarium infrastructure

**Rationale**: Users own their data and identity. Atrarium is infrastructure, not a data silo. This aligns with AT Protocol's core philosophy and prevents platform lock-in.

---

## Principle 5: PDS-First Architecture

**Name**: PDS-First Architecture

**Rules**:
- All community configuration MUST be stored as AT Protocol records in user PDSs
- Community writes MUST go to PDS first, then indexed via Firehose
- Durable Objects MUST serve as read-optimized 7-day cache only
- If Durable Object storage is lost, system MUST be able to rebuild from PDS + Firehose
- No state SHOULD exist outside PDS except ephemeral indexes

**Rationale**: PDS as source of truth ensures data durability, portability, and compliance with AT Protocol principles. Ephemeral caching enables performance without compromising decentralization.

---

## Principle 6: Operational Burden Reduction

**Name**: Operational Burden Reduction

**Rules**:
- Time commitment MUST remain under 1 hour/week for community operators
- No manual server maintenance SHOULD be required (zero SSH, zero patching)
- Cloudflare Workers auto-scaling MUST handle traffic spikes
- No database backups or restore procedures SHOULD be needed (PDS handles this)
- Monitoring SHOULD rely on Cloudflare's default observability (no custom setup)

**Rationale**: Reducing operational burden from 5 hours/week (Fediverse) to 1 hour/week enables long-term sustainability and prevents burnout-driven community closures.

---

## Principle 7: Code Quality and Pre-Commit Validation

**Name**: Code Quality and Pre-Commit Validation

**Rules**:

### Implementation Code (src/, lib/, components/)
- All implementation code MUST pass linter checks (Biome) before commit
- All implementation code MUST pass formatter checks (Biome) before commit
- All implementation code MUST pass type checks (TypeScript strict mode) before commit
- Pre-commit validation MUST be automated (no manual checks)
- CI/CD pipelines MUST enforce quality gates at all stages

### Test Code (tests/, *.test.ts, *.spec.ts)
- Test code MUST pass linter checks (Biome) before commit
- Test code MUST pass formatter checks (Biome) before commit
- Test code SHOULD pass type checks when practical, but MAY use type assertions (\`as any\`, \`as unknown as T\`) to satisfy TypeScript when:
  - Testing external API responses with unknown types
  - Following TDD workflow where tests are written before full implementation
  - Mocking complex types that would require excessive type gymnastics
- Test files with type errors SHOULD be addressed before production deployment, but MAY be committed during active development
- Type assertions in tests SHOULD include comments explaining why strict typing is impractical

**Rationale**: Automated code quality checks prevent technical debt accumulation and maintain consistent code style. Pre-commit validation catches issues early in implementation code where correctness is critical. Test code serves a different purpose (validating behavior, not production runtime) and often requires pragmatic type handling. Strict type checking in tests can impede TDD workflows and create unnecessary friction. This differentiation balances code quality with development velocity, recognizing that test code safety is verified through test execution, not TypeScript compilation.

**Examples of Acceptable Test Type Assertions**:
\`\`\`typescript
// ✅ External API response
const data = (await response.json()) as { posts: Post[]; cursor?: string };

// ✅ TDD - Implementation not yet complete
const result = (mockFn() as any).someProperty;

// ✅ Complex mock type
const mockAgent = { session: { did: 'test' } } as AtpAgent;
\`\`\`

**Examples of Unacceptable Shortcuts**:
\`\`\`typescript
// ❌ Implementation code using \`any\` to bypass type errors
function processData(input: any) { ... }

// ❌ Test assertions without explanation
expect((data as any).foo).toBe(true); // Why any? Add comment!
\`\`\`

---

## Principle 8: AT Protocol + PDS + Lexicon Constraints

**Name**: AT Protocol + PDS + Lexicon Constraints

**Rules**:
- All features MUST be implementable using AT Protocol + PDS + Lexicon schemas only
- No separate databases (SQL/NoSQL/KV) MAY be introduced beyond Durable Objects ephemeral cache
- If a feature requires additional database infrastructure, the design MUST be rejected and redesigned
- All persistent state MUST reside in PDS using \`net.atrarium.*\` Lexicon records
- Durable Objects Storage is permissible only as 7-day ephemeral cache for performance optimization
- Any feature specification flagged as "requires database" indicates architectural failure

**Rationale**: Introducing databases beyond PDS violates the PDS-First Architecture principle and creates operational burden, cost overhead, and data ownership fragmentation. This constraint forces designs to align with AT Protocol's decentralized philosophy and ensures Atrarium remains infrastructure-light. If AT Protocol + PDS + Lexicon cannot satisfy a requirement, the requirement itself should be questioned or deferred until protocol evolution enables it.

---

## Principle 9: Git Workflow and Commit Integrity

**Name**: Git Workflow and Commit Integrity

**Rules**:
- All changes MUST be fully committed before merging to master branch
- Pre-commit hooks (linting, formatting) MUST NOT be bypassed with \`--no-verify\` flag
- Type checking failures in implementation code (src/) MUST be resolved before commit
- Type checking failures in test code (tests/) MAY be committed if:
  - Tests are part of TDD workflow (implementation incomplete)
  - Type assertions are used appropriately with explanatory comments
  - Failures are documented in commit message or PR description
- Each commit MUST represent a complete, working unit of change
- Merge commits MUST include all related changes (no partial merges followed by fix-up commits)
- Emergency bypasses of pre-commit validation require:
  - Explicit justification in commit message
  - Maintainer approval (via GitHub Issue or PR comment)
  - Follow-up commit within 24 hours to address skipped validations
- CI/CD pipelines MUST validate all commits independently (no reliance on local hooks alone)

**Rationale**: Bypassing validation hooks creates technical debt and undermines automated quality gates. Incomplete commits lead to broken build states, making bisecting and debugging difficult. However, strict type checking in test files can impede TDD workflows and create unnecessary friction during active development. This principle balances repository integrity with practical development workflows, allowing test-driven development while maintaining production code quality. Emergency bypasses exist for critical situations but require explicit approval and rapid remediation.

---

## Principle 10: Complete Implementation Over MVP Excuses

**Name**: Complete Implementation Over MVP Excuses

**Rules**:
- Features MUST be fully implemented according to specification before being marked as complete
- "MVP" or "Phase 1" labels MUST NOT be used to justify incomplete implementations
- Deferred work MUST be explicitly tracked as separate future features, not as part of current scope
- If a feature specification includes optional components marked as "Phase 2" or "Future", those MUST be removed from the specification or implemented before completion
- Implementation completion criteria:
  - All core functionality specified in spec.md MUST be implemented
  - All UI components specified MUST be created and integrated
  - All API endpoints specified MUST be implemented and tested
  - All error handling paths MUST be implemented
  - All validation logic MUST be implemented
  - User-facing features MUST NOT require placeholder data or mock responses
- Features marked as "complete" in Implementation Status (CLAUDE.md, README.md) MUST satisfy all completion criteria
- Incremental delivery is acceptable, but each increment MUST be a complete, usable feature on its own

**Rationale**: Labeling incomplete implementations as "MVP" creates technical debt, undermines user trust, and leads to feature bloat through accumulated deferred work. This practice also violates Principle 2 (Simplicity) by creating hidden complexity in the form of partially-implemented features. Complete implementations ensure that:
1. **User Experience**: Features work as specified without surprising gaps or limitations
2. **Maintainability**: No orphaned code paths or incomplete logic that future developers must complete
3. **Documentation Accuracy**: Implementation Status sections accurately reflect system capabilities
4. **Scope Management**: Features are either fully done or explicitly deferred to separate specifications

**Examples of Compliant vs. Non-Compliant Implementations**:

✅ **Compliant**:
- Specification calls for emoji reactions. Implementation includes: reaction UI, backend storage, API endpoints, emoji picker with search, custom emoji upload, approval workflow. All components integrated and tested.
- Specification calls for basic reactions only (👍❤️). Implementation delivers exactly that, with custom emoji support deferred to a separate "016-custom-emoji" specification.

❌ **Non-Compliant**:
- Specification calls for emoji reactions with custom emoji support. Implementation delivers basic reactions only, marks feature as "MVP: Phase 1 complete, custom emoji deferred".
- Specification calls for emoji picker with search. Implementation delivers picker without search, comments "TODO: Add search functionality".
- Feature marked as "complete" in CLAUDE.md but frontend components not integrated into actual UI.

**Acceptable Scope Reductions**:
- If during implementation, a component proves infeasible or violates other principles (e.g., requires separate database), the specification MUST be revised to remove that component before marking feature complete
- Performance optimizations (caching, indexing) MAY be deferred if core functionality works without them
- Non-critical edge cases (e.g., handling malformed inputs beyond standard validation) MAY be deferred with explicit documentation

---

## Governance

### Amendment Procedure

1. **Proposal**: Any contributor MAY propose a constitutional amendment via GitHub Issue with tag \`constitution-amendment\`
2. **Discussion**: Minimum 7-day public comment period
3. **Approval**: Project maintainers vote (simple majority required for MINOR/PATCH, 2/3 majority for MAJOR)
4. **Implementation**: Version bump and template propagation via \`/constitution\` command
5. **Communication**: Announce changes in project documentation and release notes

### Versioning Policy

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principle added or materially expanded guidance
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

### Compliance Review

- All \`/specify\`, \`/plan\`, and \`/tasks\` outputs MUST include Constitution Check section
- Any MUST violation requires explicit justification or spec revision
- SHOULD violations require documented rationale
- Regular audits (quarterly) to ensure existing features comply with updated principles

---

## Enforcement

Features violating these principles MUST NOT be merged. Exceptions require:
1. GitHub Issue documenting the conflict
2. Explicit justification of necessity
3. Maintainer approval (2/3 majority)
4. Commitment to remediate in next release cycle

Constitution compliance is checked at:
- Feature specification (\`/specify\` command)
- Implementation planning (\`/plan\` command)
- Code review (PR checklist)
- Pre-merge validation (git hooks + CI/CD)
- Quarterly architecture review

---

**Ratified by**: tar-bin (project maintainer)
**Date**: 2025-10-06
**Last Amendment by**: tar-bin (project maintainer)
**Amendment Date**: 2025-10-09
