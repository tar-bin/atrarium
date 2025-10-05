---
title: API Reference
description: Atrarium API endpoints and interactive documentation
order: 3
---

# API Reference

Atrarium implements two APIs:

1. **Feed Generator API** (AT Protocol standard)
2. **Dashboard API** (Internal management)

## Interactive API Documentation

**Swagger UI**: [https://atrarium.net/api/docs](https://atrarium.net/api/docs)

For the most up-to-date API documentation, please visit the Swagger UI endpoint, which provides:
- Interactive API exploration
- Request/response examples
- Schema definitions
- Authentication flows

**OpenAPI Specification**: [https://atrarium.net/api/openapi.json](https://atrarium.net/api/openapi.json)

## Feed Generator API

Implements AT Protocol's Feed Generator specification.

### DID Document

**Endpoint**: `GET /.well-known/did.json`

Returns DID document identifying this feed generator.

**Example Response**:
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:atrarium.net",
  "service": [{
    "id": "#bsky_fg",
    "type": "BskyFeedGenerator",
    "serviceEndpoint": "https://atrarium.net"
  }]
}
```

### Feed Skeleton

**Endpoint**: `GET /xrpc/app.bsky.feed.getFeedSkeleton`

Returns feed skeleton (post URIs only, no content).

**Parameters**:
- `feed` (required): Feed URI (at://did:plc:xxx/app.bsky.feed.generator/feed-id)
- `cursor` (optional): Pagination cursor
- `limit` (optional): Number of posts (default: 50, max: 100)

**Example Request**:
```bash
curl "https://atrarium.net/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:xxx/app.bsky.feed.generator/community-name&limit=20"
```

**Example Response**:
```json
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" },
    { "post": "at://did:plc:zzz/app.bsky.feed.post/aaa" }
  ],
  "cursor": "1234567890"
}
```

### Feed Metadata

**Endpoint**: `GET /xrpc/app.bsky.feed.describeFeedGenerator`

Returns metadata about available feeds.

**Example Response**:
```json
{
  "did": "did:web:atrarium.net",
  "feeds": [
    {
      "uri": "at://did:plc:xxx/app.bsky.feed.generator/community-name",
      "displayName": "Community Name",
      "description": "Community description"
    }
  ]
}
```

## Dashboard API

Internal API for community management (requires JWT authentication).

### Authentication

All Dashboard API endpoints require JWT token in `Authorization` header:

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" https://atrarium.net/api/communities
```

### Endpoints Overview

**Communities**:
- `POST /api/communities` - Create community (writes to PDS)
- `GET /api/communities` - List communities
- `GET /api/communities/:id` - Get community details
- `PUT /api/communities/:id` - Update community

**Memberships**:
- `POST /api/communities/:id/members` - Add member (writes to PDS)
- `GET /api/communities/:id/members` - List members
- `PUT /api/communities/:id/members/:did` - Update role

**Moderation**:
- `POST /api/moderation/actions` - Create moderation action (writes to PDS)
- `GET /api/moderation/actions` - List moderation actions

For detailed request/response schemas, please refer to the [Swagger UI documentation](https://atrarium.net/api/docs).

## Error Responses

All endpoints return errors in standard format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

**Common HTTP Status Codes**:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

**Current Status**: Not implemented (planned for Phase 1+)

**Planned Limits**:
- Feed Generator API: 100 requests/hour/user
- Dashboard API: 1000 requests/hour/user

## CORS Configuration

All endpoints support CORS for dashboard access:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Related Documentation

- [System Architecture](/ja/architecture/system-design) - Overall system design
- [Data Storage](/ja/architecture/database) - Storage architecture
- [Implementation Guide](/ja/reference/implementation) - Development guide
- [AT Protocol Documentation](https://atproto.com/docs) - AT Protocol specs
