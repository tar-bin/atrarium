/**
 * Integration Test: Dual Lexicon Coexistence
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests that app.bsky.feed.post and net.atrarium.community.post
 * can coexist during the transition period.
 * This test MUST FAIL initially (TDD approach).
 */

import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Dual Lexicon Coexistence (Integration)', () => {
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

  it('should index both app.bsky.feed.post and net.atrarium.community.post', async () => {
    // Create legacy Bluesky post with hashtag
    const legacyPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: `Legacy Bluesky post #atrarium_${testCommunityId}`,
        createdAt: new Date().toISOString(),
      },
    });

    // Create custom Lexicon post
    const customPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Custom Lexicon post',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify both posts appear in timeline
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const uris = data.posts.map((p: { uri: string }) => p.uri);

    expect(uris).toContain(legacyPost.data.uri);
    expect(uris).toContain(customPost.data.uri);
  });

  it('should differentiate posts by Lexicon type in timeline', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;

    // Find posts of each type
    const legacyPosts = data.posts.filter((p: { uri: string }) =>
      p.uri.includes('app.bsky.feed.post')
    );
    const customPosts = data.posts.filter((p: { uri: string }) =>
      p.uri.includes('net.atrarium.community.post')
    );

    // Both types should exist during transition
    expect(legacyPosts.length).toBeGreaterThan(0);
    expect(customPosts.length).toBeGreaterThan(0);
  });

  it('should extract communityId from hashtag for legacy posts', async () => {
    // Create legacy post with hashtag
    const legacyPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: `Legacy post with hashtag #atrarium_${testCommunityId}`,
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify post indexed with correct communityId
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts.find((p: { uri: string }) => p.uri === legacyPost.data.uri);

    expect(found).toBeDefined();
    // Legacy posts should have communityId inferred from hashtag
    expect(found.communityId || found.hashtag).toContain(testCommunityId);
  });

  it('should prioritize native communityId over hashtag for custom Lexicon', async () => {
    // Create custom Lexicon post (no hashtag needed)
    const customPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Custom post without hashtag',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts.find((p: { uri: string }) => p.uri === customPost.data.uri);

    expect(found).toBeDefined();
    expect(found.communityId).toBe(testCommunityId); // Direct from Lexicon field
  });

  it('should maintain reverse chronological order across both Lexicon types', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;

    // Verify reverse chronological order (regardless of Lexicon type)
    const timestamps = data.posts.map((p: { createdAt: string }) =>
      new Date(p.createdAt).getTime()
    );

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
    }
  });

  it('should gradually deprecate app.bsky.feed.post indexing (future)', async () => {
    // This test documents the expected behavior for future deprecation
    // For now, both Lexicons should be indexed

    // After deprecation (future):
    // 1. Stop indexing NEW app.bsky.feed.post posts
    // 2. Existing legacy posts remain in 7-day cache
    // 3. Only net.atrarium.community.post indexed going forward

    // Current behavior: Both indexed
    const legacyPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: `Legacy post #atrarium_${testCommunityId}`,
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts.some((p: { uri: string }) => p.uri === legacyPost.data.uri);

    expect(found).toBe(true); // Currently indexed, will be deprecated later
  });

  it('should handle legacy posts expiring from 7-day cache', async () => {
    // Legacy app.bsky.feed.post posts expire after 7 days (Durable Object cache)
    // Custom net.atrarium.community.post posts also expire from cache but remain in PDS

    // This test documents the expected behavior (actual 7-day wait impractical in test)

    // Expected behavior:
    // 1. Legacy posts disappear from timeline after 7 days
    // 2. Custom Lexicon posts disappear from timeline after 7 days (cache expiry)
    // 3. Custom Lexicon posts remain in PDS permanently

    // Smoke test: Verify posts exist in cache initially
    const customPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post that will expire from cache',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const found = data.posts.some((p: { uri: string }) => p.uri === customPost.data.uri);

    expect(found).toBe(true); // Post exists in cache immediately
  });
});
