// Contract Test: GET /api/reactions/list
// TDD: This test MUST FAIL before implementation (T016-T021)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('GET /api/reactions/list', () => {
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 200 OK with empty reactions array if no reactions', async () => {
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/no-reactions';
    const resp = await worker.fetch(`/api/reactions/list?postUri=${encodeURIComponent(postUri)}`);

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.reactions).toEqual([]);
    expect(data.cursor).toBeUndefined();
  });

  it('should return 200 OK with reaction aggregates', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/list-test';

    // Add multiple reactions to the post
    await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' }, // 👍
      }),
    });

    await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+2764' }, // ❤️
      }),
    });

    // List reactions
    const resp = await worker.fetch(`/api/reactions/list?postUri=${encodeURIComponent(postUri)}`);

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.reactions).toBeInstanceOf(Array);
    expect(data.reactions.length).toBeGreaterThan(0);

    // Check reaction aggregate structure
    const aggregate = data.reactions[0];
    expect(aggregate).toHaveProperty('emoji');
    expect(aggregate).toHaveProperty('count');
    expect(aggregate).toHaveProperty('reactors');
    expect(aggregate).toHaveProperty('currentUserReacted');
    expect(aggregate.emoji).toHaveProperty('type');
    expect(aggregate.emoji).toHaveProperty('value');
    expect(aggregate.count).toBeGreaterThan(0);
    expect(aggregate.reactors).toBeInstanceOf(Array);
    expect(typeof aggregate.currentUserReacted).toBe('boolean');
  });

  it('should respect pagination limit', async () => {
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/pagination-test';

    const resp = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}&limit=5`
    );

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.reactions.length).toBeLessThanOrEqual(5);
  });

  it('should return pagination cursor if more results available', async () => {
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/cursor-test';

    const resp = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}&limit=1`
    );

    expect(resp.status).toBe(200);
    const data = await resp.json();
    if (data.reactions.length >= 1) {
      expect(data.cursor).toBeDefined();
      expect(typeof data.cursor).toBe('string');
    }
  });

  it('should support cursor-based pagination', async () => {
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/cursor-test2';

    // First page
    const resp1 = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}&limit=2`
    );
    const data1 = await resp1.json();

    // Second page with cursor
    if (data1.cursor) {
      const resp2 = await worker.fetch(
        `/api/reactions/list?postUri=${encodeURIComponent(postUri)}&limit=2&cursor=${encodeURIComponent(data1.cursor)}`
      );

      expect(resp2.status).toBe(200);
      const data2 = await resp2.json();
      expect(data2.reactions).toBeInstanceOf(Array);
    }
  });

  it('should return 400 Bad Request with missing postUri', async () => {
    const resp = await worker.fetch('/api/reactions/list');

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with invalid postUri format', async () => {
    const resp = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent('not-a-valid-uri')}`
    );

    expect(resp.status).toBe(400);
  });

  it('should return 400 Bad Request with invalid limit', async () => {
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/abc123';

    const resp = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}&limit=-1`
    );

    expect(resp.status).toBe(400);
  });

  it('should handle currentUserReacted flag correctly', async () => {
    const token = 'mock-jwt-token-member'; // TODO: Generate valid JWT for member
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/current-user-test';

    // Add reaction as current user
    await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    // List reactions with auth (should show currentUserReacted: true)
    const resp = await worker.fetch(`/api/reactions/list?postUri=${encodeURIComponent(postUri)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    const thumbsUpReaction = data.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+1F44D'
    );
    expect(thumbsUpReaction?.currentUserReacted).toBe(true);
  });
});
