/**
 * Integration Test: PDS Post Creation Flow
 * Feature: 014-bluesky (Custom Lexicon Posts)
 *
 * Tests the full flow of creating a post using net.atrarium.community.post
 * and verifying it's stored in the user's PDS.
 * This test MUST FAIL initially (TDD approach).
 */

import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('PDS Post Creation Flow (Integration)', () => {
  let agent: AtpAgent;
  const testCommunityId = 'a1b2c3d4';
  const pdsUrl = process.env.PDS_URL || 'http://pds:3000';

  beforeAll(async () => {
    // Setup: Create AtpAgent and authenticate
    agent = new AtpAgent({ service: pdsUrl });
    // TODO: Authenticate with test account
    // await agent.login({ identifier: 'test@example.com', password: 'test-password' });
  });

  afterAll(async () => {
    // Cleanup: Delete test posts from PDS
  });

  it('should create a post in PDS using custom Lexicon', async () => {
    const postText = 'Hello from integration test!';

    // Create post via API
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ text: postText }),
    });

    expect(response.status).toBe(201);
    const { uri, rkey } = (await response.json()) as {
      uri: string;
      rkey: string;
      createdAt: string;
    };

    // Verify post exists in PDS
    const record = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey,
    });

    expect(record.data.value).toMatchObject({
      $type: 'net.atrarium.community.post',
      text: postText,
      communityId: testCommunityId,
    });

    expect((record.data.value as any).createdAt).toBeDefined();
    expect(record.data.uri).toBe(uri);
  });

  it('should validate communityId format (8-char hex)', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ text: 'Test post' }),
    });

    const { uri } = (await response.json()) as { uri: string; rkey: string };

    // Fetch from PDS and verify communityId
    const rkey = uri.split('/').pop() || '';
    const record = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey,
    });

    expect((record.data.value as any).communityId).toMatch(/^[0-9a-f]{8}$/);
    expect((record.data.value as any).communityId).toBe(testCommunityId);
  });

  it('should enforce Lexicon validation (maxGraphemes: 300)', async () => {
    const longText = 'あ'.repeat(301); // 301 graphemes (exceeds limit)

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ text: longText }),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.error).toContain('300');
  });

  it('should set createdAt to current timestamp (ISO 8601)', async () => {
    const beforeCreate = new Date().toISOString();

    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ text: 'Timestamp test' }),
    });

    const { uri } = (await response.json()) as { uri: string; rkey: string };
    const afterCreate = new Date().toISOString();

    // Fetch from PDS
    const rkey = uri.split('/').pop();
    const record = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey,
    });

    const createdAt = (record.data.value as any).createdAt;
    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/); // ISO 8601
    expect(createdAt).toBeGreaterThanOrEqual(beforeCreate);
    expect(createdAt).toBeLessThanOrEqual(afterCreate);
  });

  it('should store posts permanently in PDS (not ephemeral)', async () => {
    const response = await fetch(`http://localhost:8787/api/communities/${testCommunityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ text: 'Persistent post' }),
    });

    const { uri } = (await response.json()) as { uri: string; rkey: string };
    const rkey = uri.split('/').pop();

    // Verify post exists immediately
    const record1 = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey,
    });
    expect(record1.data.value.text).toBe('Persistent post');

    // Wait 1 second and verify it still exists (PDS is permanent, not 7-day cache)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const record2 = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || 'did:plc:test',
      collection: 'net.atrarium.community.post',
      rkey,
    });
    expect(record2.data.value.text).toBe('Persistent post');
  });
});
