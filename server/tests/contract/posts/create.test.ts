// Contract Test: POST /api/communities/:communityId/posts (create)
// TDD: This test MUST FAIL before implementation (T006)

import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('POST /api/communities/:communityId/posts (create)', () => {
  it('should return 401 Unauthorized without auth token', async () => {
    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        text: 'Hello world',
      }),
    });

    expect(resp.status).toBe(401);
  });

  it('should return 400 Bad Request with invalid text length (> 300 chars)', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT

    const longText = 'a'.repeat(301);

    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        text: longText,
      }),
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 Bad Request with invalid communityId format', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/communities/invalid-id/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'invalid-id',
        text: 'Valid text',
      }),
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toBeDefined();
  });

  it('should return 403 Forbidden if user is not community member', async () => {
    const token = 'mock-jwt-token-non-member'; // TODO: Generate JWT for non-member

    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        text: 'Hello from non-member',
      }),
    });

    expect(resp.status).toBe(403);
    const data = await resp.json();
    expect(data.error).toContain('member');
  });

  it('should return 201 Created with valid post data', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        text: 'Hello from oRPC! 🎉',
      }),
    });

    expect(resp.status).toBe(201);
    const data = await resp.json();

    // Validate CreatePostOutputSchema
    expect(data.uri).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.group\.post\/[a-zA-Z0-9]+$/
    );
    expect(data.rkey).toBeDefined();
    expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should return 400 Bad Request with empty text', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/communities/a1b2c3d4/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        text: '',
      }),
    });

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with missing communityId', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/communities//posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: 'Valid text',
      }),
    });

    expect(resp.status).toBe(400);
  });
});
