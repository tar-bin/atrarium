import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Community } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const updateCommunitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

type UpdateCommunityFormData = z.infer<typeof updateCommunitySchema>;

interface CommunitySettingsProps {
  community: Community;
  isOwner: boolean;
  onUpdate: (data: { name: string; description: string }) => Promise<void>;
  onClose: () => Promise<void>;
}

export function CommunitySettings({
  community,
  isOwner,
  onUpdate,
  onClose,
}: CommunitySettingsProps) {
  const [error, setError] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const form = useForm<UpdateCommunityFormData>({
    resolver: zodResolver(updateCommunitySchema),
    defaultValues: {
      name: community.name,
      description: community.description || '',
    },
  });

  if (!isOwner) {
    return null;
  }

  const handleUpdate = async (data: UpdateCommunityFormData) => {
    try {
      setError(null);
      await onUpdate({
        name: data.name,
        description: data.description || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update community');
    }
  };

  const handleCloseCommunity = async () => {
    try {
      setError(null);
      await onClose();
      setShowCloseDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close community');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Community Settings</CardTitle>
          <CardDescription>Update community information or close the community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </Form>

          <div className="border-t pt-6">
            <h3 className="mb-2 text-sm font-medium text-destructive">Danger Zone</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Closing a community is permanent and cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowCloseDialog(true)}
            >
              Close Community
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently archive the community and all
              its feeds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseCommunity}>
              Yes, Close Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
