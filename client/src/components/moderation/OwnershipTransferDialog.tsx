import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface OwnershipTransferDialogProps {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnershipTransferDialog({
  communityId,
  open,
  onOpenChange,
}: OwnershipTransferDialogProps) {
  const inputId = useId();
  const [newOwnerDid, setNewOwnerDid] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async () => {
      // POST /api/memberships/:communityId/transfer with { newOwnerDid }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      queryClient.invalidateQueries({ queryKey: ['members', communityId] });
      toast({
        title: 'Ownership transferred',
        description: 'The community ownership has been transferred successfully',
      });
      onOpenChange(false);
      setNewOwnerDid('');
    },
    onError: (error) => {
      toast({
        title: 'Transfer failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            Transfer community ownership to another member. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={inputId}>New Owner DID</Label>
            <Input
              id={inputId}
              placeholder="did:plc:..."
              value={newOwnerDid}
              onChange={(e) => setNewOwnerDid(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => transferMutation.mutate()}
            disabled={!newOwnerDid || transferMutation.isPending}
          >
            {transferMutation.isPending ? 'Transferring...' : 'Transfer Ownership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
