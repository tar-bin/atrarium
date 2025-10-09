// Unit Tests: PDS Emoji Operations (015-markdown-pds)
// Tests for emoji blob upload, metadata creation, approval management
// CRITICAL: These tests MUST FAIL before implementing T007-T012

import { beforeAll, describe, expect, it } from 'vitest';
import { ATProtoService } from '../../src/services/atproto';
import type { Env } from '../../src/types';

describe('PDS Emoji Operations', () => {
  let service: ATProtoService;
  let mockEnv: Env;

  beforeAll(() => {
    // Mock environment for testing
    mockEnv = {
      BLUESKY_HANDLE: 'test.bsky.social',
      BLUESKY_APP_PASSWORD: 'test-password',
    } as Env;

    service = new ATProtoService(mockEnv);
  });

  describe('uploadEmojiBlob (T007)', () => {
    it('should upload emoji blob to PDS and return BlobRef', async () => {
      const agent = await service.getAgent();
      const mockBlob = new Blob(['fake-png-data'], { type: 'image/png' });

      // This will fail because uploadEmojiBlob doesn't exist yet
      const result = await service.uploadEmojiBlob(agent, mockBlob);

      expect(result).toBeDefined();
      expect(result.$type).toBe('blob');
      expect(result.ref).toBeDefined();
      expect(result.mimeType).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should reject blobs larger than 500KB', async () => {
      const agent = await service.getAgent();
      const largeBlob = new Blob([new Uint8Array(512001)], { type: 'image/png' });

      await expect(service.uploadEmojiBlob(agent, largeBlob)).rejects.toThrow(
        'File size exceeds 500KB limit'
      );
    });

    it('should reject unsupported MIME types', async () => {
      const agent = await service.getAgent();
      const invalidBlob = new Blob(['data'], { type: 'image/svg+xml' });

      await expect(service.uploadEmojiBlob(agent, invalidBlob)).rejects.toThrow(
        'Unsupported format'
      );
    });
  });

  describe('createCustomEmoji (T008)', () => {
    it('should create custom emoji metadata record in PDS', async () => {
      const agent = await service.getAgent();
      const mockBlobRef = {
        $type: 'blob' as const,
        ref: { $link: 'bafyreib2rxk3rh6kzwq' },
        mimeType: 'image/png',
        size: 50000,
      };

      const result = await service.createCustomEmoji(
        agent,
        'my_emoji',
        mockBlobRef,
        'png',
        50000,
        { width: 128, height: 128 },
        false
      );

      expect(result).toBeDefined();
      expect(result.uri).toMatch(/^at:\/\//);
      expect(result.cid).toBeDefined();
      expect(result.rkey).toBeDefined();
    });

    it('should reject invalid shortcodes', async () => {
      const agent = await service.getAgent();
      const mockBlobRef = {
        $type: 'blob' as const,
        ref: { $link: 'bafyreib2rxk3rh6kzwq' },
        mimeType: 'image/png',
        size: 50000,
      };

      await expect(
        service.createCustomEmoji(
          agent,
          'Invalid-Shortcode!', // Contains uppercase and special chars
          mockBlobRef,
          'png',
          50000,
          { width: 128, height: 128 },
          false
        )
      ).rejects.toThrow();
    });

    it('should reject dimensions exceeding 256x256', async () => {
      const agent = await service.getAgent();
      const mockBlobRef = {
        $type: 'blob' as const,
        ref: { $link: 'bafyreib2rxk3rh6kzwq' },
        mimeType: 'image/png',
        size: 50000,
      };

      await expect(
        service.createCustomEmoji(
          agent,
          'oversized',
          mockBlobRef,
          'png',
          50000,
          { width: 512, height: 512 }, // Exceeds 256x256 limit
          false
        )
      ).rejects.toThrow();
    });
  });

  describe('createEmojiApproval (T009)', () => {
    it('should create emoji approval record in community owner PDS', async () => {
      const agent = await service.getAgent();
      const emojiUri = 'at://did:plc:abc123/net.atrarium.emoji.custom/xyz789';

      const result = await service.createEmojiApproval(
        agent,
        'my_emoji',
        emojiUri,
        'a1b2c3d4',
        'approved'
      );

      expect(result).toBeDefined();
      expect(result.uri).toMatch(/^at:\/\//);
      expect(result.cid).toBeDefined();
      expect(result.rkey).toBeDefined();
    });

    it('should create rejected approval with reason', async () => {
      const agent = await service.getAgent();
      const emojiUri = 'at://did:plc:abc123/net.atrarium.emoji.custom/xyz789';

      const result = await service.createEmojiApproval(
        agent,
        'inappropriate',
        emojiUri,
        'a1b2c3d4',
        'rejected',
        'Violates community guidelines'
      );

      expect(result).toBeDefined();
      expect(result.uri).toMatch(/^at:\/\//);
    });

    it('should reject invalid status values', async () => {
      const agent = await service.getAgent();
      const emojiUri = 'at://did:plc:abc123/net.atrarium.emoji.custom/xyz789';

      await expect(
        service.createEmojiApproval(agent, 'test', emojiUri, 'a1b2c3d4', 'invalid_status' as any)
      ).rejects.toThrow();
    });
  });

  describe('listUserEmoji (T010)', () => {
    it('should list all custom emoji for a user', async () => {
      const agent = await service.getAgent();
      const userDid = 'did:plc:test123';

      const result = await service.listUserEmoji(agent, userDid);

      expect(Array.isArray(result)).toBe(true);
      // Should return array of CustomEmoji records
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('shortcode');
        expect(result[0]).toHaveProperty('blob');
        expect(result[0]).toHaveProperty('creator');
      }
    });

    it('should return empty array if user has no emoji', async () => {
      const agent = await service.getAgent();
      const userDid = 'did:plc:nonemoji';

      const result = await service.listUserEmoji(agent, userDid);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should reject invalid DID format', async () => {
      const agent = await service.getAgent();

      await expect(service.listUserEmoji(agent, 'invalid-did')).rejects.toThrow();
    });
  });

  describe('listCommunityApprovals (T011)', () => {
    it('should list all emoji approvals for a community', async () => {
      const agent = await service.getAgent();
      const communityId = 'a1b2c3d4';

      const result = await service.listCommunityApprovals(agent, communityId);

      expect(Array.isArray(result)).toBe(true);
      // Should return array of EmojiApproval records
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('shortcode');
        expect(result[0]).toHaveProperty('emojiRef');
        expect(result[0]).toHaveProperty('communityId');
        expect(result[0]).toHaveProperty('status');
      }
    });

    it('should filter only approved emoji when requested', async () => {
      const agent = await service.getAgent();
      const communityId = 'a1b2c3d4';

      const result = await service.listCommunityApprovals(agent, communityId, 'approved');

      expect(Array.isArray(result)).toBe(true);
      result.forEach((approval) => {
        expect(approval.status).toBe('approved');
      });
    });

    it('should reject invalid community ID format', async () => {
      const agent = await service.getAgent();

      await expect(service.listCommunityApprovals(agent, 'invalid')).rejects.toThrow();
    });
  });

  describe('createPost with Markdown (T012)', () => {
    it('should create post with markdown field', async () => {
      const userDid = 'did:plc:test123';

      const postData = {
        text: 'Hello World',
        markdown: '**Hello** _World_',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      const result = await service.createCommunityPost(postData, userDid);

      expect(result).toBeDefined();
      expect(result.uri).toMatch(/^at:\/\//);
      expect(result.cid).toBeDefined();
    });

    it('should create post with emojiShortcodes', async () => {
      const userDid = 'did:plc:test123';

      const postData = {
        text: 'Hello :wave:',
        markdown: '**Hello** :wave:',
        emojiShortcodes: ['wave'],
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      const result = await service.createCommunityPost(postData, userDid);

      expect(result).toBeDefined();
      expect(result.uri).toMatch(/^at:\/\//);
    });

    it('should reject markdown exceeding 300 chars', async () => {
      const userDid = 'did:plc:test123';

      const longMarkdown = 'a'.repeat(301);
      const postData = {
        text: 'Short text',
        markdown: longMarkdown,
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      await expect(service.createCommunityPost(postData, userDid)).rejects.toThrow();
    });

    it('should reject more than 20 emoji shortcodes', async () => {
      const userDid = 'did:plc:test123';

      const tooManyEmoji = Array.from({ length: 21 }, (_, i) => `emoji${i}`);
      const postData = {
        text: 'Many emoji',
        emojiShortcodes: tooManyEmoji,
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      await expect(service.createCommunityPost(postData, userDid)).rejects.toThrow();
    });
  });
});
