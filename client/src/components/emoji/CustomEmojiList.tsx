// CustomEmojiList Component - Manage user's uploaded emojis
// Feature: 016-slack-mastodon-misskey

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { deleteEmoji, listUserEmojis } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface CustomEmojiListProps {
  userId: string;
}

// Match api.ts listUserEmojis return type
interface CustomEmoji {
  shortcode: string;
  blob: unknown;
  creator: string;
  uploadedAt: string;
  format: 'png' | 'gif' | 'webp';
  size: number;
  dimensions: { width: number; height: number };
  animated: boolean;
  uri: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'revoked';
}

/**
 * CustomEmojiList - Display and manage user's uploaded emojis
 *
 * Features:
 * - List user's uploaded emojis with metadata
 * - Show approval status badges
 * - Delete emoji button
 * - Image preview
 * - Format and size info
 */
export function CustomEmojiList({ userId }: CustomEmojiListProps) {
  const queryClient = useQueryClient();

  // Fetch user's emojis
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-emojis', userId],
    queryFn: () => listUserEmojis(userId),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Delete emoji mutation
  const deleteMutation = useMutation({
    mutationFn: (emojiUri: string) => deleteEmoji(emojiUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-emojis', userId] });
      queryClient.invalidateQueries({ queryKey: ['emojis'] });
    },
  });

  const handleDelete = (emoji: CustomEmoji) => {
    if (
      window.confirm(`Are you sure you want to delete :${emoji.shortcode}:? This cannot be undone.`)
    ) {
      deleteMutation.mutate(emoji.uri);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Custom Emojis</h2>
        <div className="text-center text-gray-500 py-8">Loading emojis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Custom Emojis</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">Failed to load emojis: {error.message}</p>
        </div>
      </div>
    );
  }

  const emojis = data?.emoji || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Your Custom Emojis</h2>

      {emojis.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>You haven&apos;t uploaded any custom emojis yet.</p>
          <p className="text-sm mt-2">Upload your first emoji above!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Preview</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Shortcode</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Details</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emojis.map((emoji: CustomEmoji) => (
                <tr key={emoji.uri} className="border-b border-gray-100 hover:bg-gray-50">
                  {/* Preview */}
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded border border-gray-200">
                      {/* Note: blob URL not available in current schema, placeholder for now */}
                      <div className="text-2xl">{emoji.shortcode}</div>
                    </div>
                  </td>

                  {/* Shortcode */}
                  <td className="py-3 px-3">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      :{emoji.shortcode}:
                    </code>
                  </td>

                  {/* Details */}
                  <td className="py-3 px-3">
                    <div className="text-sm text-gray-600">
                      <div>
                        {emoji.format.toUpperCase()}
                        {emoji.animated && ' (animated)'}
                      </div>
                      <div>
                        {emoji.dimensions.width}×{emoji.dimensions.height}px
                      </div>
                      <div>{(emoji.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    {emoji.approvalStatus === 'approved' && (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        Approved
                      </Badge>
                    )}
                    {emoji.approvalStatus === 'pending' && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {emoji.approvalStatus === 'rejected' && (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                    {emoji.approvalStatus === 'revoked' && (
                      <Badge variant="outline" className="text-orange-700">
                        Revoked
                      </Badge>
                    )}
                    {!emoji.approvalStatus && <Badge variant="secondary">Pending</Badge>}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(emoji)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete mutation error */}
      {deleteMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            Failed to delete emoji: {deleteMutation.error?.message}
          </p>
        </div>
      )}
    </div>
  );
}
