// CreateChildTheme Component (T036)
// Child theme creation form (Graduated groups only)

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../hooks/use-toast';
import { apiClient } from '../../lib/api';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface CreateChildThemeProps {
  parentId: string;
  parentName: string;
  parentStage: 'theme' | 'community' | 'graduated';
}

// Validation schema (matches CreateChildInputSchema from contracts)
const createChildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
});

type CreateChildForm = z.infer<typeof createChildSchema>;

export function CreateChildTheme({ parentId, parentName, parentStage }: CreateChildThemeProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<CreateChildForm>({
    resolver: zodResolver(createChildSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Create child mutation
  const createChildMutation = useMutation({
    mutationFn: async (data: CreateChildForm) => {
      return apiClient.communities.createChild({
        parentId,
        name: data.name,
        description: data.description,
      });
    },
    onSuccess: (data) => {
      // Invalidate parent's children query
      queryClient.invalidateQueries({ queryKey: ['group', parentId, 'children'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });

      toast({
        title: 'Child theme created',
        description: `${data.name} has been created as a child of ${parentName}.`,
      });

      setOpen(false);
      form.reset();

      // Navigate to new child group detail page
      navigate({ to: '/communities/$communityId', params: { communityId: data.id } });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create child theme',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateChildForm) => {
    createChildMutation.mutate(data);
  };

  // Only show for Graduated-stage groups
  if (parentStage !== 'graduated') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Child Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Child Theme</DialogTitle>
          <DialogDescription>
            Create a new theme group under {parentName}. Child themes inherit moderation from the
            parent group.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., UI Patterns, Architecture Discussions"
                      {...field}
                      disabled={createChildMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for the child theme (max 200 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is this theme about?"
                      rows={4}
                      {...field}
                      disabled={createChildMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of the theme's purpose (max 2000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
                disabled={createChildMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createChildMutation.isPending}>
                {createChildMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create Theme</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
