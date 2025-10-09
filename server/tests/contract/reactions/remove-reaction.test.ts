// Contract Test: DELETE /api/reactions/remove
// TDD: This test MUST FAIL before implementation (T016-T021)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('DELETE /api/reactions/remove', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 401 Unauthorized without auth token', async () => {
    const resp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reactionUri: 'at://did:plc:alice/net.atrarium.community.reaction/abc123',
      }),
    });

    expect(resp.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not reaction owner', async () => {
    const token = 'mock-jwt-token-other-user'; // TODO: Generate valid JWT for non-owner

    const resp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reactionUri: 'at://did:plc:alice/net.atrarium.community.reaction/abc123',
      }),
    });

    expect(resp.status).toBe(403);
    const data = await resp.json();
    expect(data.error).toContain('owner');
  });

  it('should return 404 Not Found if reaction does not exist', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    const resp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reactionUri: 'at://did:plc:alice/net.atrarium.community.reaction/nonexistent',
      }),
    });

    expect(resp.status).toBe(404);
    const data = await resp.json();
    expect(data.error).toContain('not found');
  });

  it('should return 200 OK on successful removal', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member

    // First, add a reaction
    const addResp = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/remove-test',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });
    const addData = await addResp.json();
    const reactionUri = addData.reactionUri;

    // Then, remove it
    const resp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reactionUri }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.success).toBe(true);
  });

  it('should return 400 Bad Request with invalid reactionUri format', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reactionUri: 'not-a-valid-uri',
      }),
    });

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with missing reactionUri', async () => {
    const token = 'mock-jwt-token-member';

    const resp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    expect(resp.status).toBe(400);
  });
});
