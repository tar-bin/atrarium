// Contract Test: POST /api/communities/:id/emoji/approve (T031)
// Validates emoji approval endpoint with owner authorization

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Contract: POST /api/communities/:id/emoji/approve', () => {
  let ownerToken: string;
  let memberToken: string;
  const testCommunityId = 'a1b2c3d4';
  const testEmojiURI = 'at://did:plc:test/net.atrarium.emoji.custom/abc123';

  beforeAll(() => {
    ownerToken = 'mock-owner-token';
    memberToken = 'mock-member-token';
  });

  it('should approve emoji with owner role', async () => {
    const response = await env.WORKER.fetch(
      `http://test/api/communities/${testCommunityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiURI: testEmojiURI,
          approve: true,
        }),
      }
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.approvalURI).toMatch(/^at:\/\//);
    expect(result.status).toBe('approved');
  });

  it('should reject emoji with reason', async () => {
    const response = await env.WORKER.fetch(
      `http://test/api/communities/${testCommunityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiURI: testEmojiURI,
          approve: false,
          reason: 'Inappropriate content',
        }),
      }
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.approvalURI).toMatch(/^at:\/\//);
    expect(result.status).toBe('rejected');
  });

  it('should forbid non-owner from approving', async () => {
    const response = await env.WORKER.fetch(
      `http://test/api/communities/${testCommunityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiURI: testEmojiURI,
          approve: true,
        }),
      }
    );

    expect(response.status).toBe(403);
  });

  it('should invalidate emoji cache after approval', async () => {
    // Approve emoji
    await env.WORKER.fetch(`http://test/api/communities/${testCommunityId}/emoji/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emojiURI: testEmojiURI,
        approve: true,
      }),
    });

    // Verify cache was invalidated (registry should rebuild on next request)
    const registryResponse = await env.WORKER.fetch(
      `http://test/api/communities/${testCommunityId}/emoji/registry`
    );

    expect(registryResponse.status).toBe(200);
    const registry = await registryResponse.json();
    // Cache should be rebuilt with new approval
    expect(registry.emoji).toBeDefined();
  });

  it('should require authentication', async () => {
    const response = await env.WORKER.fetch(
      `http://test/api/communities/${testCommunityId}/emoji/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emojiURI: testEmojiURI,
          approve: true,
        }),
      }
    );

    expect(response.status).toBe(401);
  });
});
