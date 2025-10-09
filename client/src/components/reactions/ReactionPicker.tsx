// ReactionPicker Component - Emoji selection UI for adding reactions
// Feature: 016-slack-mastodon-misskey

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addReaction } from '../../lib/api';

interface ReactionPickerProps {
  postUri: string;
  onClose?: () => void;
}

// Common Unicode emojis (MVP set)
const COMMON_EMOJIS = [
  { codepoint: 'U+1F44D', char: '👍', label: 'Thumbs Up' },
  { codepoint: 'U+2764', char: '❤️', label: 'Heart' },
  { codepoint: 'U+1F389', char: '🎉', label: 'Party' },
  { codepoint: 'U+1F525', char: '🔥', label: 'Fire' },
  { codepoint: 'U+1F44F', char: '👏', label: 'Clap' },
  { codepoint: 'U+1F60D', char: '😍', label: 'Heart Eyes' },
  { codepoint: 'U+1F602', char: '😂', label: 'Tears of Joy' },
  { codepoint: 'U+1F914', char: '🤔', label: 'Thinking' },
  { codepoint: 'U+1F440', char: '👀', label: 'Eyes' },
  { codepoint: 'U+1F680', char: '🚀', label: 'Rocket' },
];

/**
 * ReactionPicker - Emoji selection popover
 *
 * Features:
 * - Grid of common Unicode emojis
 * - Click to add reaction
 * - Auto-close after selection
 */
export function ReactionPicker({ postUri, onClose }: ReactionPickerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  const addMutation = useMutation({
    mutationFn: (emoji: { type: 'unicode' | 'custom'; value: string }) =>
      addReaction(postUri, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', postUri] });
      setIsOpen(false);
      onClose?.();
    },
  });

  const handleSelectEmoji = (codepoint: string) => {
    addMutation.mutate({
      type: 'unicode',
      value: codepoint,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="relative">
      <div className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b">
          <span className="text-sm font-medium text-gray-700">Pick a reaction</span>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-5 gap-2">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji.codepoint}
              onClick={() => handleSelectEmoji(emoji.codepoint)}
              className="w-10 h-10 flex items-center justify-center text-2xl rounded hover:bg-gray-100 transition-colors"
              title={emoji.label}
              disabled={addMutation.isPending}
            >
              {emoji.char}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {addMutation.isPending && (
          <div className="mt-2 pt-2 border-t text-center">
            <span className="text-xs text-gray-500">Adding reaction...</span>
          </div>
        )}
      </div>

      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-40 bg-transparent cursor-default"
        onClick={() => {
          setIsOpen(false);
          onClose?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
            onClose?.();
          }
        }}
        aria-label="Close reaction picker"
      />
    </div>
  );
}
