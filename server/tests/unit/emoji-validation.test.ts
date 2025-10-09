import { describe, expect, it } from 'vitest';
import {
  validateDimensions,
  validateFormat,
  validateSize,
} from '../../src/services/emoji-validation';

describe('Emoji Image Validation (T018)', () => {
  describe('validateFormat (T015)', () => {
    it('should accept PNG format', async () => {
      const pngBlob = new Blob(['fake-png-data'], { type: 'image/png' });
      await expect(validateFormat(pngBlob)).resolves.toBe('png');
    });

    it('should accept GIF format', async () => {
      const gifBlob = new Blob(['fake-gif-data'], { type: 'image/gif' });
      await expect(validateFormat(gifBlob)).resolves.toBe('gif');
    });

    it('should accept WEBP format', async () => {
      const webpBlob = new Blob(['fake-webp-data'], { type: 'image/webp' });
      await expect(validateFormat(webpBlob)).resolves.toBe('webp');
    });

    it('should reject JPEG format', async () => {
      const jpegBlob = new Blob(['fake-jpeg-data'], { type: 'image/jpeg' });
      await expect(validateFormat(jpegBlob)).rejects.toThrow(
        'Unsupported format: image/jpeg. Only PNG, GIF, and WEBP are allowed.'
      );
    });

    it('should reject SVG format', async () => {
      const svgBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      await expect(validateFormat(svgBlob)).rejects.toThrow(
        'Unsupported format: image/svg+xml. Only PNG, GIF, and WEBP are allowed.'
      );
    });

    it('should reject unknown MIME type', async () => {
      const unknownBlob = new Blob(['fake-data'], { type: 'application/octet-stream' });
      await expect(validateFormat(unknownBlob)).rejects.toThrow(
        'Unsupported format: application/octet-stream. Only PNG, GIF, and WEBP are allowed.'
      );
    });
  });

  describe('validateSize (T016)', () => {
    it('should accept file size exactly at 500KB limit', async () => {
      const maxSizeBlob = new Blob([new Uint8Array(512000)], { type: 'image/png' });
      await expect(validateSize(maxSizeBlob)).resolves.toBeUndefined();
    });

    it('should accept file size below 500KB limit', async () => {
      const smallBlob = new Blob([new Uint8Array(100000)], { type: 'image/png' });
      await expect(validateSize(smallBlob)).resolves.toBeUndefined();
    });

    it('should accept very small file (1KB)', async () => {
      const tinyBlob = new Blob([new Uint8Array(1024)], { type: 'image/png' });
      await expect(validateSize(tinyBlob)).resolves.toBeUndefined();
    });

    it('should reject file size over 500KB limit', async () => {
      const largeBlob = new Blob([new Uint8Array(512001)], { type: 'image/png' });
      await expect(validateSize(largeBlob)).rejects.toThrow(
        'File size (512001 bytes) exceeds 500KB limit (512000 bytes)'
      );
    });

    it('should reject file size significantly over limit (1MB)', async () => {
      const veryLargeBlob = new Blob([new Uint8Array(1048576)], { type: 'image/png' });
      await expect(validateSize(veryLargeBlob)).rejects.toThrow(
        'File size (1048576 bytes) exceeds 500KB limit (512000 bytes)'
      );
    });
  });

  describe('validateDimensions (T017)', () => {
    it('should accept dimensions at 256×256px limit', async () => {
      // Mock blob with 256×256 dimensions
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      // Note: Actual implementation will extract dimensions from image headers
      await expect(validateDimensions(mockBlob, 256, 256)).resolves.toBeUndefined();
    });

    it('should accept dimensions below limit (128×128px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 128, 128)).resolves.toBeUndefined();
    });

    it('should accept non-square dimensions within limit (128×256px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 128, 256)).resolves.toBeUndefined();
    });

    it('should accept very small dimensions (16×16px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 16, 16)).resolves.toBeUndefined();
    });

    it('should reject dimensions exceeding width limit (257×256px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 257, 256)).rejects.toThrow(
        'Image dimensions (257×256) exceed maximum 256×256px'
      );
    });

    it('should reject dimensions exceeding height limit (256×257px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 256, 257)).rejects.toThrow(
        'Image dimensions (256×257) exceed maximum 256×256px'
      );
    });

    it('should reject dimensions exceeding both width and height (512×512px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 512, 512)).rejects.toThrow(
        'Image dimensions (512×512) exceed maximum 256×256px'
      );
    });

    it('should reject very large dimensions (1024×1024px)', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      await expect(validateDimensions(mockBlob, 1024, 1024)).rejects.toThrow(
        'Image dimensions (1024×1024) exceed maximum 256×256px'
      );
    });
  });

  describe('Integration: All validation functions', () => {
    it('should pass all validations for valid PNG emoji', async () => {
      const validBlob = new Blob([new Uint8Array(100000)], { type: 'image/png' });
      await expect(validateFormat(validBlob)).resolves.toBe('png');
      await expect(validateSize(validBlob)).resolves.toBeUndefined();
      await expect(validateDimensions(validBlob, 128, 128)).resolves.toBeUndefined();
    });

    it('should pass all validations for valid GIF emoji at size limit', async () => {
      const validGif = new Blob([new Uint8Array(512000)], { type: 'image/gif' });
      await expect(validateFormat(validGif)).resolves.toBe('gif');
      await expect(validateSize(validGif)).resolves.toBeUndefined();
      await expect(validateDimensions(validGif, 256, 256)).resolves.toBeUndefined();
    });

    it('should fail validation for oversized WEBP emoji', async () => {
      const invalidWebp = new Blob([new Uint8Array(600000)], { type: 'image/webp' });
      await expect(validateFormat(invalidWebp)).resolves.toBe('webp');
      await expect(validateSize(invalidWebp)).rejects.toThrow('exceeds 500KB limit');
    });

    it('should fail validation for wrong format even if size is valid', async () => {
      const invalidFormat = new Blob([new Uint8Array(100000)], { type: 'image/jpeg' });
      await expect(validateFormat(invalidFormat)).rejects.toThrow('Unsupported format');
      await expect(validateSize(invalidFormat)).resolves.toBeUndefined();
    });
  });
});
