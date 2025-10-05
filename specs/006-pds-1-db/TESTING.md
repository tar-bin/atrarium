# Testing Guide: PDS-First Architecture (006-pds-1-db)

**Feature**: 006-pds-1-db
**Date**: 2025-10-04
**Status**: Integration tests require deployed Workers environment

## Overview

This document describes testing strategies for the PDS-first data architecture, including unit tests, contract tests, and integration tests.

---

## Test Categories

### 1. Unit Tests (✅ Run Locally)

**Location**: `/workspaces/atrarium/tests/unit/`

**Description**: Test individual functions and utilities in isolation

**Examples**:
- `feed-hashtag-generator.test.ts`: Hashtag generation logic
- `membership-validation.test.ts`: Membership verification logic

**Run**:
```bash
npm test -- tests/unit/
```

**Status**: ✅ All unit tests pass locally

---

### 2. Contract Tests (✅ Run Locally)

**Location**: `/workspaces/atrarium/tests/contract/`

**Description**: Test API endpoint contracts and Durable Objects Storage operations

**Examples**:
- `durable-object-storage.test.ts`: Storage API (get, put, list, delete)
- `queue-consumer.test.ts`: Queue message processing (deferred to integration)

**Run**:
```bash
npm test -- tests/contract/
```

**Status**: ✅ Contract tests pass (except Queue consumer, requires deployment)

---

### 3. Integration Tests (⚠️ Requires Deployed Environment)

**Location**: `/workspaces/atrarium/tests/integration/`

**Description**: End-to-end tests validating complete workflows

**Examples**:
- `queue-to-feed-flow.test.ts`: Firehose → Queue → Processor → CommunityFeedGenerator
- `pds-to-feed-flow.test.ts`: Quickstart scenario (Alice-Bob workflow)

**Status**: ⚠️ SKIPPED in local environment due to Miniflare limitations

**Limitations**:
- Cloudflare Queues require deployed Workers environment
- Durable Objects storage isolation issues in Miniflare
- WebSocket connections (Firehose) not fully supported in test environment

**Manual Validation Required**: See section below

---

## Manual Validation Steps

### Quickstart Scenario (Alice-Bob Workflow)

This scenario validates the complete PDS-first data flow as described in `quickstart.md`.

#### Prerequisites

1. Deploy Workers to Cloudflare (staging or production)
2. Create Bluesky accounts for Alice and Bob
3. Generate app passwords for both accounts
4. Ensure Firehose integration is active

#### Step 1: Alice Creates Community

**Action**: Alice uses Atrarium Dashboard to create "Design Community"

**API Request**:
```bash
curl -X POST https://atrarium.workers.dev/api/communities \
  -H "Authorization: Bearer <alice-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Design Community",
    "description": "A community for designers"
  }'
```

**Expected Response**:
```json
{
  "id": "3jzfcijpj2z2a",
  "name": "Design Community",
  "hashtag": "#atr_a1b2c3d4",
  "stage": "theme",
  "ownerDid": "did:plc:alice123",
  "createdAt": "2025-10-04T12:00:00.000Z"
}
```

**Validation**:
1. Check PDS record exists:
   ```bash
   curl -X GET "https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=did:plc:alice123&collection=com.atrarium.community.config&rkey=3jzfcijpj2z2a"
   ```

2. Verify CommunityFeedGenerator Durable Object created:
   ```bash
   # Check logs for DO initialization
   wrangler tail --format pretty | grep "CommunityFeedGenerator"
   ```

#### Step 2: Bob Joins Community

**Action**: Bob joins "Design Community" via Dashboard

**API Request**:
```bash
curl -X POST https://atrarium.workers.dev/api/communities/3jzfcijpj2z2a/join \
  -H "Authorization: Bearer <bob-jwt>"
```

**Expected Response**:
```json
{
  "success": true,
  "membership": {
    "communityId": "3jzfcijpj2z2a",
    "userDid": "did:plc:bob456",
    "role": "member",
    "joinedAt": "2025-10-04T12:30:00.000Z"
  }
}
```

**Validation**:
1. Check PDS membership record:
   ```bash
   curl -X GET "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:bob456&collection=com.atrarium.community.membership"
   ```

2. Verify membership synced to Durable Object:
   ```bash
   # Check Firehose logs for membership event
   wrangler tail --format pretty | grep "membership"
   ```

#### Step 3: Bob Posts with Hashtag

**Action**: Bob posts to Bluesky with community hashtag

**Bluesky Post**:
```bash
# Use Bluesky app or API
curl -X POST https://bsky.social/xrpc/com.atproto.repo.createRecord \
  -H "Authorization: Bearer <bob-bluesky-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "did:plc:bob456",
    "collection": "app.bsky.feed.post",
    "record": {
      "$type": "app.bsky.feed.post",
      "text": "Just finished a new logo design! #atr_a1b2c3d4",
      "createdAt": "2025-10-04T13:00:00.000Z"
    }
  }'
```

**Expected Response**:
```json
{
  "uri": "at://did:plc:bob456/app.bsky.feed.post/3xyz789",
  "cid": "bafyreib2rxk3rw6..."
}
```

**Validation**:
1. Wait 5 seconds for Firehose processing
2. Check post appears in feed:
   ```bash
   curl -X GET "https://atrarium.workers.dev/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:alice123/app.bsky.feed.generator/design-community&limit=50"
   ```

3. Verify post URI in response:
   ```json
   {
     "feed": [
       {
         "post": "at://did:plc:bob456/app.bsky.feed.post/3xyz789"
       }
     ]
   }
   ```

#### Step 4: Alice Moderates Bob's Post

**Action**: Alice hides Bob's post via Dashboard moderation interface

**API Request**:
```bash
curl -X POST https://atrarium.workers.dev/api/moderation/hide \
  -H "Authorization: Bearer <alice-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "postUri": "at://did:plc:bob456/app.bsky.feed.post/3xyz789",
    "postCid": "bafyreib2rxk3rw6...",
    "communityId": "3jzfcijpj2z2a",
    "reason": "Off-topic content"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "action": {
    "uri": "at://did:plc:alice123/com.atrarium.moderation.action/4abc123",
    "action": "hide_post",
    "targetUri": "at://did:plc:bob456/app.bsky.feed.post/3xyz789"
  }
}
```

**Validation**:
1. Check PDS moderation record:
   ```bash
   curl -X GET "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:alice123&collection=com.atrarium.moderation.action"
   ```

2. Verify moderation synced to Durable Object:
   ```bash
   wrangler tail --format pretty | grep "moderation"
   ```

#### Step 5: Verify Feed Excludes Hidden Post

**Action**: Request feed skeleton and verify hidden post is excluded

**API Request**:
```bash
curl -X GET "https://atrarium.workers.dev/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:alice123/app.bsky.feed.generator/design-community&limit=50"
```

**Expected Response**:
```json
{
  "feed": []
}
```

**Validation**:
- Hidden post (`at://did:plc:bob456/app.bsky.feed.post/3xyz789`) should NOT appear in feed
- Feed should be empty or contain only non-hidden posts

---

## Success Criteria

| Criterion | Validation |
|-----------|------------|
| **PDS writes succeed** | All 3 PDS records created (CommunityConfig, MembershipRecord, ModerationAction) |
| **Firehose events processed** | All events indexed within 5 seconds |
| **Durable Object storage accurate** | DO storage matches PDS records |
| **Feed filtering works** | Hidden post excluded from feed skeleton |
| **Membership verification** | Only members' posts appear in feed |

---

## Troubleshooting

### Issue: PDS record not created

**Diagnosis**: Auth failure or API endpoint error

**Fix**:
1. Check JWT is valid: `jwt.io` (paste token, verify expiry)
2. Check app password is correct
3. Check API endpoint URL

### Issue: Firehose event not received

**Diagnosis**: FirehoseReceiver Durable Object down or WebSocket disconnected

**Fix**:
1. Check DO logs: `wrangler tail --format pretty | grep "FirehoseReceiver"`
2. Verify WebSocket connection: Look for "Jetstream connected" log
3. Restart DO if needed (automatic on next request)

### Issue: Post not indexed after 5 seconds

**Diagnosis**: Queue consumer error or heavyweight filter rejection

**Fix**:
1. Check Queue logs: `wrangler tail --format pretty | grep "FirehoseProcessor"`
2. Verify hashtag matches regex: `/#atr_[0-9a-f]{8}/`
3. Check Queue DLQ (dead letter queue) for failed messages

### Issue: Feed still shows hidden post

**Diagnosis**: Last-Write-Wins conflict or moderation not synced

**Fix**:
1. Check `indexedAt` timestamps (moderation action must be newer)
2. Verify moderation action in PDS
3. Wait 10 seconds for Firehose sync
4. Check Durable Object storage: `wrangler tail --format pretty | grep "moderatePost"`

### Issue: Cache rebuild incomplete

**Diagnosis**: Firehose cursor reset or incomplete replay

**Fix**:
1. Verify Firehose cursor storage
2. Check for errors during replay: `wrangler tail --format pretty | grep "error"`
3. Manually trigger cleanup: `wrangler do alarm wake --name CommunityFeedGenerator --id <community-id>`

---

## Running Tests in Production

### 1. Deploy to Staging

```bash
# Deploy Workers
wrangler deploy --env staging

# Deploy Queues
wrangler queues create firehose-events --env staging
wrangler queues create firehose-dlq --env staging
```

### 2. Enable Integration Tests

```bash
# Remove .skip from test files
sed -i 's/describe.skip/describe/g' tests/integration/queue-to-feed-flow.test.ts
sed -i 's/describe.skip/describe/g' tests/integration/pds-to-feed-flow.test.ts

# Run tests against staging
CLOUDFLARE_ENV=staging npm test -- tests/integration/
```

### 3. Monitor Logs

```bash
# Watch real-time logs
wrangler tail --env staging --format pretty

# Filter for specific events
wrangler tail --env staging --format pretty | grep "CommunityFeedGenerator"
wrangler tail --env staging --format pretty | grep "FirehoseProcessor"
```

---

## Next Steps

1. **Deploy to staging environment**: Complete Worker deployment with Durable Objects + Queues
2. **Run manual validation**: Execute Alice-Bob scenario end-to-end
3. **Enable integration tests**: Remove `.skip` and run against staging
4. **Verify performance**: Check feed generation latency (<200ms target)
5. **Deploy to production**: Promote staging to production after validation

---

**Status**: Ready for deployment and manual validation ✅
**Last Updated**: 2025-10-04
**Feature**: 006-pds-1-db
