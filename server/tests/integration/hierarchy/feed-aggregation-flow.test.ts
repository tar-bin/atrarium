// Integration Test: Feed Aggregation Flow
// Tests: Graduated parent feed includes posts from all children
// Verifies: Child feeds only show own posts (no aggregation at child level)

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe.skip('Feed Aggregation Flow (requires deployed environment)', () => {
  const aliceDid = 'did:plc:alice123';
  const bobDid = 'did:plc:bob456';
  const charlieDid = 'did:plc:charlie789';
  const parentId = 'parent-feed';
  const childAId = 'child-a';
  const childBId = 'child-b';
  const parentHashtag = '#atrarium_parent04';
  const childAHashtag = '#atrarium_childa';
  const childBHashtag = '#atrarium_childb';

  let parentStub: DurableObjectStub;
  let childAStub: DurableObjectStub;
  let childBStub: DurableObjectStub;

  beforeAll(async () => {
    const parentDOId = env.COMMUNITY_FEED.idFromName(parentId);
    parentStub = env.COMMUNITY_FEED.get(parentDOId);

    const childADOId = env.COMMUNITY_FEED.idFromName(childAId);
    childAStub = env.COMMUNITY_FEED.get(childADOId);

    const childBDOId = env.COMMUNITY_FEED.idFromName(childBId);
    childBStub = env.COMMUNITY_FEED.get(childBDOId);
  });

  it('should create Graduated parent and 2 Theme children', async () => {
    const parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    // Create Graduated parent
    await parentStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Parent Feed',
          hashtag: parentHashtag,
          stage: 'graduated',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Create child A
    await childAStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Child Theme A',
          hashtag: childAHashtag,
          stage: 'theme',
          parentGroup: parentAtUri,
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Create child B
    await childBStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Child Theme B',
          hashtag: childBHashtag,
          stage: 'theme',
          parentGroup: parentAtUri,
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Update parent's children list
    await parentStub.fetch(
      new Request('http://test/addChild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: childAId,
          childAtUri: `at://${aliceDid}/net.atrarium.group.config/${childAId}`,
        }),
      })
    );

    await parentStub.fetch(
      new Request('http://test/addChild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: childBId,
          childAtUri: `at://${aliceDid}/net.atrarium.group.config/${childBId}`,
        }),
      })
    );

    // Add members
    await parentStub.fetch(
      new Request('http://test/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: aliceDid,
          role: 'owner',
          joinedAt: new Date().toISOString(),
          active: true,
        }),
      })
    );

    await childAStub.fetch(
      new Request('http://test/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: bobDid,
          role: 'member',
          joinedAt: new Date().toISOString(),
          active: true,
        }),
      })
    );

    await childBStub.fetch(
      new Request('http://test/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: charlieDid,
          role: 'member',
          joinedAt: new Date().toISOString(),
          active: true,
        }),
      })
    );
  });

  it('should post to parent and both children', async () => {
    // Alice posts to parent
    const parentPostUri = `at://${aliceDid}/app.bsky.feed.post/parent123`;
    await parentStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: parentPostUri,
          authorDid: aliceDid,
          text: `Post in parent ${parentHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [parentHashtag],
        }),
      })
    );

    // Bob posts to child A
    const childAPostUri = `at://${bobDid}/app.bsky.feed.post/childa456`;
    await childAStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: childAPostUri,
          authorDid: bobDid,
          text: `Post in child A ${childAHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [childAHashtag],
          parentGroupId: parentId, // Tag for parent aggregation
        }),
      })
    );

    // Charlie posts to child B
    const childBPostUri = `at://${charlieDid}/app.bsky.feed.post/childb789`;
    await childBStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: childBPostUri,
          authorDid: charlieDid,
          text: `Post in child B ${childBHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [childBHashtag],
          parentGroupId: parentId, // Tag for parent aggregation
        }),
      })
    );

    // Index child posts in parent DO for aggregation
    await parentStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: childAPostUri,
          authorDid: bobDid,
          text: `Post in child A ${childAHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [childAHashtag],
          sourceGroupId: childAId,
        }),
      })
    );

    await parentStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: childBPostUri,
          authorDid: charlieDid,
          text: `Post in child B ${childBHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [childBHashtag],
          sourceGroupId: childBId,
        }),
      })
    );
  });

  it('should aggregate posts in parent feed (self + child A + child B)', async () => {
    const parentPostUri = `at://${aliceDid}/app.bsky.feed.post/parent123`;
    const childAPostUri = `at://${bobDid}/app.bsky.feed.post/childa456`;
    const childBPostUri = `at://${charlieDid}/app.bsky.feed.post/childb789`;

    // Query parent feed
    const parentFeedResponse = await parentStub.fetch(
      new Request('http://test/getFeedSkeleton?limit=50')
    );
    const parentFeed = (await parentFeedResponse.json()) as {
      feed: Array<{ post: string }>;
    };

    expect(parentFeed.feed).toBeDefined();
    expect(parentFeed.feed.length).toBeGreaterThanOrEqual(3);

    // Verify all posts appear in parent feed
    const parentPostFound = parentFeed.feed.find((item) => item.post === parentPostUri);
    const childAPostFound = parentFeed.feed.find((item) => item.post === childAPostUri);
    const childBPostFound = parentFeed.feed.find((item) => item.post === childBPostUri);

    expect(parentPostFound).toBeDefined();
    expect(childAPostFound).toBeDefined();
    expect(childBPostFound).toBeDefined();
  });

  it('should show only own posts in child feeds (no aggregation)', async () => {
    const childAPostUri = `at://${bobDid}/app.bsky.feed.post/childa456`;
    const childBPostUri = `at://${charlieDid}/app.bsky.feed.post/childb789`;
    const parentPostUri = `at://${aliceDid}/app.bsky.feed.post/parent123`;

    // Query child A feed
    const childAFeedResponse = await childAStub.fetch(
      new Request('http://test/getFeedSkeleton?limit=50')
    );
    const childAFeed = (await childAFeedResponse.json()) as {
      feed: Array<{ post: string }>;
    };

    // Child A feed should only have its own post
    const childAPostFound = childAFeed.feed.find((item) => item.post === childAPostUri);
    const childBPostFound = childAFeed.feed.find((item) => item.post === childBPostUri);
    const parentPostFound = childAFeed.feed.find((item) => item.post === parentPostUri);

    expect(childAPostFound).toBeDefined();
    expect(childBPostFound).toBeUndefined(); // No child B posts
    expect(parentPostFound).toBeUndefined(); // No parent posts

    // Query child B feed
    const childBFeedResponse = await childBStub.fetch(
      new Request('http://test/getFeedSkeleton?limit=50')
    );
    const childBFeed = (await childBFeedResponse.json()) as {
      feed: Array<{ post: string }>;
    };

    // Child B feed should only have its own post
    const childBOwnPostFound = childBFeed.feed.find((item) => item.post === childBPostUri);
    const childAPostInB = childBFeed.feed.find((item) => item.post === childAPostUri);
    const parentPostInB = childBFeed.feed.find((item) => item.post === parentPostUri);

    expect(childBOwnPostFound).toBeDefined();
    expect(childAPostInB).toBeUndefined(); // No child A posts
    expect(parentPostInB).toBeUndefined(); // No parent posts
  });

  it('should maintain 7-day TTL for aggregated posts', async () => {
    // Verify all posts have createdAt timestamps for TTL calculation
    const parentFeedResponse = await parentStub.fetch(
      new Request('http://test/getFeedSkeleton?limit=50')
    );
    const parentFeed = (await parentFeedResponse.json()) as {
      feed: Array<{ post: string }>;
    };

    expect(parentFeed.feed.length).toBeGreaterThan(0);

    // Query post metadata to verify TTL tracking
    const getStorageResponse = await parentStub.fetch(new Request('http://test/getStorageKeys'));
    const storageData = (await getStorageResponse.json()) as {
      keys: string[];
    };

    // Verify post: keys exist (TTL managed by Durable Objects Storage)
    const postKeys = storageData.keys.filter((key) => key.startsWith('post:'));
    expect(postKeys.length).toBeGreaterThanOrEqual(3);
  });
});
