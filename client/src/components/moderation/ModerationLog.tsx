import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRelativeTime } from '@/lib/date';
import type { ModerationAction } from '@/types';

interface ModerationLogProps {
  actions: ModerationAction[];
  loading: boolean;
  error?: string | null;
}

export function ModerationLog({ actions, loading, error }: ModerationLogProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No moderation actions yet</p>
      </div>
    );
  }

  // Sort by performedAt DESC (newest first)
  const sortedActions = [...actions].sort((a, b) => b.performedAt - a.performedAt);

  const formatActionType = (action: ModerationAction['action']): string => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Moderator</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedActions.map((action) => (
            <TableRow key={action.id}>
              <TableCell className="font-medium">{formatActionType(action.action)}</TableCell>
              <TableCell className="font-mono text-xs">{action.targetUri}</TableCell>
              <TableCell className="font-mono text-xs">{action.moderatorDid}</TableCell>
              <TableCell>{action.reason || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(action.performedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
