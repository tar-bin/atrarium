/**
 * Integration Test: Firehose Indexing for Custom Lexicon
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests that net.atrarium.community.post records flow through
 * AT Protocol Relay/Firehose and get indexed in Durable Objects.
 * This test MUST FAIL initially (TDD approach).
 */

import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Firehose Indexing for Custom Lexicon (Integration)', () => {
  let agent: AtpAgent;
  const testCommunityId = 'a1b2c3d4';
  const pdsUrl = process.env.PDS_URL || 'http://pds:3000';

  beforeAll(async () => {
    agent = new AtpAgent({ service: pdsUrl });
    // TODO: Authenticate
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should index net.atrarium.community.post from Firehose', async () => {
    // Create post via PDS directly (bypassing Dashboard API)
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Direct PDS post for Firehose test',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    const postUri = createResponse.data.uri;

    // Wait for Firehose indexing (max 10 seconds)
    let indexed = false;
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if post appears in community timeline
      const response = await fetch(
        `http://localhost:8787/api/communities/${testCommunityId}/posts`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      const data = (await response.json()) as any;
      const found = data.posts.some((p: { uri: string }) => p.uri === postUri);

      if (found) {
        indexed = true;
        break;
      }
    }

    expect(indexed).toBe(true);
  });

  it('should apply heavyweight filter (regex /#atrarium_[0-9a-f]{8}/)', async () => {
    // Create post with INVALID communityId (9 chars instead of 8)
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Invalid communityId test',
        communityId: 'a1b2c3d4e', // 9 chars (should fail regex)
        createdAt: new Date().toISOString(),
      },
    });

    const postUri = createResponse.data.uri;

    // Wait for potential indexing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify post was NOT indexed (fails heavyweight filter)
    const response = await fetch(`http://localhost:8787/api/communities/a1b2c3d4e/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts?.some((p: { uri: string }) => p.uri === postUri);

    expect(found).toBe(false); // Should NOT be indexed
  });

  it('should index posts with immutable communityId across stages', async () => {
    // Simulate stage transition: theme → community
    // CommunityId remains 'a1b2c3d4' throughout

    // Create post in "theme" stage
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post from theme stage',
        communityId: testCommunityId, // Same ID across stages
        createdAt: new Date().toISOString(),
      },
    });

    const postUri = createResponse.data.uri;

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify post appears in timeline (stage transition doesn't break indexing)
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts.some((p: { uri: string }) => p.uri === postUri);

    expect(found).toBe(true);
  });

  it('should batch process Firehose events via Queue', async () => {
    // Create multiple posts rapidly (stress test batching)
    const postPromises = Array.from({ length: 5 }, (_, i) =>
      agent.com.atproto.repo.createRecord({
        repo: agent.session?.did || 'did:plc:test',
        collection: 'net.atrarium.community.post',
        record: {
          $type: 'net.atrarium.community.post',
          text: `Batch post ${i}`,
          communityId: testCommunityId,
          createdAt: new Date().toISOString(),
        },
      })
    );

    const results = await Promise.all(postPromises);
    const uris = results.map((r) => r.data.uri);

    // Wait for batch processing (Queue max_batch_timeout = 5s)
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Verify all posts indexed
    const response = await fetch(
      `http://localhost:8787/api/communities/${testCommunityId}/posts?limit=50`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    const data = (await response.json()) as any;
    const indexedUris = data.posts.map((p: { uri: string }) => p.uri);

    for (const uri of uris) {
      expect(indexedUris).toContain(uri);
    }
  });

  it('should continue indexing app.bsky.feed.post for backward compatibility', async () => {
    // Create legacy Bluesky post (for comparison)
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: `Legacy post with #atrarium_${testCommunityId}`,
        createdAt: new Date().toISOString(),
      },
    });

    const legacyPostUri = createResponse.data.uri;

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify legacy post still indexed (dual Lexicon support)
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts.some((p: { uri: string }) => p.uri === legacyPostUri);

    expect(found).toBe(true); // Legacy posts coexist with custom Lexicon
  });
});
