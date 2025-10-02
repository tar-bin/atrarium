# Quickstart Guide: Atrarium MVP

**Feature**: Atrarium MVP - Community Management System on AT Protocol
**Branch**: `001-`
**Date**: 2025-10-02
**Purpose**: End-to-end validation workflow for local development and testing

---

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **wrangler CLI**: Latest version (`npm install -g wrangler`)
- **Git**: Any recent version

### Accounts & Credentials
- **Cloudflare Account**: Free tier acceptable for Phase 0
- **Bluesky Account**: For testing AT Protocol integration (bsky.social)

---

## Initial Setup (30-45 minutes)

### 1. Install Dependencies
```bash
# Clone repository (if not already)
git clone <repository-url>
cd atrarium

# Install backend dependencies
npm install

# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

**Expected output**: Browser opens for Cloudflare authentication

---

### 2. Create Cloudflare Resources

#### D1 Database
```bash
# Create D1 database
wrangler d1 create atrarium-db

# Expected output:
# ✅ Successfully created DB 'atrarium-db'!
#
# [[d1_databases]]
# binding = "DB"
# database_name = "atrarium-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Copy the database_id for wrangler.toml
```

#### KV Namespace
```bash
# Create KV namespace (production)
wrangler kv:namespace create POST_CACHE

# Expected output:
# ✅ Successfully created KV namespace!
#
# [[kv_namespaces]]
# binding = "POST_CACHE"
# id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Create KV namespace (preview/development)
wrangler kv:namespace create POST_CACHE --preview

# Expected output:
# ✅ Successfully created KV namespace!
#
# [[kv_namespaces]]
# binding = "POST_CACHE"
# preview_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
```

---

### 3. Configure wrangler.toml
Update `/workspaces/atrarium/wrangler.toml` with the generated IDs:

```toml
name = "atrarium"
main = "src/index.ts"
compatibility_date = "2024-10-22"

# D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "atrarium-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # From step 2

# KV Namespace Binding
[[kv_namespaces]]
binding = "POST_CACHE"
id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # From step 2
preview_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"  # From step 2

# Environment Variables
[vars]
ENVIRONMENT = "development"

# Cron Triggers (for post deletion sync)
[triggers]
crons = ["0 */12 * * *"]  # Every 12 hours
```

---

### 4. Initialize Database Schema
```bash
# Apply schema to local database
wrangler d1 execute atrarium-db --local --file=./schema.sql

# Expected output:
# 🌀 Executing on local database atrarium-db...
# 🚣 Executed 6 commands in 0.123s

# Apply schema to remote database (production)
wrangler d1 execute atrarium-db --remote --file=./schema.sql

# Expected output:
# 🌀 Executing on remote database atrarium-db...
# 🚣 Executed 6 commands in 0.456s
```

**Verification**:
```bash
# Check tables were created
wrangler d1 execute atrarium-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"

# Expected output:
# ┌───────────────────────┐
# │ name                  │
# ├───────────────────────┤
# │ communities           │
# │ theme_feeds           │
# │ memberships           │
# │ post_index            │
# │ owner_transition_log  │
# │ achievements          │
# └───────────────────────┘
```

---

### 5. Set Secrets (Production Only)
```bash
# Generate a secure JWT secret
openssl rand -hex 32

# Set JWT secret
wrangler secret put JWT_SECRET

# When prompted, paste the generated secret

# Set Bluesky credentials (for OAuth)
wrangler secret put BLUESKY_HANDLE
wrangler secret put BLUESKY_APP_PASSWORD
```

---

### 6. Start Local Development Server
```bash
# Start Miniflare (local Workers environment)
npm run dev

# Expected output:
# ⛅️ wrangler 3.x.x
# ------------------
# wrangler dev src/index.ts
# ⎔ Starting local server...
# [mf:inf] Ready on http://127.0.0.1:8787
```

**Verification**:
```bash
# Test DID document endpoint
curl http://127.0.0.1:8787/.well-known/did.json

# Expected output:
# {
#   "@context": ["https://www.w3.org/ns/did/v1"],
#   "id": "did:web:127.0.0.1:8787",
#   "service": [{
#     "id": "#bsky_fg",
#     "type": "BskyFeedGenerator",
#     "serviceEndpoint": "http://127.0.0.1:8787"
#   }]
# }
```

---

## Core Workflow Test (15-20 minutes)

This workflow validates the primary user journey from spec acceptance scenarios.

### Scenario 1: Create Community
**Spec Reference**: Acceptance Scenario 1 (spec.md:58)

```bash
# Authenticate (simulate OAuth flow)
curl -X POST http://127.0.0.1:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle": "test.bsky.social"}'

# Expected output:
# {
#   "accessJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "did": "did:plc:test123",
#   "handle": "test.bsky.social"
# }

# Save access token for subsequent requests
export ACCESS_TOKEN="<accessJwt from above>"

# Create community
curl -X POST http://127.0.0.1:8787/api/communities \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Community",
    "description": "A test community for validation"
  }'

# Expected output:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "Test Community",
#   "description": "A test community for validation",
#   "stage": "theme",
#   "parentId": null,
#   "memberCount": 1,
#   "postCount": 0,
#   "createdAt": 1696291200
# }

# Save community ID
export COMMUNITY_ID="<id from above>"
```

**Validation**:
- ✅ Community created with `stage: "theme"`
- ✅ Creator automatically assigned as owner
- ✅ `memberCount` starts at 1

---

### Scenario 2: Create Theme Feed
**Spec Reference**: Acceptance Scenario 2 (spec.md:60)

```bash
# Create theme feed
curl -X POST http://127.0.0.1:8787/api/communities/$COMMUNITY_ID/feeds \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General Discussion",
    "description": "Main discussion feed"
  }'

# Expected output:
# {
#   "id": "770e8400-e29b-41d4-a716-446655440002",
#   "communityId": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "General Discussion",
#   "description": "Main discussion feed",
#   "status": "active",
#   "lastPostAt": null,
#   "posts7d": 0,
#   "activeUsers7d": 0,
#   "createdAt": 1696291200
# }

# Save feed ID
export FEED_ID="<id from above>"
```

**Validation**:
- ✅ Feed created with `status: "active"`
- ✅ Initial health metrics are 0
- ✅ Feed belongs to correct community

---

### Scenario 3: Post to Feed
**Spec Reference**: Acceptance Scenario 2 (spec.md:60) - Modified for direct posting

```bash
# Submit post URI to theme feed
curl -X POST http://127.0.0.1:8787/api/posts \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "at://did:plc:test123/app.bsky.feed.post/3k44dddkhc322",
    "feedId": "'"$FEED_ID"'"
  }'

# Expected output:
# {
#   "id": 1,
#   "uri": "at://did:plc:test123/app.bsky.feed.post/3k44dddkhc322",
#   "feedId": "770e8400-e29b-41d4-a716-446655440002",
#   "authorDid": "did:plc:test123",
#   "createdAt": 1696291200,
#   "hasMedia": false,
#   "langs": null
# }
```

**Validation**:
- ✅ Post URI indexed in `post_index` table
- ✅ Feed's `last_post_at` updated
- ✅ Community's `post_count` incremented

---

### Scenario 4: Retrieve Feed Skeleton
**Spec Reference**: AT Protocol Feed Generator API (research.md)

```bash
# Get feed skeleton (AT Protocol endpoint)
curl "http://127.0.0.1:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:127.0.0.1:8787/app.bsky.feed.generator/$FEED_ID&limit=10"

# Expected output:
# {
#   "feed": [
#     {"post": "at://did:plc:test123/app.bsky.feed.post/3k44dddkhc322"}
#   ],
#   "cursor": "1696291200::bafyreib2rxk3rw6"
# }
```

**Validation**:
- ✅ Feed returns post URIs (not full content)
- ✅ Cursor provided for pagination
- ✅ Response complies with AT Protocol spec

---

### Scenario 5: Join Community
**Spec Reference**: Acceptance Scenario 3 (spec.md:62)

```bash
# Create second test user
curl -X POST http://127.0.0.1:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle": "alice.bsky.social"}'

# Save new access token
export ACCESS_TOKEN_ALICE="<accessJwt from above>"

# Join community as alice
curl -X POST http://127.0.0.1:8787/api/communities/$COMMUNITY_ID/members \
  -H "Authorization: Bearer $ACCESS_TOKEN_ALICE"

# Expected output:
# {
#   "communityId": "550e8400-e29b-41d4-a716-446655440000",
#   "userDid": "did:plc:alice123",
#   "handle": "alice.bsky.social",
#   "role": "member",
#   "joinedAt": 1696291300,
#   "lastActivityAt": null
# }
```

**Validation**:
- ✅ Membership created with `role: "member"`
- ✅ Community's `member_count` incremented to 2

---

### Scenario 6: Feed Inactivity Detection (Automated)
**Spec Reference**: Acceptance Scenarios 6-7 (spec.md:68-70)

**Note**: This scenario requires scheduled job execution (Cron Trigger). For quickstart, we simulate with manual database updates.

```bash
# Manually set last_post_at to 8 days ago (trigger warning status)
wrangler d1 execute atrarium-db --local --command \
  "UPDATE theme_feeds SET last_post_at = $(date -d '8 days ago' +%s) WHERE id = '$FEED_ID'"

# Run health check job (simulated)
curl -X POST http://127.0.0.1:8787/__scheduled \
  -H "Content-Type: application/json" \
  -d '{"cron": "0 0 * * *"}'

# Check feed status
curl http://127.0.0.1:8787/api/communities/$COMMUNITY_ID/feeds \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected output includes:
# {
#   "feeds": [{
#     "id": "770e8400-e29b-41d4-a716-446655440002",
#     "status": "warning",  # Changed from "active"
#     ...
#   }]
# }
```

**Validation**:
- ✅ Feed status changes to `"warning"` after 7 days of inactivity (FR-010)
- ✅ Scheduled job executes successfully

---

## Performance Validation

### Feed Generation Latency Test
**Target**: <200ms p95 (FR-022)

```bash
# Install Apache Bench (if not already installed)
sudo apt-get install apache2-utils  # Ubuntu/Debian
brew install apache2-utils           # macOS

# Run 100 requests with 10 concurrent connections
ab -n 100 -c 10 -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://127.0.0.1:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:web:127.0.0.1:8787/app.bsky.feed.generator/$FEED_ID&limit=50"

# Expected output:
# Time per request:       45.123 [ms] (mean)
# Time per request:       4.512 [ms] (mean, across all concurrent requests)
#
# Percentage of the requests served within a certain time (ms)
#   50%     42
#   66%     48
#   75%     52
#   80%     55
#   90%     65
#   95%     78   # ✅ Should be < 200ms
#   98%     92
#   99%    105
#  100%    123
```

**Validation**:
- ✅ p95 latency < 200ms
- ✅ No errors (0 failed requests)

---

## Database Verification

### Inspect Tables
```bash
# Check communities table
wrangler d1 execute atrarium-db --local --command \
  "SELECT * FROM communities"

# Check memberships table
wrangler d1 execute atrarium-db --local --command \
  "SELECT community_id, user_did, role FROM memberships"

# Check post_index table
wrangler d1 execute atrarium-db --local --command \
  "SELECT uri, feed_id, author_did FROM post_index"

# Check theme_feeds table
wrangler d1 execute atrarium-db --local --command \
  "SELECT id, name, status, last_post_at FROM theme_feeds"
```

---

## Deployment to Production

### 1. Deploy to Cloudflare Workers
```bash
# Deploy backend
npm run deploy

# Expected output:
# ⛅️ wrangler 3.x.x
# ------------------
# Total Upload: xx.xx KiB / gzip: xx.xx KiB
# Uploaded atrarium (x.xx sec)
# Published atrarium (x.xx sec)
#   https://atrarium.<your-subdomain>.workers.dev
```

### 2. Register Feed Generator with Bluesky
```bash
# Use publishFeedGen script (from @atproto/api)
npx @atproto/dev-env publishFeedGen \
  --handle <your-bluesky-handle> \
  --password <your-app-password> \
  --service-did did:web:atrarium.<your-subdomain>.workers.dev \
  --feed-id general-discussion \
  --display-name "General Discussion" \
  --description "Main discussion feed"

# Expected output:
# ✅ Feed generator published successfully
# Feed URI: at://did:plc:xxx/app.bsky.feed.generator/general-discussion
```

### 3. Test from Bluesky Client
1. Open Bluesky app (iOS/Android/Web)
2. Navigate to Feeds → Add Feed
3. Enter feed URI: `at://did:web:atrarium.<your-subdomain>.workers.dev/app.bsky.feed.generator/general-discussion`
4. Verify posts appear correctly

---

## Troubleshooting

### Issue: `wrangler d1 execute` fails with "Database not found"
**Solution**: Ensure `database_id` in `wrangler.toml` matches the output from `wrangler d1 create`

### Issue: JWT authentication fails
**Solution**: Check `JWT_SECRET` is set correctly with `wrangler secret list`

### Issue: Feed returns empty array
**Solution**:
1. Verify posts exist in `post_index` table
2. Check `feed_id` matches the requested feed URI
3. Inspect Workers logs with `wrangler tail`

### Issue: Performance test shows >200ms p95
**Solution**:
1. Ensure D1 Sessions API is enabled (check `result.meta.served_by_region`)
2. Reduce query complexity (check `EXPLAIN QUERY PLAN`)
3. Add missing indexes (verify with `PRAGMA index_list('post_index')`)

---

## Cleanup (Development Only)

```bash
# Stop local dev server
# Press Ctrl+C in the terminal running `npm run dev`

# Delete local D1 database
rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject

# Delete remote resources (production)
wrangler d1 delete atrarium-db
wrangler kv:namespace delete --namespace-id <POST_CACHE_ID>
```

---

## Next Steps

After completing this quickstart:

1. **Review Logs**: Check Workers logs with `wrangler tail --format pretty`
2. **Run Tests**: Execute integration tests with `npm test`
3. **Dashboard Setup**: Follow dashboard setup guide in `dashboard/README.md` (Phase 0, Weeks 13-16)
4. **Performance Tuning**: Analyze D1 query performance with `EXPLAIN QUERY PLAN`

---

**Status**: Quickstart guide complete. All core acceptance scenarios validated.
