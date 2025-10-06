# Research: AT Protocol Lexicon Publication

**Feature**: 010-lexicon
**Date**: 2025-10-06
**Status**: Complete

## Research Questions

1. AT Protocol Lexicon discovery conventions (exact URL path format)
2. `@atproto/lexicon` tooling usage (code generation workflow)
3. ETag generation strategy for static JSON files
4. Cloudflare Workers static file serving best practices

---

## 1. AT Protocol Lexicon Discovery Conventions

### Decision
**Use AT Protocol repository-based publication** (primary method) with optional HTTP endpoint as fallback.

### Rationale
According to the [AT Protocol Lexicon specification](https://atproto.com/specs/lexicon#lexicon-publication-and-resolution):

- **Primary method**: Lexicon schemas are published as records in AT Protocol repositories using the `com.atproto.lexicon.schema` collection
- **Resolution flow**:
  1. NSID (e.g., `net.atrarium.community.config`) resolves to DID via DNS TXT record (_lexicon prefix)
  2. DID resolves to AT Protocol repository
  3. Schema retrieved from repository as a record with key = NSID

- **HTTP/.well-known fallback**: The RFC discussion (GitHub #3074) considered `.well-known` mechanism but prioritized repository-based publication for stronger decentralization

**For Atrarium Phase 1 (Beta)**:
- Implement simple HTTP endpoint at `/xrpc/com.atproto.lexicon.schema` or similar path (not `.well-known`)
- Serve schemas as JSON files from `src/lexicons/` directory
- Future enhancement: Publish schemas to PDS repository for full AT Protocol compliance

### Alternatives Considered
- `.well-known/atproto-lexicon/` path - NOT standardized in official spec
- Direct HTTP-only distribution - Insufficient for full AT Protocol compliance

### Implementation Notes
- Lexicon JSON must include: `$type: "com.atproto.lexicon.schema"`, `lexicon: 1`, `id: <NSID>`, `defs: {...}`
- Current Atrarium schemas already follow this format
- No special HTTP headers required beyond standard CORS and caching

---

## 2. `@atproto/lexicon` Code Generation

### Decision
**Use `@atproto/lex-cli` package for TypeScript code generation**.

### Rationale
[`@atproto/lex-cli`](https://www.npmjs.com/package/@atproto/lex-cli) (latest: v0.9.1) provides official TypeScript codegen:

**Available commands**:
- `lex gen-api <outdir> <schemas...>` - Generate TS client API
- `lex gen-server <outdir> <schemas...>` - Generate TS server API
- `lex gen-ts-obj <schemas...>` - Generate TS file exporting schema array

**Recommended approach for Atrarium**:
```bash
# Install as dev dependency
npm install --save-dev @atproto/lex-cli

# Generate TypeScript types (manual invocation during development)
npx lex-cli gen-api src/schemas/generated/ src/lexicons/*.json

# Or add to package.json scripts
"scripts": {
  "codegen": "lex-cli gen-api src/schemas/generated/ src/lexicons/*.json"
}
```

**Output format**:
- Generates TypeScript interfaces and Zod schemas from Lexicon JSON
- Creates type-safe client/server methods
- Handles nested definitions and references

### Alternatives Considered
- Manual TypeScript type definitions - **REJECTED** (violates FR-007: single source of truth)
- `@yupio/atproto-lex-cli` fork - Unnecessary, official tool sufficient
- Rust tool `esquema` - Language mismatch with TypeScript project

### Known Issues (as of 2025-01)
- Issue #3230: Not using type-only imports (minor, workaround available)
- Issue #3327: TypeError with lex-cli (closed, likely resolved)

**Recommendation**: Pin `@atproto/lex-cli` version in package.json to avoid breaking changes.

---

## 3. ETag Generation for Static JSON Files

### Decision
**Generate ETags from JSON content hash using crypto.subtle.digest()**.

### Rationale
Cloudflare Workers best practices ([Static Assets docs](https://developers.cloudflare.com/workers/static-assets/)):

- Cloudflare Pages auto-generates ETags for static files
- Workers can customize ETag generation via `crypto.subtle.digest()`
- Browser caching works via `If-None-Match` → 304 response

**Implementation approach**:
```typescript
// Generate ETag from JSON content
const jsonContent = JSON.stringify(lexiconSchema);
const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonContent));
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
const etag = `"${hashHex.substring(0, 16)}"`;

// Handle conditional request
const ifNoneMatch = request.headers.get('If-None-Match');
if (ifNoneMatch === etag) {
  return new Response(null, { status: 304 });
}

// Return with ETag header
return new Response(jsonContent, {
  headers: {
    'Content-Type': 'application/json',
    'ETag': etag,
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*'
  }
});
```

### Alternatives Considered
- Last-Modified header - Less precise than ETag
- Cloudflare Cache API - Overkill for 3 small JSON files
- Static ETag in code - Doesn't update with schema changes

### Performance Note
- ETag computed once per request (negligible overhead for small JSON files)
- Cloudflare edge caching reduces Worker invocations after first request

---

## 4. Cloudflare Workers Static File Serving

### Decision
**Bundle JSON files as ES modules using Wrangler's asset support**.

### Rationale
Cloudflare Workers Static Assets ([docs](https://developers.cloudflare.com/workers/static-assets/)):

- **Bundling approach**: Import JSON files directly in Worker code
- **Automatic handling**: Wrangler bundles assets during build
- **Custom headers**: Full control via Response object

**Implementation**:
```typescript
// src/routes/lexicon.ts
import communityConfigSchema from '../lexicons/net.atrarium.community.config.json';
import membershipSchema from '../lexicons/net.atrarium.community.membership.json';
import moderationSchema from '../lexicons/net.atrarium.moderation.action.json';

export function serveLexicon(schemaName: string) {
  const schemas = {
    'net.atrarium.community.config': communityConfigSchema,
    'net.atrarium.community.membership': membershipSchema,
    'net.atrarium.moderation.action': moderationSchema,
  };

  const schema = schemas[schemaName];
  if (!schema) {
    return new Response('Not Found', { status: 404 });
  }

  // Generate ETag, handle caching (as above)
  // ...
}
```

### Alternatives Considered
- Cloudflare Workers Sites - Deprecated in favor of Workers Static Assets
- R2 bucket storage - Unnecessary complexity for 3 small files
- External CDN - Violates self-hosting requirement

### CORS Configuration
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'If-None-Match',
}
```

---

## Summary

| Research Area | Decision | Implementation Complexity |
|---------------|----------|--------------------------|
| Lexicon Discovery | Simple HTTP endpoint (non-.well-known) | Low |
| Code Generation | `@atproto/lex-cli gen-api` | Low (npm script) |
| ETag Generation | SHA-256 content hash | Low (native crypto API) |
| Static File Serving | ES module imports + bundling | Low (Wrangler built-in) |

**Risk Assessment**: ✅ Low - All approaches use official Cloudflare/AT Protocol tooling.

**Next Phase**: Design contracts and data model based on these technical decisions.
