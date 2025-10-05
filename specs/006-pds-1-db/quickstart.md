# Quickstart: PDS-First Integration Test

**Feature**: 006-pds-1-db
**Date**: 2025-10-04
**Purpose**: End-to-end integration test scenario for PDS-first architecture

## Overview

This document describes a comprehensive integration test that validates the entire PDS-first data flow:
1. Create community (PDS write)
2. Join community (PDS write)
3. Post to feed (Bluesky + hashtag)
4. Moderate post (PDS write)
5. Verify feed generator serves moderated feed

---

## Test Scenario

### Actors

- **Alice** (`alice.bsky.social`, `did:plc:alice123`)
  - Creates "Design Community"
  - Role: Owner & Moderator

- **Bob** (`bob.bsky.social`, `did:plc:bob456`)
  - Joins "Design Community"
  - Role: Member

### Preconditions

1. Firehose Durable Object is running
2. Worker Indexer is deployed
3. D1 database has `pds_synced_at` column
4. Alice and Bob have Bluesky accounts with app passwords

---

## Step-by-Step Execution

### Step 1: Alice Creates Community

**Action**: Alice uses Atrarium Dashboard to create "Design Community"

**Expected Behavior**:
```gherkin
Given Alice is logged into Atrarium Dashboard
When Alice submits the "Create Community" form with:
  | name        | Design Community                     |
  | description | A community for designers            |
  | stage       | theme                                |
Then a CommunityConfig record is created in Alice's PDS
  And the record has $type "com.atrarium.community.config"
  And the record has a system-generated hashtag "#atr_a1b2c3d4"
  And Alice's DID is in the moderators array
  And a Firehose commit event is emitted
  And the Worker Indexer receives the event within 5 seconds
  And the D1 communities table has a new row with pds_synced_at > 0
```

**API Call**:
```http
POST /api/communities
Authorization: Bearer <alice-jwt>
Content-Type: application/json

{
  "name": "Design Community",
  "description": "A community for designers"
}
```

**PDS Record Created** (in Alice's PDS):
```json
{
  "$type": "com.atrarium.community.config",
  "name": "Design Community",
  "description": "A community for designers",
  "hashtag": "#atr_a1b2c3d4",
  "stage": "theme",
  "moderators": ["did:plc:alice123"],
  "blocklist": [],
  "feedMix": { "own": 1.0, "parent": 0.0, "global": 0.0 },
  "parentCommunity": null,
  "createdAt": "2025-10-04T12:00:00.000Z"
}
```

**D1 Row Created** (communities table):
```sql
INSERT INTO communities (
  id, owner_did, name, description, stage,
  feed_mix_own, feed_mix_parent, feed_mix_global,
  created_at, pds_synced_at
) VALUES (
  '3jzfcijpj2z2a',
  'did:plc:alice123',
  'Design Community',
  'A community for designers',
  'theme',
  1.0, 0.0, 0.0,
  1728048000,
  1728048005
);
```

**Verification**:
```bash
# Check PDS record exists
curl -X GET "https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=did:plc:alice123&collection=com.atrarium.community.config&rkey=3jzfcijpj2z2a"

# Check D1 cache
wrangler d1 execute atrarium-db --command "SELECT * FROM communities WHERE owner_did = 'did:plc:alice123'"
```

---

### Step 2: Bob Joins Community

**Action**: Bob discovers "Design Community" and joins via Dashboard

**Expected Behavior**:
```gherkin
Given Bob is logged into Atrarium Dashboard
  And Bob views the "Design Community" page
When Bob clicks "Join Community"
Then a MembershipRecord is created in Bob's PDS
  And the record references Alice's CommunityConfig URI
  And the record has role "member"
  And a Firehose commit event is emitted
  And the Worker Indexer receives the event within 5 seconds
  And the D1 memberships table has a new row with pds_synced_at > 0
  And the communities.member_count increments by 1
```

**API Call**:
```http
POST /api/communities/3jzfcijpj2z2a/join
Authorization: Bearer <bob-jwt>
```

**PDS Record Created** (in Bob's PDS):
```json
{
  "$type": "com.atrarium.community.membership",
  "community": "at://did:plc:alice123/com.atrarium.community.config/3jzfcijpj2z2a",
  "role": "member",
  "joinedAt": "2025-10-04T12:30:00.000Z",
  "active": true,
  "invitedBy": "did:plc:alice123"
}
```

**D1 Row Created** (memberships table):
```sql
INSERT INTO memberships (
  community_id, user_did, role, joined_at, pds_synced_at
) VALUES (
  '3jzfcijpj2z2a',
  'did:plc:bob456',
  'member',
  1728049800,
  1728049805
);
```

**Verification**:
```bash
# Check membership record in Bob's PDS
curl -X GET "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:bob456&collection=com.atrarium.community.membership"

# Check D1 cache
wrangler d1 execute atrarium-db --command "SELECT * FROM memberships WHERE community_id = '3jzfcijpj2z2a' AND user_did = 'did:plc:bob456'"
```

---

### Step 3: Bob Posts to Community Feed

**Action**: Bob posts to Bluesky with the community hashtag

**Expected Behavior**:
```gherkin
Given Bob is a member of "Design Community"
  And the community hashtag is "#atr_a1b2c3d4"
When Bob posts "Just finished a new logo design! #atr_a1b2c3d4" to Bluesky
Then a Firehose commit event is emitted for Bob's post
  And the Worker Indexer detects the hashtag "#atr_a1b2c3d4"
  And the Worker Indexer verifies Bob's membership in D1 cache
  And the post URI is indexed in the post_index table
  And the moderation_status is set to "approved"
  And the communities.post_count increments by 1
```

**Bluesky Post** (via Bluesky app or API):
```http
POST /xrpc/com.atproto.repo.createRecord
Host: bsky.social
Authorization: Bearer <bob-bluesky-token>
Content-Type: application/json

{
  "repo": "did:plc:bob456",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Just finished a new logo design! #atr_a1b2c3d4",
    "createdAt": "2025-10-04T13:00:00.000Z"
  }
}
```

**D1 Row Created** (post_index table):
```sql
INSERT INTO post_index (
  uri, feed_id, author_did, created_at, has_media, langs, moderation_status, indexed_at
) VALUES (
  'at://did:plc:bob456/app.bsky.feed.post/3xyz789',
  '3jzfcijpj2z2a',
  'did:plc:bob456',
  1728051600,
  0,
  '["en"]',
  'approved',
  1728051605
);
```

**Verification**:
```bash
# Check post in Bluesky
curl -X GET "https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=did:plc:bob456&collection=app.bsky.feed.post&rkey=3xyz789"

# Check post index in D1
wrangler d1 execute atrarium-db --command "SELECT * FROM post_index WHERE author_did = 'did:plc:bob456' AND feed_id = '3jzfcijpj2z2a'"
```

---

### Step 4: Alice Moderates Bob's Post

**Action**: Alice hides Bob's post via Dashboard moderation interface

**Expected Behavior**:
```gherkin
Given Alice is a moderator of "Design Community"
  And Bob's post "at://did:plc:bob456/app.bsky.feed.post/3xyz789" is visible
When Alice selects "Hide Post" with reason "Off-topic content"
Then a ModerationAction record is created in Alice's PDS
  And the record has action "hide_post"
  And the record has target.uri = Bob's post URI
  And a Firehose commit event is emitted
  And the Worker Indexer receives the event within 5 seconds
  And the post_index.moderation_status is updated to "hidden"
  And a row is added to moderation_logs table
```

**API Call**:
```http
POST /api/moderation/hide
Authorization: Bearer <alice-jwt>
Content-Type: application/json

{
  "postUri": "at://did:plc:bob456/app.bsky.feed.post/3xyz789",
  "postCid": "bafyreib2rxk3rw6...",
  "communityId": "3jzfcijpj2z2a",
  "reason": "Off-topic content"
}
```

**PDS Record Created** (in Alice's PDS):
```json
{
  "$type": "com.atrarium.moderation.action",
  "action": "hide_post",
  "target": {
    "uri": "at://did:plc:bob456/app.bsky.feed.post/3xyz789",
    "cid": "bafyreib2rxk3rw6..."
  },
  "community": "at://did:plc:alice123/com.atrarium.community.config/3jzfcijpj2z2a",
  "reason": "Off-topic content",
  "createdAt": "2025-10-04T13:15:00.000Z"
}
```

**D1 Updates**:
```sql
-- Update post moderation status
UPDATE post_index
SET moderation_status = 'hidden'
WHERE uri = 'at://did:plc:bob456/app.bsky.feed.post/3xyz789';

-- Log moderation action
INSERT INTO moderation_logs (
  action, target_uri, community_id, moderator_did, reason, performed_at, pds_synced_at
) VALUES (
  'hide_post',
  'at://did:plc:bob456/app.bsky.feed.post/3xyz789',
  '3jzfcijpj2z2a',
  'did:plc:alice123',
  'Off-topic content',
  1728052500,
  1728052505
);
```

**Verification**:
```bash
# Check moderation action in Alice's PDS
curl -X GET "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:alice123&collection=com.atrarium.moderation.action"

# Check D1 moderation status
wrangler d1 execute atrarium-db --command "SELECT moderation_status FROM post_index WHERE uri = 'at://did:plc:bob456/app.bsky.feed.post/3xyz789'"
```

---

### Step 5: Verify Feed Generator Excludes Hidden Post

**Action**: Client requests feed skeleton for "Design Community"

**Expected Behavior**:
```gherkin
Given the "Design Community" feed has 1 approved post and 1 hidden post
When a client requests GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=at://...
Then the response includes the approved post
  And the response DOES NOT include the hidden post
  And the metadata indicates cache status "fresh"
```

**API Call**:
```http
GET /xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:alice123/app.bsky.feed.generator/design-community&limit=50
```

**Expected Response**:
```json
{
  "feed": [
    {
      "post": "at://did:plc:bob456/app.bsky.feed.post/3abc123"
    }
  ],
  "cursor": "1728051605::3abc123"
}
```

**Note**: The hidden post (`3xyz789`) is excluded because `moderation_status = 'hidden'`.

**SQL Query** (internal to Feed Generator):
```sql
SELECT uri
FROM post_index
WHERE feed_id = '3jzfcijpj2z2a'
  AND moderation_status = 'approved'
ORDER BY created_at DESC
LIMIT 50;
```

**Verification**:
```bash
# Test feed endpoint
curl -X GET "https://atrarium.workers.dev/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://did:plc:alice123/app.bsky.feed.generator/design-community&limit=50"

# Should NOT contain: at://did:plc:bob456/app.bsky.feed.post/3xyz789
```

---

### Step 6: Feed Generator Rebuilds from PDS (Resilience Test)

**Action**: Simulate Feed Generator restart and cache rebuild

**Expected Behavior**:
```gherkin
Given the D1 database is empty (simulated crash)
When the Feed Generator restarts
  And replays Firehose events from cursor 0
Then all CommunityConfig records are re-indexed
  And all MembershipRecord records are re-indexed
  And all ModerationAction records are re-applied
  And all post moderation statuses are restored
  And the feed skeleton matches the pre-crash state
```

**Rebuild Script**:
```typescript
async function rebuildCacheFromPDS() {
  // 1. Clear D1 cache
  await db.batch([
    db.prepare('DELETE FROM communities'),
    db.prepare('DELETE FROM memberships'),
    db.prepare('DELETE FROM moderation_logs'),
  ]);

  // 2. Replay Firehose from beginning
  const firehose = new Firehose({
    service: 'wss://bsky.network',
    cursor: 0, // Start from beginning
  });

  firehose.on('commit', async (evt) => {
    for (const op of evt.ops) {
      if (op.path.startsWith('com.atrarium.')) {
        await processFirehoseEvent(evt, op);
      }
    }
  });

  await firehose.start();

  // 3. Wait for sync to complete (monitor cursor)
  await waitForCursorToReachLatest();

  // 4. Verify data integrity
  const communityCount = await db.prepare('SELECT COUNT(*) as count FROM communities').first();
  console.log(`Rebuilt ${communityCount.count} communities`);
}
```

**Verification**:
```bash
# Check D1 has been rebuilt
wrangler d1 execute atrarium-db --command "SELECT COUNT(*) FROM communities"
wrangler d1 execute atrarium-db --command "SELECT COUNT(*) FROM memberships"
wrangler d1 execute atrarium-db --command "SELECT COUNT(*) FROM moderation_logs"

# Verify feed still excludes hidden post
curl -X GET "https://atrarium.workers.dev/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://..."
```

---

## Success Criteria

| Criterion | Validation |
|-----------|------------|
| **PDS writes succeed** | All 3 PDS records created (CommunityConfig, MembershipRecord, ModerationAction) |
| **Firehose events processed** | All events indexed within 5 seconds |
| **D1 cache accurate** | D1 rows match PDS records |
| **Feed filtering works** | Hidden post excluded from feed skeleton |
| **Cache rebuild works** | Feed Generator can rebuild from Firehose |
| **No data loss** | Post-rebuild feed matches pre-rebuild feed |

---

## Automated Test Implementation

```typescript
// tests/integration/pds-to-feed-flow.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { BskyAgent } from '@atproto/api';

describe('PDS-First Integration Test', () => {
  let aliceAgent: BskyAgent;
  let bobAgent: BskyAgent;
  let communityUri: string;
  let postUri: string;

  beforeAll(async () => {
    // Setup agents
    aliceAgent = new BskyAgent({ service: 'https://bsky.social' });
    await aliceAgent.login({ identifier: 'alice.bsky.social', password: process.env.ALICE_PASSWORD });

    bobAgent = new BskyAgent({ service: 'https://bsky.social' });
    await bobAgent.login({ identifier: 'bob.bsky.social', password: process.env.BOB_PASSWORD });
  });

  it('Alice creates community', async () => {
    const response = await aliceAgent.com.atproto.repo.createRecord({
      repo: aliceAgent.session.did,
      collection: 'com.atrarium.community.config',
      record: {
        $type: 'com.atrarium.community.config',
        name: 'Design Community',
        description: 'A community for designers',
        hashtag: '#atr_test1234',
        stage: 'theme',
        moderators: [aliceAgent.session.did],
        blocklist: [],
        feedMix: { own: 1.0, parent: 0.0, global: 0.0 },
        parentCommunity: null,
        createdAt: new Date().toISOString(),
      },
    });

    communityUri = response.uri;
    expect(communityUri).toMatch(/^at:\/\//);

    // Wait for Firehose sync
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify D1 cache
    const cached = await fetchFromWorker(`/api/communities/${extractRkey(communityUri)}`);
    expect(cached.name).toBe('Design Community');
  });

  it('Bob joins community', async () => {
    const response = await bobAgent.com.atproto.repo.createRecord({
      repo: bobAgent.session.did,
      collection: 'com.atrarium.community.membership',
      record: {
        $type: 'com.atrarium.community.membership',
        community: communityUri,
        role: 'member',
        joinedAt: new Date().toISOString(),
        active: true,
      },
    });

    expect(response.uri).toMatch(/^at:\/\//);

    // Wait for Firehose sync
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify membership in D1
    const community = await fetchFromWorker(`/api/communities/${extractRkey(communityUri)}`);
    expect(community.memberCount).toBe(1);
  });

  it('Bob posts with hashtag', async () => {
    const response = await bobAgent.com.atproto.repo.createRecord({
      repo: bobAgent.session.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: 'Test post #atr_test1234',
        createdAt: new Date().toISOString(),
      },
    });

    postUri = response.uri;

    // Wait for Firehose indexing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify post in feed
    const feed = await fetchFromWorker(`/xrpc/app.bsky.feed.getFeedSkeleton?feed=${communityUri}`);
    expect(feed.feed).toContainEqual({ post: postUri });
  });

  it('Alice hides Bob\'s post', async () => {
    const response = await aliceAgent.com.atproto.repo.createRecord({
      repo: aliceAgent.session.did,
      collection: 'com.atrarium.moderation.action',
      record: {
        $type: 'com.atrarium.moderation.action',
        action: 'hide_post',
        target: { uri: postUri, cid: 'bafyreib...' },
        community: communityUri,
        reason: 'Test moderation',
        createdAt: new Date().toISOString(),
      },
    });

    expect(response.uri).toMatch(/^at:\/\//);

    // Wait for moderation sync
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify post hidden in feed
    const feed = await fetchFromWorker(`/xrpc/app.bsky.feed.getFeedSkeleton?feed=${communityUri}`);
    expect(feed.feed).not.toContainEqual({ post: postUri });
  });
});
```

---

## Running the Test

```bash
# Set environment variables
export ALICE_PASSWORD="alice-app-password"
export BOB_PASSWORD="bob-app-password"
export PDS_URL="https://bsky.social"

# Run integration test
npx vitest run tests/integration/pds-to-feed-flow.test.ts

# Expected output:
# ✓ Alice creates community (5.2s)
# ✓ Bob joins community (5.1s)
# ✓ Bob posts with hashtag (5.3s)
# ✓ Alice hides Bob's post (5.2s)
#
# Test Files  1 passed (1)
#      Tests  4 passed (4)
#   Duration  21.8s
```

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| PDS record not created | Auth failure | Check app password, verify DID |
| Firehose event not received | Durable Object down | Check DO logs, restart DO |
| D1 not synced after 5s | Indexer error | Check Worker logs, verify DB schema |
| Feed still shows hidden post | LWW conflict | Check `indexed_at` timestamps, verify newer action |
| Cache rebuild incomplete | Cursor reset | Verify Firehose cursor storage |

---

**Status**: Ready for implementation ✅
**Next**: Execute `/tasks` to generate task breakdown
