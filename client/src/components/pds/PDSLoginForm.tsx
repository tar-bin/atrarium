import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { usePDS } from '@/contexts/PDSContext';

const loginSchema = z.object({
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Handle must be in format: handle.domain'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface PDSLoginFormProps {
  pdsUrl: string;
  onSuccess?: () => void;
}

export function PDSLoginForm({ pdsUrl, onSuccess }: PDSLoginFormProps) {
  const { login } = usePDS();
  const navigate = useNavigate();
  const search = useSearch({ from: '/' });
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      handle: '',
      password: '',
    },
  });

  const handleSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.handle, data.password);

      if (onSuccess) {
        onSuccess();
      }

      // Redirect to the original page or communities page
      const redirectTo = (search as { redirect?: string })?.redirect || '/communities';
      navigate({ to: redirectTo as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login to PDS');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login to PDS</CardTitle>
        <CardDescription>Connect to your Bluesky PDS to post content</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md bg-muted p-3">
          <p className="text-sm font-medium text-muted-foreground">PDS URL:</p>
          <p className="font-mono text-sm">{pdsUrl}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handle</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="alice.test"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
