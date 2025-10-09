# Changelog

All notable changes to Atrarium will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 015-markdown-pds: Markdown Formatting + Custom Emoji Support

**Markdown Rendering**:
- GitHub Flavored Markdown (GFM) support for community posts
  - Extended syntax: tables, strikethrough, task lists
  - Code blocks with syntax highlighting
  - Ordered/unordered lists, blockquotes, headings
- XSS protection via DOMPurify sanitization
  - Blocks dangerous protocols (`javascript:`, `data:`, `vbscript:`)
  - Strips malicious tags (`<script>`, `<iframe>`, `<object>`, `<embed>`)
  - Removes event handlers (`onclick`, `onerror`, `onload`)
- Live preview Markdown editor component
- Emoji shortcode replacement with code block preservation

**Custom Emoji System**:
- User emoji upload to Personal Data Server (PDS)
  - AT Protocol Lexicon: `net.atrarium.emoji.custom`
  - Image validation: PNG/GIF/WEBP, max 500KB, max 256×256px
  - Blob storage in user's PDS
- Community emoji approval workflow
  - AT Protocol Lexicon: `net.atrarium.emoji.approval`
  - Submission → Owner/Moderator approval → Community registry
  - Approval/rejection/revocation actions
- Emoji registry cache in Durable Objects
  - 7-day TTL for approved emoji metadata
  - Automatic cache invalidation on approval/revocation
  - Per-community isolated storage
- Extended post schema with Markdown and emoji fields
  - AT Protocol Lexicon: `net.atrarium.community.post` extended
  - Optional `markdown` field (max 300 chars)
  - Optional `emojiShortcodes` array (max 20 emoji)

**API Endpoints** (7 new endpoints):
- `POST /api/emoji/upload` - Upload custom emoji
- `GET /api/emoji/list` - List user's emoji
- `POST /api/communities/:id/emoji/submit` - Submit for approval
- `GET /api/communities/:id/emoji/pending` - List pending submissions (owner/moderator)
- `POST /api/communities/:id/emoji/approve` - Approve/reject emoji (owner/moderator)
- `POST /api/communities/:id/emoji/revoke` - Revoke approved emoji (owner/moderator)
- `GET /api/communities/:id/emoji/registry` - Get approved emoji registry

**Technical Implementation**:
- Markdown library: `marked` (10KB gzipped) + `DOMPurify` (7KB gzipped)
  - Total bundle impact: 17KB (vs 32KB markdown-it, 157KB+ remark)
  - Decision documented in `specs/015-markdown-pds/research.md`
- PDS integration: Blob upload, metadata records, approval records
- Image validation service: Format/size/dimensions checks
- Durable Objects emoji cache: <10ms lookup performance
- oRPC contract schemas for type-safe API communication

**Testing**:
- 27 Markdown rendering unit tests (all passing)
  - Extended syntax parsing
  - XSS protection validation
  - Emoji shortcode replacement
  - Code block preservation
- Emoji validation unit tests
- Emoji cache unit tests
- PDS integration tests
- E2E emoji workflow tests (Playwright)

**Documentation**:
- API documentation: `/server/API.md` (emoji endpoints + Markdown support)
- Research notes: `/specs/015-markdown-pds/research.md` (library comparison)
- User guide updates: Custom emoji management workflow

### Changed

- Extended `net.atrarium.community.post` Lexicon schema with optional `markdown` and `emojiShortcodes` fields
- Updated TypeScript configuration to include generated Lexicon types
- Added dependencies: `@atproto/lexicon`, `@atproto/xrpc`, `marked`, `dompurify`, `multiformats`

### Fixed

- Type errors in emoji routes (File type checks, Durable Objects bindings)
- Type errors in membership routes (MembershipRecord imports, URI type assertions)
- Test file type safety (BlobRef types, unknown result types)

---

## [0.1.0] - 2025-01-XX (Placeholder)

### Added
- Initial Atrarium MVP release
- PDS-first architecture (006-pds-1-db)
- Community management API
- Feed Generator API
- Cloudflare Workers + Durable Objects infrastructure
- AT Protocol Lexicon schemas (`net.atrarium.*`)

[Unreleased]: https://github.com/yourusername/atrarium/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/atrarium/releases/tag/v0.1.0
