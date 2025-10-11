// StageUpgradeButton Component (T035)
// Display upgrade button when Dunbar threshold met, with modal confirmation

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

interface StageUpgradeButtonProps {
  group: {
    id: string;
    name: string;
    stage: 'theme' | 'community' | 'graduated';
    memberCount: number;
  };
}

// Dunbar thresholds (from T012 validation)
const THEME_TO_COMMUNITY_THRESHOLD = 15;
const COMMUNITY_TO_GRADUATED_THRESHOLD = 50;

export function StageUpgradeButton({ group }: StageUpgradeButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine target stage and threshold
  const getUpgradeInfo = () => {
    switch (group.stage) {
      case 'theme':
        return {
          targetStage: 'community' as const,
          threshold: THEME_TO_COMMUNITY_THRESHOLD,
          canUpgrade: group.memberCount >= THEME_TO_COMMUNITY_THRESHOLD,
        };
      case 'community':
        return {
          targetStage: 'graduated' as const,
          threshold: COMMUNITY_TO_GRADUATED_THRESHOLD,
          canUpgrade: group.memberCount >= COMMUNITY_TO_GRADUATED_THRESHOLD,
        };
      case 'graduated':
        return null; // Already at max stage
      default:
        return null;
    }
  };

  const upgradeInfo = getUpgradeInfo();

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async (targetStage: 'community' | 'graduated') => {
      return apiClient.communities.upgradeStage({
        groupId: group.id,
        targetStage,
      });
    },
    onSuccess: (data) => {
      // Invalidate group queries
      queryClient.invalidateQueries({ queryKey: ['group', group.id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });

      toast({
        title: 'Stage upgraded',
        description: `${group.name} is now a ${data.stage}-stage group.`,
      });

      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Upgrade failed',
        description: error instanceof Error ? error.message : 'Failed to upgrade stage',
        variant: 'destructive',
      });
    },
  });

  if (!upgradeInfo) {
    return null; // No upgrade available for Graduated stage
  }

  const { targetStage, threshold, canUpgrade } = upgradeInfo;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={canUpgrade ? 'default' : 'outline'} disabled={!canUpgrade} size="sm">
          <ArrowUp className="h-4 w-4 mr-2" />
          {canUpgrade
            ? `Upgrade to ${targetStage}`
            : `Needs ${threshold - group.memberCount} more members`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Upgrade {group.name} to {targetStage}?
          </DialogTitle>
          <DialogDescription>
            This will upgrade your group from {group.stage} to {targetStage} stage.
            {targetStage === 'graduated' && (
              <> Graduated groups can create child themes and have independent moderation.</>
            )}
            {targetStage === 'community' && (
              <>
                {' '}
                Community-stage groups have independent moderation but cannot create child themes.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            <strong>Current status:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Stage: {group.stage}</li>
              <li>Members: {group.memberCount}</li>
              <li>Required: {threshold} members</li>
            </ul>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={upgradeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => upgradeMutation.mutate(targetStage)}
            disabled={upgradeMutation.isPending}
          >
            {upgradeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upgrading...
              </>
            ) : (
              <>Confirm Upgrade</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
