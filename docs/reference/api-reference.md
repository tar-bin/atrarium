---
title: API Reference
description: Complete API endpoint reference for Atrarium
order: 1
---

# API Reference

Complete reference for all Atrarium API endpoints.

::: tip
This page provides a quick reference. For detailed design and examples, see [API Design](/en/architecture/api).
:::

## Feed Generator API

AT Protocol standard endpoints.

### GET /.well-known/did.json

Returns DID document identifying this feed generator.

**Response**: `application/json`

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

### GET /xrpc/app.bsky.feed.getFeedSkeleton

Returns feed skeleton (post URIs only).

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `feed` | string | Yes | Feed URI (at://...) |
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Number of posts (default: 50, max: 100) |

**Response**: `application/json`

```json
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" }
  ],
  "cursor": "1234567890"
}
```

### GET /xrpc/app.bsky.feed.describeFeedGenerator

Returns metadata about available feeds.

**Response**: `application/json`

```json
{
  "did": "did:web:atrarium.net",
  "feeds": [
    {
      "uri": "at://did:plc:xxx/app.bsky.feed.generator/feed-id",
      "displayName": "Feed Name",
      "description": "Feed description"
    }
  ]
}
```

## Dashboard API

Internal management API (requires JWT authentication).

::: warning Authentication Required
All Dashboard API endpoints require `Authorization: Bearer <token>` header.
:::

### Communities

#### POST /api/communities

Create a new community.

**Request Body**:
```json
{
  "name": "Community Name",
  "stage": "theme",
  "parent_id": null
}
```

**Response**: `201 Created`

#### GET /api/communities

List communities.

**Query Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `stage` | string | Filter by stage (theme/community/graduated) |
| `parent_id` | number | Filter by parent community |

**Response**: `200 OK`

#### GET /api/communities/:id

Get community details.

**Response**: `200 OK`

#### PUT /api/communities/:id

Update community.

**Request Body**:
```json
{
  "name": "New Name",
  "stage": "community",
  "feed_mix": { "own": 80, "parent": 15, "global": 5 }
}
```

**Response**: `200 OK`

#### DELETE /api/communities/:id

Delete community (owner only).

**Response**: `204 No Content`

### Theme Feeds

#### POST /api/feeds

Create a theme feed.

**Request Body**:
```json
{
  "community_id": 1,
  "name": "Feed Name",
  "filter_config": {
    "hashtags": ["#tag"],
    "keywords": ["keyword"],
    "authors": ["did:plc:xxx"]
  }
}
```

**Response**: `201 Created`

#### GET /api/feeds

List feeds.

**Query Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `community_id` | number | Filter by community |

**Response**: `200 OK`

#### GET /api/feeds/:id

Get feed details.

**Response**: `200 OK`

#### PUT /api/feeds/:id

Update feed configuration.

**Request Body**:
```json
{
  "name": "New Name",
  "filter_config": { /* ... */ }
}
```

**Response**: `200 OK`

#### DELETE /api/feeds/:id

Delete feed.

**Response**: `204 No Content`

### Memberships

#### POST /api/communities/:id/members

Add member to community.

**Request Body**:
```json
{
  "user_did": "did:plc:xxx",
  "role": "member"
}
```

**Response**: `201 Created`

#### GET /api/communities/:id/members

List community members.

**Response**: `200 OK`

#### PUT /api/communities/:id/members/:did

Update member role.

**Request Body**:
```json
{
  "role": "moderator"
}
```

**Response**: `200 OK`

#### DELETE /api/communities/:id/members/:did

Remove member.

**Response**: `204 No Content`

### Statistics

#### GET /api/communities/:id/stats

Get community statistics.

**Response**: `200 OK`

```json
{
  "community_id": 1,
  "stats": {
    "total_members": 48,
    "total_posts": 1250,
    "active_feeds": 3,
    "health_metrics": { /* ... */ }
  },
  "timeline": {
    "daily": [/* ... */],
    "weekly": [/* ... */]
  }
}
```

## Error Responses

All endpoints return errors in standard format:

**Response**: `4xx` or `5xx`

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `bad_request` | 400 | Invalid request parameters |
| `unauthorized` | 401 | Missing or invalid authentication |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict (e.g., duplicate name) |
| `internal_error` | 500 | Server error |

## Authentication

### JWT Token Format

```json
{
  "did": "did:plc:xxx",
  "handle": "user.bsky.social",
  "iat": 1704067200,
  "exp": 1704153600
}
```

### Token Usage

```bash
curl -H "Authorization: Bearer eyJhbGc..." https://atrarium.net/api/communities
```

## Rate Limits

::: info Coming in Phase 1
Rate limiting is not currently implemented but is planned for Phase 1.
:::

**Planned Limits**:
- Feed Generator API: 100 requests/hour/user
- Dashboard API: 1000 requests/hour/user

**Rate Limit Headers** (future):
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1704067200
```

## Related Documentation

- [API Design](/en/architecture/api) - Detailed design and examples
- [System Architecture](/en/architecture/system-design) - Overall architecture
- [Implementation Guide](/en/reference/implementation) - Development details
