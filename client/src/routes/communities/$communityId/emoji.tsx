import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { EmojiApprovalList } from '@/components/emoji/EmojiApprovalList';
import { EmojiUploadForm } from '@/components/emoji/EmojiUploadForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listPendingEmojis } from '@/lib/api';
import { useCommunity, useMyMemberships } from '@/lib/hooks';

// biome-ignore lint/suspicious/noExplicitAny: TanStack Router type generation requires dev server
export const Route = createFileRoute('/communities/$communityId/emoji' as any)({
  component: EmojiManagementPage,
});

interface Membership {
  communityId: string;
  role: 'owner' | 'moderator' | 'member';
  status: 'active' | 'pending';
}

interface Community {
  id: string;
  name: string;
  description?: string;
}

function EmojiManagementPage() {
  const { communityId } = Route.useParams();
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);
  const { data: memberships, isLoading: membershipsLoading } = useMyMemberships();
  const queryClient = useQueryClient();
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Fetch pending emoji submissions
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['emoji', 'pending', communityId],
    queryFn: async () => {
      const result = await listPendingEmojis(communityId);
      // Transform to expected format
      return {
        submissions: result.submissions.map((emoji) => ({
          emojiUri: emoji.emojiUri,
          shortcode: emoji.shortcode,
          creator: emoji.creator,
          creatorHandle: emoji.creatorHandle || '',
          uploadedAt: emoji.uploadedAt,
          format: emoji.format,
          animated: emoji.animated,
          blobUrl: emoji.blobUrl,
        })),
      };
    },
  });

  if (communityLoading || membershipsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if user is owner or moderator
  const userMembership = (memberships as Membership[] | undefined)?.find(
    (m) => m.communityId === communityId
  );
  const userRole = userMembership?.role || 'member';
  const isOwnerOrModerator = userRole === 'owner' || userRole === 'moderator';

  if (!isOwnerOrModerator) {
    return <Navigate to="/communities/$communityId" params={{ communityId }} />;
  }

  const handleUploadSuccess = (emojiURI: string) => {
    setUploadSuccess(`Emoji uploaded successfully: ${emojiURI}`);
    setTimeout(() => setUploadSuccess(null), 3000);
  };

  const handleApprovalChange = () => {
    // Invalidate pending emoji query to refresh list
    queryClient.invalidateQueries({ queryKey: ['emoji', 'pending', communityId] });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {(community as Community | undefined)?.name} - Custom Emoji
        </h1>
        <p className="text-muted-foreground">Upload and manage custom emoji for this community</p>
      </div>

      {uploadSuccess && (
        <div className="mb-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-4 py-2 rounded-md">
          {uploadSuccess}
        </div>
      )}

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Emoji</TabsTrigger>
          <TabsTrigger value="approvals">
            Pending Approvals
            {pendingData?.submissions && pendingData.submissions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {pendingData.submissions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-xl font-semibold">Upload Custom Emoji</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Upload a custom emoji for use in this community. Emoji must be approved before they
              can be used in posts.
            </p>
            <EmojiUploadForm
              onSuccess={handleUploadSuccess}
              onError={() => {
                // Error handling managed by form component
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-xl font-semibold">Pending Emoji Approvals</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Review and approve or reject emoji submissions from community members.
            </p>

            {pendingLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
            ) : (
              <EmojiApprovalList
                communityId={communityId}
                submissions={pendingData?.submissions || []}
                onApprovalChange={handleApprovalChange}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
