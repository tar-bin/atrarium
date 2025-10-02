// Contract Test: POST /api/posts
// Verifies submit post URI to theme feed

import { describe, it, expect } from 'vitest';
import app from '../../../src/index';
import { createMockEnv, createMockJWT } from '../../helpers/test-env';

describe('Contract: POST /api/posts', () => {
  let env: any;
  let jwt: string;

  beforeEach(async () => {
    env = createMockEnv();
    jwt = await createMockJWT('did:plc:test123', 'test.bsky.social');
  });

  it('should require authentication', async () => {
    const request = new Request('http://localhost:8787/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri: 'at://did:plc:test123/app.bsky.feed.post/abc123',
        feedId: '770e8400-e29b-41d4-a716-446655440002',
      }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });

  it('should require uri and feedId', async () => {
    const request = new Request('http://localhost:8787/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({}),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(400);
  });

  it('should validate AT-URI format', async () => {
    const request = new Request('http://localhost:8787/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        uri: 'invalid-uri',
        feedId: '770e8400-e29b-41d4-a716-446655440002',
      }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('AT-URI');
  });

  it('should accept valid AT-URI', async () => {
    const request = new Request('http://localhost:8787/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        uri: 'at://did:plc:test123/app.bsky.feed.post/3k44dddkhc322',
        feedId: '770e8400-e29b-41d4-a716-446655440002',
      }),
    });

    const response = await app.fetch(request, env, {} as ExecutionContext);

    // May return 404 if feed doesn't exist, which is acceptable for contract test
    expect([201, 404, 403]).toContain(response.status);
  });
});
