import { describe, it, expect } from 'vitest';
import { generateFeedHashtag, validateHashtagFormat, extractFeedHashtags } from '../../src/utils/hashtag';

/**
 * Unit tests for feed hashtag generator
 * Tests the utility function that generates unique #atrarium_xxxxx hashtags
 */
describe('Unit: Feed hashtag generator', () => {
  it('should generate hashtag in #atrarium_xxxxx format', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag).toMatch(/^#atrarium_[a-f0-9]{8}$/);
  });

  it('should generate unique hashtags on each call', () => {
    const hashtag1 = generateFeedHashtag();
    const hashtag2 = generateFeedHashtag();
    const hashtag3 = generateFeedHashtag();

    expect(hashtag1).not.toBe(hashtag2);
    expect(hashtag2).not.toBe(hashtag3);
    expect(hashtag1).not.toBe(hashtag3);
  });

  it('should use lowercase hex characters only', () => {
    const hashtag = generateFeedHashtag();
    const hexPart = hashtag.replace('#atrarium_', '');

    // Should only contain lowercase hex chars
    expect(hexPart).toMatch(/^[a-f0-9]+$/);
    // Should not contain uppercase
    expect(hexPart).not.toMatch(/[A-F]/);
  });

  it('should generate exactly 8 hex characters after prefix', () => {
    const hashtag = generateFeedHashtag();
    const hexPart = hashtag.replace('#atrarium_', '');

    expect(hexPart.length).toBe(8);
  });

  it('should include # symbol at the start', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag.startsWith('#')).toBe(true);
  });

  it('should include atrarium_ prefix after # symbol', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag.startsWith('#atrarium_')).toBe(true);
  });

  it('should have total length of 18 characters (#atrarium_ + 8 hex)', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag.length).toBe(18); // # + atrarium_ + 8 hex chars
  });

  it('should be collision-resistant (test with 1000 generations)', () => {
    const hashtags = new Set<string>();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      hashtags.add(generateFeedHashtag());
    }

    // All hashtags should be unique (no collisions)
    expect(hashtags.size).toBe(iterations);
  });

  it('should use crypto.randomUUID() as randomness source', () => {
    // Verify the function relies on crypto.randomUUID()
    // This is important for collision resistance
    const originalRandomUUID = crypto.randomUUID;
    let uuidCalled = false;

    // Mock crypto.randomUUID to track calls
    crypto.randomUUID = () => {
      uuidCalled = true;
      return '550e8400-e29b-41d4-a716-446655440000';
    };

    const hashtag = generateFeedHashtag();

    // Restore original function
    crypto.randomUUID = originalRandomUUID;

    expect(uuidCalled).toBe(true);
    expect(hashtag).toBe('#atrarium_550e8400'); // First 8 chars from mocked UUID
  });

  it('should validate new format correctly', () => {
    expect(validateHashtagFormat('#atrarium_a1b2c3d4')).toBe(true);
    expect(validateHashtagFormat('#atrarium_12345678')).toBe(true);
    expect(validateHashtagFormat('#atrarium_deadbeef')).toBe(true);
  });

  it('should reject old format', () => {
    expect(validateHashtagFormat('#atr_a1b2c3d4')).toBe(false);
    expect(validateHashtagFormat('#atr_12345678')).toBe(false);
  });

  it('should reject invalid formats', () => {
    expect(validateHashtagFormat('#atrarium_xyz')).toBe(false);  // non-hex
    expect(validateHashtagFormat('#atrarium_a1b2c3d')).toBe(false);  // 7 chars
    expect(validateHashtagFormat('#atrarium_a1b2c3d4e')).toBe(false);  // 9 chars
    expect(validateHashtagFormat('atrarium_a1b2c3d4')).toBe(false);  // no #
  });

  it('should extract new format hashtags from text', () => {
    const text = 'Check out #atrarium_12345678 and #atrarium_deadbeef';
    const extracted = extractFeedHashtags(text);
    expect(extracted).toEqual(['#atrarium_12345678', '#atrarium_deadbeef']);
  });

  it('should not extract old format hashtags', () => {
    const text = 'Old format #atr_a1b2c3d4 should not match';
    const extracted = extractFeedHashtags(text);
    expect(extracted).toEqual([]);
  });
});
