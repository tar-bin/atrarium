/**
 * Format hashtag by adding # prefix if missing
 * @param hashtag Hashtag string (with or without #)
 * @returns Hashtag with # prefix
 * @example
 * formatHashtag('atr_abc12345') // '#atr_abc12345'
 * formatHashtag('#atr_abc12345') // '#atr_abc12345'
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
 * stripHashtag('#atr_abc12345') // 'atr_abc12345'
 * stripHashtag('atr_abc12345') // 'atr_abc12345'
 */
export function stripHashtag(hashtag: string): string {
  if (hashtag.startsWith('#')) {
    return hashtag.slice(1);
  }
  return hashtag;
}

/**
 * Copy text to clipboard using Clipboard API
 * @param text Text to copy
 * @returns Promise that resolves when copy succeeds
 * @throws Error if clipboard API is not available or copy fails
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard API is not available in this browser');
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('[Hashtag] Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

/**
 * Validate hashtag format (Atrarium system hashtag)
 * @param hashtag Hashtag string
 * @returns True if valid Atrarium hashtag format
 * @example
 * isValidHashtag('#atr_abc12345') // true
 * isValidHashtag('atr_abc12345') // true
 * isValidHashtag('#random') // false
 */
export function isValidHashtag(hashtag: string): boolean {
  const stripped = stripHashtag(hashtag);
  return /^atr_[a-f0-9]{8}$/.test(stripped);
}
