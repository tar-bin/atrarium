# Data Model: AT Protocol Lexicon Publication

**Feature**: 010-lexicon
**Date**: 2025-10-06

## Overview

This feature introduces HTTP endpoints for serving AT Protocol Lexicon schemas. The data model focuses on HTTP request/response entities and schema metadata, with no database storage required.

---

## Entities

### 1. LexiconSchema

**Description**: AT Protocol Lexicon schema definition (JSON file).

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `$type` | string | Yes | Always `"com.atproto.lexicon.schema"` |
| `lexicon` | integer | Yes | Lexicon version (currently `1`) |
| `id` | string (NSID) | Yes | Schema identifier (e.g., `net.atrarium.community.config`) |
| `defs` | object | Yes | Schema definitions (main + sub-definitions) |

**Validation Rules**:
- `id` must match NSID pattern: `[a-z]+(\\.[a-z]+)+\\.[a-z]+`
- `defs.main` must exist with `type: "record"`
- Must validate against AT Protocol Lexicon meta-schema

**Relationships**:
- No database relationships (static JSON files)
- Logical relationship: 1 schema → N generated TypeScript types

**File Location**: `src/lexicons/<id>.json`

**Example**:
```json
{
  "$type": "com.atproto.lexicon.schema",
  "lexicon": 1,
  "id": "net.atrarium.community.config",
  "defs": {
    "main": {
      "type": "record",
      "description": "Community configuration record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["name", "hashtag", "stage", "createdAt"],
        "properties": { /* ... */ }
      }
    }
  }
}
```

---

### 2. LexiconResponse

**Description**: HTTP response entity for Lexicon schema requests.

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | integer | Yes | HTTP status code (200, 304, 404) |
| `body` | LexiconSchema | Conditional | JSON schema (omitted for 304) |
| `headers.content-type` | string | Yes | `"application/json"` |
| `headers.etag` | string | Yes | Content hash (e.g., `"abc123def456"`) |
| `headers.cache-control` | string | Yes | `"public, max-age=3600"` (beta) or `"public, max-age=86400, immutable"` (stable) |
| `headers.access-control-allow-origin` | string | Yes | `"*"` (CORS) |

**State Transitions**:
```
Request → [Has If-None-Match header?]
  ├─ Yes → [ETag matches?]
  │    ├─ Yes → 304 Not Modified (no body)
  │    └─ No  → 200 OK (full schema)
  └─ No  → 200 OK (full schema)
```

**Validation Rules**:
- ETag must be stable (same input → same ETag)
- Cache-Control max-age must match beta/stable policy
- Content-Type must be `application/json` for 200 responses

---

### 3. ETag

**Description**: HTTP cache validator for Lexicon schemas.

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `value` | string | Yes | SHA-256 hash of JSON content (first 16 hex chars) |
| `algorithm` | string | Yes | Always `"SHA-256"` |

**Generation Algorithm**:
```typescript
1. Serialize LexiconSchema to JSON string (stable order)
2. Compute SHA-256 hash of UTF-8 encoded string
3. Take first 16 hex characters of hash
4. Wrap in double quotes: `"<hash>"`
```

**Validation Rules**:
- Must be deterministic (same JSON → same ETag)
- Must change when schema content changes
- Must be quoted in HTTP headers (RFC 7232)

**Lifecycle**:
- Generated on-demand per request (no storage)
- Compared against `If-None-Match` request header
- Sent in `ETag` response header

---

### 4. TypeScriptTypes (Generated)

**Description**: Auto-generated TypeScript type definitions from Lexicon schemas.

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceSchema` | string (NSID) | Yes | Lexicon schema ID (e.g., `net.atrarium.community.config`) |
| `generatedTypes` | string (code) | Yes | TypeScript interface/type definitions |
| `generatedValidators` | string (code) | Conditional | Zod schemas (if using `lex-cli gen-api`) |

**Relationships**:
- Input: LexiconSchema (JSON file)
- Output: TypeScript file in `src/schemas/generated/`

**Generation Process**:
```bash
lex-cli gen-api src/schemas/generated/ src/lexicons/*.json
```

**Validation Rules**:
- Generated types must be committed to version control (FR-012)
- Must re-generate when source JSON changes
- Must pass TypeScript compilation (`tsc --noEmit`)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Static JSON Files (src/lexicons/)                       │
│  - net.atrarium.community.config.json                   │
│  - net.atrarium.community.membership.json               │
│  - net.atrarium.moderation.action.json                  │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────────┬─────────────────────────┐
             │                 │                         │
             v                 v                         v
   ┌─────────────────┐  ┌─────────────┐      ┌──────────────────┐
   │ HTTP Endpoint   │  │ @atproto    │      │ Version Control  │
   │ (Workers)       │  │ /lex-cli    │      │ (Git)            │
   └─────────────────┘  └─────────────┘      └──────────────────┘
             │                 │
             v                 v
   ┌─────────────────┐  ┌──────────────────────┐
   │ LexiconResponse │  │ TypeScript Types     │
   │  - 200/304      │  │ (src/schemas/        │
   │  - ETag         │  │  generated/)         │
   │  - Cache        │  └──────────────────────┘
   └─────────────────┘
             │
             v
   ┌─────────────────┐
   │ PDS Server      │
   │ (External)      │
   │  - Schema       │
   │    validation   │
   └─────────────────┘
```

---

## Storage

**File System**:
- **Source**: `src/lexicons/*.json` (3 files, ~1-2KB each)
- **Generated**: `src/schemas/generated/*.ts` (auto-generated, committed to Git)

**No Database Required**: All data is static JSON files bundled into Worker at build time.

**Cache Layer**:
- Cloudflare edge cache (automatic, controlled by Cache-Control header)
- Browser cache (controlled by ETag + Cache-Control)

---

## Constraints

1. **Immutability (Beta → Stable transition)**:
   - Beta period: Schemas MAY change (additive-only)
   - Stable period: Schemas MUST NOT change (immutable)

2. **Size Limits**:
   - Each Lexicon JSON file: < 10KB (typical: 1-2KB)
   - Total static assets: < 1MB (Cloudflare Workers limit)

3. **Performance**:
   - ETag generation: < 1ms (SHA-256 on ~1KB JSON)
   - Response time: < 100ms (p95, per NFR-002)

4. **Versioning**:
   - Breaking changes require new NSID (e.g., `net.atrarium.v2.community.config`)
   - No URL-based versioning (per FR-009: stable URLs)

---

## Schema Evolution

**Allowed Changes** (additive-only, per AT Protocol spec):
- ✅ Add optional fields to existing records
- ✅ Add new definitions to `defs` object
- ✅ Add new enum values (with caution)

**Prohibited Changes** (breaking):
- ❌ Remove required fields
- ❌ Change field types
- ❌ Rename fields
- ❌ Remove enum values

**Migration Path** (if breaking changes needed):
1. Create new Lexicon with new NSID (e.g., `net.atrarium.v2.community.config`)
2. Update Atrarium codebase to write to new Lexicon
3. Maintain old Lexicon for backwards compatibility (read-only)
4. Deprecate old Lexicon after migration period

---

## Testing Considerations

1. **Contract Tests**:
   - Verify all 3 schemas accessible via HTTP
   - Validate JSON structure matches AT Protocol Lexicon format
   - Test ETag generation (same input → same output)
   - Test 304 responses for conditional requests

2. **Integration Tests**:
   - Simulate PDS fetching schema → validation → success
   - Test CORS headers work with cross-origin requests

3. **Unit Tests**:
   - Verify TypeScript codegen produces valid types
   - Test ETag algorithm stability

---

*This data model reflects the stateless, HTTP-focused nature of Lexicon publication.*
