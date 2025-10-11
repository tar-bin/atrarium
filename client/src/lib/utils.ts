import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert File to base64 string (018-api-orpc: Emoji upload utility)
 * @param file - Image file to convert
 * @returns Promise<string> - base64-encoded string (without data:image/...;base64, prefix)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract image dimensions from File (018-api-orpc: Emoji upload utility)
 * @param file - Image file to analyze
 * @returns Promise<{ width: number; height: number }> - Image dimensions
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src); // Clean up object URL
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if image file is animated GIF (018-api-orpc: Emoji upload utility)
 * @param file - Image file to check
 * @returns Promise<boolean> - True if animated GIF
 */
export async function isAnimatedGif(file: File): Promise<boolean> {
  // Simple check: animated GIFs typically have multiple frames
  // This is a heuristic check based on file size and structure
  if (file.type !== 'image/gif') {
    return false;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      // Check for multiple GIF frames (GCE blocks)
      // This is a simplified check - a more robust solution would parse GIF structure
      let count = 0;
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === 0x21 && arr[i + 1] === 0xf9) {
          // Graphic Control Extension (indicates frame)
          count++;
          if (count > 1) {
            resolve(true);
            return;
          }
        }
      }
      resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file);
  });
}
