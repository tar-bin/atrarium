# Feature Specification: Moderation Reason Enum (Privacy-Focused)

**Feature Branch**: `007-reason-enum-atproto`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "プライバシーを考慮してreasonフィールドをenum（列挙型）に変更する。atprotoがプライベートデータに対応するまではそういった情報の取り扱いに関する実装は後回しにする（Discordなど別システムをつかった運用で対応）"

## Execution Flow (main)
```
1. Parse user description from Input
   → User wants: enum-based moderation reason field for privacy protection
   → Constraint: No private data handling until AT Protocol supports it
   → Workaround: External systems (Discord) for detailed internal notes
2. Extract key concepts from description
   → Actors: Moderators
   → Actions: Select predefined moderation reason when hiding posts/blocking users
   → Data: Moderation reason (public PDS record)
   → Constraints: Must prevent PII/confidential data leakage
3. For each unclear aspect:
   → [RESOLVED] Auth method: Already implemented (JWT-based)
   → [RESOLVED] Supported actions: hide_post, unhide_post, block_user, unblock_user
   → [RESOLVED] Storage: AT Protocol PDS (public records)
4. Fill User Scenarios & Testing section
   → Happy path: Moderator selects reason from dropdown
   → Edge case: Invalid reason rejected by backend
5. Generate Functional Requirements
   → All requirements testable via API contract tests
6. Identify Key Entities
   → ModerationReason enum (17 predefined values)
   → ModerationAction record (updated schema)
7. Run Review Checklist
   → No [NEEDS CLARIFICATION] markers
   → No implementation details (focuses on WHAT, not HOW)
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story

As a community moderator, when I hide a post or block a user, I want to select a moderation reason from a predefined list so that I don't accidentally include personal information (emails, phone numbers, internal reports) in the public moderation log.

**Context**: All moderation actions are stored as public records in the moderator's Personal Data Server (PDS) via AT Protocol. Free-text reason fields create privacy risks because moderators may inadvertently include PII or confidential information (e.g., "Removed based on report from user@example.com").

**Goal**: Replace free-text `reason` field with a dropdown of standardized moderation reasons to eliminate privacy risks.

### Acceptance Scenarios

1. **Given** a moderator is viewing a post in a community feed, **When** they click "Hide Post", **Then** they see a dialog with a dropdown to select one of 17 predefined moderation reasons (e.g., "Spam post", "Community guidelines violation", "Harassment").

2. **Given** a moderator selects "Spam post" from the reason dropdown, **When** they confirm the action, **Then** the moderation action is recorded in their PDS with `reason: "spam"` and the post is hidden from the public feed.

3. **Given** a moderator attempts to submit a moderation action with an invalid reason value (e.g., `reason: "custom text"`), **When** the backend validates the request, **Then** the API returns a 400 error with message "Invalid reason. Must be one of: spam, low_quality, duplicate, ..."

4. **Given** a moderator speaks Japanese, **When** they view the moderation reason dropdown, **Then** all reason labels are displayed in Japanese (e.g., "spam" → "スパム投稿").

5. **Given** a moderator needs to document detailed internal context for a moderation decision (e.g., related ticket numbers, private user reports), **When** they complete the moderation action, **Then** they use an external system (Discord, internal tools) to record these details separately (not in the public PDS record).

### Edge Cases

- **Empty reason**: What happens if moderator doesn't select a reason?
  - **Expected**: Reason field is optional. Action succeeds without reason.

- **New reason needed**: What happens when a moderator encounters a scenario not covered by the 17 predefined reasons?
  - **Expected**: Moderator selects `other` as a catch-all option. Detailed internal notes go to external system.

- **Backward compatibility**: What happens to existing moderation actions with free-text reasons?
  - **Expected**: Existing records remain unchanged (read-only compatibility). New actions use enum values only.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide exactly 17 predefined moderation reason values: `spam`, `low_quality`, `duplicate`, `off_topic`, `wrong_community`, `guidelines_violation`, `terms_violation`, `copyright`, `harassment`, `hate_speech`, `violence`, `nsfw`, `illegal_content`, `bot_activity`, `impersonation`, `ban_evasion`, `other`.

- **FR-002**: System MUST reject moderation actions with reason values not in the predefined enum list (return 400 Bad Request).

- **FR-003**: Dashboard UI MUST display moderation reasons as a dropdown/select element (not free-text input).

- **FR-004**: Dashboard UI MUST support bilingual labels (English and Japanese) for all 17 moderation reasons.

- **FR-005**: Moderation reason field MUST remain optional (moderators can choose not to provide a reason).

- **FR-006**: System MUST NOT store free-text notes or detailed explanations in the public PDS moderation action record.

- **FR-007**: Documentation MUST guide moderators to use external systems (Discord, internal tools) for recording detailed internal context or private information related to moderation decisions.

- **FR-008**: Backend validation MUST enforce enum-only values for the `reason` field in all moderation action endpoints.

- **FR-009**: AT Protocol Lexicon schema MUST define `reason` as an enum field with the 17 predefined values.

- **FR-010**: System MUST remove the existing regex-based PII validation (email, phone number detection) since enum values eliminate this risk.

### Key Entities

- **ModerationReason (Enum)**: A predefined set of 17 standardized moderation reason codes. Each value is a short lowercase identifier (e.g., `spam`, `harassment`) that maps to human-readable labels in multiple languages.
  - **Purpose**: Prevent privacy leaks by eliminating free-text input
  - **Values**: `spam`, `low_quality`, `duplicate`, `off_topic`, `wrong_community`, `guidelines_violation`, `terms_violation`, `copyright`, `harassment`, `hate_speech`, `violence`, `nsfw`, `illegal_content`, `bot_activity`, `impersonation`, `ban_evasion`, `other`
  - **Localization**: Each value has English and Japanese labels (stored in i18n files, not in PDS)

- **ModerationAction (Record)**: An AT Protocol record stored in the moderator's PDS. Updated to use enum-based `reason` field.
  - **Schema**: `net.atrarium.moderation.action`
  - **Key Fields**: `action` (hide_post, unhide_post, block_user, unblock_user), `target` (post URI or user DID), `community` (community AT-URI), `reason` (enum value from ModerationReason), `createdAt` (ISO 8601 timestamp)
  - **Visibility**: Public record (anyone can read from moderator's PDS)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (enum-only, no private data storage)
- [x] Dependencies and assumptions identified (AT Protocol public records, external systems for internal notes)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (resolved: backward compatibility = read-only for existing records)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes

**Privacy Context**: This feature addresses the risk of moderators accidentally including PII or confidential information in moderation reasons. Since AT Protocol currently stores all records publicly (private data support planned for 2025 but not yet available), an enum-based approach eliminates input-based privacy risks.

**Future Consideration**: When AT Protocol supports private encrypted records, the system could add a separate `privateNotes` field stored in encrypted PDS records or Durable Objects Storage (not in public moderation action records).
