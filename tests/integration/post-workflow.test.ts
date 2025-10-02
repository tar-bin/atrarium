// Integration Test: Post to feed workflow (Scenario 3)
// Tests: Create community → Create feed → Submit post → Verify indexed

import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/index';
import { createMockEnv, createMockJWT } from '../helpers/test-env';
import type { CommunityResponse, ThemeFeedResponse, PostIndexResponse, FeedSkeleton } from '../../src/types';

describe('Integration: Post Workflow', () => {
  let env: any;
  let jwt: string;
  let communityId: string;
  let feedId: string;

  beforeAll(async () => {
    env = createMockEnv();
    jwt = await createMockJWT('did:plc:test123', 'test.bsky.social');
  });

  it('should complete full post submission workflow', async () => {
    // Step 1: Create community
    const createCommunityReq = new Request('http://localhost:8787/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        name: 'Post Test Community',
      }),
    });

    const communityResp = await app.fetch(createCommunityReq, env, {} as ExecutionContext);
    const community = await communityResp.json() as CommunityResponse;
    communityId = community.id;

    expect(communityId).toBeTruthy();

    // Step 2: Create theme feed
    const createFeedReq = new Request(
      `http://localhost:8787/api/communities/${communityId}/feeds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          name: 'General Discussion',
        }),
      }
    );

    const feedResp = await app.fetch(createFeedReq, env, {} as ExecutionContext);
    const feed = await feedResp.json() as ThemeFeedResponse;
    feedId = feed.id;

    expect(feedId).toBeTruthy();
    expect(feed.status).toBe('active');

    // Step 3: Submit post
    const postReq = new Request('http://localhost:8787/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        uri: 'at://did:plc:test123/app.bsky.feed.post/testpost123',
        feedId,
      }),
    });

    const postResp = await app.fetch(postReq, env, {} as ExecutionContext);
    expect(postResp.status).toBe(201);

    const post = await postResp.json() as PostIndexResponse;
    expect(post.uri).toBe('at://did:plc:test123/app.bsky.feed.post/testpost123');
    expect(post.feedId).toBe(feedId);

    // Step 4: Verify post in feed skeleton
    const feedUri = `at://did:web:localhost:8787/app.bsky.feed.generator/${feedId}`;
    const skeletonReq = new Request(
      `http://localhost:8787/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const skeletonResp = await app.fetch(skeletonReq, env, {} as ExecutionContext);
    const skeleton = await skeletonResp.json() as FeedSkeleton;

    const foundPost = skeleton.feed.find(
      (item) => item.post === 'at://did:plc:test123/app.bsky.feed.post/testpost123'
    );
    expect(foundPost).toBeTruthy();
  });
});
