import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';

interface EmojiSubmission {
  emojiUri: string;
  shortcode: string;
  creator: string;
  creatorHandle: string;
  uploadedAt: string;
  format: 'png' | 'gif' | 'webp';
  animated: boolean;
  blobUrl: string;
}

interface EmojiApprovalListProps {
  communityId: string;
  submissions: EmojiSubmission[];
  onApprovalChange?: () => void;
}

export function EmojiApprovalList({
  communityId,
  submissions,
  onApprovalChange,
}: EmojiApprovalListProps) {
  const [processingUri, setProcessingUri] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (emojiUri: string) => {
    try {
      setError(null);
      setProcessingUri(emojiUri);

      await apiClient.emoji.approve({
        communityId,
        emojiURI: emojiUri,
        approve: true,
      });

      if (onApprovalChange) {
        onApprovalChange();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve emoji');
    } finally {
      setProcessingUri(null);
    }
  };

  const handleReject = async (emojiUri: string) => {
    try {
      setError(null);
      setProcessingUri(emojiUri);

      await apiClient.emoji.approve({
        communityId,
        emojiURI: emojiUri,
        approve: false,
        reason: rejectReason[emojiUri] || undefined,
      });

      // Clear reject reason
      setRejectReason((prev) => {
        const newReasons = { ...prev };
        delete newReasons[emojiUri];
        return newReasons;
      });

      if (onApprovalChange) {
        onApprovalChange();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject emoji');
    } finally {
      setProcessingUri(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">No pending emoji submissions</div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {submissions.map((submission) => (
        <Card key={submission.emojiUri}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={submission.blobUrl}
                  alt={submission.shortcode}
                  className="w-16 h-16 object-contain border rounded"
                />
                <div>
                  <CardTitle className="text-lg">:{submission.shortcode}:</CardTitle>
                  <CardDescription>
                    Submitted by @{submission.creatorHandle}
                    <br />
                    {new Date(submission.uploadedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="uppercase">{submission.format}</span>
                {submission.animated && <span>• Animated</span>}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <Label htmlFor={`reason-${submission.emojiUri}`}>Rejection Reason (optional)</Label>
              <Input
                id={`reason-${submission.emojiUri}`}
                placeholder="Enter reason for rejection..."
                value={rejectReason[submission.emojiUri] || ''}
                onChange={(e) =>
                  setRejectReason((prev) => ({
                    ...prev,
                    [submission.emojiUri]: e.target.value,
                  }))
                }
                disabled={processingUri === submission.emojiUri}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => handleReject(submission.emojiUri)}
              disabled={processingUri !== null}
            >
              {processingUri === submission.emojiUri ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              variant="default"
              onClick={() => handleApprove(submission.emojiUri)}
              disabled={processingUri !== null}
            >
              {processingUri === submission.emojiUri ? 'Approving...' : 'Approve'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
