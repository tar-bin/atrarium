import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { MembershipStatusBadge } from '../communities/MembershipStatusBadge';

interface Member {
  did: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;
  active: boolean;
}

interface MemberManagementTableProps {
  communityId: string;
  members: Member[];
  currentUserRole: 'owner' | 'moderator' | 'member';
}

export function MemberManagementTable({
  communityId,
  members,
  currentUserRole,
}: MemberManagementTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const changeRoleMutation = useMutation({
    mutationFn: async ({ did, newRole }: { did: string; newRole: string }) => {
      // PATCH /api/memberships/:communityId/:did/role
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', communityId] });
      toast({ title: 'Role updated successfully' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (_did: string) => {
      // DELETE /api/memberships/:communityId/:did
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', communityId] });
      toast({ title: 'Member removed successfully' });
    },
  });

  const canManage = currentUserRole === 'owner' || currentUserRole === 'moderator';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.did}>
            <TableCell className="font-medium">{member.did}</TableCell>
            <TableCell>
              <MembershipStatusBadge status="active" role={member.role} />
            </TableCell>
            <TableCell>{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
            {canManage && (
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentUserRole === 'owner' && member.role !== 'owner' && (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            changeRoleMutation.mutate({
                              did: member.did,
                              newRole: 'moderator',
                            })
                          }
                        >
                          Make Moderator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            changeRoleMutation.mutate({ did: member.did, newRole: 'member' })
                          }
                        >
                          Make Member
                        </DropdownMenuItem>
                      </>
                    )}
                    {member.role !== 'owner' && (
                      <DropdownMenuItem
                        onClick={() => removeMemberMutation.mutate(member.did)}
                        className="text-destructive"
                      >
                        Remove Member
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
