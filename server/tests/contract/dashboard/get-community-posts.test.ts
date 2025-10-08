/**
 * Contract Test: GET /api/communities/{communityId}/posts
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests fetching posts for a community timeline.
 * This test MUST FAIL initially (TDD approach).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('GET /api/communities/{communityId}/posts', () => {
  const testCommunityId = 'a1b2c3d4'; // 8-char hex

  beforeAll(async () => {
    // Setup: Create test community and posts (implementation pending)
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  it('should fetch posts in reverse chronological order', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('posts');
    expect(data).toHaveProperty('cursor');
    expect(Array.isArray(data.posts)).toBe(true);

    // Verify reverse chronological order
    if (data.posts.length > 1) {
      const timestamps = data.posts.map((p: { createdAt: string }) =>
        new Date(p.createdAt).getTime()
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    }
  });

  it('should include author profile data', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    if (data.posts.length > 0) {
      const post = data.posts[0];
      expect(post).toHaveProperty('author');
      expect(post.author).toHaveProperty('did');
      expect(post.author).toHaveProperty('displayName');
      expect(post.author).toHaveProperty('avatar');
    }
  });

  it('should respect limit parameter', async () => {
    const limit = 5;
    const response = await fetch(
      `http://localhost:8787/api/communities/${testCommunityId}/posts?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.posts.length).toBeLessThanOrEqual(limit);
  });

  it('should support cursor-based pagination', async () => {
    // First page
    const response1 = await fetch(
      `http://localhost:8787/api/communities/${testCommunityId}/posts?limit=2`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    expect(response1.status).toBe(200);
    const data1 = (await response1.json()) as { posts: Array<{ uri: string }>; cursor?: string };

    if (data1.cursor) {
      // Second page
      const response2 = await fetch(
        `http://localhost:8787/api/communities/${testCommunityId}/posts?limit=2&cursor=${encodeURIComponent(data1.cursor)}`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      expect(response2.status).toBe(200);
      const data2 = (await response2.json()) as { posts: Array<{ uri: string }>; cursor?: string };

      // Ensure no duplicate posts
      const uris1 = data1.posts.map((p) => p.uri);
      const uris2 = data2.posts.map((p) => p.uri);
      const overlap = uris1.filter((uri: string) => uris2.includes(uri));
      expect(overlap.length).toBe(0);
    }
  });

  it('should filter hidden posts for non-moderators', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer member-token', // Non-moderator
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    // Hidden posts should not appear
    const hiddenPosts = data.posts.filter(
      (p: { moderationStatus?: string }) => p.moderationStatus === 'hidden'
    );
    expect(hiddenPosts.length).toBe(0);
  });

  it('should include hidden posts for moderators', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer moderator-token',
      },
    });

    expect(response.status).toBe(200);

    const _data = await response.json();
    // Moderators can see hidden posts (if any exist)
    // This is a smoke test - actual hidden posts require setup
  });

  it('should return 404 for non-existent community', async () => {
    const response = await fetch('http://localhost:8787/api/communities/ffffffff/posts', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(404);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('community');
  });

  it('should return empty array for community with no posts', async () => {
    // Assuming 'b2c3d4e5' is a valid but empty community
    const response = await fetch('http://localhost:8787/api/communities/b2c3d4e5/posts', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.posts).toEqual([]);
    expect(data.cursor).toBeNull();
  });
});
