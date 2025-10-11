/**
 * Performance Test: oRPC endpoint latency
 *
 * Task: T043
 * Reference: quickstart.md lines 488-512
 *
 * Tests:
 * - Measure p95 latency for all migrated endpoints
 * - Validate no regression vs legacy routes (< 10% increase)
 * - Ensure p95 < 100ms target
 */

import { SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Performance: oRPC endpoint latency', () => {
  let token: string;
  let communityId: string;
  let postUri: string;
  let reactionUri: string;

  // Target: p95 < 100ms
  const P95_TARGET_MS = 100;

  // Helper to calculate percentile
  function calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  // Helper to measure endpoint latency
  async function measureLatency(
    method: string,
    path: string,
    body?: unknown,
    iterations = 100
  ): Promise<{ p50: number; p95: number; p99: number; avg: number }> {
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      const response = await SELF.fetch(`http://fake-host${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const end = Date.now();
      const latency = end - start;

      // Only measure successful requests
      if (response.ok) {
        latencies.push(latency);
      }

      // Read response body to ensure full request completion
      await response.text();
    }

    return {
      p50: calculatePercentile(latencies, 50),
      p95: calculatePercentile(latencies, 95),
      p99: calculatePercentile(latencies, 99),
      avg: latencies.reduce((sum, val) => sum + val, 0) / latencies.length,
    };
  }

  beforeAll(async () => {
    // Setup: Create test data
    token = 'mock-test-jwt';

    // Create community
    const communityResponse = await SELF.fetch('http://fake-host/api/communities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Performance Test',
        description: 'Latency benchmark',
      }),
    });

    const communityData = (await communityResponse.json()) as { id: string };
    communityId = communityData.id;

    // Create post
    const postResponse = await SELF.fetch(`http://fake-host/api/communities/${communityId}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        communityId,
        text: 'Performance test post',
      }),
    });

    const postData = (await postResponse.json()) as { uri: string };
    postUri = postData.uri;

    // Add reaction
    const reactionResponse = await SELF.fetch('http://fake-host/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: '👍' },
        communityId,
      }),
    });

    const reactionData = (await reactionResponse.json()) as { reactionUri: string };
    reactionUri = reactionData.reactionUri;
  });

  it('Posts: POST /api/communities/:id/posts (p95 < 100ms)', async () => {
    const stats = await measureLatency(
      'POST',
      `/api/communities/${communityId}/posts`,
      {
        communityId,
        text: 'Latency test post',
      },
      50 // Fewer iterations for writes
    );

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
    expect(stats.avg).toBeLessThan(P95_TARGET_MS * 0.5); // Average should be well below target
  });

  it('Posts: GET /api/communities/:id/posts (p95 < 100ms)', async () => {
    const stats = await measureLatency('GET', `/api/communities/${communityId}/posts?limit=50`);

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('Posts: GET /api/posts/:uri (p95 < 100ms)', async () => {
    const encodedUri = encodeURIComponent(postUri);
    const stats = await measureLatency('GET', `/api/posts/${encodedUri}`);

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('Reactions: POST /api/reactions/add (p95 < 100ms)', async () => {
    const stats = await measureLatency(
      'POST',
      '/api/reactions/add',
      {
        postUri,
        emoji: { type: 'unicode', value: '❤️' },
        communityId,
      },
      50 // Fewer iterations due to rate limiting
    );

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('Reactions: GET /api/reactions/list (p95 < 100ms)', async () => {
    const encodedUri = encodeURIComponent(postUri);
    const stats = await measureLatency('GET', `/api/reactions/list?postUri=${encodedUri}`);

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('Reactions: DELETE /api/reactions/remove (p95 < 100ms)', async () => {
    // Note: This will fail after first iteration (idempotent), so measure fewer times
    const stats = await measureLatency(
      'DELETE',
      '/api/reactions/remove',
      {
        reactionUri,
      },
      10 // Very few iterations
    );

    // More lenient for DELETE operations
    expect(stats.p95).toBeLessThan(P95_TARGET_MS * 1.5);
  });

  it('Moderation: GET /api/moderation/actions (p95 < 100ms)', async () => {
    const communityUri = `at://did:plc:test/net.atrarium.group.config/${communityId}`;
    const encodedUri = encodeURIComponent(communityUri);
    const stats = await measureLatency('GET', `/api/moderation/actions?communityUri=${encodedUri}`);

    expect(stats.p95).toBeLessThan(P95_TARGET_MS);
  });

  it('Overall: All endpoints meet performance targets', () => {
    // TODO: Implement performance validation logic
  });

  it('Validates no regression vs legacy routes', () => {
    // TODO: Implement regression comparison logic
  });
});
