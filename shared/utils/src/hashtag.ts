/**
 * Hashtag Utility
 *
 * Functions for generating, validating, and formatting Atrarium feed hashtags
 */

/**
 * Generate a feed hashtag in format #atrarium_[8-hex]
 * Uses crypto.randomUUID() for collision resistance
 */
export function generateFeedHashtag(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  const shortId = uuid.slice(0, 8).toLowerCase();
  return `#atrarium_${shortId}`;
}

/**
 * Validate hashtag format (strict server-side validation)
 */
export function validateHashtagFormat(hashtag: string): boolean {
  const pattern = /^#atrarium_[0-9a-f]{8}$/;
  return pattern.test(hashtag);
}

/**
 * Extract #atrarium_xxxxx hashtags from text
 */
export function extractFeedHashtags(text: string): string[] {
  const pattern = /#atrarium_[0-9a-f]{8}/g;
  const matches = text.match(pattern);
  return matches || [];
}

/**
 * Format hashtag by adding # prefix if missing
 * @param hashtag Hashtag string (with or without #)
 * @returns Hashtag with # prefix
 * @example
 * formatHashtag('atrarium_abc12345') // '#atrarium_abc12345'
 * formatHashtag('#atrarium_abc12345') // '#atrarium_abc12345'
 */
export function formatHashtag(hashtag: string): string {
  if (hashtag.startsWith('#')) {
    return hashtag;
  }
  return `#${hashtag}`;
}

/**
 * Strip # prefix from hashtag
 * @param hashtag Hashtag string (with or without #)
 * @returns Hashtag without # prefix
 * @example
 * stripHashtag('#atrarium_abc12345') // 'atrarium_abc12345'
 * stripHashtag('atrarium_abc12345') // 'atrarium_abc12345'
 */
export function stripHashtag(hashtag: string): string {
  if (hashtag.startsWith('#')) {
    return hashtag.slice(1);
  }
  return hashtag;
}

/**
 * Validate hashtag format (lenient client-side validation)
 * Accepts both old `atr_` and new `atrarium_` prefixes
 * @param hashtag Hashtag string
 * @returns True if valid Atrarium hashtag format
 * @example
 * isValidHashtag('#atrarium_abc12345') // true
 * isValidHashtag('atrarium_abc12345') // true
 * isValidHashtag('#atr_abc12345') // true (legacy format)
 * isValidHashtag('#random') // false
 */
export function isValidHashtag(hashtag: string): boolean {
  const stripped = stripHashtag(hashtag);
  // Accept both legacy atr_ and current atrarium_ prefixes
  return /^(atr|atrarium)_[a-f0-9]{8}$/.test(stripped);
}
