# API Contract: Lexicon Endpoint

**Endpoint**: `GET /xrpc/net.atrarium.lexicon.get`
**Alternative**: `GET /.well-known/atproto-lexicon/{nsid}.json` (if following proposed convention)

## Request

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nsid` | string (query or path) | Yes | Lexicon schema NSID (e.g., `net.atrarium.community.config`) |

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `If-None-Match` | No | ETag value from previous request (for conditional caching) |

### Example Request
```http
GET /xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config HTTP/1.1
Host: atrarium.net
If-None-Match: "a1b2c3d4e5f6g7h8"
```

---

## Response: Success (200 OK)

### Status Code
`200 OK`

### Headers
| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `Content-Type` | Yes | `application/json` | JSON response |
| `ETag` | Yes | `"<hash>"` | SHA-256 content hash (first 16 chars) |
| `Cache-Control` | Yes | `public, max-age=3600` (beta) or `public, max-age=86400, immutable` (stable) | Caching policy |
| `Access-Control-Allow-Origin` | Yes | `*` | CORS allow all origins |
| `Access-Control-Allow-Methods` | Yes | `GET, OPTIONS` | Allowed HTTP methods |

### Body
```json
{
  "$type": "com.atproto.lexicon.schema",
  "lexicon": 1,
  "id": "net.atrarium.community.config",
  "defs": {
    "main": {
      "type": "record",
      "description": "Community configuration record stored in the owner's Personal Data Server (PDS)",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["name", "hashtag", "stage", "createdAt"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Community display name",
            "maxLength": 200,
            "maxGraphemes": 100
          },
          "hashtag": {
            "type": "string",
            "description": "System-generated unique hashtag",
            "pattern": "^#atrarium_[0-9a-f]{8}$"
          },
          "stage": {
            "type": "string",
            "description": "Community development stage",
            "enum": ["theme", "community", "graduated"]
          },
          "createdAt": {
            "type": "string",
            "format": "datetime",
            "description": "Community creation timestamp (ISO 8601)"
          }
        }
      }
    }
  }
}
```

### Example Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "a1b2c3d4e5f6g7h8"
Cache-Control: public, max-age=3600
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS

{/* JSON body as above */}
```

---

## Response: Not Modified (304)

### Status Code
`304 Not Modified`

### Condition
Request includes `If-None-Match` header with ETag matching current schema version.

### Headers
| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `ETag` | Yes | `"<hash>"` | Current ETag (matches If-None-Match) |
| `Cache-Control` | Yes | `public, max-age=3600` | Caching policy |

### Body
**Empty** (no content sent for 304 responses)

### Example Response
```http
HTTP/1.1 304 Not Modified
ETag: "a1b2c3d4e5f6g7h8"
Cache-Control: public, max-age=3600
```

---

## Response: Not Found (404)

### Status Code
`404 Not Found`

### Condition
Invalid or unknown NSID requested.

### Headers
| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |
| `Access-Control-Allow-Origin` | Yes | `*` |

### Body
```json
{
  "error": "InvalidRequest",
  "message": "Unknown lexicon NSID: net.atrarium.unknown.schema"
}
```

---

## Supported Schemas (Phase 1)

1. `net.atrarium.community.config` - Community metadata
2. `net.atrarium.community.membership` - User membership records
3. `net.atrarium.moderation.action` - Moderation action records

---

## CORS Preflight (OPTIONS)

### Request
```http
OPTIONS /xrpc/net.atrarium.lexicon.get HTTP/1.1
Host: atrarium.net
Origin: https://example-pds.com
Access-Control-Request-Method: GET
Access-Control-Request-Headers: If-None-Match
```

### Response
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: If-None-Match
Access-Control-Max-Age: 86400
```

---

## Validation Rules

1. **NSID Format**: Must match `^[a-z]+(\.[a-z]+)+\.[a-z]+$`
2. **ETag Format**: Must be quoted string (RFC 7232)
3. **Lexicon Schema**: Must validate against AT Protocol Lexicon meta-schema
4. **Cache-Control**: Must include `public` and appropriate `max-age`

---

## Performance Requirements

- Response time (p95): < 100ms
- ETag generation overhead: < 1ms
- Cloudflare edge caching: Automatic after first request

---

## Security Considerations

- **No authentication required**: Public endpoint (FR-004)
- **CORS enabled**: Allow all origins (wildcard `*`)
- **Rate limiting**: Rely on Cloudflare Workers default limits
- **Input validation**: Strict NSID format validation to prevent injection

---

*This contract defines the HTTP interface for serving AT Protocol Lexicon schemas.*
