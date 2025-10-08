// Unit Tests: Post Validation Logic (014-bluesky)
// Tests for CommunityPost Lexicon validation

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validateCommunityPost } from '../../src/schemas/lexicon';

describe('CommunityPost Validation', () => {
  describe('Text Validation', () => {
    it('should accept valid text (1-300 chars)', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Hello, this is a valid post!',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should reject empty text', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: '',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject text exceeding 300 chars', () => {
      const longText = 'a'.repeat(301);
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: longText,
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should accept text exactly 300 chars', () => {
      const maxText = 'a'.repeat(300);
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: maxText,
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should accept text with 1 char (minimum)', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'a',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });
  });

  describe('CommunityId Validation', () => {
    it('should accept valid 8-char hex communityId', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should accept all lowercase hex chars', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'abcdef01',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should accept all numeric chars', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: '12345678',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should reject communityId shorter than 8 chars', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject communityId longer than 8 chars', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4e',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject communityId with uppercase hex chars', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'A1B2C3D4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject communityId with non-hex chars', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'g1h2i3j4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject communityId with special chars', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2-3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });
  });

  describe('CreatedAt Validation', () => {
    it('should accept valid ISO 8601 timestamp', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: '2025-01-15T10:30:00.000Z',
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should accept ISO 8601 with milliseconds', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: '2025-01-15T10:30:00.123Z',
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should accept ISO 8601 from Date.toISOString()', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should reject non-ISO 8601 format', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: '2025-01-15 10:30:00',
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject invalid date string', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: 'not-a-date',
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject numeric timestamp', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: Date.now().toString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });
  });

  describe('Required Fields', () => {
    it('should reject missing $type', () => {
      const invalidPost = {
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject wrong $type', () => {
      const invalidPost = {
        $type: 'app.bsky.feed.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject missing text', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject missing communityId', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });

    it('should reject missing createdAt', () => {
      const invalidPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
      };

      expect(() => validateCommunityPost(invalidPost)).toThrow(z.ZodError);
    });
  });

  describe('Schema Parsing', () => {
    it('should return parsed CommunityPost on valid input', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: '2025-01-15T10:30:00.000Z',
      };

      const result = validateCommunityPost(validPost);

      expect(result).toEqual(validPost);
      expect(result.$type).toBe('net.atrarium.community.post');
      expect(result.text).toBe('Test post');
      expect(result.communityId).toBe('a1b2c3d4');
      expect(result.createdAt).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should strip extra fields not in schema', () => {
      const postWithExtra = {
        $type: 'net.atrarium.community.post',
        text: 'Test post',
        communityId: 'a1b2c3d4',
        createdAt: '2025-01-15T10:30:00.000Z',
        extraField: 'should be removed',
      };

      const result = validateCommunityPost(postWithExtra);

      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Unicode text correctly', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'こんにちは、世界！ 🌍',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should handle text with newlines', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Line 1\nLine 2\nLine 3',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });

    it('should handle text with special characters', () => {
      const validPost = {
        $type: 'net.atrarium.community.post',
        text: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        communityId: 'a1b2c3d4',
        createdAt: new Date().toISOString(),
      };

      expect(() => validateCommunityPost(validPost)).not.toThrow();
    });
  });
});
