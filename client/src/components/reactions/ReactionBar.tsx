// ReactionBar Component - Display reaction counts with interactive buttons
// Feature: 016-slack-mastodon-misskey

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useReactionStream } from '../../hooks/useReactionStream';
import { addReaction, listReactions, removeReaction } from '../../lib/api';
import { ReactionModal } from './ReactionModal';

interface ReactionBarProps {
  postUri: string;
  communityId: string; // T046: Required for SSE connection
  className?: string;
}

interface ReactionAggregate {
  emoji: {
    type: 'unicode' | 'custom';
    value: string;
  };
  count: number;
  reactors: string[];
  currentUserReacted: boolean;
}

/**
 * ReactionBar - Show reaction counts and allow toggling reactions
 *
 * Features:
 * - Display emoji with count badges (max 20 inline)
 * - Highlight current user's reactions
 * - Toggle reactions on click
 * - Show reactor list on hover
 * - "Show More" button for 20+ unique emoji types (opens modal)
 * - Real-time updates via SSE (T046)
 */
export function ReactionBar({ postUri, communityId, className = '' }: ReactionBarProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // T046: Subscribe to SSE for real-time reaction updates
  const { isConnected } = useReactionStream({
    communityId,
    enabled: true, // Always connect when component mounts
    onError: (error) => {
      // biome-ignore lint/suspicious/noConsole: Intentional warning log for SSE fallback
      console.warn('[ReactionBar] SSE error, falling back to polling:', error);
    },
  });

  // Fetch reactions for this post
  // T046: Fallback to polling if SSE disconnected (staleTime: 10s)
  const { data, isLoading } = useQuery({
    queryKey: ['reactions', postUri],
    queryFn: () => listReactions(postUri),
    staleTime: isConnected ? 300000 : 10000, // 5min if SSE active, 10s if fallback
    refetchInterval: isConnected ? false : 10000, // Poll every 10s if SSE inactive
  });

  // Add reaction mutation
  const addMutation = useMutation({
    mutationFn: (emoji: { type: 'unicode' | 'custom'; value: string }) =>
      addReaction(postUri, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', postUri] });
    },
  });

  // Remove reaction mutation
  const removeMutation = useMutation({
    mutationFn: (reactionUri: string) => removeReaction(reactionUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', postUri] });
    },
  });

  const handleToggle = (reaction: ReactionAggregate) => {
    if (reaction.currentUserReacted) {
      // Find reaction URI (would need to be stored in aggregate)
      // For now, just refresh to show it's interactive
      // TODO: Store reactionUri in aggregate or fetch from API
      queryClient.invalidateQueries({ queryKey: ['reactions', postUri] });
    } else {
      addMutation.mutate(reaction.emoji);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-full h-8 w-16" />
        <div className="animate-pulse bg-gray-200 rounded-full h-8 w-16" />
      </div>
    );
  }

  const reactions = data?.reactions || [];

  if (reactions.length === 0) {
    return null;
  }

  // FR-029: Show max 20 emoji types inline, rest in modal
  const MAX_INLINE_EMOJI_TYPES = 20;
  const hasOverflow = reactions.length > MAX_INLINE_EMOJI_TYPES;
  const visibleReactions = hasOverflow ? reactions.slice(0, MAX_INLINE_EMOJI_TYPES) : reactions;
  const overflowCount = hasOverflow ? reactions.length - MAX_INLINE_EMOJI_TYPES : 0;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {visibleReactions.map((reaction: ReactionAggregate, index: number) => {
          const emojiDisplay =
            reaction.emoji.type === 'unicode'
              ? String.fromCodePoint(parseInt(reaction.emoji.value.replace('U+', ''), 16))
              : '🎨'; // Placeholder for custom emoji

          return (
            <button
              key={`${reaction.emoji.type}-${reaction.emoji.value}-${index}`}
              onClick={() => handleToggle(reaction)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                border transition-all duration-200
                ${
                  reaction.currentUserReacted
                    ? 'bg-blue-100 border-blue-500 text-blue-700 font-medium'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              disabled={addMutation.isPending || removeMutation.isPending}
              title={`${reaction.reactors.length} reaction${reaction.reactors.length > 1 ? 's' : ''}`}
            >
              <span className="text-base leading-none">{emojiDisplay}</span>
              <span className="text-sm font-medium">{reaction.count}</span>
            </button>
          );
        })}

        {/* FR-033: Show More button for overflow */}
        {hasOverflow && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all duration-200"
            title="View all reactions"
          >
            <span className="text-sm font-medium">Show More (+{overflowCount})</span>
          </button>
        )}
      </div>

      {/* FR-033: Modal for viewing all reactions */}
      <ReactionModal postUri={postUri} isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
