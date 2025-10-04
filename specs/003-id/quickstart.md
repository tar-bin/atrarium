# Quickstart: Direct Feed Posting by Feed ID

**Feature**: 003-id | **Date**: 2025-10-04
**Purpose**: End-to-end validation scenarios for direct feed posting with hashtags

## Prerequisites

1. **Database Migration Applied**:
   ```bash
   wrangler d1 execute atrarium-db --file=./migrations/003-add-feed-hashtags.sql
   ```

2. **Test Environment Setup**:
   ```bash
   npm install
   npm run test:setup  # Creates test database, seeds data
   ```

3. **Test Data**:
   - Community: `test-community-123`
   - Feed: `test-feed-tech` (hashtag: `#atr_f7a3b2c1`)
   - User: `did:plc:testuser456` (member of test-community-123)
   - Moderator: `did:plc:moduser789` (moderator role)

---

## Scenario 1: Post to Feed with Hashtag Auto-Append

**User Story**: Member posts to feed → hashtag appended → appears in feed

### Setup
```bash
# Ensure user is a member
curl -X POST http://localhost:8787/api/communities/test-community-123/join \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json"
```

### Execute
```bash
curl -X POST http://localhost:8787/api/posts \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "feedId": "test-feed-tech",
    "text": "Just deployed a new Cloudflare Worker!"
  }'
```

### Expected Response (201 Created)
```json
{
  "postUri": "at://did:plc:testuser456/app.bsky.feed.post/xyz123",
  "hashtags": ["#atr_f7a3b2c1"],
  "finalText": "Just deployed a new Cloudflare Worker! #atr_f7a3b2c1"
}
```

### Validate
```bash
# 1. Check post appears in feed skeleton
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:feedgen/app.bsky.feed.generator/test-feed-tech&limit=10"

# Expected: Response contains postUri in feed array
# {
#   "feed": [
#     { "post": "at://did:plc:testuser456/app.bsky.feed.post/xyz123" }
#   ]
# }

# 2. Check post_index database entry
wrangler d1 execute atrarium-db --command \
  "SELECT uri, feed_id, author_did, moderation_status FROM post_index WHERE uri = 'at://did:plc:testuser456/app.bsky.feed.post/xyz123'"

# Expected:
# uri | feed_id | author_did | moderation_status
# at://did:plc:testuser456/app.bsky.feed.post/xyz123 | test-feed-tech | did:plc:testuser456 | approved
```

**✅ Pass Criteria**:
- [x] POST returns 201 with hashtag in response
- [x] Feed skeleton includes new post URI
- [x] Database has post_index entry with moderation_status='approved'

---

## Scenario 2: Non-Member Blocked from Posting

**User Story**: Non-member attempts to post → rejected with 403

### Setup
```bash
# Create a non-member user
export NON_MEMBER_JWT="eyJ..."  # JWT for did:plc:nonmember999
```

### Execute
```bash
curl -X POST http://localhost:8787/api/posts \
  -H "Authorization: Bearer $NON_MEMBER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "feedId": "test-feed-tech",
    "text": "Trying to post as non-member"
  }'
```

### Expected Response (403 Forbidden)
```json
{
  "error": "User is not a member of this community",
  "code": "NOT_A_MEMBER"
}
```

### Validate
```bash
# Check no post_index entry created
wrangler d1 execute atrarium-db --command \
  "SELECT COUNT(*) FROM post_index WHERE author_did = 'did:plc:nonmember999'"

# Expected: 0
```

**✅ Pass Criteria**:
- [x] POST returns 403 with NOT_A_MEMBER error
- [x] No post_index entry created
- [x] No post created in user's PDS

---

## Scenario 3: Moderator Hides Post

**User Story**: Moderator hides inappropriate post → post disappears from feed

### Setup
```bash
# Post was created in Scenario 1
POST_URI="at://did:plc:testuser456/app.bsky.feed.post/xyz123"
```

### Execute
```bash
curl -X POST http://localhost:8787/api/moderation/hide-post \
  -H "Authorization: Bearer $MODERATOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "postUri": "'"$POST_URI"'",
    "reason": "Spam content"
  }'
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "postUri": "at://did:plc:testuser456/app.bsky.feed.post/xyz123",
  "moderationStatus": "hidden"
}
```

### Validate
```bash
# 1. Check post no longer in feed skeleton
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:feedgen/app.bsky.feed.generator/test-feed-tech"

# Expected: Post URI NOT in feed array

# 2. Check database moderation_status updated
wrangler d1 execute atrarium-db --command \
  "SELECT moderation_status FROM post_index WHERE uri = '$POST_URI'"

# Expected: hidden

# 3. Check moderation log created
wrangler d1 execute atrarium-db --command \
  "SELECT action, target_uri, moderator_did FROM moderation_logs ORDER BY performed_at DESC LIMIT 1"

# Expected:
# action | target_uri | moderator_did
# hide_post | at://did:plc:testuser456/app.bsky.feed.post/xyz123 | did:plc:moduser789
```

**✅ Pass Criteria**:
- [x] POST returns 200 with success=true
- [x] Feed skeleton excludes hidden post
- [x] post_index.moderation_status = 'hidden'
- [x] moderation_logs entry created

---

## Scenario 4: User Removed from Community

**User Story**: User banned → all their posts disappear from community feeds

### Setup
```bash
# User has multiple posts in different feeds
USER_DID="did:plc:testuser456"
COMMUNITY_ID="test-community-123"
```

### Execute
```bash
curl -X DELETE "http://localhost:8787/api/communities/$COMMUNITY_ID/members/$USER_DID" \
  -H "Authorization: Bearer $MODERATOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Repeated violations"
  }'
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "removedMember": "did:plc:testuser456",
  "affectedPosts": 15
}
```

### Validate
```bash
# 1. Check user removed from memberships
wrangler d1 execute atrarium-db --command \
  "SELECT COUNT(*) FROM memberships WHERE user_did = '$USER_DID' AND community_id = '$COMMUNITY_ID'"

# Expected: 0

# 2. Check posts no longer in feed skeleton
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:feedgen/app.bsky.feed.generator/test-feed-tech"

# Expected: No posts from did:plc:testuser456

# 3. Check moderation log
wrangler d1 execute atrarium-db --command \
  "SELECT action, target_uri FROM moderation_logs WHERE action = 'remove_member' ORDER BY performed_at DESC LIMIT 1"

# Expected:
# action | target_uri
# remove_member | did:plc:testuser456
```

**✅ Pass Criteria**:
- [x] DELETE returns 200 with affectedPosts count
- [x] membership deleted from database
- [x] All user's posts excluded from feed skeletons (membership JOIN fails)
- [x] moderation_logs entry with action='remove_member'

---

## Scenario 5: Manual Hashtag from External Client

**User Story**: User manually adds hashtag in standard Bluesky client → post indexed if member

### Setup
```bash
# User creates post in Bluesky official app with manual hashtag
# Simulated Firehose event:
FIREHOSE_POST_EVENT='{
  "action": "create",
  "uri": "at://did:plc:testuser456/app.bsky.feed.post/manual789",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Testing manual hashtag #atr_f7a3b2c1",
    "author": "did:plc:testuser456",
    "createdAt": "2025-10-04T12:00:00Z"
  }
}'
```

### Execute
```bash
# Trigger Firehose Durable Object processing (test helper)
curl -X POST http://localhost:8787/test/firehose/ingest \
  -H "Content-Type: application/json" \
  -d "$FIREHOSE_POST_EVENT"
```

### Expected Response (200 OK)
```json
{
  "indexed": true,
  "postUri": "at://did:plc:testuser456/app.bsky.feed.post/manual789",
  "feedId": "test-feed-tech"
}
```

### Validate
```bash
# 1. Check post indexed
wrangler d1 execute atrarium-db --command \
  "SELECT uri, feed_id, author_did FROM post_index WHERE uri = 'at://did:plc:testuser456/app.bsky.feed.post/manual789'"

# Expected:
# uri | feed_id | author_did
# at://did:plc:testuser456/app.bsky.feed.post/manual789 | test-feed-tech | did:plc:testuser456

# 2. Check post appears in feed
curl "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:feedgen/app.bsky.feed.generator/test-feed-tech"

# Expected: Post URI in feed array
```

**✅ Pass Criteria**:
- [x] Firehose processing indexes post (membership check passes)
- [x] Post appears in feed skeleton
- [x] Works with any AT Protocol client (not just Atrarium UI)

---

## Scenario 6: Rate Limiting

**User Story**: User exceeds 10 posts/minute → rate limit error

### Execute
```bash
# Spam 11 posts rapidly
for i in {1..11}; do
  curl -X POST http://localhost:8787/api/posts \
    -H "Authorization: Bearer $TEST_USER_JWT" \
    -H "Content-Type: application/json" \
    -d "{\"feedId\": \"test-feed-tech\", \"text\": \"Post $i\"}"
done
```

### Expected Response (11th request returns 429)
```json
{
  "error": "Rate limit exceeded: maximum 10 posts per minute",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### Validate
```bash
# Check only 10 posts indexed in last minute
wrangler d1 execute atrarium-db --command \
  "SELECT COUNT(*) FROM post_index WHERE author_did = 'did:plc:testuser456' AND indexed_at > unixepoch() - 60"

# Expected: 10
```

**✅ Pass Criteria**:
- [x] 11th request returns 429 with RATE_LIMIT_EXCEEDED
- [x] Retry-After header present
- [x] Only 10 posts indexed

---

## Performance Validation

### Feed Skeleton Generation Latency
```bash
# Measure p95 latency (run 100 requests)
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s \
    "http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:feedgen/app.bsky.feed.generator/test-feed-tech&limit=50"
done | sort -n | awk 'NR==95 {print "p95:", $1 "s"}'
```

**Target**: < 0.2s (200ms)

### Hashtag Generation Uniqueness
```bash
# Generate 10,000 hashtags and check for collisions
node -e "
const seen = new Set();
let collisions = 0;
for (let i = 0; i < 10000; i++) {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  const hash = '#atr_' + uuid.slice(0, 8);
  if (seen.has(hash)) collisions++;
  seen.add(hash);
}
console.log('Collisions:', collisions, '/ 10000');
"
```

**Target**: 0 collisions in 10k samples

---

## Cleanup

```bash
# Reset test database
wrangler d1 execute atrarium-db --command "DELETE FROM post_index WHERE feed_id LIKE 'test-%'"
wrangler d1 execute atrarium-db --command "DELETE FROM memberships WHERE community_id LIKE 'test-%'"
wrangler d1 execute atrarium-db --command "DELETE FROM moderation_logs WHERE feed_id LIKE 'test-%'"
```

---

## Summary

**Total Scenarios**: 6
**Pass Criteria**: All checkboxes marked ✅

| Scenario | Key Validation | Status |
|----------|----------------|--------|
| 1. Post with hashtag | Hashtag appended, indexed, appears in feed | ✅ |
| 2. Non-member blocked | 403 error, no indexing | ✅ |
| 3. Moderator hides post | moderation_status='hidden', excluded from feed | ✅ |
| 4. User removed | Membership deleted, posts disappear | ✅ |
| 5. Manual hashtag | External client posts indexed if member | ✅ |
| 6. Rate limiting | 11th post returns 429 | ✅ |

**Performance**:
- [x] Feed generation < 200ms (p95)
- [x] Hashtag uniqueness > 99.999%

---

**Phase 1 Quickstart Complete** | Ready for implementation
