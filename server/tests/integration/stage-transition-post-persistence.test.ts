/**
 * Integration Test: Stage Transition Post Persistence
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests that posts remain associated with their community during
 * stage transitions (theme → community → graduated) via immutable communityId.
 * This test MUST FAIL initially (TDD approach).
 */

import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Stage Transition Post Persistence (Integration)', () => {
  let agent: AtpAgent;
  const testCommunityId = 'a1b2c3d4'; // Immutable across stages
  const pdsUrl = process.env.PDS_URL || 'http://pds:3000';

  beforeAll(async () => {
    agent = new AtpAgent({ service: pdsUrl });
    // TODO: Authenticate
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should preserve posts when community transitions from theme to community', async () => {
    // Stage 1: Create post in "theme" stage
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post created in theme stage',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    const postUri = createResponse.data.uri;

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify post appears in timeline (theme stage)
    const response1 = await fetch(
      `http://localhost:8787/api/communities/${testCommunityId}/posts`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    const data1 = await response1.json();
    const found1 = data1.posts.some((p: { uri: string }) => p.uri === postUri);
    expect(found1).toBe(true);

    // Stage 2: Transition community from "theme" to "community"
    // (Simulated via community config update - communityId remains unchanged)
    await agent.com.atproto.repo.putRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.config',
      rkey: 'community-config-rkey', // Replace with actual rkey
      record: {
        $type: 'net.atrarium.community.config',
        name: 'Test Community',
        hashtag: `#atrarium_${testCommunityId}`,
        stage: 'community', // Changed from "theme"
        createdAt: new Date().toISOString(),
      },
    });

    // Wait for config update propagation
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Stage 3: Verify post STILL appears in timeline (community stage)
    const response2 = await fetch(
      `http://localhost:8787/api/communities/${testCommunityId}/posts`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    const data2 = await response2.json();
    const found2 = data2.posts.some((p: { uri: string }) => p.uri === postUri);

    expect(found2).toBe(true); // Post persists across stage transition
  });

  it('should maintain communityId when transitioning to graduated stage', async () => {
    // Create post in "community" stage
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post before graduation',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    const postUri = createResponse.data.uri;
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Transition to "graduated" stage
    await agent.com.atproto.repo.putRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.config',
      rkey: 'community-config-rkey',
      record: {
        $type: 'net.atrarium.community.config',
        name: 'Test Community',
        hashtag: `#atrarium_${testCommunityId}`,
        stage: 'graduated', // Changed to "graduated"
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify post persists
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

  it('should NOT change post communityId in PDS during transition', async () => {
    // Create post
    const createResponse = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Immutable communityId test',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    const postRkey = createResponse.data.uri.split('/').pop();

    // Fetch initial communityId from PDS
    const record1 = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey: postRkey,
    });

    const initialCommunityId = record1.data.value.communityId;
    expect(initialCommunityId).toBe(testCommunityId);

    // Transition stage
    await agent.com.atproto.repo.putRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.config',
      rkey: 'community-config-rkey',
      record: {
        $type: 'net.atrarium.community.config',
        name: 'Test Community',
        hashtag: `#atrarium_${testCommunityId}`,
        stage: 'graduated',
        createdAt: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify communityId UNCHANGED in PDS
    const record2 = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey: postRkey,
    });

    const updatedCommunityId = record2.data.value.communityId;
    expect(updatedCommunityId).toBe(initialCommunityId); // Immutable
  });

  it('should allow posts in communities at any stage', async () => {
    // Test creating posts in all three stages

    // Theme stage
    const themePost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post in theme stage',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    expect(themePost.data.uri).toBeDefined();

    // Community stage (simulate transition)
    const communityPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post in community stage',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    expect(communityPost.data.uri).toBeDefined();

    // Graduated stage
    const graduatedPost = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      record: {
        $type: 'net.atrarium.community.post',
        text: 'Post in graduated stage',
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      },
    });

    expect(graduatedPost.data.uri).toBeDefined();

    // All posts should appear in timeline
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const data = (await response.json()) as any;
    const uris = data.posts.map((p: { uri: string }) => p.uri);

    expect(uris).toContain(themePost.data.uri);
    expect(uris).toContain(communityPost.data.uri);
    expect(uris).toContain(graduatedPost.data.uri);
  });
});
