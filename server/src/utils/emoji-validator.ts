/**
 * Emoji Validation Utility
 *
 * Validates custom emoji uploads (file type, size, dimensions, aspect ratio).
 * Enforces constraints: PNG/GIF/APNG/WebP, 256KB max, 64px×512px max (8:1 ratio).
 */

export interface EmojiValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    fileType?: string;
    fileSize?: number;
    dimensions?: { width: number; height: number };
    aspectRatio?: number;
  };
}

export interface EmojiValidationConfig {
  allowedTypes: string[]; // MIME types (default: PNG, GIF, APNG, WebP)
  maxFileSizeBytes: number; // Maximum file size (default: 256KB)
  maxHeight: number; // Maximum height in pixels (default: 64px)
  maxWidth: number; // Maximum width in pixels (default: 512px)
  maxAspectRatio: number; // Maximum width:height ratio (default: 8:1)
}

const DEFAULT_CONFIG: EmojiValidationConfig = {
  allowedTypes: ['image/png', 'image/gif', 'image/webp'],
  maxFileSizeBytes: 256 * 1024, // 256KB
  maxHeight: 64,
  maxWidth: 512,
  maxAspectRatio: 8,
};

export function validateFileType(
  mimeType: string,
  config: Partial<EmojiValidationConfig> = {}
): EmojiValidationResult {
  const { allowedTypes } = { ...DEFAULT_CONFIG, ...config };

  if (!allowedTypes.includes(mimeType)) {
    const allowedList = allowedTypes.join(', ');
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedList}`,
      details: { fileType: mimeType },
    };
  }

  return { valid: true, details: { fileType: mimeType } };
}

export function validateFileSize(
  fileSizeBytes: number,
  config: Partial<EmojiValidationConfig> = {}
): EmojiValidationResult {
  const { maxFileSizeBytes } = { ...DEFAULT_CONFIG, ...config };

  if (fileSizeBytes > maxFileSizeBytes) {
    const maxKb = maxFileSizeBytes / 1024;
    const actualKb = (fileSizeBytes / 1024).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds ${maxKb}KB limit (actual: ${actualKb}KB)`,
      details: { fileSize: fileSizeBytes },
    };
  }

  return { valid: true, details: { fileSize: fileSizeBytes } };
}

export function validateDimensions(
  width: number,
  height: number,
  config: Partial<EmojiValidationConfig> = {}
): EmojiValidationResult {
  const { maxHeight, maxWidth, maxAspectRatio } = { ...DEFAULT_CONFIG, ...config };

  if (height > maxHeight) {
    return {
      valid: false,
      error: `Image height exceeds ${maxHeight}px limit (actual: ${height}px)`,
      details: { dimensions: { width, height } },
    };
  }

  if (width > maxWidth) {
    return {
      valid: false,
      error: `Image width exceeds ${maxWidth}px limit (actual: ${width}px)`,
      details: { dimensions: { width, height } },
    };
  }

  const aspectRatio = width / height;
  if (aspectRatio > maxAspectRatio) {
    const ratioStr = aspectRatio.toFixed(2);
    return {
      valid: false,
      error: `Aspect ratio exceeds ${maxAspectRatio}:1 limit (actual: ${ratioStr}:1)`,
      details: { dimensions: { width, height }, aspectRatio },
    };
  }

  return {
    valid: true,
    details: { dimensions: { width, height }, aspectRatio },
  };
}

export function validateShortcode(shortcode: string): EmojiValidationResult {
  const MIN_LENGTH = 2;
  const MAX_LENGTH = 32;
  const PATTERN = /^[a-zA-Z0-9_]+$/;

  if (shortcode.length < MIN_LENGTH || shortcode.length > MAX_LENGTH) {
    return {
      valid: false,
      error:
        'Shortcode must be ' +
        MIN_LENGTH +
        '-' +
        MAX_LENGTH +
        ' characters (actual: ' +
        shortcode.length +
        ')',
    };
  }

  if (!PATTERN.test(shortcode)) {
    return {
      valid: false,
      error: 'Shortcode must contain only alphanumeric characters and underscores',
    };
  }

  return { valid: true };
}

export async function validateEmoji(
  file: {
    mimeType: string;
    sizeBytes: number;
    shortcode: string;
    width?: number;
    height?: number;
  },
  config: Partial<EmojiValidationConfig> = {}
): Promise<EmojiValidationResult> {
  const shortcodeResult = validateShortcode(file.shortcode);
  if (!shortcodeResult.valid) {
    return shortcodeResult;
  }

  const typeResult = validateFileType(file.mimeType, config);
  if (!typeResult.valid) {
    return typeResult;
  }

  const sizeResult = validateFileSize(file.sizeBytes, config);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  if (file.width !== undefined && file.height !== undefined) {
    const dimensionsResult = validateDimensions(file.width, file.height, config);
    if (!dimensionsResult.valid) {
      return dimensionsResult;
    }

    return {
      valid: true,
      details: {
        fileType: file.mimeType,
        fileSize: file.sizeBytes,
        dimensions: { width: file.width, height: file.height },
        aspectRatio: file.width / file.height,
      },
    };
  }

  return {
    valid: true,
    details: {
      fileType: file.mimeType,
      fileSize: file.sizeBytes,
    },
  };
}
