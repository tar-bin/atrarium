import { describe, it, expect } from 'vitest';

/**
 * Unit tests for feed hashtag generator
 * Tests the utility function that generates unique #atr_xxxxx hashtags
 */
describe('Unit: Feed hashtag generator', () => {
  // This function will be implemented in src/utils/hashtag.ts
  function generateFeedHashtag(): string {
    // Uses crypto.randomUUID() to generate collision-resistant ID
    const uuid = crypto.randomUUID();
    // Extract first 8 characters (hex format)
    const shortId = uuid.replace(/-/g, '').substring(0, 8);
    return `#atr_${shortId}`;
  }

  it('should generate hashtag in #atr_xxxxx format', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag).toMatch(/^#atr_[a-f0-9]{8}$/);
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
    const hexPart = hashtag.replace('#atr_', '');

    // Should only contain lowercase hex chars
    expect(hexPart).toMatch(/^[a-f0-9]+$/);
    // Should not contain uppercase
    expect(hexPart).not.toMatch(/[A-F]/);
  });

  it('should generate exactly 8 hex characters after prefix', () => {
    const hashtag = generateFeedHashtag();
    const hexPart = hashtag.replace('#atr_', '');

    expect(hexPart.length).toBe(8);
  });

  it('should include # symbol at the start', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag.startsWith('#')).toBe(true);
  });

  it('should include atr_ prefix after # symbol', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag.startsWith('#atr_')).toBe(true);
  });

  it('should have total length of 13 characters (#atr_ + 8 hex)', () => {
    const hashtag = generateFeedHashtag();
    expect(hashtag.length).toBe(13); // # + atr_ + 8 hex chars
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
    expect(hashtag).toBe('#atr_550e8400'); // First 8 chars from mocked UUID
  });
});
