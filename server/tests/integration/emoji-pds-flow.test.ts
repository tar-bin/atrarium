import { AtpAgent } from '@atproto/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ATProtoService } from '../../src/services/atproto';
import type { Env } from '../../src/types';

/**
 * Integration test: Emoji workflow (015-markdown-pds: T014)
 * Scenario: Upload emoji blob → create metadata → submit for approval → approve → list approved
 *
 * Requires local PDS running on localhost:3000
 *
 * Setup:
 * 1. DevContainer should start PDS automatically
 * 2. Run: bash .devcontainer/setup-pds.sh
 * 3. Run tests: pnpm test tests/integration/emoji-pds-flow.test.ts
 */

const PDS_URL = process.env.PDS_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

describe.skip('PDS Integration: Emoji Workflow', { timeout: TEST_TIMEOUT }, () => {
  let aliceAgent: AtpAgent;
  let bobAgent: AtpAgent;
  let aliceService: ATProtoService;
  let bobService: ATProtoService;
  let mockEnv: Env;

  beforeAll(async () => {
    // Health check
    const healthCheck = await fetch(`${PDS_URL}/xrpc/_health`);
    if (!healthCheck.ok) {
      throw new Error('PDS health check failed');
    }

    // Initialize agents
    aliceAgent = new AtpAgent({ service: PDS_URL });
    bobAgent = new AtpAgent({ service: PDS_URL });

    await aliceAgent.login({
      identifier: 'alice.test',
      password: 'test123',
    });

    await bobAgent.login({
      identifier: 'bob.test',
      password: 'test123',
    });

    // Mock environment
    mockEnv = {
      BLUESKY_HANDLE: 'alice.test',
      BLUESKY_APP_PASSWORD: 'test123',
      PDS_URL,
    } as Env;

    aliceService = new ATProtoService(mockEnv);
    bobService = new ATProtoService({
      ...mockEnv,
      BLUESKY_HANDLE: 'bob.test',
    } as Env);
  });

  afterAll(async () => {
    // Cleanup test data
    // PDS data is ephemeral in dev environment
  });

  describe('Emoji Upload Flow (T007-T008)', () => {
    it('should upload emoji blob and create metadata record', async () => {
      // Create mock PNG blob (minimal valid PNG)
      const pngData = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // IHDR chunk length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR
        0x00,
        0x00,
        0x00,
        0x01, // width = 1
        0x00,
        0x00,
        0x00,
        0x01, // height = 1
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // bit depth, color type, compression, filter, interlace
        0x90,
        0x77,
        0x53,
        0xde, // CRC
        0x00,
        0x00,
        0x00,
        0x00, // IEND chunk length
        0x49,
        0x45,
        0x4e,
        0x44, // IEND
        0xae,
        0x42,
        0x60,
        0x82, // CRC
      ]);
      const mockBlob = new Blob([pngData], { type: 'image/png' });

      // T007: Upload blob
      const blobRef = await aliceService.uploadEmojiBlob(aliceAgent, mockBlob);

      expect(blobRef).toBeDefined();
      expect(blobRef.$type).toBe('blob');
      expect(blobRef.ref).toBeDefined();
      expect(blobRef.mimeType).toBe('image/png');
      expect(blobRef.size).toBeGreaterThan(0);

      // T008: Create metadata record
      const emojiRecord = await aliceService.createCustomEmoji(
        aliceAgent,
        'alice_wave',
        blobRef,
        'png',
        blobRef.size,
        { width: 1, height: 1 },
        false
      );

      expect(emojiRecord).toBeDefined();
      expect(emojiRecord.uri).toMatch(/^at:\/\//);
      expect(emojiRecord.uri).toContain('net.atrarium.emoji.custom');
      expect(emojiRecord.cid).toBeDefined();
      expect(emojiRecord.rkey).toBeDefined();
    });

    it('should reject emoji blob exceeding 500KB', async () => {
      const largeBlob = new Blob([new Uint8Array(512001)], { type: 'image/png' });

      await expect(aliceService.uploadEmojiBlob(aliceAgent, largeBlob)).rejects.toThrow(
        'File size exceeds 500KB limit'
      );
    });

    it('should reject unsupported image format', async () => {
      const svgBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });

      await expect(aliceService.uploadEmojiBlob(aliceAgent, svgBlob)).rejects.toThrow(
        'Unsupported format'
      );
    });
  });

  describe('Emoji Approval Flow (T009-T011)', () => {
    let aliceEmojiUri: string;
    const testCommunityId = 'a1b2c3d4';

    beforeAll(async () => {
      // Upload emoji for approval tests
      const pngData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const mockBlob = new Blob([pngData], { type: 'image/png' });
      const blobRef = await aliceService.uploadEmojiBlob(aliceAgent, mockBlob);
      const emojiRecord = await aliceService.createCustomEmoji(
        aliceAgent,
        'test_emoji',
        blobRef,
        'png',
        blobRef.size,
        { width: 1, height: 1 },
        false
      );
      aliceEmojiUri = emojiRecord.uri;
    });

    it('should create approved emoji approval record (T009)', async () => {
      // Bob (community owner) approves Alice's emoji
      const approvalRecord = await bobService.createEmojiApproval(
        bobAgent,
        'test_emoji',
        aliceEmojiUri,
        testCommunityId,
        'approved'
      );

      expect(approvalRecord).toBeDefined();
      expect(approvalRecord.uri).toMatch(/^at:\/\//);
      expect(approvalRecord.uri).toContain('net.atrarium.emoji.approval');
    });

    it('should create rejected emoji approval record', async () => {
      const rejectionRecord = await bobService.createEmojiApproval(
        bobAgent,
        'rejected_emoji',
        aliceEmojiUri,
        testCommunityId,
        'rejected',
        'Does not meet community guidelines'
      );

      expect(rejectionRecord).toBeDefined();
      expect(rejectionRecord.uri).toMatch(/^at:\/\//);
    });

    it('should list approved emoji for community (T011)', async () => {
      const approvals = await bobService.listCommunityApprovals(
        bobAgent,
        testCommunityId,
        'approved'
      );

      expect(Array.isArray(approvals)).toBe(true);
      expect(approvals.length).toBeGreaterThan(0);

      const testApproval = approvals.find((a) => a.shortcode === 'test_emoji');
      expect(testApproval).toBeDefined();
      expect(testApproval?.status).toBe('approved');
      expect(testApproval?.emojiRef).toBe(aliceEmojiUri);
      expect(testApproval?.communityId).toBe(testCommunityId);
    });

    it('should list all approvals (approved + rejected)', async () => {
      const allApprovals = await bobService.listCommunityApprovals(bobAgent, testCommunityId);

      expect(Array.isArray(allApprovals)).toBe(true);
      expect(allApprovals.length).toBeGreaterThanOrEqual(2); // At least approved + rejected
    });
  });

  describe('Emoji Listing (T010)', () => {
    it('should list user emoji', async () => {
      const aliceDid = aliceAgent.session?.did || '';
      const aliceEmoji = await aliceService.listUserEmoji(aliceAgent, aliceDid);

      expect(Array.isArray(aliceEmoji)).toBe(true);
      expect(aliceEmoji.length).toBeGreaterThan(0);

      const testEmoji = aliceEmoji.find((e) => e.shortcode === 'test_emoji');
      expect(testEmoji).toBeDefined();
      expect(testEmoji?.format).toBe('png');
      expect(testEmoji?.creator).toBe(aliceDid);
      expect(testEmoji?.dimensions).toEqual({ width: 1, height: 1 });
    });

    it('should return empty array for user with no emoji', async () => {
      const bobDid = bobAgent.session?.did || '';
      const bobEmoji = await bobService.listUserEmoji(bobAgent, bobDid);

      expect(Array.isArray(bobEmoji)).toBe(true);
      // Bob may have no emoji uploaded
    });
  });

  describe('Post with Markdown and Emoji (T012)', () => {
    it('should create post with markdown field', async () => {
      const aliceDid = aliceAgent.session?.did || '';

      const postData = {
        text: 'Hello World',
        markdown: '**Hello** _World_',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      const postRecord = await aliceService.createCommunityPost(postData, aliceDid);

      expect(postRecord).toBeDefined();
      expect(postRecord.uri).toMatch(/^at:\/\//);
      expect(postRecord.uri).toContain('net.atrarium.community.post');
    });

    it('should create post with emoji shortcodes', async () => {
      const aliceDid = aliceAgent.session?.did || '';

      const postData = {
        text: 'Hello :wave:',
        markdown: '**Hello** :wave:',
        emojiShortcodes: ['wave', 'test_emoji'],
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      const postRecord = await aliceService.createCommunityPost(postData, aliceDid);

      expect(postRecord).toBeDefined();
      expect(postRecord.uri).toMatch(/^at:\/\//);
    });

    it('should reject post with too many emoji shortcodes', async () => {
      const aliceDid = aliceAgent.session?.did || '';

      const tooManyEmoji = Array.from({ length: 21 }, (_, i) => `emoji${i}`);
      const postData = {
        text: 'Too many emoji',
        emojiShortcodes: tooManyEmoji,
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      await expect(aliceService.createCommunityPost(postData, aliceDid)).rejects.toThrow();
    });
  });

  describe('Complete Emoji Workflow', () => {
    it('should complete full workflow: upload → approve → post', async () => {
      const aliceDid = aliceAgent.session?.did || '';
      const testCommunityId = 'f1e2d3c4';

      // Step 1: Alice uploads emoji
      const pngData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const mockBlob = new Blob([pngData], { type: 'image/png' });
      const blobRef = await aliceService.uploadEmojiBlob(aliceAgent, mockBlob);
      const emojiRecord = await aliceService.createCustomEmoji(
        aliceAgent,
        'workflow_test',
        blobRef,
        'png',
        blobRef.size,
        { width: 1, height: 1 },
        false
      );

      expect(emojiRecord.uri).toMatch(/^at:\/\//);

      // Step 2: Bob approves emoji
      const approvalRecord = await bobService.createEmojiApproval(
        bobAgent,
        'workflow_test',
        emojiRecord.uri,
        testCommunityId,
        'approved'
      );

      expect(approvalRecord.uri).toMatch(/^at:\/\//);

      // Step 3: List approved emoji
      const approvals = await bobService.listCommunityApprovals(
        bobAgent,
        testCommunityId,
        'approved'
      );

      const workflowApproval = approvals.find((a) => a.shortcode === 'workflow_test');
      expect(workflowApproval).toBeDefined();
      expect(workflowApproval?.status).toBe('approved');

      // Step 4: Alice creates post with approved emoji
      const postData = {
        text: 'Testing workflow :workflow_test:',
        markdown: 'Testing **workflow** :workflow_test:',
        emojiShortcodes: ['workflow_test'],
        communityId: testCommunityId,
        createdAt: new Date().toISOString(),
      };

      const postRecord = await aliceService.createCommunityPost(postData, aliceDid);

      expect(postRecord.uri).toMatch(/^at:\/\//);
      expect(postRecord.uri).toContain('net.atrarium.community.post');
    });
  });
});
