/**
 * LockTubesModal - Modal for locking tubes with optional note
 *
 * Simple modal that allows users to:
 * - Lock selected tubes
 * - Add an optional note explaining the lock
 *
 * @module tubes/ui/components/modals
 */

import { useState } from 'react';

import { Lock } from 'lucide-react';

import { useLockTubesMutation } from '@domains/tubes/hooks';
import { notifications } from '@shared/utils/notifications';

import { BaseModal } from './BaseModal';

export interface LockTubesModalProps {
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
export function LockTubesModal({ tubeIds, onClose, onSuccess }: LockTubesModalProps) {
  const [lockNote, setLockNote] = useState('');
  const lockMutation = useLockTubesMutation();

  const handleLock = async () => {
    try {
      const result = await lockMutation.mutateAsync({
        tubeIds,
        lockNote: lockNote.trim() || undefined,
      });

      const lockedCount = result.locked.length;
      const skippedCount = result.skipped.length;

      if (lockedCount > 0 && skippedCount === 0) {
        notifications.lock(`Locked ${lockedCount} tube${lockedCount !== 1 ? 's' : ''}`);
      } else if (lockedCount > 0 && skippedCount > 0) {
        notifications.lock(
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

  return (
    <BaseModal
      title={`Lock ${tubeIds.length} Tube${tubeIds.length !== 1 ? 's' : ''}`}
      icon={<Lock size={24} className="text-white" />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Lock Note Input */}
        <div>
          <label htmlFor="lockNote" className="block text-sm font-medium text-gray-700 mb-1">
            Lock Note (optional)
          </label>
          <input
            id="lockNote"
            type="text"
            value={lockNote}
            onChange={e => setLockNote(e.target.value)}
            placeholder="e.g., Project X - Donor 123"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-action"
          />
          <p className="text-xs text-gray-500 mt-1">
            Add an optional note to help others understand why these tubes are locked.
          </p>
        </div>

        {/* Info text */}
        <p className="text-sm text-gray-600">
          Locking prevents other users from editing or moving these tubes. You can unlock them at
          any time or share access with specific users.
        </p>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLock}
            disabled={lockMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-action hover:bg-action-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {lockMutation.isPending ? 'Locking...' : 'Lock Tubes'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
