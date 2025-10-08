import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { ModerationReason } from '@/lib/moderation';
import { ModerationReasonSelect } from './ModerationReasonSelect';

interface ModerationActionsPanelProps {
  targetUri: string;
  targetType: 'post' | 'user';
  communityId: string;
  onActionComplete?: () => void;
}

export function ModerationActionsPanel({
  targetUri,
  targetType,
  communityId,
  onActionComplete,
}: ModerationActionsPanelProps) {
  const [reason, setReason] = useState<ModerationReason | undefined>(undefined);

  const handleHide = async () => {
    // POST /api/moderation/hide with { postUri, communityId, reason }
    onActionComplete?.();
  };

  const handleBlock = async () => {
    // POST /api/moderation/block with { targetDid, communityId, reason }
    onActionComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Reason</Label>
          <ModerationReasonSelect value={reason} onChange={setReason} />
        </div>

        <div className="flex gap-2">
          {targetType === 'post' ? (
            <>
              <Button onClick={handleHide} variant="destructive">
                Hide Post
              </Button>
              <Button onClick={handleHide} variant="outline">
                Unhide Post
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleBlock} variant="destructive">
                Block User
              </Button>
              <Button onClick={handleBlock} variant="outline">
                Unblock User
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
