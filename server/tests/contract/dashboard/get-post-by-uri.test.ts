/**
 * Contract Test: GET /api/posts/{uri}
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests fetching a single post by AT-URI.
 * This test MUST FAIL initially (TDD approach).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('GET /api/posts/{uri}', () => {
  let _testPostUri: string;

  beforeAll(async () => {
    // Setup: Create test post (implementation pending)
    // testPostUri = 'at://did:plc:xxx/net.atrarium.community.post/yyy';
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  it('should fetch a post with author profile', async () => {
    // Mock URI for testing (replace with actual after setup)
    const mockUri = 'at://did:plc:abc123xyz/net.atrarium.community.post/3k2l4m5n6o7p8q9r';
    const encodedUri = encodeURIComponent(mockUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('uri');
    expect(data).toHaveProperty('text');
    expect(data).toHaveProperty('communityId');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('author');

    // Validate author profile
    expect(data.author).toHaveProperty('did');
    expect(data.author).toHaveProperty('displayName');
    expect(data.author).toHaveProperty('avatar');

    // Validate communityId format (8-char hex)
    expect(data.communityId).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should return 404 for non-existent post', async () => {
    const nonExistentUri = 'at://did:plc:nonexistent/net.atrarium.community.post/fakefake';
    const encodedUri = encodeURIComponent(nonExistentUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(404);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('post');
  });

  it('should return 400 for malformed AT-URI', async () => {
    const malformedUri = 'invalid-uri-format';
    const encodedUri = encodeURIComponent(malformedUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('uri');
  });

  it('should reject app.bsky.feed.post URIs (wrong Lexicon)', async () => {
    const bskyUri = 'at://did:plc:abc123xyz/app.bsky.feed.post/3k2l4m5n6o7p8q9r';
    const encodedUri = encodeURIComponent(bskyUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('net.atrarium.community.post');
  });

  it('should include moderation status for moderators', async () => {
    const mockUri = 'at://did:plc:abc123xyz/net.atrarium.community.post/3k2l4m5n6o7p8q9r';
    const encodedUri = encodeURIComponent(mockUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer moderator-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    // Moderators should see moderation status field
    expect(data).toHaveProperty('moderationStatus');
    expect(['approved', 'hidden', 'reported']).toContain(data.moderationStatus);
  });

  it('should hide moderation status from regular members', async () => {
    const mockUri = 'at://did:plc:abc123xyz/net.atrarium.community.post/3k2l4m5n6o7p8q9r';
    const encodedUri = encodeURIComponent(mockUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer member-token',
      },
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    // Regular members should NOT see moderation status
    expect(data).not.toHaveProperty('moderationStatus');
  });

  it('should return 403 for hidden posts (non-moderators)', async () => {
    // Assuming this URI points to a hidden post
    const hiddenPostUri = 'at://did:plc:abc123xyz/net.atrarium.community.post/hiddenpost';
    const encodedUri = encodeURIComponent(hiddenPostUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer member-token',
      },
    });

    expect(response.status).toBe(403);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('hidden');
  });

  it('should allow moderators to view hidden posts', async () => {
    const hiddenPostUri = 'at://did:plc:abc123xyz/net.atrarium.community.post/hiddenpost';
    const encodedUri = encodeURIComponent(hiddenPostUri);

    const response = await fetch(`http://localhost:8787/api/posts/${encodedUri}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer moderator-token',
      },
    });

    // Moderators should be able to view hidden posts
    expect([200, 404]).toContain(response.status); // 404 if post doesn't exist in test env
  });
});
