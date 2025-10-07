<!--
SYNC IMPACT REPORT (2025-10-07)
Version: 1.0.0 → 1.1.0 (MINOR - New principle added)
Rationale: MINOR - Added Principle 7 (Code Quality and Pre-Commit Validation) to enforce automated quality checks before commits
Modified Principles: None (existing principles unchanged)
Added Sections: Principle 7: Code Quality and Pre-Commit Validation
Removed Sections: None
Templates Requiring Updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check section already includes quality gates)
  - ✅ .specify/templates/tasks-template.md (Phase 3.1 Setup already includes linting configuration)
  - ⚠ .specify/templates/spec-template.md (may need code quality requirements section)
Follow-up TODOs:
  - Consider adding pre-commit hook setup to project initialization tasks
  - Document Biome configuration standards in development guidelines
-->

# Atrarium Project Constitution

**Version**: 1.1.0
**Ratification Date**: 2025-10-06
**Last Amended**: 2025-10-07
**Project**: Atrarium - Small ecosystems on AT Protocol

---

## Preamble

This constitution establishes the non-negotiable architectural and operational principles governing the Atrarium project. These principles ensure alignment with the project's core mission: enabling sustainable, small-scale communities (10-200 people) on AT Protocol through serverless infrastructure, while preserving decentralization, protocol-first design, and economic efficiency.

All features, implementations, and technical decisions MUST comply with these principles. Violations require explicit constitutional amendment via the governance process outlined herein.

---

## Principle 1: Protocol-First Architecture

**Name**: Protocol-First Architecture

**Rules**:
- AT Protocol Lexicon schemas (`net.atrarium.*`) MUST define all community data structures
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
- All code MUST pass linter checks (Biome) before commit
- All code MUST pass formatter checks (Biome) before commit
- All code MUST pass type checks (TypeScript) before commit
- Pre-commit validation MUST be automated (no manual checks)
- CI/CD pipelines MUST enforce quality gates at all stages

**Rationale**: Automated code quality checks prevent technical debt accumulation, reduce code review burden, and maintain consistent code style across contributors. Pre-commit validation catches issues early, reducing the cost of fixes and preventing broken commits from entering the repository.

---

## Governance

### Amendment Procedure

1. **Proposal**: Any contributor MAY propose a constitutional amendment via GitHub Issue with tag `constitution-amendment`
2. **Discussion**: Minimum 7-day public comment period
3. **Approval**: Project maintainers vote (simple majority required for MINOR/PATCH, 2/3 majority for MAJOR)
4. **Implementation**: Version bump and template propagation via `/constitution` command
5. **Communication**: Announce changes in project documentation and release notes

### Versioning Policy

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principle added or materially expanded guidance
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

### Compliance Review

- All `/specify`, `/plan`, and `/tasks` outputs MUST include Constitution Check section
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
- Feature specification (`/specify` command)
- Implementation planning (`/plan` command)
- Code review (PR checklist)
- Quarterly architecture review

---

**Ratified by**: tar-bin (project maintainer)
**Date**: 2025-10-06
**Last Amendment by**: tar-bin (project maintainer)
**Amendment Date**: 2025-10-07
