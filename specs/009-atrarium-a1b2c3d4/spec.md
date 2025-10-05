# Feature Specification: Update Hashtag Prefix to 'atrarium_'

**Feature Branch**: `009-atrarium-a1b2c3d4`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "プレフィックスを #atrarium_a1b2c3d4 のように明示的に"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Change hashtag prefix from '#atr_' to '#atrarium_'
2. Extract key concepts from description
   → Actors: Users posting to communities, system filtering posts
   → Actions: Generate hashtags, filter Firehose events, validate hashtag format
   → Data: Hashtag prefix format, community identifiers
   → Constraints: Maintain uniqueness, no backward compatibility needed (pre-production)
3. For each unclear aspect:
   → [RESOLVED] No backward compatibility needed - system is pre-production
4. Fill User Scenarios & Testing section
   → User posts with '#atrarium_' hashtag to community
5. Generate Functional Requirements
   → All requirements are testable
6. Identify Key Entities
   → Hashtag format, community identifier
7. Run Review Checklist
   → No implementation details in requirements
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
When a user wants to post to an Atrarium community, they include a hashtag in their post. The hashtag should clearly indicate that this is an Atrarium community post (not just an arbitrary '#atr_' tag). The system should recognize posts with '#atrarium_[8-hex]' format hashtags and include them in the appropriate community feed.

### Acceptance Scenarios
1. **Given** a user has joined an Atrarium community with hashtag '#atrarium_a1b2c3d4', **When** they create a post including '#atrarium_a1b2c3d4', **Then** the post appears in that community's feed
2. **Given** a user sees a post with hashtag '#atrarium_12345678', **When** they read the hashtag, **Then** they can immediately recognize it as an Atrarium community tag
3. **Given** the system receives a Firehose event, **When** the post text contains '#atrarium_' followed by 8 hexadecimal characters, **Then** the system filters and processes it as an Atrarium community post
4. **Given** a user attempts to use an invalid hashtag format like '#atrarium_xyz' (non-hex characters), **When** the system validates the hashtag, **Then** the post is not indexed to any community feed

### Edge Cases
- How does the system handle hashtags with similar but incorrect patterns like '#atrarium_a1b2c3d' (7 chars) or '#atrarium_a1b2c3d4e' (9 chars)?
- What if a post contains multiple valid '#atrarium_' hashtags for different communities?
- What happens when a post contains a substring '#atrarium_' in non-hashtag context (e.g., in a URL)?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST generate community hashtags in the format '#atrarium_[8-hex]' where [8-hex] is 8 hexadecimal characters (0-9, a-f)
- **FR-002**: System MUST validate hashtags to ensure they match the exact pattern '#atrarium_[0-9a-f]{8}'
- **FR-003**: System MUST filter Firehose events to identify posts containing hashtags starting with '#atrarium_'
- **FR-004**: System MUST extract all valid '#atrarium_[8-hex]' hashtags from post text for indexing
- **FR-005**: Users MUST be able to identify Atrarium community posts by the distinctive '#atrarium_' prefix
- **FR-006**: System MUST ensure hashtag uniqueness across all communities using cryptographically secure random generation
  - Technical note: 8 hex characters (32-bit) = 4.3 billion possible combinations
  - Collision probability: ~0.000012% for 1,000 communities, ~0.0012% for 10,000 communities
  - Birthday paradox applies: collision becomes significant (>10%) only beyond 100,000 communities
  - Current scale target (1,000-10,000 communities) has negligible collision risk
  - If collision occurs during generation, system MUST automatically retry with a new random value (with reasonable retry limit)
- **FR-007**: System MUST display the community hashtag in the dashboard UI with clear indication that it's an Atrarium system tag
- **FR-008**: System MUST completely replace old '#atr_' format with new '#atrarium_' format (no backward compatibility required as system is pre-production)

### Key Entities *(include if feature involves data)*
- **Community Hashtag**: A unique identifier in format '#atrarium_[8-hex]' that associates posts with a specific community
  - Attributes: prefix ('#atrarium_'), unique ID (8 hexadecimal characters)
  - Uniqueness: Globally unique across all Atrarium communities
  - Visibility: Displayed to users in dashboard, included in posts, visible in feeds
- **Hashtag Pattern**: The validation pattern that defines valid Atrarium community hashtags
  - Format: Regular expression pattern for matching
  - Two-stage filtering: Lightweight prefix check, heavyweight exact match
  - Scope: Applied to all incoming Firehose events

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified (pre-production system, no backward compatibility needed)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (no backward compatibility needed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
