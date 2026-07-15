/**
 * Tube Lock Modal
 *
 * Locks selected tubes with an optional note explaining the lock.
 */

import { useEffect, useState } from 'react';

import { Lock } from 'lucide-react';

import { useLockTubesMutation } from '@domains/tubes/hooks';
import { AlertBanner, Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import { LockNoteField } from './LockNoteField';

export interface TubeLockModalProps {
  isOpen?: boolean;
  tubeIds: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function TubeLockModal({ isOpen = true, tubeIds, onClose, onSuccess }: TubeLockModalProps) {
  const [lockNote, setLockNote] = useState('');
  const lockMutation = useLockTubesMutation();

  // Reset note when modal opens (component stays mounted, only isOpen changes)
  useEffect(() => {
    if (isOpen) {
      setLockNote('');
    }
  }, [isOpen]);

  const handleLock = async () => {
    try {
      const result = await lockMutation.mutateAsync({
        tubeIds,
        lockNote: lockNote.trim() || undefined,
      });

      const lockedCount = result.locked.length;
      const skippedCount = result.skipped.length;

      if (lockedCount > 0 && skippedCount === 0) {
        notifications.success(`Locked ${lockedCount} tube${lockedCount !== 1 ? 's' : ''}`);
      } else if (lockedCount > 0 && skippedCount > 0) {
        notifications.success(
          `Locked ${lockedCount} tube${lockedCount !== 1 ? 's' : ''}. ${skippedCount} skipped.`
        );
      } else {
        notifications.warning('No tubes were locked');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      notifications.error('Failed to lock tubes');
    }
  };

  const tubeCount = tubeIds.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !lockMutation.isPending) {
      e.preventDefault();
      void handleLock();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={`Lock ${tubeCount} Tube${tubeCount !== 1 ? 's' : ''}`}
      icon={<Lock size={24} />}
      onClose={onClose}
      size="sm"
    >
      <div className="space-y-4">
        <LockNoteField value={lockNote} onValueChange={setLockNote} onKeyDown={handleKeyDown} />

        <AlertBanner variant="info" spacing="none" className="text-caption">
          Locking prevents other users from editing or moving these tubes. You can unlock or share
          access anytime.
        </AlertBanner>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleLock}
            isLoading={lockMutation.isPending}
            loadingText="Locking..."
            leftIcon={<Lock size={16} />}
          >
            Lock {tubeCount} Tube{tubeCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
