import { EyeOff } from 'lucide-react';
import { useState } from 'react';
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
import type { Post } from '@/types';

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

            {/* Post text */}
            <p className="text-sm whitespace-pre-wrap break-words mb-3">{post.text}</p>

            {/* Post image */}
            {post.hasMedia && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-border">
                <img src={getPostImageUrl(post.uri)} alt="Post media" className="w-full" />
              </div>
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
