/**
 * Hashtag utilities for client
 * Re-exports shared hashtag functions from @atrarium/utils
 * and provides browser-specific utilities (clipboard)
 */

// Re-export shared hashtag utilities
export {
  extractFeedHashtags,
  formatHashtag,
  generateFeedHashtag,
  isValidHashtag,
  stripHashtag,
  validateHashtagFormat,
} from '@atrarium/utils/hashtag';

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
  } catch (_error) {
    throw new Error('Failed to copy to clipboard');
  }
}
