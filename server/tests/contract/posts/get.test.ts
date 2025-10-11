// Contract Test: GET /api/posts/:uri (get)
// TDD: This test MUST FAIL before implementation (T008)

import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('GET /api/posts/:uri (get)', () => {
  it('should return 401 Unauthorized without auth token', async () => {
    const postUri = encodeURIComponent('at://did:plc:alice/net.atrarium.group.post/abc123');

    const resp = await env.WORKER.fetch(`http://test/api/posts/${postUri}`, {
      method: 'GET',
    });

    expect(resp.status).toBe(401);
  });

  it('should return 400 Bad Request with invalid AT-URI format', async () => {
    const token = 'mock-jwt-token-member';
    const invalidUri = encodeURIComponent('not-a-valid-uri');

    const resp = await env.WORKER.fetch(`http://test/api/posts/${invalidUri}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toBeDefined();
  });

  it('should return 404 Not Found for non-existent post', async () => {
    const token = 'mock-jwt-token-member';
    const postUri = encodeURIComponent('at://did:plc:nonexistent/net.atrarium.group.post/notfound');

    const resp = await env.WORKER.fetch(`http://test/api/posts/${postUri}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(404);
    const data = await resp.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 Bad Request for non-post record (wrong collection)', async () => {
    const token = 'mock-jwt-token-member';
    const wrongCollectionUri = encodeURIComponent(
      'at://did:plc:alice/net.atrarium.group.config/abc123'
    );

    const resp = await env.WORKER.fetch(`http://test/api/posts/${wrongCollectionUri}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toContain('post');
  });

  it('should return 200 OK with valid post data', async () => {
    const token = 'mock-jwt-token-member';
    const postUri = encodeURIComponent('at://did:plc:alice/net.atrarium.group.post/valid123');

    const resp = await env.WORKER.fetch(`http://test/api/posts/${postUri}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();

    // Validate PostOutputSchema
    expect(data.uri).toMatch(/^at:\/\//);
    expect(data.rkey).toBeDefined();
    expect(data.text).toBeDefined();
    expect(typeof data.text).toBe('string');
    expect(data.communityId).toMatch(/^[0-9a-f]{8}$/);
    expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Validate author profile
    expect(data.author).toBeDefined();
    expect(data.author.did).toMatch(/^did:/);
    expect(data.author.handle).toBeDefined();
  });

  it('should enrich author profile correctly', async () => {
    const token = 'mock-jwt-token-member';
    const postUri = encodeURIComponent('at://did:plc:alice/net.atrarium.group.post/valid123');

    const resp = await env.WORKER.fetch(`http://test/api/posts/${postUri}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();

    // Author profile structure
    expect(data.author.did).toBeDefined();
    expect(data.author.handle).toBeDefined();
    expect(typeof data.author.displayName === 'string' || data.author.displayName === null).toBe(
      true
    );
    expect(typeof data.author.avatar === 'string' || data.author.avatar === null).toBe(true);
  });

  it('should return 400 Bad Request with missing URI parameter', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await env.WORKER.fetch('http://test/api/posts/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(resp.status).toBe(400);
  });
});
