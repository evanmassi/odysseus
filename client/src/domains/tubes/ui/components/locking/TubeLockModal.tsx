/**
 * LockTubesModal - Modal for locking tubes with optional note
 *
 * Simple modal that allows users to:
 * - Lock selected tubes
 * - Add an optional note explaining the lock
 *
 * @module tubes/ui/components/modals
 */

import { useEffect, useState } from 'react';

import { Lock, Notebook } from 'lucide-react';

import { useLockTubesMutation } from '@domains/tubes/hooks';
import { AlertBanner, Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils/notifications';

export interface TubeLockModalProps {
  /** Whether modal is open - controls visibility with exit animation */
  isOpen?: boolean;
  /** IDs of tubes to lock */
  tubeIds: string[];
  /** Close handler */
  onClose: () => void;
  /** Optional callback after successful lock */
  onSuccess?: () => void;
}

/**
 * LockTubesModal Component
 *
 * @example
 * ```tsx
 * <LockTubesModal
 *   tubeIds={selectedTubeIds}
 *   onClose={() => setShowLockModal(false)}
 *   onSuccess={() => clearSelection()}
 * />
 * ```
 */
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
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Lock Note Input */}
        <div>
          <label
            htmlFor="lockNote"
            className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground mb-1"
          >
            <Notebook className="w-4 h-4" />
            Lock Note (optional)
          </label>
          <div className="relative">
            <Input
              id="lockNote"
              type="text"
              value={lockNote}
              onValueChange={setLockNote}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Project X - Donor 123"
              maxLength={100}
              fullWidth
              inputClassName="pr-12"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 pointer-events-none">
              {lockNote.length}/100
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Provides context for the lock.</p>
        </div>

        {/* Info text */}
        <AlertBanner variant="info" spacing="none" className="text-xs">
          Locking prevents other users from editing or moving these tubes. You can unlock or share
          access anytime.
        </AlertBanner>

        {/* Actions */}
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
