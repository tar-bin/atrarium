import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BskyAgent } from '@atproto/api';
import { postToPDS } from '@/lib/pds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const MAX_POST_LENGTH = 300;

const createPostSchema = z.object({
  text: z
    .string()
    .min(1, 'Post text is required')
    .refine(
      () => {
        // The text + space + hashtag must not exceed 300 characters
        // We'll check this in the form component since hashtag is external
        return true;
      },
      { message: 'Post must be at most 300 characters including hashtag' }
    ),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

interface CreatePostFormProps {
  agent: BskyAgent;
  feedHashtag: string;
  onSuccess: (postUri: string) => void;
}

export function CreatePostForm({ agent, feedHashtag, onSuccess }: CreatePostFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      text: '',
    },
  });

  const textValue = form.watch('text');
  const finalText = textValue ? `${textValue} ${feedHashtag}` : '';
  const charCount = finalText.length;
  const isOverLimit = charCount > MAX_POST_LENGTH;

  const handleSubmit = async (data: CreatePostFormData) => {
    const finalPostText = `${data.text} ${feedHashtag}`;

    if (finalPostText.length > MAX_POST_LENGTH) {
      setError(`Post must be at most ${MAX_POST_LENGTH} characters including hashtag`);
      return;
    }

    try {
      setError(null);
      const postUri = await postToPDS(agent, finalPostText);
      form.reset();
      onSuccess(postUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's on your mind?"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span
                      className={isOverLimit ? 'text-destructive' : ''}
                    >
                      {charCount} / {MAX_POST_LENGTH}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Preview */}
            {textValue && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                <p className="text-sm">{finalText}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting || isOverLimit || !textValue.trim()}
            >
              {form.formState.isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
