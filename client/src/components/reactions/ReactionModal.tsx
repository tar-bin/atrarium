import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { listReactions } from '../../lib/api';
import { Button } from '../ui/button';

interface ReactionModalProps {
  postUri: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ReactionAggregate {
  emoji: {
    type: 'unicode' | 'custom';
    value: string;
  };
  count: number;
  currentUserReacted: boolean;
  reactorDids?: string[];
}

export function ReactionModal({ postUri, isOpen, onClose }: ReactionModalProps) {
  const modalId = useId();
  const titleId = useId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['reactions', postUri, 'all'],
    queryFn: () => listReactions(postUri, 100), // Fetch up to 100 emoji types
    enabled: isOpen,
    staleTime: 10000,
  });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const reactions = data?.reactions || [];

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click handler is for backdrop close only, dialog has proper ARIA
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      id={modalId}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Modal content prevents event bubbling, no keyboard handler needed */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: This is the modal content container, not an interactive element */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 id={titleId} className="text-lg font-semibold">
            All Reactions ({reactions.length})
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <div className="text-center py-8 text-gray-500">Loading reactions...</div>}

          {error && (
            <div className="text-center py-8 text-red-500">
              Error loading reactions: {String(error)}
            </div>
          )}

          {!isLoading && !error && reactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">No reactions yet</div>
          )}

          {!isLoading && !error && reactions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reactions.map((reaction: ReactionAggregate, index: number) => (
                <div
                  key={`${reaction.emoji.type}-${reaction.emoji.value}-${index}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  {/* Emoji */}
                  <div className="text-2xl flex-shrink-0">
                    {reaction.emoji.type === 'unicode'
                      ? String.fromCodePoint(
                          Number.parseInt(reaction.emoji.value.replace('U+', ''), 16)
                        )
                      : `:${reaction.emoji.value}:`}
                  </div>

                  {/* Count and Status */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}
                    </div>
                    {reaction.currentUserReacted && (
                      <div className="text-xs text-blue-600 dark:text-blue-400">You reacted</div>
                    )}
                  </div>

                  {/* Reactor Count Badge */}
                  {reaction.reactorDids && reaction.reactorDids.length > 0 && (
                    <div
                      className="flex-shrink-0 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded"
                      title={`${reaction.reactorDids.length} reactors`}
                    >
                      {reaction.reactorDids.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t dark:border-gray-700">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
