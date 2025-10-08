// PostCreator Component (014-bluesky: Custom Lexicon Posts)
// UI for creating posts in a community

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { apiClient } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';

interface PostCreatorProps {
  communityId: string;
}

export function PostCreator({ communityId }: PostCreatorProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const maxChars = 300;
  const remainingChars = maxChars - text.length;
  const isValid = text.trim().length > 0 && text.length <= maxChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast({
        title: 'Invalid Post',
        description: 'Post text must be 1-300 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.posts.create({
        communityId,
        text: text.trim(),
      });

      // Success feedback
      toast({
        title: 'Post Created',
        description: 'Your post has been published to the community.',
      });

      // Clear input
      setText('');

      // Invalidate posts query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['posts', communityId] });
    } catch (error) {
      // Error feedback
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create post. Please try again.';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
              maxLength={maxChars}
            />
            <div className="flex justify-between items-center text-sm">
              <span
                className={`${
                  remainingChars < 0
                    ? 'text-destructive'
                    : remainingChars < 50
                      ? 'text-warning'
                      : 'text-muted-foreground'
                }`}
              >
                {remainingChars} characters remaining
              </span>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
