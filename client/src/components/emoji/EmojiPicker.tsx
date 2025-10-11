import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { listEmojis } from '@/lib/api';

interface EmojiMetadata {
  emojiURI: string;
  blobURI: string;
  animated: boolean;
}

interface EmojiPickerProps {
  communityId: string;
  onEmojiSelect: (shortcode: string) => void;
  trigger?: React.ReactNode;
}

export function EmojiPicker({ communityId, onEmojiSelect, trigger }: EmojiPickerProps) {
  const [emojiRegistry, setEmojiRegistry] = useState<Record<string, EmojiMetadata>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadEmojiRegistry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await listEmojis(communityId);

      // Convert array to registry object
      const registry: Record<string, EmojiMetadata> = {};
      for (const emoji of result.emojis) {
        registry[emoji.shortcode] = {
          emojiURI: '', // Not available in legacy API
          blobURI: emoji.imageUrl,
          animated: emoji.animated,
        };
      }
      setEmojiRegistry(registry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emoji');
    } finally {
      setIsLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    if (isOpen && Object.keys(emojiRegistry).length === 0) {
      loadEmojiRegistry();
    }
  }, [isOpen, emojiRegistry, loadEmojiRegistry]);

  const handleEmojiClick = (shortcode: string) => {
    onEmojiSelect(shortcode);
    setIsOpen(false);
  };

  const emojiEntries = Object.entries(emojiRegistry);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            😊 Emoji
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Custom Emoji</h4>

          {isLoading && (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading emoji...</div>
          )}

          {error && <div className="text-sm text-destructive py-2">{error}</div>}

          {!isLoading && !error && emojiEntries.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No custom emoji available
            </div>
          )}

          {!isLoading && !error && emojiEntries.length > 0 && (
            <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {emojiEntries.map(([shortcode, metadata]) => (
                <button
                  key={shortcode}
                  type="button"
                  onClick={() => handleEmojiClick(shortcode)}
                  className="p-2 hover:bg-accent rounded transition-colors group relative"
                  title={`:${shortcode}:`}
                >
                  <img src={metadata.blobURI} alt={shortcode} className="w-8 h-8 object-contain" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-popover border rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    :{shortcode}:
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
