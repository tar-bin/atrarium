import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Feed } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { stripHashtag } from '@/lib/hashtag';
import { useToast } from '@/hooks/use-toast';

const createFeedSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

type CreateFeedFormData = z.infer<typeof createFeedSchema>;

interface CreateFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => Promise<Feed>;
}

export function CreateFeedModal({ isOpen, onClose, onSubmit }: CreateFeedModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [createdFeed, setCreatedFeed] = useState<Feed | null>(null);
  const { toast } = useToast();

  const form = useForm<CreateFeedFormData>({
    resolver: zodResolver(createFeedSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleSubmit = async (data: CreateFeedFormData) => {
    try {
      setError(null);
      const feed = await onSubmit({
        name: data.name,
        description: data.description || '',
      });
      setCreatedFeed(feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feed');
    }
  };

  const handleCopyHashtag = async () => {
    if (!createdFeed) return;
    try {
      const plainHashtag = stripHashtag(createdFeed.hashtag);
      await navigator.clipboard.writeText(plainHashtag);
      toast({
        title: 'Copied!',
        description: 'Hashtag copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy hashtag to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    form.reset();
    setCreatedFeed(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Feed</DialogTitle>
          <DialogDescription>
            Create a new feed for your community. A unique hashtag will be generated.
          </DialogDescription>
        </DialogHeader>

        {!createdFeed ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Feed name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Feed description (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-2 font-semibold">Feed Created Successfully!</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Use this hashtag when posting to this feed:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                  {createdFeed.hashtag}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyHashtag}
                  aria-label="Copy hashtag"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
