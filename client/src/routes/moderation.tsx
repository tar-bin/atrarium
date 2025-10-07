import { createFileRoute, redirect } from '@tanstack/react-router';
import { ModerationLog } from '@/components/moderation/ModerationLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isAuthenticated } from '@/lib/auth';
import type { ModerationAction } from '@/types';

export const Route = createFileRoute('/moderation')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/',
        search: { redirect: '/moderation' },
      });
    }
  },
  component: ModerationPage,
});

function ModerationPage() {
  // TODO: Replace with TanStack Query in Phase 3.6
  const mockActions: ModerationAction[] = [];
  const loading = false;
  const error = null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Moderation Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ModerationLog actions={mockActions} loading={loading} error={error} />
        </CardContent>
      </Card>
    </div>
  );
}
