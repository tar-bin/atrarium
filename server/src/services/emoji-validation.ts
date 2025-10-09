/**
 * Emoji image validation service
 *
 * Validates custom emoji uploads against constraints:
 * - Format: PNG, GIF, WEBP only
 * - Size: ≤500KB (512000 bytes)
 * - Dimensions: ≤256×256px
 *
 * @module emoji-validation
 */

const ALLOWED_FORMATS = ['image/png', 'image/gif', 'image/webp'] as const;
const MAX_FILE_SIZE = 512000; // 500KB in bytes
const MAX_DIMENSION = 256; // pixels

type EmojiFormat = 'png' | 'gif' | 'webp';

/**
 * Validates emoji image format (T015)
 *
 * @param file - Blob to validate
 * @returns Format string ('png', 'gif', or 'webp')
 * @throws Error if format is not supported
 */
export async function validateFormat(file: Blob): Promise<EmojiFormat> {
  const mimeType = file.type;

  if (!ALLOWED_FORMATS.includes(mimeType as (typeof ALLOWED_FORMATS)[number])) {
    throw new Error(`Unsupported format: ${mimeType}. Only PNG, GIF, and WEBP are allowed.`);
  }

  // Extract format from MIME type (image/png → png)
  const format = mimeType.split('/')[1] as EmojiFormat;
  return format;
}

/**
 * Validates emoji image file size (T016)
 *
 * @param file - Blob to validate
 * @throws Error if file size exceeds 500KB limit
 */
export async function validateSize(file: Blob): Promise<void> {
  const sizeBytes = file.size;

  if (sizeBytes > MAX_FILE_SIZE) {
    throw new Error(`File size (${sizeBytes} bytes) exceeds 500KB limit (${MAX_FILE_SIZE} bytes)`);
  }
}

/**
 * Validates emoji image dimensions (T017)
 *
 * @param file - Blob to validate (unused in current implementation)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @throws Error if dimensions exceed 256×256px
 *
 * @remarks
 * Current implementation accepts width/height as parameters for testing.
 * In production, dimensions should be extracted from image headers using
 * one of these approaches:
 * - Option 1: Parse image headers manually (PNG/GIF/WEBP spec)
 * - Option 2: Use image-size library (lightweight, format detection)
 * - Option 3: Use Canvas API in Cloudflare Workers (if available)
 *
 * See research.md for decision on dimension extraction strategy.
 */
export async function validateDimensions(
  _file: Blob,
  width: number,
  height: number
): Promise<void> {
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(
      `Image dimensions (${width}×${height}) exceed maximum ${MAX_DIMENSION}×${MAX_DIMENSION}px`
    );
  }
}

/**
 * Validates all emoji constraints (format + size + dimensions)
 *
 * @param file - Blob to validate
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Emoji format if all validations pass
 * @throws Error if any validation fails
 */
export async function validateEmoji(
  file: Blob,
  width: number,
  height: number
): Promise<EmojiFormat> {
  const format = await validateFormat(file);
  await validateSize(file);
  await validateDimensions(file, width, height);
  return format;
}
