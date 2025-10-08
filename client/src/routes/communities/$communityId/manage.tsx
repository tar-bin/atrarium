import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { CommunityStatsPanel } from '@/components/moderation/CommunityStatsPanel';
import { JoinRequestList } from '@/components/moderation/JoinRequestList';
import { MemberManagementTable } from '@/components/moderation/MemberManagementTable';
import { OwnershipTransferDialog } from '@/components/moderation/OwnershipTransferDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCommunity, useCommunityMembers, useMyMemberships } from '@/lib/hooks';

export const Route = createFileRoute('/communities/$communityId/manage')({
  component: CommunityManagementPage,
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
  accessType?: 'open' | 'invite-only';
}

function CommunityManagementPage() {
  const { communityId } = Route.useParams();
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);
  const { data: memberships, isLoading: membershipsLoading } = useMyMemberships();
  const { data: members = [] } = useCommunityMembers(communityId);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  if (communityLoading || membershipsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if user is admin (owner or moderator)
  const userMembership = (memberships as Membership[] | undefined)?.find(
    (m) => m.communityId === communityId
  );
  const userRole = userMembership?.role || 'member';
  const isAdmin = userRole === 'owner' || userRole === 'moderator';
  const isOwner = userRole === 'owner';

  if (!isAdmin) {
    return <Navigate to="/communities/$communityId" params={{ communityId }} />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {(community as Community | undefined)?.name} - Management
        </h1>
        <p className="text-muted-foreground">
          Manage members, join requests, and community settings
        </p>
      </div>

      {/* Community Stats */}
      <div className="mb-8">
        <CommunityStatsPanel communityId={communityId} />
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="requests">Join Requests</TabsTrigger>
          {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <MemberManagementTable
            communityId={communityId}
            members={members}
            currentUserRole={userRole}
          />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <JoinRequestList communityId={communityId} />
        </TabsContent>

        {isOwner && (
          <TabsContent value="settings" className="space-y-4">
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-xl font-semibold">Ownership Transfer</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Transfer ownership of this community to another member. This action cannot be
                undone.
              </p>
              <OwnershipTransferDialog
                communityId={communityId}
                open={transferDialogOpen}
                onOpenChange={setTransferDialogOpen}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
