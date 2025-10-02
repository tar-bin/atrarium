# DID Document and .well-known Routing Research

**Research Date**: 2025-10-02
**Status**: Complete
**Target Implementation**: Phase 0, Week 5-8 (Feed Generator Implementation)

---

## Executive Summary

This document provides comprehensive research findings on DID (Decentralized Identifier) document generation and `.well-known` routing configuration for AT Protocol feed generators on Cloudflare Workers.

**Key Findings**:
- did:web method is recommended for Cloudflare Workers deployment
- DID document must be served at `/.well-known/did.json` endpoint
- itty-router is the optimal routing library for Cloudflare Workers
- Service endpoint must match the hostname configuration
- No additional infrastructure required beyond standard Workers routing

---

## Table of Contents

1. [DID Document Specification](#did-document-specification)
2. [did:web Method for Feed Generators](#didweb-method-for-feed-generators)
3. [Cloudflare Workers Routing Configuration](#cloudflare-workers-routing-configuration)
4. [Implementation Examples](#implementation-examples)
5. [Validation and Testing](#validation-and-testing)
6. [Decision and Rationale](#decision-and-rationale)
7. [References](#references)

---

## 1. DID Document Specification

### 1.1 W3C DID Core Requirements

A DID document for AT Protocol feed generators must include:

**Required Fields**:
- `@context`: Array containing `"https://www.w3.org/ns/did/v1"`
- `id`: The DID identifier (e.g., `did:web:atrarium.example.com`)
- `service`: Array of service endpoint objects

**Service Endpoint Structure**:
```json
{
  "id": "#bsky_fg",
  "type": "BskyFeedGenerator",
  "serviceEndpoint": "https://atrarium.example.com"
}
```

### 1.2 AT Protocol Specific Requirements

According to [AT Protocol DID specification](https://atproto.com/specs/did):

**DID Document Must Include**:
1. **Handle** (in `alsoKnownAs` array):
   - URI scheme: `at://`
   - First valid handle is primary

2. **Signing Key** (in `verificationMethod` array):
   - `id` ending in `#atproto`
   - `type` must be `Multikey`
   - `controller` must match the DID
   - `publicKeyMultibase` contains encoded public key

3. **Service Endpoint** (in `service` array):
   - For feed generators: `type` = `BskyFeedGenerator`
   - For PDS: `type` = `AtprotoPersonalDataServer`

### 1.3 Feed Generator Specific DID Document

**Minimal Example**:
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.example.com",
  "service": [
    {
      "id": "#bsky_fg",
      "type": "BskyFeedGenerator",
      "serviceEndpoint": "https://atrarium.example.com"
    }
  ]
}
```

**Key Characteristics**:
- No `verificationMethod` required for feed generators (unlike PDS)
- No `alsoKnownAs` required (used for user accounts)
- Service endpoint MUST be accessible via HTTPS on port 443
- Service endpoint MUST match the hostname in environment configuration

---

## 2. did:web Method for Feed Generators

### 2.1 did:web Resolution Algorithm

According to [W3C did:web Method Specification](https://w3c-ccg.github.io/did-method-web/):

**Resolution Process**:
1. Replace `:` with `/` in the method-specific identifier
2. If domain contains a port, percent-decode the colon
3. Construct HTTPS URL:
   - Prepend `https://`
   - If no path specified, append `/.well-known`
   - Append `/did.json`

**Examples**:
```
did:web:example.com
→ https://example.com/.well-known/did.json

did:web:example.com:user:alice
→ https://example.com/user/alice/did.json

did:web:example.com%3A3000
→ https://example.com:3000/.well-known/did.json
```

### 2.2 did:web vs did:plc Comparison

| Feature | did:web | did:plc |
|---------|---------|---------|
| **Resolution** | HTTPS + DNS | AT Protocol PLC service |
| **Setup Complexity** | Low (just serve JSON) | Medium (requires PLC registration) |
| **Migration** | Requires domain ownership | Portable across domains |
| **Privacy** | DNS tracked | Better privacy |
| **Cost** | Domain cost only | Free |
| **Best For** | Stable domains, serverless | Long-standing services, migration |

**For Atrarium (Cloudflare Workers)**:
- **Phase 0**: Use **did:web** for simplicity
- **Phase 1+**: Consider migrating to **did:plc** for portability

### 2.3 Validation Constraints

From the did:web specification:

- DID URLs within a did:web document MUST be absolute URLs
- The resolved document MUST match the original DID identifier
- Service endpoint MUST use HTTPS (HTTP not allowed)
- Domain MUST have valid SSL/TLS certificate

---

## 3. Cloudflare Workers Routing Configuration

### 3.1 Routing Options for Workers

Cloudflare Workers supports three routing approaches:

1. **Custom Domains**: Worker is the origin (recommended for production)
2. **Routes**: Zone-based routing with origin behind Worker
3. **workers.dev**: Subdomain routing (development only)

### 3.2 Handling .well-known Paths

**No Special Configuration Required**:
- `.well-known` is treated as a regular path segment
- No reserved behavior in Cloudflare Workers
- Standard route matching applies

**Route Pattern Examples**:
```
example.com/*                    → Matches all paths
example.com/.well-known/*        → Matches only .well-known paths
example.com/.well-known/did.json → Exact match
```

### 3.3 Recommended Router: itty-router

Based on research, **itty-router** is optimal for Cloudflare Workers:

**Why itty-router?**:
- Ultra-lightweight (< 1KB)
- Designed specifically for Cloudflare Workers
- TypeScript support with full typing
- No dependencies
- Natural handling of `.well-known` paths

**Basic Usage**:
```typescript
import { AutoRouter } from 'itty-router'

const router = AutoRouter()

router.get('/.well-known/did.json', () => {
  return {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: 'did:web:atrarium.example.com',
    service: [{
      id: '#bsky_fg',
      type: 'BskyFeedGenerator',
      serviceEndpoint: 'https://atrarium.example.com'
    }]
  }
})

export default { ...router }
```

---

## 4. Implementation Examples

### 4.1 Official Bluesky Feed Generator

From [bluesky-social/feed-generator](https://github.com/bluesky-social/feed-generator/blob/main/src/well-known.ts):

```typescript
import express from 'express'
import { AppContext } from './config'

const makeRouter = (ctx: AppContext) => {
  const router = express.Router()

  router.get('/.well-known/did.json', (_req, res) => {
    if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
      return res.sendStatus(404)
    }
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: ctx.cfg.serviceDid,
      service: [
        {
          id: '#bsky_fg',
          type: 'BskyFeedGenerator',
          serviceEndpoint: `https://${ctx.cfg.hostname}`
        }
      ]
    })
  })

  return router
}

export default makeRouter
```

**Key Takeaways**:
- Validates that serviceDid matches hostname
- Returns 404 if validation fails
- Constructs service endpoint from hostname
- Uses Express (not applicable to Workers)

### 4.2 Cloudflare Workers Implementation

**Recommended Approach with itty-router**:

```typescript
import { AutoRouter, IRequest } from 'itty-router'

interface Env {
  DB: D1Database
  POST_CACHE: KVNamespace
  FIREHOSE_CONSUMER: DurableObjectNamespace
  SERVICE_HOSTNAME: string
  SERVICE_DID: string
}

type CFArgs = [Env, ExecutionContext]

const router = AutoRouter<IRequest, CFArgs>()

// DID Document endpoint
router.get('/.well-known/did.json', (request, env) => {
  const hostname = env.SERVICE_HOSTNAME
  const serviceDid = env.SERVICE_DID

  // Validation: ensure DID matches hostname
  if (!serviceDid.endsWith(hostname)) {
    return new Response('Not Found', { status: 404 })
  }

  const didDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: serviceDid,
    service: [
      {
        id: '#bsky_fg',
        type: 'BskyFeedGenerator',
        serviceEndpoint: `https://${hostname}`
      }
    ]
  }

  return new Response(JSON.stringify(didDocument), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  })
})

// Feed Generator endpoint
router.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (request, env) => {
  // Implementation in separate document
})

export default { ...router }
```

### 4.3 Environment Variables Configuration

**wrangler.toml**:
```toml
name = "atrarium"
main = "src/index.ts"
compatibility_date = "2024-10-01"

[vars]
SERVICE_HOSTNAME = "atrarium.example.com"
SERVICE_DID = "did:web:atrarium.example.com"

# For production, use secrets:
# wrangler secret put JWT_SECRET
```

**Environment Variable Usage**:
- `SERVICE_HOSTNAME`: The domain where feed generator is hosted
- `SERVICE_DID`: The DID identifier (must match hostname for did:web)
- `JWT_SECRET`: (Secret) Used for authentication tokens

---

## 5. Validation and Testing

### 5.1 DID Document Validation

**Manual Validation Steps**:
1. Access `https://your-domain/.well-known/did.json`
2. Verify JSON structure matches specification
3. Validate `id` field matches DID
4. Verify `serviceEndpoint` is accessible

**Automated Validation**:
```bash
# Test DID document endpoint
curl https://atrarium.example.com/.well-known/did.json | jq

# Expected output:
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.example.com",
  "service": [
    {
      "id": "#bsky_fg",
      "type": "BskyFeedGenerator",
      "serviceEndpoint": "https://atrarium.example.com"
    }
  ]
}
```

### 5.2 DID Resolution Testing

**Using @atproto/identity**:
```typescript
import { IdResolver } from '@atproto/identity'

const resolver = new IdResolver()

// Test DID resolution
const didDoc = await resolver.did.resolve('did:web:atrarium.example.com')
console.log(didDoc)

// Verify service endpoint
const service = didDoc?.service?.find(s => s.type === 'BskyFeedGenerator')
console.log('Service endpoint:', service?.serviceEndpoint)
```

### 5.3 Feed Generator Registration

**Publishing to Bluesky**:
```typescript
import { BskyAgent } from '@atproto/api'

const agent = new BskyAgent({ service: 'https://bsky.social' })
await agent.login({
  identifier: 'your-handle.bsky.social',
  password: 'your-app-password'
})

// Publish feed generator
await agent.api.com.atproto.repo.putRecord({
  repo: agent.session.did,
  collection: 'app.bsky.feed.generator',
  rkey: 'atrarium-feed',
  record: {
    did: 'did:web:atrarium.example.com',
    displayName: 'Atrarium Community Feed',
    description: 'Custom community feed for small communities',
    createdAt: new Date().toISOString()
  }
})
```

### 5.4 Local Testing with Miniflare

```bash
# Run locally with Miniflare
npx wrangler dev

# Test DID endpoint
curl http://localhost:8787/.well-known/did.json

# Test with environment variables
npx wrangler dev --var SERVICE_HOSTNAME:localhost:8787 \
  --var SERVICE_DID:did:web:localhost%3A8787
```

---

## 6. Decision and Rationale

### 6.1 Final Decision

**For Atrarium Phase 0 Implementation**:

1. **DID Method**: Use **did:web**
2. **Routing Library**: Use **itty-router**
3. **DID Document Structure**: Minimal (service endpoint only)
4. **Validation**: Hostname matching required
5. **Caching**: 1-hour HTTP cache for DID document

### 6.2 Rationale

**Why did:web?**
- **Simplicity**: No external service dependencies
- **Cost**: Only domain cost (already required)
- **Serverless-Friendly**: Perfect for Cloudflare Workers
- **Migration Path**: Can migrate to did:plc in Phase 1

**Why itty-router?**
- **Size**: < 1KB (critical for Workers)
- **Performance**: Optimized for edge computing
- **TypeScript**: Full type safety
- **Workers-First**: Designed for Cloudflare Workers

**Why Minimal DID Document?**
- **Feed Generators Don't Need**:
  - `verificationMethod` (no signing required)
  - `alsoKnownAs` (no user account association)
  - `authentication` (handled by Bluesky AppView)
- **Only Required**: Service endpoint declaration

### 6.3 Alternatives Considered

**did:plc Instead of did:web**:
- **Pros**: Portable, better privacy, AT Protocol native
- **Cons**: More complex setup, external dependency
- **Decision**: Defer to Phase 1 for long-term stability

**Express Instead of itty-router**:
- **Pros**: Familiar API, extensive ecosystem
- **Cons**: Not optimized for Workers, larger bundle size
- **Decision**: itty-router for Workers optimization

**Static DID Document Without Validation**:
- **Pros**: Simpler implementation
- **Cons**: Security risk, no hostname verification
- **Decision**: Include validation for security

---

## 7. Key Technical Details

### 7.1 DID Document JSON Structure

```typescript
interface DIDDocument {
  '@context': string[]
  id: string  // DID identifier
  service: ServiceEndpoint[]
  alsoKnownAs?: string[]  // Optional for feed generators
  verificationMethod?: VerificationMethod[]  // Optional for feed generators
}

interface ServiceEndpoint {
  id: string  // Must start with # (fragment)
  type: string  // 'BskyFeedGenerator' for feed generators
  serviceEndpoint: string  // HTTPS URL
}
```

### 7.2 Resolution Flow

```
User Requests Feed
    ↓
Bluesky AppView receives feed URI:
  at://did:web:atrarium.example.com/app.bsky.feed.generator/feed-id
    ↓
AppView resolves DID:
  GET https://atrarium.example.com/.well-known/did.json
    ↓
AppView extracts service endpoint:
  https://atrarium.example.com
    ↓
AppView requests feed skeleton:
  GET https://atrarium.example.com/xrpc/app.bsky.feed.getFeedSkeleton
  ?feed=at://did:web:atrarium.example.com/app.bsky.feed.generator/feed-id
    ↓
Feed Generator returns post URIs
```

### 7.3 Security Considerations

**DID Document Security**:
- HTTPS required (no HTTP)
- Valid SSL/TLS certificate
- Hostname validation prevents DID spoofing
- Cache-Control headers prevent stale data

**Rate Limiting**:
- DID document endpoint should be cached (1 hour recommended)
- No authentication required for public DID document
- Implement rate limiting for abuse prevention

**CORS Configuration**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

### 7.4 Performance Optimization

**HTTP Caching**:
```typescript
return new Response(JSON.stringify(didDocument), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',  // 1 hour
    'CDN-Cache-Control': 'public, max-age=86400'  // 24 hours at CDN
  }
})
```

**Cloudflare Edge Caching**:
- DID documents are static
- Can be cached at Cloudflare edge
- Reduces origin requests to near zero

---

## 8. Implementation Checklist

### Phase 0, Week 5-8 Tasks

- [ ] Install itty-router: `npm install itty-router`
- [ ] Create `src/index.ts` with router setup
- [ ] Implement `/.well-known/did.json` endpoint
- [ ] Add hostname validation logic
- [ ] Configure environment variables in wrangler.toml
- [ ] Test DID document locally with Miniflare
- [ ] Deploy to Cloudflare Workers
- [ ] Verify DID resolution with curl
- [ ] Test with @atproto/identity resolver
- [ ] Register feed generator with Bluesky
- [ ] Verify feed appears in Bluesky app

### Deployment Commands

```bash
# Local development
npx wrangler dev

# Test DID endpoint
curl http://localhost:8787/.well-known/did.json | jq

# Deploy to production
npx wrangler deploy

# Verify production
curl https://atrarium.example.com/.well-known/did.json | jq

# Set production secrets
npx wrangler secret put JWT_SECRET
```

---

## 9. References

### Official Documentation

- [AT Protocol DID Specification](https://atproto.com/specs/did)
- [AT Protocol Identity Guide](https://atproto.com/guides/identity)
- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [W3C did:web Method Specification](https://w3c-ccg.github.io/did-method-web/)
- [Bluesky Feed Generator Guide](https://docs.bsky.app/docs/starter-templates/custom-feeds)
- [Bluesky Feed Generator Starter Kit](https://github.com/bluesky-social/feed-generator)

### Cloudflare Documentation

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers Routing](https://developers.cloudflare.com/workers/configuration/routing/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

### Libraries and Tools

- [itty-router](https://itty.dev/itty-router/) - Routing library
- [itty-router for Cloudflare Workers](https://itty.dev/itty-router/guides/cloudflare-workers)
- [@atproto/api](https://www.npmjs.com/package/@atproto/api) - AT Protocol SDK
- [@atproto/identity](https://atproto.blue/en/latest/atproto_identity/index.html) - DID resolver

### Reference Implementations

- [Bluesky Feed Generator (Official)](https://github.com/bluesky-social/feed-generator)
- [Contrails - AT Protocol Feed Generator on Cloudflare Workers](https://github.com/jcsalterego/Contrails)
- [Serverless ATProto on Cloudflare](https://blog.cloudflare.com/serverless-atproto/)

### Community Resources

- [AT Protocol Discord](https://discord.gg/atproto) - Developer community
- [Bluesky GitHub](https://github.com/bluesky-social) - Official repositories
- [Cloudflare Workers Community](https://community.cloudflare.com/c/developers/workers-platform/)

---

## Appendix A: Complete Working Example

**src/index.ts**:
```typescript
import { AutoRouter, IRequest } from 'itty-router'

interface Env {
  DB: D1Database
  POST_CACHE: KVNamespace
  FIREHOSE_CONSUMER: DurableObjectNamespace
  SERVICE_HOSTNAME: string
  SERVICE_DID: string
  JWT_SECRET: string
}

type CFArgs = [Env, ExecutionContext]

const router = AutoRouter<IRequest, CFArgs>({
  // Handle CORS preflight
  before: [
    (request) => {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        })
      }
    }
  ],
  // Add CORS headers to all responses
  finally: [
    (response) => {
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }
  ]
})

// DID Document endpoint
router.get('/.well-known/did.json', (request, env) => {
  const hostname = env.SERVICE_HOSTNAME
  const serviceDid = env.SERVICE_DID

  // Validation: ensure DID matches hostname
  if (!serviceDid.endsWith(hostname)) {
    return new Response('Not Found', { status: 404 })
  }

  const didDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: serviceDid,
    service: [
      {
        id: '#bsky_fg',
        type: 'BskyFeedGenerator',
        serviceEndpoint: `https://${hostname}`
      }
    ]
  }

  return new Response(JSON.stringify(didDocument, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  })
})

// Health check endpoint
router.get('/health', () => {
  return { status: 'ok', timestamp: Date.now() }
})

// Feed Generator endpoint (placeholder)
router.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (request, env) => {
  return {
    feed: [],
    cursor: undefined
  }
})

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }))

export default { ...router }
```

**wrangler.toml**:
```toml
name = "atrarium"
main = "src/index.ts"
compatibility_date = "2024-10-01"

[vars]
SERVICE_HOSTNAME = "atrarium.example.com"
SERVICE_DID = "did:web:atrarium.example.com"

[[d1_databases]]
binding = "DB"
database_name = "atrarium-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "POST_CACHE"
id = "your-kv-namespace-id"

[durable_objects]
bindings = [
  { name = "FIREHOSE_CONSUMER", class_name = "FirehoseConsumer" }
]
```

**package.json**:
```json
{
  "name": "atrarium",
  "version": "0.1.0",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "itty-router": "^5.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241004.0",
    "typescript": "^5.6.0",
    "wrangler": "^3.78.0"
  }
}
```

---

**Document Status**: Complete
**Next Steps**: Implement feed generator endpoint and Firehose integration
**Related Documents**:
- `feed-generator-implementation.md` (to be created)
- `firehose-integration.md` (to be created)
