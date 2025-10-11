import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { uploadEmoji } from '@/lib/api';

const emojiUploadSchema = z.object({
  shortcode: z
    .string()
    .min(2, 'Shortcode must be at least 2 characters')
    .max(32, 'Shortcode must be at most 32 characters')
    .regex(
      /^[a-z0-9_]+$/,
      'Shortcode can only contain lowercase letters, numbers, and underscores'
    ),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 500 * 1024, 'File size must be ≤500KB')
    .refine(
      (file) => ['image/png', 'image/gif', 'image/webp'].includes(file.type),
      'File must be PNG, GIF, or WEBP'
    ),
});

type EmojiUploadFormData = z.infer<typeof emojiUploadSchema>;

interface EmojiUploadFormProps {
  onSuccess?: (emojiURI: string) => void;
  onError?: (error: string) => void;
}

export function EmojiUploadForm({ onSuccess, onError }: EmojiUploadFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<EmojiUploadFormData>({
    resolver: zodResolver(emojiUploadSchema),
    defaultValues: {
      shortcode: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      form.setValue('file', file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (data: EmojiUploadFormData) => {
    try {
      setError(null);

      // Validate image dimensions
      const img = new Image();
      const imageUrl = URL.createObjectURL(data.file);
      await new Promise((resolve, reject) => {
        img.onload = () => {
          if (img.width > 256 || img.height > 256) {
            reject(new Error('Image dimensions must be ≤256×256px'));
          }
          resolve(true);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });
      URL.revokeObjectURL(imageUrl);

      // Upload emoji via legacy API
      const result = await uploadEmoji(data.shortcode, data.file);

      // Reset form and preview
      form.reset();
      setPreviewUrl(null);

      // Notify success
      if (onSuccess) {
        onSuccess(result.emojiURI);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload emoji';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="shortcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shortcode</FormLabel>
              <FormControl>
                <Input
                  placeholder="wave"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>
                Lowercase letters, numbers, and underscores only (e.g., "wave", "happy_face")
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={() => (
            <FormItem>
              <FormLabel>Emoji Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                />
              </FormControl>
              <FormDescription>PNG, GIF, or WEBP • Max 500KB • Max 256×256px</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {previewUrl && (
          <div className="flex items-center gap-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-16 h-16 object-contain border rounded"
            />
            <span className="text-sm text-muted-foreground">Preview</span>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Uploading...' : 'Upload Emoji'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
