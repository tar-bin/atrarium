// Contract Test: POST /api/reactions/add
// TDD: This test MUST FAIL before implementation (T016-T021)

import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe('POST /api/reactions/add', () => {
  let _authToken: string;

  beforeAll(() => {
    _authToken = 'mock-jwt-token';
  });

  it('should return 401 Unauthorized without auth token', async () => {
    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: { type: 'unicode', value: 'U+1F44D' }, // 👍
      }),
    });

    expect(resp.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not community member', async () => {
    const token = 'mock-jwt-token-non-member'; // TODO: Generate valid JWT for non-member

    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    expect(resp.status).toBe(403);
    const data = await resp.json();
    expect(data.error).toContain('member');
  });

  it('should return 409 Conflict if duplicate reaction', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    // First reaction (should succeed)
    await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    // Duplicate reaction (should fail)
    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    expect(resp.status).toBe(409);
    const data = await resp.json();
    expect(data.error).toContain('duplicate');
  });

  it('should return 200 OK with reaction URI on success (Unicode emoji)', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/xyz789',
        emoji: { type: 'unicode', value: 'U+2764' }, // ❤️
      }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.success).toBe(true);
    expect(data.reactionUri).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.community\.reaction\/[a-zA-Z0-9]+$/
    );
  });

  it('should return 200 OK with reaction URI on success (Custom emoji)', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/custom123',
        emoji: {
          type: 'custom',
          value: 'at://did:plc:bob/net.atrarium.emoji.custom/myemoji',
        },
      }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.success).toBe(true);
    expect(data.reactionUri).toMatch(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.community\.reaction\/[a-zA-Z0-9]+$/
    );
  });

  it('should return 400 Bad Request with invalid emoji type', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: { type: 'invalid', value: 'something' },
      }),
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 Bad Request with invalid postUri format', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'not-a-valid-uri',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    expect(resp.status).toBe(400);
  });
});
