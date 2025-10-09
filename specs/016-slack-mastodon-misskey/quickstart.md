# Quickstart Scenario: Custom Emoji Reactions

**Feature**: 016-slack-mastodon-misskey
**Purpose**: Validate end-to-end reaction workflow from user action to UI update

## Scenario Overview

This scenario validates the complete custom emoji reaction feature through the following steps:
1. Alice creates a community
2. Alice uploads a custom emoji (`:partyblob:`)
3. Alice approves the emoji
4. Alice posts to the community
5. Bob (member) reacts with Unicode emoji (👍)
6. Alice reacts with custom emoji (`:partyblob:`)
7. Bob views reactions and sees both emojis
8. Alice toggles her reaction (remove)
9. Bob verifies Alice's reaction disappeared

## Prerequisites

- Local PDS running at `http://localhost:3000` (via DevContainer)
- Server running at `http://localhost:8787` (`pnpm --filter server dev`)
- Dashboard running at `http://localhost:5173` (`pnpm --filter client dev`)
- Test accounts created: `alice.test`, `bob.test`

## Step-by-Step Execution

### Setup Phase

```bash
# 1. Start DevContainer (opens local PDS automatically)
# 2. Create test accounts
.devcontainer/setup-pds.sh

# 3. Start server
pnpm --filter server dev

# 4. Start dashboard (in separate terminal)
pnpm --filter client dev
```

### Test Phase

#### Step 1: Alice Creates Community

**Action** (Dashboard UI):
1. Login as `alice.test` at `http://localhost:5173`
2. Navigate to Communities → Create Community
3. Fill form:
   - Name: "Test Community"
   - Stage: "community"
4. Click "Create"

**Expected Result**:
- Community created with unique hashtag (e.g., `#atrarium_a1b2c3d4`)
- `net.atrarium.community.config` record written to Alice's PDS
- CommunityFeedGenerator Durable Object created
- User redirected to community page

**Validation**:
```bash
# Verify PDS record
curl http://localhost:3000/xrpc/com.atproto.repo.listRecords \
  -H "Authorization: Bearer <alice-token>" \
  -d actor=alice.test \
  -d collection=net.atrarium.community.config
```

#### Step 2: Alice Uploads Custom Emoji

**Action** (Dashboard UI):
1. Navigate to Community Settings → Custom Emojis
2. Click "Upload Emoji"
3. Fill form:
   - Shortcode: `partyblob`
   - Image: Select `partyblob.gif` (64x64, animated GIF, 128KB)
4. Click "Upload"

**Expected Result**:
- Image uploaded to PDS blob storage (returns CID)
- `net.atrarium.community.emoji` record written to Alice's PDS with `approvalStatus: 'pending'`
- Emoji appears in "Pending Approval" section with badge

**Validation**:
```bash
# Verify PDS blob upload
curl http://localhost:3000/xrpc/com.atproto.repo.listRecords \
  -H "Authorization: Bearer <alice-token>" \
  -d actor=alice.test \
  -d collection=net.atrarium.community.emoji

# Check response includes imageBlobCid and approvalStatus: 'pending'
```

#### Step 3: Alice Approves Emoji

**Action** (Dashboard UI):
1. In "Pending Approval" section, click "Approve" button next to `:partyblob:`
2. Confirm approval

**Expected Result**:
- `net.atrarium.community.emoji` record updated with `approvalStatus: 'approved'`, `approvedBy`, `approvedAt`
- Emoji moves to "Approved Emojis" section
- Emoji becomes available in EmojiPicker for all community members

**Validation**:
```bash
# Verify approval status update
curl http://localhost:3000/xrpc/com.atproto.repo.getRecord \
  -H "Authorization: Bearer <alice-token>" \
  -d repo=alice.test \
  -d collection=net.atrarium.community.emoji \
  -d rkey=<emoji-rkey>

# Check approvalStatus === 'approved'
```

#### Step 4: Alice Posts to Community

**Action** (Dashboard UI):
1. Navigate to community feed
2. Write post: "Testing emoji reactions! 🎉"
3. Click "Post"

**Expected Result**:
- Post created with community hashtag (e.g., `#atrarium_a1b2c3d4`)
- Post appears in community feed
- Empty reaction bar displayed below post

**Validation**:
```bash
# Verify post in feed
curl http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton \
  -d feed=at://alice.test/app.bsky.feed.generator/test-community \
  -d limit=10

# Check response includes Alice's post URI
```

#### Step 5: Bob Reacts with Unicode Emoji

**Action** (Dashboard UI):
1. Login as `bob.test` at `http://localhost:5173`
2. Navigate to community feed
3. Click reaction button (➕) on Alice's post
4. Select 👍 from Unicode emoji picker
5. Click emoji to add reaction

**Expected Result**:
- `net.atrarium.community.reaction` record written to Bob's PDS
- Firehose event emitted → Queue → FirehoseProcessor → CommunityFeedGenerator
- Durable Object updates ReactionAggregate:
  - Key: `reaction:at://alice.test/app.bsky.feed.post/<rkey>:unicode:U+1F44D`
  - `count: 1`, `reactorDids: ['did:plc:bob']`
- SSE broadcast sends `reaction_update` event to connected clients
- UI updates immediately: 👍 1 (highlighted for Bob)

**Validation**:
```bash
# Verify PDS reaction record
curl http://localhost:3000/xrpc/com.atproto.repo.listRecords \
  -H "Authorization: Bearer <bob-token>" \
  -d actor=bob.test \
  -d collection=net.atrarium.community.reaction

# Verify Durable Object aggregate (via API)
curl http://localhost:8787/api/reactions/list \
  -H "Authorization: Bearer <bob-token>" \
  -d postUri=at://alice.test/app.bsky.feed.post/<rkey>

# Check response: reactions array includes { emoji: {type: 'unicode', value: 'U+1F44D'}, count: 1 }
```

#### Step 6: Alice Reacts with Custom Emoji

**Action** (Dashboard UI):
1. Login as `alice.test`
2. Navigate to community feed
3. Click reaction button on her own post
4. Switch to "Custom Emojis" tab in picker
5. Click `:partyblob:` emoji

**Expected Result**:
- `net.atrarium.community.reaction` record written to Alice's PDS
- Durable Object updates ReactionAggregate:
  - Key: `reaction:at://alice.test/app.bsky.feed.post/<rkey>:custom:partyblob`
  - `count: 1`, `reactorDids: ['did:plc:alice']`
- SSE broadcast sends update
- UI updates: 👍 1 | :partyblob: 1 (both emojis displayed)

**Validation**:
```bash
# Verify custom emoji reaction
curl http://localhost:8787/api/reactions/list \
  -H "Authorization: Bearer <alice-token>" \
  -d postUri=at://alice.test/app.bsky.feed.post/<rkey>

# Check response includes both Unicode and custom emoji reactions
# reactions: [
#   { emoji: {type: 'unicode', value: 'U+1F44D'}, count: 1 },
#   { emoji: {type: 'custom', value: 'partyblob'}, count: 1 }
# ]
```

#### Step 7: Bob Views Reactions

**Action** (Dashboard UI):
1. As Bob, view Alice's post
2. Hover over reaction emojis to see reactor list

**Expected Result**:
- Bob sees two reactions:
  - 👍 1 (highlighted, since Bob reacted)
  - :partyblob: 1 (not highlighted, image displayed from PDS blob URL)
- Hover tooltip shows:
  - 👍: "bob.test"
  - :partyblob:: "alice.test"

**Validation**:
- Visual inspection of UI
- Reaction counts match expected values
- Custom emoji image loads correctly (animated GIF plays)
- Highlight indicator shows correctly (Bob's reaction highlighted, Alice's not)

#### Step 8: Alice Toggles Reaction (Remove)

**Action** (Dashboard UI):
1. As Alice, click :partyblob: emoji again (toggle off)

**Expected Result**:
- `DELETE /api/reactions/remove` called
- Reaction record deleted from Alice's PDS
- Durable Object updates ReactionAggregate:
  - `count: 0`, `reactorDids: []`
  - Aggregate record deleted (count reached 0)
- SSE broadcast sends update
- UI updates: 👍 1 (only Bob's reaction remains)

**Validation**:
```bash
# Verify reaction removed
curl http://localhost:8787/api/reactions/list \
  -H "Authorization: Bearer <alice-token>" \
  -d postUri=at://alice.test/app.bsky.feed.post/<rkey>

# Check response: reactions array has only Unicode emoji
# reactions: [
#   { emoji: {type: 'unicode', value: 'U+1F44D'}, count: 1 }
# ]
```

#### Step 9: Bob Verifies Reaction Disappeared

**Action** (Dashboard UI):
1. As Bob, verify Alice's post
2. Observe reaction bar

**Expected Result**:
- Bob sees only 👍 1 (his own reaction)
- :partyblob: emoji no longer displayed (count = 0)
- UI updated via SSE (no page refresh needed)

**Validation**:
- Visual inspection confirms only 👍 emoji visible
- No stale data displayed (SSE worked correctly)

## Success Criteria

✅ All steps complete without errors
✅ PDS records created/updated correctly (verified via API)
✅ Durable Object aggregates match expected state
✅ SSE updates received (< 1s latency)
✅ UI displays reactions correctly (counts, highlights, images)
✅ Toggle behavior works (add → remove → UI updates)
✅ Custom emoji image loads and displays correctly
✅ Rate limiting not triggered (< 100 reactions in scenario)

## Cleanup

```bash
# Delete test community (optional)
curl -X DELETE http://localhost:8787/api/communities/<community-id> \
  -H "Authorization: Bearer <alice-token>"

# Delete test accounts (optional)
# Via PDS admin tools
```

## Edge Cases to Test Manually

After completing the main scenario, validate these edge cases:

1. **Rate Limit**: As Bob, add 100 reactions within 1 hour → verify 101st reaction returns 429
2. **20+ Emoji Types**: Add 21 different emoji reactions → verify "Show More" button appears
3. **Modal Display**: Click "Show More" → verify modal shows all reactions
4. **Non-member Reaction**: Login as Carol (non-member) → verify reaction button disabled
5. **Hidden Post**: Hide Alice's post → verify Bob cannot add new reactions
6. **Deleted Custom Emoji**: Delete :partyblob: → verify fallback placeholder shown for existing reactions
7. **Revoked Custom Emoji**: Revoke approved emoji → verify new reactions blocked, existing preserved
8. **SSE Reconnection**: Disconnect/reconnect network → verify SSE auto-reconnects
9. **Emoji Validation**: Upload 512KB+ image → verify 400 error with clear message
10. **Aspect Ratio Validation**: Upload 1000×64 image (>8:1 ratio) → verify 400 error

## Automated Test Script

```typescript
// server/tests/integration/reaction-quickstart.test.ts
import { describe, test, expect } from 'vitest';
import { setupTestPDS, createTestUser } from '../helpers/test-env';

describe('Quickstart: Custom Emoji Reactions', () => {
  test('end-to-end reaction workflow', async () => {
    const pds = await setupTestPDS();
    const alice = await createTestUser('alice.test');
    const bob = await createTestUser('bob.test');

    // Step 1: Create community
    const community = await alice.createCommunity('Test Community');
    expect(community.hashtag).toMatch(/#atrarium_[0-9a-f]{8}/);

    // Step 2: Upload custom emoji
    const emoji = await alice.uploadEmoji(community.id, 'partyblob', './fixtures/partyblob.gif');
    expect(emoji.approvalStatus).toBe('pending');

    // Step 3: Approve emoji
    await alice.approveEmoji(emoji.uri);
    const approvedEmoji = await alice.getEmoji(emoji.uri);
    expect(approvedEmoji.approvalStatus).toBe('approved');

    // Step 4: Post to community
    const post = await alice.createPost(`Testing reactions! ${community.hashtag}`);

    // Step 5: Bob reacts with Unicode emoji
    await bob.addReaction(post.uri, { type: 'unicode', value: 'U+1F44D' });
    const reactions1 = await bob.listReactions(post.uri);
    expect(reactions1.reactions).toHaveLength(1);
    expect(reactions1.reactions[0].count).toBe(1);

    // Step 6: Alice reacts with custom emoji
    await alice.addReaction(post.uri, { type: 'custom', value: 'partyblob' });
    const reactions2 = await alice.listReactions(post.uri);
    expect(reactions2.reactions).toHaveLength(2);

    // Step 7: Bob views reactions (tested via API)
    const reactionsForBob = await bob.listReactions(post.uri);
    expect(reactionsForBob.reactions[0].currentUserReacted).toBe(true);
    expect(reactionsForBob.reactions[1].currentUserReacted).toBe(false);

    // Step 8: Alice toggles reaction (remove)
    await alice.removeReaction(post.uri, { type: 'custom', value: 'partyblob' });
    const reactions3 = await alice.listReactions(post.uri);
    expect(reactions3.reactions).toHaveLength(1);

    // Step 9: Bob verifies (same as Step 8 result)
    const finalReactions = await bob.listReactions(post.uri);
    expect(finalReactions.reactions).toHaveLength(1);
    expect(finalReactions.reactions[0].emoji.type).toBe('unicode');
  });
});
```

## Troubleshooting

**Issue**: Reactions not appearing in UI
- Check SSE connection in Network tab (should show persistent connection)
- Verify TanStack Query cache invalidation (check React DevTools)
- Check Durable Object logs: `wrangler tail --format pretty`

**Issue**: Custom emoji image not loading
- Verify blob CID in PDS: `curl http://localhost:3000/xrpc/com.atproto.repo.getRecord ...`
- Check blob resolution: `agent.resolveBlob(blobCid)` should return CDN URL
- Verify CORS headers on blob response

**Issue**: Rate limit triggered unexpectedly
- Check Durable Object Storage: `storage.get('ratelimit:did:plc:bob')`
- Verify timestamp cleanup logic (past 1 hour only)
- Reset rate limit manually if needed: `storage.delete('ratelimit:did:plc:bob')`

**Issue**: Firehose not indexing reactions
- Verify Firehose connection: Check FirehoseReceiver logs
- Check Queue processing: `wrangler tail --filter FirehoseProcessor`
- Manually trigger indexing: Replay Firehose from cursor 0

## Performance Benchmarks

Expected latencies (measured during quickstart):
- **Add reaction**: < 200ms (PDS write + Durable Object update)
- **Remove reaction**: < 150ms
- **SSE latency**: < 1s (Firehose → Queue → DO → broadcast)
- **List reactions**: < 50ms (Durable Object read)
- **Upload emoji**: < 500ms (blob upload + metadata write)

If latencies exceed these thresholds, investigate bottlenecks (PDS, Queue, or Durable Objects).
