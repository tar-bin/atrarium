// Integration Test: Moderation Inheritance Flow
// Tests: Theme groups inherit moderation from Graduated parent
// Verifies: Parent owner can moderate child, moderation switches to independent after upgrade

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe.skip('Moderation Inheritance Flow (requires deployed environment)', () => {
  const aliceDid = 'did:plc:alice123'; // Parent owner
  const bobDid = 'did:plc:bob456'; // Member who posts
  const parentId = 'design-community';
  const childId = 'ui-theme';
  const parentHashtag = '#atrarium_parent02';
  const childHashtag = '#atrarium_child02';

  let parentStub: DurableObjectStub;
  let childStub: DurableObjectStub;

  beforeAll(async () => {
    const parentDOId = env.COMMUNITY_FEED.idFromName(parentId);
    parentStub = env.COMMUNITY_FEED.get(parentDOId);

    const childDOId = env.COMMUNITY_FEED.idFromName(childId);
    childStub = env.COMMUNITY_FEED.get(childDOId);
  });

  it('should create Graduated parent and Theme child', async () => {
    const parentAtUri = `at://${aliceDid}/net.atrarium.group.config/${parentId}`;

    // Create Graduated parent
    await parentStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Design Community',
          hashtag: parentHashtag,
          stage: 'graduated',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Add Alice as owner of parent
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

    // Create Theme child with parent reference
    await childStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'UI Theme',
          hashtag: childHashtag,
          stage: 'theme',
          parentGroup: parentAtUri,
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Add Bob as member of child (not parent)
    await childStub.fetch(
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

    // Cache parent AT-URI in child DO
    await childStub.fetch(
      new Request('http://test/setParent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentAtUri: parentAtUri,
        }),
      })
    );
  });

  it('should allow parent owner to moderate posts in child Theme', async () => {
    const postUri = `at://${bobDid}/app.bsky.feed.post/post123`;

    // Bob posts to child Theme
    const indexPostResponse = await childStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: postUri,
          authorDid: bobDid,
          text: `Test post in child theme ${childHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [childHashtag],
        }),
      })
    );

    expect(indexPostResponse.ok).toBe(true);

    // Verify post appears in child feed
    let feedResponse = await childStub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    let feedResult = (await feedResponse.json()) as {
      feed: Array<{ post: string }>;
    };

    let foundPost = feedResult.feed.find((item) => item.post === postUri);
    expect(foundPost).toBeDefined();

    // Alice (parent owner) moderates post in child Theme
    const moderateResponse = await childStub.fetch(
      new Request('http://test/moderatePost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hide_post',
          targetUri: postUri,
          moderatorDid: aliceDid, // Parent owner DID
          reason: 'Off-topic (moderated by parent owner)',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    expect(moderateResponse.ok).toBe(true);

    // Verify post hidden from child feed
    feedResponse = await childStub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    feedResult = (await feedResponse.json()) as {
      feed: Array<{ post: string }>;
    };

    foundPost = feedResult.feed.find((item) => item.post === postUri);
    expect(foundPost).toBeUndefined();
  });

  it('should cache inherited moderators from parent', async () => {
    // Query inherited moderators from child DO
    const getInheritedModeratorsResponse = await childStub.fetch(
      new Request('http://test/getInheritedModerators')
    );
    const moderatorsData = (await getInheritedModeratorsResponse.json()) as {
      moderators: string[];
    };

    // Alice should be in inherited moderators list
    expect(moderatorsData.moderators).toContain(aliceDid);
  });

  it('should switch to independent moderation after Theme → Community upgrade', async () => {
    // Add 14 more members to child (reach 15 for Community upgrade)
    for (let i = 2; i <= 15; i++) {
      await childStub.fetch(
        new Request('http://test/addMember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            did: `did:plc:member${i}`,
            role: 'member',
            joinedAt: new Date().toISOString(),
            active: true,
          }),
        })
      );
    }

    // Upgrade child Theme → Community
    const upgradeResponse = await childStub.fetch(
      new Request('http://test/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'community',
          updatedAt: new Date().toISOString(),
        }),
      })
    );

    expect(upgradeResponse.ok).toBe(true);

    // Verify stage is now Community
    const getConfigResponse = await childStub.fetch(new Request('http://test/getConfig'));
    const config = (await getConfigResponse.json()) as {
      stage: string;
    };

    expect(config.stage).toBe('community');

    // Bob posts again to upgraded Community
    const newPostUri = `at://${bobDid}/app.bsky.feed.post/post456`;
    await childStub.fetch(
      new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: newPostUri,
          authorDid: bobDid,
          text: `Post in upgraded community ${childHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [childHashtag],
        }),
      })
    );

    // Alice (parent owner) tries to moderate post in upgraded Community
    const moderateUpgradedResponse = await childStub.fetch(
      new Request('http://test/moderatePost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hide_post',
          targetUri: newPostUri,
          moderatorDid: aliceDid,
          reason: 'Attempting parent moderation',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Moderation should fail (403 Forbidden) - Alice not moderator of Community
    expect(moderateUpgradedResponse.ok).toBe(false);
    expect(moderateUpgradedResponse.status).toBe(403);
  });

  it('should verify inherited_moderators cache cleared after upgrade', async () => {
    // Query inherited moderators after upgrade
    const getInheritedModeratorsResponse = await childStub.fetch(
      new Request('http://test/getInheritedModerators')
    );
    const moderatorsData = (await getInheritedModeratorsResponse.json()) as {
      moderators?: string[];
    };

    // Inherited moderators should be undefined or empty (independent moderation)
    expect(moderatorsData.moderators || []).toHaveLength(0);
  });
});
