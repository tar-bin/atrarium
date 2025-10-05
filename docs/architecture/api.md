---
title: API Design
description: Atrarium API endpoints and Feed Generator specification
order: 3
---

# API Design

Atrarium implements two APIs:

1. **Feed Generator API** (AT Protocol standard)
2. **Dashboard API** (Internal management)

## Feed Generator API

Implements AT Protocol's Feed Generator specification.

### DID Document

**Endpoint**: `GET /.well-known/did.json`

Returns DID document identifying this feed generator.

**Response**:
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

**Response**:
```json
{
  "feed": [
    { "post": "at://did:plc:xxx/app.bsky.feed.post/yyy" },
    { "post": "at://did:plc:zzz/app.bsky.feed.post/aaa" }
  ],
  "cursor": "1234567890"
}
```

**Example**:
```bash
curl "https://atrarium.net/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:xxx/app.bsky.feed.generator/typescript-tips&limit=20"
```

### Feed Metadata

**Endpoint**: `GET /xrpc/app.bsky.feed.describeFeedGenerator`

Returns metadata about available feeds.

**Response**:
```json
{
  "did": "did:web:atrarium.net",
  "feeds": [
    {
      "uri": "at://did:plc:xxx/app.bsky.feed.generator/typescript-tips",
      "displayName": "TypeScript Tips",
      "description": "Best TypeScript practices and tips"
    }
  ]
}
```

## Dashboard API

Internal API for community management (requires JWT authentication).

### Authentication

All Dashboard API endpoints require JWT token in Authorization header:

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" https://atrarium.net/api/communities
```

### Communities

#### Create Community

**Endpoint**: `POST /api/communities`

**Request**:
```json
{
  "name": "TypeScript Enthusiasts",
  "stage": "theme",
  "parent_id": null
}
```

**Response**:
```json
{
  "id": 1,
  "name": "TypeScript Enthusiasts",
  "stage": "theme",
  "parent_id": null,
  "feed_mix": { "own": 80, "parent": 15, "global": 5 },
  "created_at": 1704067200
}
```

#### List Communities

**Endpoint**: `GET /api/communities`

**Query Parameters**:
- `stage` (optional): Filter by stage (theme/community/graduated)
- `parent_id` (optional): Filter by parent

**Response**:
```json
{
  "communities": [
    {
      "id": 1,
      "name": "TypeScript Enthusiasts",
      "stage": "theme",
      "member_count": 15,
      "post_count": 342
    }
  ]
}
```

#### Get Community

**Endpoint**: `GET /api/communities/:id`

**Response**:
```json
{
  "id": 1,
  "name": "TypeScript Enthusiasts",
  "stage": "community",
  "parent_id": null,
  "feed_mix": { "own": 80, "parent": 15, "global": 5 },
  "health_metrics": {
    "activity_score": 0.75,
    "growth_rate": 0.12,
    "engagement_rate": 0.68
  },
  "member_count": 48,
  "post_count": 1250,
  "created_at": 1704067200
}
```

#### Update Community

**Endpoint**: `PUT /api/communities/:id`

**Request**:
```json
{
  "name": "Advanced TypeScript",
  "stage": "community",
  "feed_mix": { "own": 90, "parent": 10, "global": 0 }
}
```

### Theme Feeds

#### Create Feed

**Endpoint**: `POST /api/feeds`

**Request**:
```json
{
  "community_id": 1,
  "name": "TypeScript Tips",
  "filter_config": {
    "hashtags": ["#TypeScript", "#TS"],
    "keywords": ["typescript", "type safety"],
    "authors": ["did:plc:example"]
  }
}
```

**Response**:
```json
{
  "id": 1,
  "community_id": 1,
  "name": "TypeScript Tips",
  "feed_uri": "at://did:web:atrarium.net/app.bsky.feed.generator/typescript-tips",
  "filter_config": { /* ... */ },
  "post_count": 0,
  "created_at": 1704067200
}
```

#### List Feeds

**Endpoint**: `GET /api/feeds?community_id=:id`

**Response**:
```json
{
  "feeds": [
    {
      "id": 1,
      "name": "TypeScript Tips",
      "feed_uri": "at://...",
      "post_count": 425,
      "last_post_at": 1704153600
    }
  ]
}
```

### Memberships

#### Add Member

**Endpoint**: `POST /api/communities/:id/members`

**Request**:
```json
{
  "user_did": "did:plc:xxx",
  "role": "member"
}
```

**Response**:
```json
{
  "community_id": 1,
  "user_did": "did:plc:xxx",
  "role": "member",
  "joined_at": 1704067200
}
```

#### List Members

**Endpoint**: `GET /api/communities/:id/members`

**Response**:
```json
{
  "members": [
    {
      "user_did": "did:plc:xxx",
      "role": "owner",
      "joined_at": 1704067200
    },
    {
      "user_did": "did:plc:yyy",
      "role": "member",
      "joined_at": 1704153600
    }
  ]
}
```

#### Update Role

**Endpoint**: `PUT /api/communities/:id/members/:did`

**Request**:
```json
{
  "role": "moderator"
}
```

### Statistics

#### Community Stats

**Endpoint**: `GET /api/communities/:id/stats`

**Response**:
```json
{
  "community_id": 1,
  "stats": {
    "total_members": 48,
    "total_posts": 1250,
    "active_feeds": 3,
    "health_metrics": {
      "activity_score": 0.75,
      "growth_rate": 0.12,
      "engagement_rate": 0.68
    }
  },
  "timeline": {
    "daily": [/* 30 days of stats */],
    "weekly": [/* 12 weeks of stats */]
  }
}
```

## Error Responses

All endpoints return errors in standard format:

```json
{
  "error": "unauthorized",
  "message": "Invalid or expired JWT token"
}
```

**Common Error Codes**:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

**Current Status**: Not implemented (Phase 1 feature)

**Planned Limits**:
- Feed Generator API: 100 requests/hour/user
- Dashboard API: 1000 requests/hour/user

## CORS Configuration

All endpoints support CORS for dashboard access:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Related Documentation

- [System Architecture](/architecture/system-design)
- [Database Schema](/architecture/database)
- [Implementation Guide](/reference/implementation)
