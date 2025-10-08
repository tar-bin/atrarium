/**
 * Contract Test: POST /api/communities/{communityId}/posts
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests the creation of posts using net.atrarium.community.post Lexicon.
 * This test MUST FAIL initially (TDD approach).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('POST /api/communities/{communityId}/posts', () => {
  const testCommunityId = 'a1b2c3d4'; // 8-char hex

  beforeAll(async () => {
    // Setup: Create test community (implementation pending)
    // This will be implemented in Phase 3.3
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  it('should create a post with valid input', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token', // Mock JWT
      },
      body: JSON.stringify({
        text: 'Hello, Atrarium! This is a test post.',
      }),
    });

    expect(response.status).toBe(201);

    const data = (await response.json()) as { uri: string; rkey: string; createdAt: string };
    expect(data).toHaveProperty('uri');
    expect(data).toHaveProperty('rkey');
    expect(data).toHaveProperty('createdAt');
    expect(data.uri).toMatch(/^at:\/\/did:plc:.+\/net\.atrarium\.community\.post\/.+$/);
  });

  it('should reject empty text', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        text: '',
      }),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('text');
  });

  it('should reject text exceeding 300 graphemes', async () => {
    const longText = 'あ'.repeat(301); // 301 graphemes

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        text: longText,
      }),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('300');
  });

  it('should reject non-member posts (403)', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer non-member-token',
      },
      body: JSON.stringify({
        text: 'I am not a member',
      }),
    });

    expect(response.status).toBe(403);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('member');
  });

  it('should reject invalid community ID (404)', async () => {
    const response = await fetch('http://localhost:8787/api/communities/invalid-id/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        text: 'Test post',
      }),
    });

    expect(response.status).toBe(404);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('community');
  });

  it('should enforce rate limiting (429)', async () => {
    // Send 11 requests rapidly (assuming rate limit is 10/minute)
    const requests = Array.from({ length: 11 }, (_, i) =>
      fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          text: `Test post ${i}`,
        }),
      })
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((r) => r.status);

    // At least one should be rate-limited
    expect(statusCodes).toContain(429);
  });
});
