// Contract Test: GET /api/communities/:communityId/posts (list)
// TDD: This test MUST FAIL before implementation (T007)

import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('GET /api/communities/:communityId/posts (list)', () => {
  it('should return 401 Unauthorized without auth token', async () => {
    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts?limit=10', {
      method: 'GET',
    });

    expect(resp.status).toBe(401);
  });

  it('should return 200 OK with empty array for empty feed', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT

    const resp = await env.WORKER.fetch('http://test/api/communities/empty123/posts?limit=10', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();

    // Validate PostListOutputSchema
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBe(0);
    expect(data.cursor).toBeUndefined();
  });

  it('should return 200 OK with posts and pagination', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts?limit=10', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();

    // Validate PostListOutputSchema
    expect(data.data).toBeInstanceOf(Array);

    if (data.data.length > 0) {
      const firstPost = data.data[0];
      expect(firstPost.uri).toMatch(/^at:\/\//);
      expect(firstPost.text).toBeDefined();
      expect(firstPost.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(firstPost.author).toBeDefined();
      expect(firstPost.author.did).toMatch(/^did:/);
      expect(firstPost.author.handle).toBeDefined();
    }

    // Cursor is optional
    if (data.cursor) {
      expect(typeof data.cursor).toBe('string');
    }
  });

  it('should return 200 OK with author profiles enriched', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts?limit=5', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();

    if (data.data.length > 0) {
      const post = data.data[0];

      // Validate author profile structure
      expect(post.author).toBeDefined();
      expect(post.author.did).toMatch(/^did:/);
      expect(post.author.handle).toBeDefined();
      expect(typeof post.author.displayName === 'string' || post.author.displayName === null).toBe(
        true
      );
      expect(typeof post.author.avatar === 'string' || post.author.avatar === null).toBe(true);
    }
  });

  it('should support cursor-based pagination', async () => {
    const token = 'mock-jwt-token-member';

    // First page
    const resp1 = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts?limit=2', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp1.status).toBe(200);
    const data1 = await resp1.json();

    if (data1.cursor) {
      // Second page using cursor
      const resp2 = await env.WORKER.fetch(
        `http://test/api/communities/a1b2c3d4/posts?limit=2&cursor=${data1.cursor}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(resp2.status).toBe(200);
      const data2 = await resp2.json();

      // Posts should be different
      if (data1.data.length > 0 && data2.data.length > 0) {
        expect(data1.data[0].uri).not.toBe(data2.data[0].uri);
      }
    }
  });

  it('should return 400 Bad Request with invalid limit parameter', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch(
      'http://test/api/communities/a1b2c3d4/posts?limit=invalid',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with invalid communityId format', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/communities/invalid-id/posts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(400);
  });
});
