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

import { Info, Lock, Notebook } from 'lucide-react';

import { useLockTubesMutation } from '@domains/tubes/hooks';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils/notifications';

export interface LockTubesModalProps {
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
export function LockTubesModal({
  isOpen = true,
  tubeIds,
  onClose,
  onSuccess,
}: LockTubesModalProps) {
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
  const buttonLabel = lockMutation.isPending
    ? 'Locking...'
    : `Lock ${tubeCount} Tube${tubeCount !== 1 ? 's' : ''}`;

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
          <input
            id="lockNote"
            type="text"
            value={lockNote}
            onChange={e => setLockNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Project X - Donor 123"
            maxLength={100}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-focus focus:border-action-focus"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-muted-foreground">Provides context for the lock.</p>
            <p className="text-xs text-muted-foreground">{lockNote.length}/100</p>
          </div>
        </div>

        {/* Info text */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted border-l-4 border-l-muted-foreground rounded-lg shadow-sm">
          <Info size={16} className="text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-secondary-foreground">
            Locking prevents other users from editing or moving these tubes. You can unlock or share
            access anytime.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLock}
            disabled={lockMutation.isPending}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Lock size={16} />
            {buttonLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
