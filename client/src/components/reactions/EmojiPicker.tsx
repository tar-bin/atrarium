// EmojiPicker Component - Tabbed emoji selector with Unicode and custom emojis
// Feature: 016-slack-mastodon-misskey

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { addReaction, listEmojis } from '../../lib/api';
import { Input } from '../ui/input';

interface EmojiPickerProps {
  postUri: string;
  communityId: string;
  onClose?: () => void;
}

// Unicode emoji categories
const UNICODE_CATEGORIES = [
  {
    name: 'Smileys & Emotion',
    emojis: [
      { codepoint: 'U+1F603', char: '😃', label: 'Grinning Face with Big Eyes' },
      { codepoint: 'U+1F604', char: '😄', label: 'Grinning Face with Smiling Eyes' },
      { codepoint: 'U+1F601', char: '😁', label: 'Beaming Face with Smiling Eyes' },
      { codepoint: 'U+1F606', char: '😆', label: 'Grinning Squinting Face' },
      { codepoint: 'U+1F605', char: '😅', label: 'Grinning Face with Sweat' },
      { codepoint: 'U+1F923', char: '🤣', label: 'Rolling on the Floor Laughing' },
      { codepoint: 'U+1F602', char: '😂', label: 'Face with Tears of Joy' },
      { codepoint: 'U+1F642', char: '🙂', label: 'Slightly Smiling Face' },
      { codepoint: 'U+1F643', char: '🙃', label: 'Upside-Down Face' },
      { codepoint: 'U+1F609', char: '😉', label: 'Winking Face' },
      { codepoint: 'U+1F60A', char: '😊', label: 'Smiling Face with Smiling Eyes' },
      { codepoint: 'U+1F607', char: '😇', label: 'Smiling Face with Halo' },
    ],
  },
  {
    name: 'Gestures & Hands',
    emojis: [
      { codepoint: 'U+1F44D', char: '👍', label: 'Thumbs Up' },
      { codepoint: 'U+1F44E', char: '👎', label: 'Thumbs Down' },
      { codepoint: 'U+1F44F', char: '👏', label: 'Clapping Hands' },
      { codepoint: 'U+1F64C', char: '🙌', label: 'Raising Hands' },
      { codepoint: 'U+1F64F', char: '🙏', label: 'Folded Hands' },
      { codepoint: 'U+1F91D', char: '🤝', label: 'Handshake' },
      { codepoint: 'U+270A', char: '✊', label: 'Raised Fist' },
      { codepoint: 'U+1F44A', char: '👊', label: 'Oncoming Fist' },
    ],
  },
  {
    name: 'Hearts & Love',
    emojis: [
      { codepoint: 'U+2764', char: '❤️', label: 'Red Heart' },
      { codepoint: 'U+1F9E1', char: '🧡', label: 'Orange Heart' },
      { codepoint: 'U+1F49B', char: '💛', label: 'Yellow Heart' },
      { codepoint: 'U+1F49A', char: '💚', label: 'Green Heart' },
      { codepoint: 'U+1F499', char: '💙', label: 'Blue Heart' },
      { codepoint: 'U+1F49C', char: '💜', label: 'Purple Heart' },
      { codepoint: 'U+1F5A4', char: '🖤', label: 'Black Heart' },
      { codepoint: 'U+1F90D', char: '🤍', label: 'White Heart' },
      { codepoint: 'U+1F498', char: '💘', label: 'Heart with Arrow' },
      { codepoint: 'U+1F495', char: '💕', label: 'Two Hearts' },
    ],
  },
  {
    name: 'Animals & Nature',
    emojis: [
      { codepoint: 'U+1F436', char: '🐶', label: 'Dog Face' },
      { codepoint: 'U+1F431', char: '🐱', label: 'Cat Face' },
      { codepoint: 'U+1F42D', char: '🐭', label: 'Mouse Face' },
      { codepoint: 'U+1F430', char: '🐰', label: 'Rabbit Face' },
      { codepoint: 'U+1F98A', char: '🦊', label: 'Fox' },
      { codepoint: 'U+1F43B', char: '🐻', label: 'Bear' },
      { codepoint: 'U+1F43C', char: '🐼', label: 'Panda' },
      { codepoint: 'U+1F428', char: '🐨', label: 'Koala' },
    ],
  },
  {
    name: 'Food & Drink',
    emojis: [
      { codepoint: 'U+1F355', char: '🍕', label: 'Pizza' },
      { codepoint: 'U+1F354', char: '🍔', label: 'Hamburger' },
      { codepoint: 'U+1F35F', char: '🍟', label: 'French Fries' },
      { codepoint: 'U+1F32D', char: '🌭', label: 'Hot Dog' },
      { codepoint: 'U+1F35D', char: '🍝', label: 'Spaghetti' },
      { codepoint: 'U+1F363', char: '🍣', label: 'Sushi' },
      { codepoint: 'U+1F371', char: '🍱', label: 'Bento Box' },
      { codepoint: 'U+1F372', char: '🍲', label: 'Pot of Food' },
    ],
  },
  {
    name: 'Activities',
    emojis: [
      { codepoint: 'U+26BD', char: '⚽', label: 'Soccer Ball' },
      { codepoint: 'U+1F3C0', char: '🏀', label: 'Basketball' },
      { codepoint: 'U+1F3C8', char: '🏈', label: 'American Football' },
      { codepoint: 'U+26BE', char: '⚾', label: 'Baseball' },
      { codepoint: 'U+1F3BE', char: '🎾', label: 'Tennis' },
      { codepoint: 'U+1F3B5', char: '🎵', label: 'Musical Note' },
      { codepoint: 'U+1F3A8', char: '🎨', label: 'Artist Palette' },
      { codepoint: 'U+1F4DA', char: '📚', label: 'Books' },
    ],
  },
];

/**
 * EmojiPicker - Full-featured emoji picker with tabs and search
 *
 * Features:
 * - Unicode emoji categories (Smileys, Gestures, Hearts, etc.)
 * - Community custom emojis
 * - Search functionality
 * - Tab switching
 */
export function EmojiPicker({ postUri, communityId, onClose }: EmojiPickerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'unicode' | 'custom'>('unicode');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  // Fetch community custom emojis
  const { data: customEmojisData, isLoading: isLoadingCustom } = useQuery({
    queryKey: ['emojis', communityId],
    queryFn: () => listEmojis(communityId),
    staleTime: 60000, // Cache for 1 minute
  });

  // Add reaction mutation
  const addMutation = useMutation({
    mutationFn: (emoji: { type: 'unicode' | 'custom'; value: string }) =>
      addReaction(postUri, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', postUri] });
      setIsOpen(false);
      onClose?.();
    },
  });

  const handleSelectUnicodeEmoji = (codepoint: string) => {
    addMutation.mutate({
      type: 'unicode',
      value: codepoint,
    });
  };

  const handleSelectCustomEmoji = (emojiRef: string) => {
    addMutation.mutate({
      type: 'custom',
      value: emojiRef,
    });
  };

  if (!isOpen) {
    return null;
  }

  // Convert Record to array of [shortcode, metadata] entries
  const customEmojisRecord = customEmojisData?.emoji || {};
  const customEmojisArray = Object.entries(customEmojisRecord);

  // Filter emojis by search query
  const filteredUnicodeCategories = UNICODE_CATEGORIES.map((category) => ({
    ...category,
    emojis: category.emojis.filter(
      (emoji) =>
        emoji.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emoji.char.includes(searchQuery)
    ),
  })).filter((category) => category.emojis.length > 0);

  const filteredCustomEmojis = customEmojisArray.filter(([shortcode]) =>
    shortcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Picker popup */}
      <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-gray-300 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('unicode')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'unicode'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Unicode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Custom ({customEmojisArray.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-64 p-3">
          {activeTab === 'unicode' && (
            <div className="space-y-4">
              {filteredUnicodeCategories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No emojis found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredUnicodeCategories.map((category) => (
                  <div key={category.name}>
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">{category.name}</h3>
                    <div className="grid grid-cols-8 gap-1">
                      {category.emojis.map((emoji) => (
                        <button
                          key={emoji.codepoint}
                          type="button"
                          onClick={() => handleSelectUnicodeEmoji(emoji.codepoint)}
                          disabled={addMutation.isPending}
                          className="flex items-center justify-center w-10 h-10 text-2xl rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={emoji.label}
                        >
                          {emoji.char}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div>
              {isLoadingCustom ? (
                <div className="text-center text-gray-500 py-8">Loading custom emojis...</div>
              ) : filteredCustomEmojis.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {searchQuery
                    ? `No custom emojis found for "${searchQuery}"`
                    : 'No custom emojis available'}
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-1">
                  {filteredCustomEmojis.map(([shortcode, metadata]) => (
                    <button
                      key={shortcode}
                      type="button"
                      onClick={() => handleSelectCustomEmoji(metadata.emojiURI)}
                      disabled={addMutation.isPending}
                      className="flex items-center justify-center w-10 h-10 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                      title={`:${shortcode}:`}
                    >
                      <img src={metadata.blobURI} alt={shortcode} className="max-h-8 w-auto" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {addMutation.isPending && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2">
            <div className="text-xs text-gray-600">Adding reaction...</div>
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
        aria-label="Close emoji picker"
      />
    </div>
  );
}
