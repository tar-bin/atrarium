import { useState } from 'react';
import type { ModerationStatus } from '@/types';
import type { ModerationReason } from '@/lib/moderation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EyeOff, Eye, Ban } from 'lucide-react';
import { ModerationReasonSelect } from './ModerationReasonSelect';

interface ModerationActionsProps {
  targetType: 'post' | 'user';
  currentStatus?: ModerationStatus;
  onHide?: (reason?: ModerationReason) => Promise<void>;
  onUnhide?: (reason?: ModerationReason) => Promise<void>;
  onBlockUser?: (reason?: ModerationReason) => Promise<void>;
}

export function ModerationActions({
  targetType,
  currentStatus,
  onHide,
  onUnhide,
  onBlockUser,
}: ModerationActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'hide' | 'unhide' | 'block' | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reason, setReason] = useState<ModerationReason | undefined>();

  const handleActionClick = (action: 'hide' | 'unhide' | 'block') => {
    setPendingAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);

      if (pendingAction === 'hide' && onHide) {
        await onHide(reason);
      } else if (pendingAction === 'unhide' && onUnhide) {
        await onUnhide(reason);
      } else if (pendingAction === 'block' && onBlockUser) {
        await onBlockUser(reason);
      }

      setShowConfirmDialog(false);
      setPendingAction(null);
      setReason(undefined); // Reset reason after action
    } catch (error) {
      console.error('Moderation action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDialogContent = () => {
    switch (pendingAction) {
      case 'hide':
        return {
          title: 'Hide Post?',
          description: 'This will hide the post from the feed. You can unhide it later.',
          confirmLabel: 'Yes, Hide',
        };
      case 'unhide':
        return {
          title: 'Unhide Post?',
          description: 'This will make the post visible in the feed again.',
          confirmLabel: 'Yes, Unhide',
        };
      case 'block':
        return {
          title: 'Block User?',
          description: 'This will block the user from posting to this feed.',
          confirmLabel: 'Yes, Block User',
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Are you sure?',
          confirmLabel: 'Confirm',
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <>
      <div className="flex gap-2">
        {targetType === 'post' && currentStatus === 'approved' && onHide && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleActionClick('hide')}
          >
            <EyeOff className="mr-1 h-4 w-4" />
            Hide
          </Button>
        )}

        {targetType === 'post' && currentStatus === 'hidden' && onUnhide && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleActionClick('unhide')}
          >
            <Eye className="mr-1 h-4 w-4" />
            Unhide
          </Button>
        )}

        {targetType === 'user' && onBlockUser && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleActionClick('block')}
          >
            <Ban className="mr-1 h-4 w-4" />
            Block User
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
            <ModerationReasonSelect value={reason} onChange={setReason} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === 'block' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : dialogContent.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
