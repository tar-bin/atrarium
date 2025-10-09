// EmojiApproval Component - Approval queue for community owners
// Feature: 016-slack-mastodon-misskey

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { approveEmoji, listPendingEmojis } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface EmojiApprovalProps {
  communityId: string;
  isOwner: boolean;
}

interface PendingEmoji {
  shortcode: string;
  emojiRef: string;
  imageUrl: string;
  creator: string;
  creatorHandle?: string;
  uploadedAt: string;
  format: 'png' | 'gif' | 'webp';
  size: number;
  dimensions: { width: number; height: number };
  animated: boolean;
}

/**
 * EmojiApproval - Approval queue for community owners
 *
 * Features:
 * - List pending emoji submissions
 * - Approve/reject buttons
 * - Optional reason textarea for rejections
 * - Preview images with metadata
 * - Owner-only access
 */
export function EmojiApproval({ communityId, isOwner }: EmojiApprovalProps) {
  const queryClient = useQueryClient();
  const [rejectingEmoji, setRejectingEmoji] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch pending emojis
  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-emojis', communityId],
    queryFn: () => listPendingEmojis(communityId),
    staleTime: 30000, // Cache for 30 seconds
    enabled: isOwner, // Only fetch if user is owner
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: (data: { emojiRef: string; status: 'approved' | 'rejected'; reason?: string }) =>
      approveEmoji(communityId, data.emojiRef, data.status, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-emojis', communityId] });
      queryClient.invalidateQueries({ queryKey: ['emojis', communityId] });
      setRejectingEmoji(null);
      setRejectionReason('');
    },
  });

  const handleApprove = (emoji: PendingEmoji) => {
    approveMutation.mutate({
      emojiRef: emoji.emojiRef,
      status: 'approved',
    });
  };

  const handleReject = (emoji: PendingEmoji) => {
    setRejectingEmoji(emoji.emojiRef);
  };

  const handleConfirmReject = (emoji: PendingEmoji) => {
    approveMutation.mutate({
      emojiRef: emoji.emojiRef,
      status: 'rejected',
      reason: rejectionReason || undefined,
    });
  };

  const handleCancelReject = () => {
    setRejectingEmoji(null);
    setRejectionReason('');
  };

  if (!isOwner) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Emoji Approval Queue</h2>
        <div className="text-center text-gray-500 py-8">
          Only community owners can approve emojis.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Emoji Approval Queue</h2>
        <div className="text-center text-gray-500 py-8">Loading pending emojis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Emoji Approval Queue</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">Failed to load pending emojis: {error.message}</p>
        </div>
      </div>
    );
  }

  const pendingEmojis = data?.emojis || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Emoji Approval Queue</h2>
        <Badge variant="secondary">{pendingEmojis.length} pending</Badge>
      </div>

      {pendingEmojis.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>No emojis pending approval.</p>
          <p className="text-sm mt-2">Check back later for new submissions!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingEmojis.map((emoji: PendingEmoji) => (
            <div
              key={emoji.emojiRef}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-16 h-16 bg-gray-50 rounded border border-gray-200">
                    <img src={emoji.imageUrl} alt={emoji.shortcode} className="max-h-14 w-auto" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">
                      :{emoji.shortcode}:
                    </code>
                    {emoji.animated && (
                      <Badge variant="outline" className="text-xs">
                        Animated
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Creator:</span>{' '}
                      {emoji.creatorHandle || emoji.creator}
                    </div>
                    <div>
                      <span className="font-medium">Format:</span> {emoji.format.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {emoji.dimensions.width}×
                      {emoji.dimensions.height}px ({(emoji.size / 1024).toFixed(1)} KB)
                    </div>
                    <div>
                      <span className="font-medium">Uploaded:</span>{' '}
                      {new Date(emoji.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {rejectingEmoji === emoji.emojiRef ? (
                  <div className="flex-shrink-0 w-64">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`reason-${emoji.emojiRef}`}>Rejection Reason</Label>
                        <Textarea
                          id={`reason-${emoji.emojiRef}`}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Optional reason for rejection..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleConfirmReject(emoji)}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          Confirm Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelReject}
                          disabled={approveMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(emoji)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(emoji)}
                      disabled={approveMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval mutation error */}
      {approveMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            Failed to process approval: {approveMutation.error?.message}
          </p>
        </div>
      )}
    </div>
  );
}
