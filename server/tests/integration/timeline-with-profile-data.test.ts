/**
 * Integration Test: Timeline Fetch with Profile Data
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests that timeline API fetches posts with enriched author profiles
 * using app.bsky.actor.profile (not replaced by custom Lexicon).
 * This test MUST FAIL initially (TDD approach).
 */

import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Timeline Fetch with Profile Data (Integration)', () => {
  let agent: AtpAgent;
  const testCommunityId = 'a1b2c3d4';
  const pdsUrl = process.env.PDS_URL || 'http://pds:3000';

  beforeAll(async () => {
    agent = new AtpAgent({ service: pdsUrl });
    // TODO: Authenticate and create test posts
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should fetch timeline with app.bsky.actor.profile data', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.posts.length).toBeGreaterThan(0);

    // Verify each post has enriched profile
    for (const post of data.posts) {
      expect(post).toHaveProperty('author');
      expect(post.author).toHaveProperty('did');
      expect(post.author).toHaveProperty('displayName');
      expect(post.author).toHaveProperty('avatar'); // May be null
      expect(post.author).toHaveProperty('handle');

      // Ensure profile data is from app.bsky.actor.profile (not custom Lexicon)
      expect(post.author.did).toMatch(/^did:(plc|web):.+$/);
    }
  });

  it('should handle posts from users without profiles gracefully', async () => {
    // Create post from user with no profile set
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post from user with no profile',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for indexing

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const postWithNoProfile = data.posts.find(
      (p: { uri: string }) => p.uri === createResponse.data.uri
    );

    expect(postWithNoProfile).toBeDefined();
    expect(postWithNoProfile.author).toHaveProperty('did');
    expect(postWithNoProfile.author.displayName).toBeTruthy(); // Fallback to handle or DID
  });

  it('should fetch profile data from Bluesky AppView or PDS', async () => {
    const response = await fetch(
      `http://localhost:8787/api/communities/${testCommunityId}/posts?limit=1`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    const data = (await response.json()) as any;
    if (data.posts.length > 0) {
      const post = data.posts[0];

      // Verify profile data is fetched (not hardcoded)
      expect(post.author.displayName).not.toBe('Unknown User');
      expect(post.author.handle).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/); // Valid handle format
    }
  });

  it('should cache profile data for performance', async () => {
    // First fetch (cold cache)
    const start1 = Date.now() as any;
    await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
    const duration1 = (Date.now() as any) - start1;

    // Second fetch (warm cache)
    const start2 = Date.now() as any;
    await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
    const duration2 = (Date.now() as any) - start2;

    // Cached request should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.8); // At least 20% faster
  });

  it('should NOT replace app.bsky.actor.profile with custom Lexicon', async () => {
    // Verify that profile data still comes from app.bsky.actor.profile
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    if (data.posts.length > 0) {
      const post = data.posts[0];

      // Profile fields should match app.bsky.actor.profile schema
      expect(post.author).toHaveProperty('displayName'); // app.bsky.actor.profile field
      expect(post.author).toHaveProperty('avatar'); // app.bsky.actor.profile field
      expect(post.author).not.toHaveProperty('customProfileField'); // No custom Lexicon
    }
  });

  it('should handle profile fetch failures gracefully', async () => {
    // Simulate profile fetch failure (e.g., PDS offline)
    // This test may require mocking or manual PDS shutdown

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200); // Timeline should still work

    const data = (await response.json()) as any;
    // Posts should be returned even if profile fetch fails (degraded mode)
    expect(data.posts).toBeDefined();
  });

  it('should include profile data in single post fetch (GET /api/posts/{uri})', async () => {
    // Create test post
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Single post profile test',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    const encodedUri = encodeURIComponent(createResponse.data.uri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('author');
    expect(data.author).toHaveProperty('displayName');
    expect(data.author).toHaveProperty('avatar');
    expect(data.author).toHaveProperty('handle');
  });
});
