# Atrarium API Documentation

## Overview

Atrarium provides a RESTful API for community management, built on AT Protocol. All endpoints return JSON responses and use standard HTTP status codes.

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Emoji Management API

### POST /api/emoji/upload

Upload a custom emoji to the user's PDS.

**Authentication**: Required

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file` (File): Image file (PNG/GIF/WEBP, max 500KB, max 256×256px)
  - `shortcode` (string): Emoji shortcode (lowercase alphanumeric + underscore, 2-32 chars)

**Response** (200):
```json
{
  "emojiURI": "at://did:plc:xxx/net.atrarium.emoji.custom/abc123",
  "blobRef": {
    "$type": "blob",
    "ref": { "$link": "bafyreib2rxk3rh6kzwq..." },
    "mimeType": "image/png",
    "size": 50000
  }
}
```

**Errors**:
- `400`: Invalid file format, size, or shortcode
- `401`: Unauthorized

---

### GET /api/emoji/list

List user's uploaded custom emoji.

**Authentication**: Required

**Request**:
- Method: `GET`

**Response** (200):
```json
{
  "emoji": [
    {
      "$type": "net.atrarium.emoji.custom",
      "uri": "at://did:plc:xxx/net.atrarium.emoji.custom/abc123",
      "shortcode": "my_emoji",
      "blob": {
        "$type": "blob",
        "ref": { "$link": "bafyreib2rxk3rh6kzwq..." },
        "mimeType": "image/png",
        "size": 50000
      },
      "creator": "did:plc:xxx",
      "uploadedAt": "2025-01-15T10:30:00Z",
      "format": "png",
      "size": 50000,
      "dimensions": { "width": 128, "height": 128 },
      "animated": false
    }
  ]
}
```

---

### POST /api/communities/:id/emoji/submit

Submit custom emoji for community approval.

**Authentication**: Required

**Request**:
- Method: `POST`
- Path Parameters:
  - `id` (string): Community ID (8-character hex)
- Body:
```json
{
  "emojiURI": "at://did:plc:xxx/net.atrarium.emoji.custom/abc123"
}
```

**Response** (200):
```json
{
  "approvalURI": "at://did:plc:owner/net.atrarium.emoji.approval/def456"
}
```

**Errors**:
- `400`: Invalid community ID or emoji URI
- `401`: Unauthorized
- `404`: Community or emoji not found

---

### GET /api/communities/:id/emoji/pending

List pending emoji submissions (owner/moderator only).

**Authentication**: Required (owner/moderator)

**Request**:
- Method: `GET`
- Path Parameters:
  - `id` (string): Community ID

**Response** (200):
```json
{
  "submissions": [
    {
      "emojiUri": "at://did:plc:xxx/net.atrarium.emoji.custom/abc123",
      "shortcode": "my_emoji",
      "submitter": "did:plc:xxx",
      "submittedAt": "2025-01-15T10:35:00Z",
      "status": "pending"
    }
  ]
}
```

---

### POST /api/communities/:id/emoji/approve

Approve or reject emoji submission (owner/moderator only).

**Authentication**: Required (owner/moderator)

**Request**:
- Method: `POST`
- Path Parameters:
  - `id` (string): Community ID
- Body:
```json
{
  "emojiURI": "at://did:plc:xxx/net.atrarium.emoji.custom/abc123",
  "approve": true,
  "reason": "Looks good!" // optional
}
```

**Response** (200):
```json
{
  "approvalURI": "at://did:plc:owner/net.atrarium.emoji.approval/def456",
  "status": "approved"
}
```

**Errors**:
- `400`: Invalid request
- `401`: Unauthorized
- `403`: Insufficient permissions

---

### POST /api/communities/:id/emoji/revoke

Revoke previously approved emoji (owner/moderator only).

**Authentication**: Required (owner/moderator)

**Request**:
- Method: `POST`
- Path Parameters:
  - `id` (string): Community ID
- Body:
```json
{
  "shortcode": "my_emoji",
  "reason": "No longer appropriate" // optional
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

### GET /api/communities/:id/emoji/registry

Get approved emoji registry for community.

**Authentication**: Optional

**Request**:
- Method: `GET`
- Path Parameters:
  - `id` (string): Community ID

**Response** (200):
```json
{
  "emoji": {
    "my_emoji": {
      "emojiURI": "at://did:plc:xxx/net.atrarium.emoji.custom/abc123",
      "blobURI": "https://cdn.bsky.app/img/avatar/plain/...",
      "animated": false
    },
    "party_parrot": {
      "emojiURI": "at://did:plc:yyy/net.atrarium.emoji.custom/xyz789",
      "blobURI": "https://cdn.bsky.app/img/avatar/plain/...",
      "animated": true
    }
  }
}
```

---

## Markdown Support

### Extended Syntax

Community posts support Markdown formatting with GitHub Flavored Markdown (GFM) extensions:

- **Basic**: Bold (`**text**`), italic (`*text*`), code (`` `code` ``)
- **Lists**: Ordered (`1. item`), unordered (`- item`), task lists (`- [x] done`)
- **Tables**: Pipe-separated tables with alignment
- **Strikethrough**: `~~deleted~~`
- **Code blocks**: `` ```language `` with syntax highlighting

### Security

- **XSS Protection**: All HTML is sanitized via DOMPurify
- **Blocked protocols**: `javascript:`, `data:`, `vbscript:`
- **Stripped tags**: `<script>`, `<iframe>`, `<object>`, `<embed>`
- **Removed attributes**: `onclick`, `onerror`, `onload`

### Emoji Shortcodes

Posts can include custom emoji using shortcodes (`:emoji_name:`):

- Replaced with `<img>` tags in rendered output
- Preserved in code blocks and inline code
- Only approved community emoji are rendered
- Fallback to plain text for unknown shortcodes

**Example**:
```markdown
**Hello** :wave: world!

- Task 1 :check:
- [x] Completed :party:

\`\`\`
// Emoji in code are preserved: :wave:
\`\`\`
```

---

## Rate Limits

- **Upload**: 10 emoji per user per hour
- **Submissions**: 20 submissions per community per day
- **API requests**: 100 requests per minute per user

## Error Responses

All errors return a JSON response with `error` field:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid JWT)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error
