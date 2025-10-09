// CustomEmojiUpload Component - Upload custom emoji form
// Feature: 016-slack-mastodon-misskey

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import { useId, useState } from 'react';
import { uploadEmoji } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CustomEmojiUploadProps {
  onSuccess?: () => void;
}

/**
 * CustomEmojiUpload - Form for uploading custom emojis
 *
 * Features:
 * - Image file upload with validation (PNG/GIF/WebP, 512KB max, 256x256px max)
 * - Shortcode input (alphanumeric + underscore)
 * - Image preview before upload
 * - Real-time validation feedback
 */
export function CustomEmojiUpload({ onSuccess }: CustomEmojiUploadProps) {
  const queryClient = useQueryClient();
  const shortcodeId = useId();
  const imageId = useId();
  const [shortcode, setShortcode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload emoji mutation
  const uploadMutation = useMutation({
    mutationFn: (data: { shortcode: string; image: File }) =>
      uploadEmoji(data.shortcode, data.image),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emojis'] });
      // Reset form
      setShortcode('');
      setImageFile(null);
      setPreviewUrl(null);
      setValidationError(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setValidationError(error.message || 'Failed to upload emoji');
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setValidationError('Invalid file type. Only PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (512KB max)
    const maxSize = 512 * 1024; // 512KB
    if (file.size > maxSize) {
      setValidationError('File size exceeds 512KB limit.');
      return;
    }

    // Validate image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      if (img.width > 256 || img.height > 256) {
        setValidationError('Image dimensions exceed 256x256px limit.');
        URL.revokeObjectURL(objectUrl);
        return;
      }

      // All validations passed
      setImageFile(file);
      setPreviewUrl(objectUrl);
      setValidationError(null);
    };

    img.onerror = () => {
      setValidationError('Failed to load image.');
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  };

  const handleShortcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    // Only allow alphanumeric and underscore
    if (!/^[a-z0-9_]*$/.test(value)) {
      setValidationError(
        'Shortcode must only contain lowercase letters, numbers, and underscores.'
      );
      return;
    }
    if (value.length > 32) {
      setValidationError('Shortcode must be 32 characters or less.');
      return;
    }
    setShortcode(value);
    setValidationError(null);
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      setValidationError('Please select an image file.');
      return;
    }

    if (shortcode.length < 2) {
      setValidationError('Shortcode must be at least 2 characters.');
      return;
    }

    uploadMutation.mutate({ shortcode, image: imageFile });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Custom Emoji</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Shortcode input */}
        <div>
          <Label htmlFor={shortcodeId}>Shortcode</Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">:</span>
            <Input
              id={shortcodeId}
              type="text"
              value={shortcode}
              onChange={handleShortcodeChange}
              placeholder="my_emoji"
              className="pl-6 pr-6"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">:</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Use lowercase letters, numbers, and underscores (2-32 characters)
          </p>
        </div>

        {/* Image upload */}
        <div>
          <Label htmlFor={imageId}>Image File</Label>
          <div className="mt-1">
            {!previewUrl ? (
              <label
                htmlFor={imageId}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload image</span>
                <span className="text-xs text-gray-500 mt-1">
                  PNG, GIF, or WebP • Max 512KB • Max 256x256px
                </span>
                <Input
                  id={imageId}
                  type="file"
                  accept="image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  required
                />
              </label>
            ) : (
              <div className="relative border border-gray-300 rounded-lg p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-16 h-16 object-contain bg-gray-50 rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{imageFile?.name}</p>
                  <p className="text-xs text-gray-500">
                    {imageFile && `${(imageFile.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        {/* Upload mutation error */}
        {uploadMutation.isError && !validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              {uploadMutation.error?.message || 'Failed to upload emoji'}
            </p>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          disabled={!imageFile || !shortcode || uploadMutation.isPending || !!validationError}
          className="w-full"
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Emoji'}
        </Button>

        {/* Success message */}
        {uploadMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              Emoji uploaded successfully! Waiting for community owner approval.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
