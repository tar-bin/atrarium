import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BskyAgent } from '@atproto/api';
import { loginToPDS, getSessionDID, getSessionHandle } from '@/lib/pds';
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
import { Button } from '@/components/ui/button';

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
  onSuccess: (result: { agent: BskyAgent; did: string; handle: string }) => void;
}

export function PDSLoginForm({ pdsUrl, onSuccess }: PDSLoginFormProps) {
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
      const agent = await loginToPDS(data.handle, data.password);

      const did = getSessionDID(agent);
      const handle = getSessionHandle(agent);

      if (!did || !handle) {
        throw new Error('Failed to retrieve session information');
      }

      // Store session in localStorage
      localStorage.setItem('pds_session', JSON.stringify({ did, handle }));

      onSuccess({ agent, did, handle });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login to PDS');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login to PDS</CardTitle>
        <CardDescription>
          Connect to your Bluesky PDS to post content
        </CardDescription>
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
                    <Input placeholder="alice.test" {...field} />
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
                    <Input type="password" placeholder="••••••••" {...field} />
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
