import { BskyAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integration tests for PDS posting functionality
 * Requires local PDS running on localhost:3000
 *
 * Setup:
 * 1. DevContainer should start PDS automatically
 * 2. Run: bash .devcontainer/setup-pds.sh
 * 3. Run tests: npm test tests/integration/pds-posting.test.ts
 */

const PDS_URL = process.env.PDS_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

describe.skip('PDS Integration: Direct Posting', { timeout: TEST_TIMEOUT }, () => {
  let aliceAgent: BskyAgent;
  let bobAgent: BskyAgent;

  beforeAll(async () => {
    const healthCheck = await fetch(`${PDS_URL}/xrpc/_health`);
    if (!healthCheck.ok) {
      throw new Error('PDS health check failed');
    }

    // Initialize agents for test users
    aliceAgent = new BskyAgent({ service: PDS_URL });
    bobAgent = new BskyAgent({ service: PDS_URL });
    await aliceAgent.login({
      identifier: 'alice.test',
      password: 'test123',
    });

    await bobAgent.login({
      identifier: 'bob.test',
      password: 'test123',
    });
  });

  afterAll(async () => {
    // Cleanup: delete test posts if needed
    // For now, PDS data is ephemeral in dev environment
  });

  describe('Basic PDS Operations', () => {
    it('should authenticate with local PDS', () => {
      expect(aliceAgent.session).toBeDefined();
      expect(aliceAgent.session?.handle).toBe('alice.test');
    });

    it('should create a simple post', async () => {
      const text = 'Hello from Atrarium tests!';
      const response = await aliceAgent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      expect(response.uri).toMatch(/^at:\/\//);
      expect(response.cid).toBeDefined();
    });

    it('should retrieve created post by URI', async () => {
      // Create post
      const text = 'Test post for retrieval';
      const createResponse = await aliceAgent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      // Parse URI to get repo and rkey
      const uriParts = createResponse.uri.split('/');
      const repo = uriParts[2]!; // did:plc:xxx
      const rkey = uriParts[uriParts.length - 1]!; // post ID

      // Retrieve post
      const getResponse = await aliceAgent.app.bsky.feed.post.get({
        repo,
        rkey,
      });

      expect(getResponse.value.text).toBe(text);
    });
  });

  describe('Atrarium Feed Hashtag Integration', () => {
    const testHashtag = '#atrarium_testfeed';

    it('should create post with Atrarium feed hashtag', async () => {
      const text = `Testing direct feed posting! ${testHashtag}`;

      const response = await aliceAgent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      expect(response.uri).toBeDefined();
      expect(response.cid).toBeDefined();

      // Verify hashtag is in the post
      const uriParts = response.uri.split('/');
      const repo = uriParts[2]!;
      const rkey = uriParts[uriParts.length - 1]!;

      const post = await aliceAgent.app.bsky.feed.post.get({ repo, rkey });
      expect(post.value.text).toContain(testHashtag);
    });

    it('should handle multiple feed hashtags in one post', async () => {
      const hashtag1 = '#atrarium_feed001';
      const hashtag2 = '#atrarium_feed002';
      const text = `Multi-feed post! ${hashtag1} ${hashtag2}`;

      const response = await aliceAgent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      const uriParts = response.uri.split('/');
      const repo = uriParts[2]!;
      const rkey = uriParts[uriParts.length - 1]!;

      const post = await aliceAgent.app.bsky.feed.post.get({ repo, rkey });
      expect(post.value.text).toContain(hashtag1);
      expect(post.value.text).toContain(hashtag2);
    });

    it('should create posts from different users', async () => {
      const aliceText = `Alice's post ${testHashtag}`;
      const bobText = `Bob's post ${testHashtag}`;

      const aliceResponse = await aliceAgent.post({
        text: aliceText,
        createdAt: new Date().toISOString(),
      });

      const bobResponse = await bobAgent.post({
        text: bobText,
        createdAt: new Date().toISOString(),
      });

      expect(aliceResponse.uri).toBeDefined();
      expect(bobResponse.uri).toBeDefined();
      expect(aliceResponse.uri).not.toBe(bobResponse.uri);
    });
  });

  describe('Post Deletion (FR-011)', () => {
    it('should delete post from PDS', async () => {
      // Create post
      const text = 'This post will be deleted';
      const createResponse = await aliceAgent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      const uriParts = createResponse.uri.split('/');
      const repo = uriParts[2]!;
      const rkey = uriParts[uriParts.length - 1]!;

      // Delete post
      await aliceAgent.app.bsky.feed.post.delete({
        repo,
        rkey,
      });

      // Verify deletion (should throw or return null)
      try {
        await aliceAgent.app.bsky.feed.post.get({ repo, rkey });
        throw new Error('Post should have been deleted');
      } catch (error: any) {
        // Expected: post not found after deletion
        expect(error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle posts with special characters', async () => {
      const text = 'Test with émojis 🎉 and symbols: @mention #hashtag #atrarium_test';

      const response = await aliceAgent.post({
        text,
        createdAt: new Date().toISOString(),
      });

      expect(response.uri).toBeDefined();
    });

    it('should handle long posts (near character limit)', async () => {
      // AT Protocol allows 300 characters
      const longText = `${'A'.repeat(270)} #atrarium_longpost`;

      const response = await aliceAgent.post({
        text: longText,
        createdAt: new Date().toISOString(),
      });

      expect(response.uri).toBeDefined();
    });

    it('should reject posts exceeding character limit', async () => {
      // Over 300 characters
      const tooLongText = 'A'.repeat(301);

      await expect(
        aliceAgent.post({
          text: tooLongText,
          createdAt: new Date().toISOString(),
        })
      ).rejects.toThrow();
    });
  });
});

describe('PDS Availability Check', () => {
  it('should verify PDS is running', async () => {
    const response = await fetch(`${PDS_URL}/xrpc/_health`);
    expect(response.ok).toBe(true);
  });

  it('should verify PDS API endpoint', async () => {
    const response = await fetch(`${PDS_URL}/xrpc/com.atproto.server.describeServer`);
    expect(response.ok).toBe(true);

    const data = (await response.json()) as { availableUserDomains: string[] };
    expect(data.availableUserDomains).toBeDefined();
  });
});
