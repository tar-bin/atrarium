import { describe, it, expect } from 'vitest';

// ============================================================================
// Moderation Reason Validation Tests
// Ensures that moderation reasons do not contain PII or confidential data
// ============================================================================

/**
 * Validates moderation reason to prevent PII/confidential data in public PDS records
 * This is a critical security check since moderation actions are PUBLIC records.
 */
function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim() === '') {
    return { valid: true }; // Empty reason is allowed
  }

  const trimmedReason = reason.trim();

  // Check length (max 300 characters for safety)
  if (trimmedReason.length > 300) {
    return { valid: false, error: 'Reason too long (max 300 characters)' };
  }

  // Check for potential PII patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // Phone pattern: at least 10 digits with optional separators (avoid false positives like "#123")
  const phonePattern = /(\+?\d{1,4}[-.\s()]?)?\d{3,4}[-.\s()]?\d{3,4}[-.\s]?\d{4,}/;
  const urlPattern = /https?:\/\/[^\s]+/;

  if (emailPattern.test(trimmedReason)) {
    return { valid: false, error: 'Reason contains email address (not allowed in public records)' };
  }

  if (phonePattern.test(trimmedReason)) {
    return { valid: false, error: 'Reason may contain phone number (not allowed in public records)' };
  }

  // Warning for URLs (not strict prohibition, but suspicious)
  if (urlPattern.test(trimmedReason)) {
    return { valid: false, error: 'Reason contains URL (avoid including external links in public records)' };
  }

  // Warning keywords that suggest confidential information
  const sensitiveKeywords = [
    'report',
    'complaint',
    'ticket',
    'internal',
    'private',
    'confidential',
    'password',
    'secret',
  ];

  const lowerReason = trimmedReason.toLowerCase();
  for (const keyword of sensitiveKeywords) {
    if (lowerReason.includes(keyword)) {
      return {
        valid: false,
        error: `Reason contains potentially sensitive keyword "${keyword}". Use brief, professional descriptions (e.g., "Spam post", "Community guidelines violation").`,
      };
    }
  }

  return { valid: true };
}

describe('validateModerationReason', () => {
  describe('Valid reasons', () => {
    it('should allow empty reason', () => {
      const result = validateModerationReason('');
      expect(result.valid).toBe(true);
    });

    it('should allow undefined reason', () => {
      const result = validateModerationReason(undefined);
      expect(result.valid).toBe(true);
    });

    it('should allow simple professional descriptions', () => {
      const validReasons = [
        'Spam post',
        'Community guidelines violation',
        'Off-topic content',
        'Duplicate post',
        'Inappropriate language',
        'Harassment',
        'Low-quality content',
      ];

      for (const reason of validReasons) {
        const result = validateModerationReason(reason);
        expect(result.valid).toBe(true);
      }
    });

    it('should allow reasons with Japanese characters', () => {
      const result = validateModerationReason('スパム投稿');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid reasons - Length', () => {
    it('should reject reason longer than 300 characters', () => {
      const longReason = 'a'.repeat(301);
      const result = validateModerationReason(longReason);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('Invalid reasons - PII', () => {
    it('should reject reason with email address', () => {
      const result = validateModerationReason('Removed based on report from user@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('email address');
    });

    it('should reject reason with phone number', () => {
      const result = validateModerationReason('Contact +1-555-123-4567 for details');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('phone number');
    });

    it('should reject reason with URL', () => {
      const result = validateModerationReason('See https://example.com/details');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('URL');
    });
  });

  describe('Invalid reasons - Sensitive keywords', () => {
    it('should reject reason with "report"', () => {
      const result = validateModerationReason('Based on user report #12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('report');
    });

    it('should reject reason with "internal"', () => {
      const result = validateModerationReason('Internal policy violation');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('internal');
    });

    it('should reject reason with "confidential"', () => {
      const result = validateModerationReason('Confidential information disclosed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('confidential');
    });

    it('should reject reason with "private"', () => {
      const result = validateModerationReason('Private conversation shared');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    it('should reject reason with "ticket"', () => {
      const result = validateModerationReason('See ticket #456 for details');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ticket');
    });

    it('should reject reason with "complaint"', () => {
      const result = validateModerationReason('Multiple complaints received');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('complaint');
    });

    it('should reject reason with "password"', () => {
      const result = validateModerationReason('Password exposed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('password');
    });

    it('should reject reason with "secret"', () => {
      const result = validateModerationReason('Secret information leaked');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('secret');
    });
  });

  describe('Case insensitivity', () => {
    it('should detect sensitive keywords regardless of case', () => {
      const reasons = ['INTERNAL policy', 'Private Message', 'RePoRt #123'];

      for (const reason of reasons) {
        const result = validateModerationReason(reason);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace-only reason as empty', () => {
      const result = validateModerationReason('   ');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace before validation', () => {
      const result = validateModerationReason('  Spam post  ');
      expect(result.valid).toBe(true);
    });
  });
});
