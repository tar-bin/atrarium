/**
 * Feed Hashtag Generator Utility
 * Generates unique #atr_xxxxx hashtags for feeds
 */

/**
 * Generate a feed hashtag in format #atr_[8-hex]
 * Uses crypto.randomUUID() for collision resistance
 */
export function generateFeedHashtag(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  const shortId = uuid.slice(0, 8).toLowerCase();
  return `#atr_${shortId}`;
}

/**
 * Validate hashtag format
 */
export function validateHashtagFormat(hashtag: string): boolean {
  const pattern = /^#atr_[0-9a-f]{8}$/;
  return pattern.test(hashtag);
}

/**
 * Extract #atr_xxxxx hashtags from text
 */
export function extractFeedHashtags(text: string): string[] {
  const pattern = /#atr_[0-9a-f]{8}/g;
  const matches = text.match(pattern);
  return matches || [];
}
