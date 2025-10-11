/**
 * Integration Test: Post Creation Flow (Scenario 1)
 * Validates: FR-001 (Posts API - create endpoint)
 * Reference: quickstart.md lines 36-120
 *
 * Flow: Authenticate → Create community → Create post → Verify in feed
 * Tests: PDS write → Firehose → Durable Object indexing
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Integration: Post Creation Flow', () => {
  let worker: UnstableDevWorker;
  let token: string;
  let communityId: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  it('authenticates user and obtains JWT token', async () => {
    const response = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as { token: string };
    expect(data.token).toBeTruthy();
    expect(typeof data.token).toBe('string');

    token = data.token;
  });

  it('creates community for testing', async () => {
    const response = await worker.fetch('http://localhost/api/communities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Integration Test Community',
        description: 'Post creation flow test',
      }),
    });

    expect(response.status).toBe(201);

    const data = (await response.json()) as { id: string };
    expect(data.id).toMatch(/^[0-9a-f]{8}$/);

    communityId = data.id;
  });

  it('creates post via oRPC endpoint', async () => {
    const response = await worker.fetch(`http://localhost/api/communities/${communityId}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        communityId,
        text: 'Hello from oRPC integration test! 🎉',
      }),
    });

    expect(response.status).toBe(201);

    const data = (await response.json()) as {
      uri: string;
      rkey: string;
      createdAt: string;
    };

    // Validate response structure
    expect(data.uri).toMatch(/^at:\/\//);
    expect(data.uri).toContain('net.atrarium.group.post');
    expect(data.rkey).toBeTruthy();
    expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('verifies post appears in community feed', async () => {
    // Wait for Firehose indexing (simulate delay)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/posts?limit=10`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      data: Array<{ text: string; author: { handle: string } }>;
    };

    // Verify post exists in feed
    expect(data.data.length).toBeGreaterThan(0);

    const post = data.data.find((p) => p.text === 'Hello from oRPC integration test! 🎉');
    expect(post).toBeDefined();
    expect(post?.author.handle).toBe('alice.test');
  });

  it('rejects post creation from non-member', async () => {
    // Authenticate as bob.test (not a member)
    const bobLoginResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'bob.test',
        password: 'test123',
      }),
    });

    const bobData = (await bobLoginResponse.json()) as { token: string };
    const bobToken = bobData.token;

    // Try to create post in alice's community
    const response = await worker.fetch(`http://localhost/api/communities/${communityId}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bobToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        communityId,
        text: 'Should be rejected',
      }),
    });

    expect(response.status).toBe(403);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toContain('not a member');
  });
});
