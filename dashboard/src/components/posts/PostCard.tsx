import { useState } from 'react';
import { Post } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
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
import { Image, EyeOff } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date';

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
    } catch (error) {
      console.error('Failed to hide post:', error);
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <>
      <Card data-testid="post-card">
        <CardContent className="pt-6">
          <div className="space-y-3">
            {/* Header: Author and timestamp */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">{post.authorDid}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>

            {/* Post text */}
            <p className="whitespace-pre-wrap">{post.text}</p>

            {/* Indicators */}
            <div className="flex items-center gap-2">
              {post.hasMedia && (
                <Badge variant="outline" data-testid="media-indicator">
                  <Image className="mr-1 h-3 w-3" />
                  Media
                </Badge>
              )}
              {post.moderationStatus === 'hidden' && (
                <Badge variant="destructive">
                  <EyeOff className="mr-1 h-3 w-3" />
                  Hidden
                </Badge>
              )}
            </div>

            {/* Moderation actions */}
            {canModerate && post.moderationStatus !== 'hidden' && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleHideClick}
                >
                  Hide
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will hide this post from the feed. You can unhide it later from the
              moderation log.
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
