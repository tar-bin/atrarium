import { Feed } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { stripHashtag } from '@/lib/hashtag';
import { Copy, Hash, TrendingUp, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedCardProps {
  feed: Feed;
  onClick: () => void;
}

export function FeedCard({ feed, onClick }: FeedCardProps) {
  const { toast } = useToast();

  const handleCopyHashtag = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    try {
      const plainHashtag = stripHashtag(feed.hashtag);
      await navigator.clipboard.writeText(plainHashtag);
      toast({
        title: 'Copied!',
        description: 'Hashtag copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy hashtag to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle
            role="button"
            aria-label={feed.name}
            className="cursor-pointer text-lg"
            onClick={onClick}
          >
            {feed.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Hashtag with copy button */}
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <code className="flex-1 text-sm font-mono">{feed.hashtag}</code>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyHashtag}
            aria-label="Copy hashtag"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{feed.posts7d} posts (7d)</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{feed.activeUsers7d} users (7d)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
