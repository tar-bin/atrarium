import { EyeOff, Smile } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatRelativeTime } from '@/lib/date';
import { renderMarkdown } from '@/lib/markdown';
import type { Post } from '@/types';
import { ReactionBar } from '../reactions/ReactionBar';
import { ReactionPicker } from '../reactions/ReactionPicker';

// Helper function to get avatar from DID
function getAvatarUrl(did: string): string {
  const hash = did.split(':').pop()?.slice(0, 8) || 'default';
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${hash}`;
}

// Helper function to get dummy image for posts with media
function getPostImageUrl(uri: string): string {
  const hash = uri.split('/').pop()?.slice(0, 8) || 'default';
  return `https://picsum.photos/seed/${hash}/600/400`;
}

interface PostCardProps {
  post: Post;
  canModerate: boolean;
  onHide: (uri: string) => Promise<void>;
}

export function PostCard({ post, canModerate, onHide }: PostCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Render Markdown if available, otherwise plain text
  const renderedContent = useMemo(() => {
    if (post.markdown) {
      // TODO: Fetch emoji registry for community and pass to renderMarkdown
      // For now, render without emoji registry
      return renderMarkdown(post.markdown);
    }
    return null;
  }, [post.markdown]);

  const handleHideClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmHide = async () => {
    try {
      setIsHiding(true);
      await onHide(post.uri);
      setShowConfirmDialog(false);
    } catch (_error) {
      // Error handling by parent component
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <>
      <article
        data-testid="post-card"
        className="border-b border-border bg-card p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <img
            src={getAvatarUrl(post.authorDid)}
            alt="Avatar"
            className="h-10 w-10 rounded-full flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-sm truncate">
                @{post.authorDid.split(':').pop()?.slice(0, 12)}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>

            {/* Post text - Markdown or plain text */}
            {renderedContent ? (
              <div
                className="text-sm break-words mb-3 prose prose-sm dark:prose-invert max-w-none"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via DOMPurify in renderMarkdown
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words mb-3">{post.text}</p>
            )}

            {/* Post image */}
            {post.hasMedia && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-border">
                <img src={getPostImageUrl(post.uri)} alt="Post media" className="w-full" />
              </div>
            )}

            {/* Reactions */}
            {post.communityId && (
              <div className="mb-3 flex items-center gap-2">
                <ReactionBar postUri={post.uri} communityId={post.communityId} className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="h-8 w-8 p-0"
                  title="Add reaction"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Reaction Picker */}
            {showReactionPicker && (
              <ReactionPicker postUri={post.uri} onClose={() => setShowReactionPicker(false)} />
            )}

            {/* Indicators & Actions */}
            <div className="flex items-center justify-between">
              <div>
                {post.moderationStatus === 'hidden' && (
                  <Badge variant="destructive" className="text-xs">
                    <EyeOff className="mr-1 h-3 w-3" />
                    Hidden
                  </Badge>
                )}
              </div>

              {/* Moderation actions */}
              {canModerate && post.moderationStatus !== 'hidden' && (
                <Button size="sm" variant="ghost" onClick={handleHideClick} className="text-xs h-7">
                  Hide
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will hide this post from the feed. You can unhide it later from the moderation
              log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmHide} disabled={isHiding}>
              {isHiding ? 'Hiding...' : 'Yes, Hide Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
