# Quickstart: AT Protocol Lexicon Publication

**Feature**: 010-lexicon
**Purpose**: Verify Lexicon schemas are correctly published and accessible via HTTP endpoints.

This quickstart validates the primary user story from [spec.md](./spec.md):
> "When a user creates a community record in their Personal Data Server (PDS), the PDS needs to validate the record against Atrarium's custom Lexicon schema."

---

## Prerequisites

- Atrarium Workers deployed (local dev server or production)
- `curl` or similar HTTP client installed
- (Optional) `jq` for JSON formatting

---

## Test Steps

### 1. Fetch Community Config Schema

**Expected**: PDS fetches `net.atrarium.community.config` schema to validate community records.

```bash
curl -v http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config
```

**Expected Output**:
```json
{
  "$type": "com.atproto.lexicon.schema",
  "lexicon": 1,
  "id": "net.atrarium.community.config",
  "defs": {
    "main": {
      "type": "record",
      "description": "Community configuration record...",
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

**Validation**:
- ✅ HTTP Status: `200 OK`
- ✅ Content-Type: `application/json`
- ✅ ETag header present (e.g., `"a1b2c3d4e5f6g7h8"`)
- ✅ Cache-Control header: `public, max-age=3600`
- ✅ CORS header: `Access-Control-Allow-Origin: *`
- ✅ JSON structure matches AT Protocol Lexicon format

---

### 2. Validate JSON Structure

**Purpose**: Ensure schema contains all required AT Protocol Lexicon fields.

```bash
curl -s http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config | jq '
  .["$type"],
  .lexicon,
  .id,
  .defs.main.type
'
```

**Expected Output**:
```json
"com.atproto.lexicon.schema"
1
"net.atrarium.community.config"
"record"
```

**Validation**:
- ✅ `$type` is `"com.atproto.lexicon.schema"`
- ✅ `lexicon` is `1`
- ✅ `id` matches requested NSID
- ✅ `defs.main` exists with `type: "record"`

---

### 3. Test HTTP Caching (ETag)

**Purpose**: Verify conditional requests return 304 Not Modified.

**Step 3.1: Get initial ETag**
```bash
# Extract ETag from response headers
ETAG=$(curl -s -D - http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config | grep -i 'etag:' | awk '{print $2}' | tr -d '\r')
echo "ETag: $ETAG"
```

**Expected**: ETag value like `"a1b2c3d4e5f6g7h8"`

**Step 3.2: Send conditional request**
```bash
curl -v -H "If-None-Match: $ETAG" http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config
```

**Expected Output**:
```http
HTTP/1.1 304 Not Modified
ETag: "a1b2c3d4e5f6g7h8"
Cache-Control: public, max-age=3600
```

**Validation**:
- ✅ HTTP Status: `304 Not Modified`
- ✅ No response body
- ✅ ETag header matches original

---

### 4. Test All 3 Schemas

**Purpose**: Verify all Atrarium Lexicon schemas are accessible.

```bash
# Community Config
curl -I http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config | grep -E "HTTP|ETag"

# Community Membership
curl -I http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.membership | grep -E "HTTP|ETag"

# Moderation Action
curl -I http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.moderation.action | grep -E "HTTP|ETag"
```

**Expected Output** (for each):
```
HTTP/1.1 200 OK
ETag: "<unique-hash-per-schema>"
```

**Validation**:
- ✅ All 3 schemas return `200 OK`
- ✅ Each schema has a different ETag

---

### 5. Test Error Handling

**Purpose**: Verify unknown NSID returns 404.

```bash
curl -v http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.unknown.schema
```

**Expected Output**:
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "InvalidRequest",
  "message": "Unknown lexicon NSID: net.atrarium.unknown.schema"
}
```

**Validation**:
- ✅ HTTP Status: `404 Not Found`
- ✅ Error message includes unknown NSID

---

### 6. Test CORS Preflight

**Purpose**: Verify cross-origin requests work for PDS servers.

```bash
curl -X OPTIONS -v \
  -H "Origin: https://example-pds.com" \
  -H "Access-Control-Request-Method: GET" \
  http://localhost:8787/xrpc/net.atrarium.lexicon.get
```

**Expected Output**:
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Max-Age: 86400
```

**Validation**:
- ✅ HTTP Status: `204 No Content`
- ✅ CORS headers allow GET requests
- ✅ Origin wildcard (`*`)

---

### 7. Measure Response Time

**Purpose**: Verify performance requirement (< 100ms p95).

```bash
# Make 20 requests and measure response time
for i in {1..20}; do
  curl -w "%{time_total}\n" -o /dev/null -s http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config
done | sort -n | awk 'NR==19 {print "p95:", $1*1000, "ms"}'
```

**Expected Output**:
```
p95: 45.2 ms
```

**Validation**:
- ✅ p95 response time < 100ms

---

## Integration Test Scenario

**Simulated PDS Workflow**:

1. **PDS receives community config record from user**
2. **PDS fetches Lexicon schema** (Step 1 above)
3. **PDS validates record against schema**:
   ```bash
   # Example: Validate that "stage" field accepts "theme" value
   curl -s http://localhost:8787/xrpc/net.atrarium.lexicon.get?nsid=net.atrarium.community.config | jq '
     .defs.main.record.properties.stage.enum[]
   '
   ```
   **Expected**: `["theme", "community", "graduated"]`

4. **PDS stores validated record** (success)

**End-to-End Validation**:
- ✅ Schema fetch succeeds
- ✅ Schema defines expected fields (`name`, `hashtag`, `stage`, `createdAt`)
- ✅ Enum values match Atrarium's community stages

---

## Acceptance Criteria (from spec.md)

**Scenario 1**: ✅ PDS fetches `net.atrarium.community.config` schema successfully
- Validated in Step 1

**Scenario 2**: ✅ AT Protocol client validates membership record structure
- Schema accessible (Step 4)
- Schema defines all required fields (Step 2)

**Scenario 3**: ✅ Moderation action schema validates all action types
- Schema accessible (Step 4)
- Action enum values: `["hide_post", "unhide_post", "block_user", "unblock_user"]`

---

## Cleanup

No cleanup required (stateless HTTP requests).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `curl: (7) Failed to connect` | Ensure Cloudflare Workers dev server is running (`npm run dev`) |
| `404 Not Found` for valid NSID | Check that Lexicon JSON files exist in `src/lexicons/` |
| ETag changes on every request | Verify JSON serialization is deterministic (stable key order) |
| 304 not working | Check `If-None-Match` header format (must be quoted) |

---

**Status**: ⏳ Ready to execute after implementation (tests will initially fail - TDD approach)

**Next Steps**: Run `/tasks` to generate implementation tasks.
