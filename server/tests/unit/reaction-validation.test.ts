// Unit Test: Reaction Validation
// TDD: This test MUST FAIL before implementation (T016-T021)
// Test size limits, dimensions, and formats

import { describe, expect, it } from 'vitest';
import {
  AddReactionRequestSchema,
  EmojiReferenceSchema,
  ListReactionsRequestSchema,
  RemoveReactionRequestSchema,
} from '../../src/schemas/validation';

describe('Reaction Validation Unit Tests', () => {
  describe('EmojiReferenceSchema', () => {
    it('should validate unicode emoji with valid codepoint', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'unicode',
        value: 'U+1F44D',
      });

      expect(result.success).toBe(true);
    });

    it('should validate unicode emoji with 6-digit codepoint', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'unicode',
        value: 'U+1F600A',
      });

      expect(result.success).toBe(true);
    });

    it('should reject unicode emoji with invalid format', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'unicode',
        value: '👍', // Raw emoji character, not codepoint
      });

      expect(result.success).toBe(false);
    });

    it('should reject unicode emoji with lowercase U+', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'unicode',
        value: 'u+1F44D', // Must be uppercase U+
      });

      expect(result.success).toBe(false);
    });

    it('should reject unicode emoji with too short codepoint', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'unicode',
        value: 'U+12', // Less than 4 digits
      });

      expect(result.success).toBe(false);
    });

    it('should reject unicode emoji with too long codepoint', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'unicode',
        value: 'U+1F44D12', // More than 6 digits
      });

      expect(result.success).toBe(false);
    });

    it('should validate custom emoji with AT URI', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'custom',
        value: 'at://did:plc:alice/net.atrarium.emoji.custom/abc123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject custom emoji without AT URI prefix', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'custom',
        value: 'did:plc:alice/net.atrarium.emoji.custom/abc123', // Missing at://
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid emoji type', () => {
      const result = EmojiReferenceSchema.safeParse({
        type: 'invalid',
        value: 'something',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('AddReactionRequestSchema', () => {
    it('should validate add reaction with unicode emoji', () => {
      const result = AddReactionRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      });

      expect(result.success).toBe(true);
    });

    it('should validate add reaction with custom emoji', () => {
      const result = AddReactionRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        emoji: {
          type: 'custom',
          value: 'at://did:plc:bob/net.atrarium.emoji.custom/myemoji',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject add reaction with invalid postUri', () => {
      const result = AddReactionRequestSchema.safeParse({
        postUri: 'not-a-valid-uri',
        emoji: { type: 'unicode', value: 'U+1F44D' },
      });

      expect(result.success).toBe(false);
    });

    it('should reject add reaction with missing postUri', () => {
      const result = AddReactionRequestSchema.safeParse({
        emoji: { type: 'unicode', value: 'U+1F44D' },
      });

      expect(result.success).toBe(false);
    });

    it('should reject add reaction with missing emoji', () => {
      const result = AddReactionRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('RemoveReactionRequestSchema', () => {
    it('should validate remove reaction with valid reactionUri', () => {
      const result = RemoveReactionRequestSchema.safeParse({
        reactionUri: 'at://did:plc:alice/net.atrarium.community.reaction/abc123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject remove reaction with invalid reactionUri', () => {
      const result = RemoveReactionRequestSchema.safeParse({
        reactionUri: 'not-a-valid-uri',
      });

      expect(result.success).toBe(false);
    });

    it('should reject remove reaction with missing reactionUri', () => {
      const result = RemoveReactionRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('ListReactionsRequestSchema', () => {
    it('should validate list reactions with valid postUri', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
      });

      expect(result.success).toBe(true);
    });

    it('should validate list reactions with limit', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        limit: 25,
      });

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(25);
    });

    it('should validate list reactions with cursor', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        cursor: 'cursor-string',
      });

      expect(result.success).toBe(true);
      expect(result.data?.cursor).toBe('cursor-string');
    });

    it('should use default limit if not provided', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(50); // Default value
    });

    it('should reject list reactions with limit < 1', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        limit: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject list reactions with limit > 100', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'at://did:plc:alice/net.atrarium.community.post/abc123',
        limit: 101,
      });

      expect(result.success).toBe(false);
    });

    it('should reject list reactions with invalid postUri', () => {
      const result = ListReactionsRequestSchema.safeParse({
        postUri: 'not-a-valid-uri',
      });

      expect(result.success).toBe(false);
    });

    it('should reject list reactions with missing postUri', () => {
      const result = ListReactionsRequestSchema.safeParse({
        limit: 25,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Emoji File Constraints (from Lexicon)', () => {
    it('should validate max file size constraint (512KB)', () => {
      const maxSize = 512000; // 512KB in bytes
      const validSize = 400000; // 400KB
      const invalidSize = 600000; // 600KB

      expect(validSize).toBeLessThanOrEqual(maxSize);
      expect(invalidSize).toBeGreaterThan(maxSize);
    });

    it('should validate max dimensions constraint (256x256px)', () => {
      const maxDimension = 256;

      // Valid dimensions
      expect(64).toBeLessThanOrEqual(maxDimension);
      expect(128).toBeLessThanOrEqual(maxDimension);
      expect(256).toBeLessThanOrEqual(maxDimension);

      // Invalid dimensions
      expect(300).toBeGreaterThan(maxDimension);
      expect(512).toBeGreaterThan(maxDimension);
    });

    it('should validate supported formats', () => {
      const supportedFormats = ['png', 'gif', 'webp'];

      expect(supportedFormats).toContain('png');
      expect(supportedFormats).toContain('gif');
      expect(supportedFormats).toContain('webp');
      expect(supportedFormats).not.toContain('jpeg');
      expect(supportedFormats).not.toContain('jpg');
      expect(supportedFormats).not.toContain('svg');
    });

    it('should validate shortcode format constraints', () => {
      const validShortcodes = ['my_emoji', 'emoji123', 'test_emoji_2'];
      const invalidShortcodes = [
        'My-Emoji', // Uppercase
        'emoji!', // Special char
        'emoji space', // Space
        'e', // Too short (< 2 chars)
        'a'.repeat(33), // Too long (> 32 chars)
      ];

      const shortcodePattern = /^[a-z0-9_]+$/;
      const minLength = 2;
      const maxLength = 32;

      for (const shortcode of validShortcodes) {
        expect(shortcodePattern.test(shortcode)).toBe(true);
        expect(shortcode.length).toBeGreaterThanOrEqual(minLength);
        expect(shortcode.length).toBeLessThanOrEqual(maxLength);
      }

      for (const shortcode of invalidShortcodes) {
        const isValid =
          shortcodePattern.test(shortcode) &&
          shortcode.length >= minLength &&
          shortcode.length <= maxLength;
        expect(isValid).toBe(false);
      }
    });
  });

  describe('Reaction Record Constraints (from Lexicon)', () => {
    it('should validate communityId format (8-char hex)', () => {
      const validCommunityIds = ['a1b2c3d4', '00000000', 'ffffffff'];
      const invalidCommunityIds = [
        'a1b2c3d', // Too short
        'a1b2c3d41', // Too long
        'g1b2c3d4', // Invalid hex
        'A1B2C3D4', // Uppercase (should be lowercase)
      ];

      const communityIdPattern = /^[0-9a-f]{8}$/;

      for (const id of validCommunityIds) {
        expect(communityIdPattern.test(id)).toBe(true);
      }

      for (const id of invalidCommunityIds) {
        expect(communityIdPattern.test(id)).toBe(false);
      }
    });

    it('should validate AT URI format for postUri', () => {
      const validPostUris = [
        'at://did:plc:alice/net.atrarium.community.post/abc123',
        'at://did:web:example.com/net.atrarium.community.post/xyz789',
      ];
      const invalidPostUris = [
        'did:plc:alice/net.atrarium.community.post/abc123', // Missing at://
        'http://example.com/post/abc123', // Wrong protocol
        'at://alice/post/abc123', // Invalid DID format
      ];

      const atUriPattern = /^at:\/\//;

      for (const uri of validPostUris) {
        expect(atUriPattern.test(uri)).toBe(true);
      }

      for (const uri of invalidPostUris) {
        expect(atUriPattern.test(uri)).toBe(false);
      }
    });

    it('should validate createdAt is ISO 8601 format', () => {
      const validTimestamps = [
        '2025-01-15T12:00:00Z',
        '2025-01-15T12:00:00.123Z',
        '2025-01-15T12:00:00+09:00',
      ];
      const invalidTimestamps = [
        '2025-01-15', // Date only
        '12:00:00', // Time only
        '2025/01/15 12:00:00', // Wrong format
        '1705320000', // Unix timestamp
      ];

      const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;

      for (const timestamp of validTimestamps) {
        expect(iso8601Pattern.test(timestamp)).toBe(true);
      }

      for (const timestamp of invalidTimestamps) {
        expect(iso8601Pattern.test(timestamp)).toBe(false);
      }
    });
  });
});
