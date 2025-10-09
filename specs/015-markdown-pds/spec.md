# Feature Specification: Markdown Formatting and Custom Emoji Support

**Feature Branch**: `015-markdown-pds`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "投稿のフォーマットとしてMarkdownとカスタム絵文字を利用できるようにする。カスタム絵文字はユーザーごとのPDSで保存しコミュニティオーナーがコミュニティ内での利用を承認できるようにする"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature requires Markdown formatting for posts and custom emoji support
2. Extract key concepts from description
   → Actors: users (post authors), community owners
   → Actions: format posts with Markdown, upload custom emoji, approve emoji for community use
   → Data: post content with Markdown, custom emoji metadata and images
   → Constraints: emoji stored in user PDS, approval required by community owner
3. For each unclear aspect:
   → See [NEEDS CLARIFICATION] markers in Requirements section
4. Fill User Scenarios & Testing section
   → User scenarios defined below
5. Generate Functional Requirements
   → See Requirements section
6. Identify Key Entities (if data involved)
   → See Key Entities section
7. Run Review Checklist
   → WARN: Spec has uncertainties (clarification needed)
8. Return: SUCCESS (spec ready for planning after clarification)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a community member, I want to format my posts using Markdown (bold, italics, lists, links, etc.) so that I can express my ideas more clearly and make posts more readable.

As a community member, I want to upload custom emoji to my personal data server and use them in posts within communities that have approved them, so that I can express emotions and identity unique to my community.

As a community owner, I want to approve or reject custom emoji uploaded by members for use within my community, so that I can maintain appropriate content standards and community culture.

### Acceptance Scenarios
1. **Given** a user is writing a post, **When** they use Markdown syntax (e.g., `**bold**`, `*italic*`, `[link](url)`, tables, ~~strikethrough~~, `- [ ]` task lists), **Then** the post displays with proper formatting when viewed
2. **Given** a user has uploaded a custom emoji to their PDS, **When** they use the emoji shortcode in a post (e.g., `:custom_emoji:`), **Then** the emoji appears in the post if approved by the community owner
3. **Given** a community owner views pending custom emoji submissions, **When** they approve an emoji, **Then** all community members can use that emoji in posts
4. **Given** a community owner views pending custom emoji submissions, **When** they reject an emoji, **Then** the emoji cannot be used in community posts (but remains in user's PDS)
5. **Given** a user uploads a custom emoji, **When** the emoji is stored, **Then** it is saved in the user's own PDS (not a centralized database)

### Edge Cases
- What happens when a user tries to use a custom emoji that hasn't been approved by the community owner?
  → Post should display the shortcode as plain text (e.g., `:unapproved_emoji:`) or indicate the emoji is unavailable
- What happens when a user deletes a custom emoji from their PDS after it's been approved for community use?
  → System displays the original shortcode as plain text (e.g., `:deleted_emoji:`) in existing posts
- What happens when Markdown syntax is malformed or contains potentially unsafe content (e.g., XSS attempts)?
  → System must sanitize and safely render Markdown to prevent security vulnerabilities
- What happens when a custom emoji file is too large or in an unsupported format?
  → System rejects upload with error message: formats must be PNG/GIF/WEBP, file size ≤500KB, dimensions ≤256×256px
- What happens when a community owner wants to revoke approval for a previously approved emoji?
  → Owners can revoke approval; existing posts display the shortcode as plain text (e.g., `:revoked_emoji:`)

## Requirements *(mandatory)*

### Functional Requirements

**Markdown Formatting:**
- **FR-001**: System MUST allow users to format post text using extended Markdown syntax: basic (headings, bold, italic, lists, links, code blocks, blockquotes) + extended (tables, strikethrough, task lists)
- **FR-002**: System MUST safely render Markdown content, sanitizing potentially malicious code (e.g., script tags, harmful links), and MUST block raw HTML passthrough
- **FR-003**: System MUST display formatted Markdown in post previews, feeds, and detail views

**Custom Emoji Upload:**
- **FR-004**: System MUST allow users to upload custom emoji images to their personal PDS
- **FR-005**: System MUST store custom emoji metadata (name, shortcode, image reference) as AT Protocol Lexicon records in the user's PDS
- **FR-006**: System MUST validate emoji uploads: supported formats (PNG, GIF, WEBP), max file size 500KB, max dimensions 256×256px, animated GIF allowed
- **FR-007**: Users MUST be able to assign a unique shortcode to each custom emoji (e.g., `:my_emoji:`)
- **FR-008**: System MUST enforce shortcode uniqueness per community (each community maintains its own emoji namespace, requires owner approval before registration)

**Community Owner Approval:**
- **FR-009**: System MUST provide community owners with an interface to view pending custom emoji submissions from members (including shortcode, preview, submitter)
- **FR-010**: Community owners MUST be able to approve custom emoji for use within their community, registering the shortcode in the community namespace
- **FR-011**: Community owners MUST be able to reject custom emoji submissions with optional reason
- **FR-011a**: Community owners MUST be able to revoke previously approved emoji (removes from community namespace)
- **FR-012**: System MUST prevent duplicate shortcodes within a community (approval fails if shortcode already registered)
- **FR-013**: System MUST store emoji approval records as separate AT Protocol Lexicon records (one record per approval, enabling atomic operations and scalability)
- **FR-014**: System MUST only allow approved custom emoji to render in community posts

**Emoji Usage in Posts:**
- **FR-015**: System MUST allow users to insert custom emoji into posts using shortcode syntax (e.g., `:emoji_name:`)
- **FR-016**: System MUST replace approved emoji shortcodes with the corresponding emoji image when rendering posts
- **FR-017**: System MUST display unapproved emoji shortcodes as plain text or with an unavailable indicator
- **FR-018**: System MUST display the original shortcode as plain text (e.g., `:emoji_name:`) when emoji images are deleted, unavailable, or approval is revoked

**Data Storage Constraints (Constitution Principle 8):**
- **FR-019**: Custom emoji metadata MUST be stored in user PDS using AT Protocol Lexicon schemas (no separate database)
- **FR-020**: Emoji image files MUST be stored in user PDS blob storage (AT Protocol blob support)
- **FR-021**: Emoji approval records MUST be stored as separate AT Protocol Lexicon records in community owner's PDS (one record per approval decision)
- **FR-022**: Markdown content MUST be stored as part of post records in user PDS (extending existing `net.atrarium.community.post` Lexicon)

### Key Entities *(include if feature involves data)*

- **CustomEmoji**: Represents a user-uploaded emoji
  - Attributes: shortcode (unique identifier, e.g., `:my_emoji:`), image blob reference (stored in user PDS), creator DID, upload timestamp, image format (PNG/GIF/WEBP), file size (≤500KB), dimensions (≤256×256px), animated (boolean)

- **EmojiApproval**: Represents a community owner's approval decision for a custom emoji (stored as separate Lexicon record in community owner's PDS)
  - Attributes: shortcode (registered in community namespace), emoji reference (DID + record key of CustomEmoji), community ID, approval status (approved/rejected/revoked), approver DID (community owner), decision timestamp, rejection reason (optional)
  - Storage: One AT Protocol Lexicon record per approval decision, enabling atomic create/update/delete operations

- **Post (extended)**: Existing post entity with added support for Markdown and emoji
  - Attributes: existing attributes (text, communityId, createdAt) + formatted content (Markdown), embedded emoji shortcodes

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain *(7 clarification points identified)*
- [ ] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed *(pending clarification)*

---

## Clarifications

### Session 2025-10-09

- Q: Custom emoji file size limits and supported formats? → A: PNG/GIF/WEBP, max 500KB, max 256×256px (animated GIF supported)
- Q: Shortcode uniqueness scope (per user, per community, or global)? → A: Per community with owner approval (requires application and approval system)
- Q: Fallback behavior when emoji deleted or approval revoked? → A: Display original shortcode as plain text (e.g., `:deleted_emoji:`)
- Q: Markdown feature subset (basic, extended, or full)? → A: Extended (basic + tables, strikethrough, task lists - no raw HTML)
- Q: Emoji approval storage location (config array or separate Lexicon records)? → A: Separate Lexicon records per approval (scalable, atomic operations)
