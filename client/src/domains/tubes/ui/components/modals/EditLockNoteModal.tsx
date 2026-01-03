/**
 * EditLockNoteModal - Modal for editing lock notes on one or more tubes
 *
 * Allows the lock owner to update the lock note on locked tubes.
 * Supports batch editing - all selected tubes will receive the same note.
 *
 * @module tubes/ui/components/modals
 */

import { useState, useMemo } from 'react';

import { Pencil, AlertTriangle, Notebook } from 'lucide-react';

import { useBulkUpdateTubesMutation } from '@domains/tubes/hooks';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils/notifications';

import type { TubeData } from '@domains/tubes/types';

export interface EditLockNoteModalProps {
  /** Tubes to edit (must all be locked by current user) */
  tubes: TubeData[];
  /** Close handler */
  onClose: () => void;
  /** Optional callback after successful update */
  onSuccess?: () => void;
}

/**
 * EditLockNoteModal Component
 *
 * @example
 * ```tsx
 * <EditLockNoteModal
 *   tubes={selectedTubes}
 *   onClose={() => setShowEditModal(false)}
 *   onSuccess={() => refetchTubes()}
 * />
 * ```
 */
export function EditLockNoteModal({ tubes, onClose, onSuccess }: EditLockNoteModalProps) {
  // Determine initial note value based on selected tubes
  const { initialNote, hasMixedNotes } = useMemo(() => {
    if (tubes.length === 0) {
      return { initialNote: '', hasMixedNotes: false };
    }

    const firstNote = tubes[0].lockNote ?? '';
    const allSame = tubes.every(t => (t.lockNote ?? '') === firstNote);

    return {
      initialNote: allSame ? firstNote : '',
      hasMixedNotes: !allSame,
    };
  }, [tubes]);

  const [lockNote, setLockNote] = useState(initialNote);
  const bulkUpdateMutation = useBulkUpdateTubesMutation();

  const tubeIds = useMemo(() => tubes.map(t => t.id), [tubes]);
  const tubeCount = tubes.length;
  const isSingleTube = tubeCount === 1;

  const handleSave = async () => {
    try {
      await bulkUpdateMutation.mutateAsync({
        tubeIds,
        updates: {
          lockNote: lockNote.trim() || undefined,
        },
      });

      const message = isSingleTube
        ? 'Lock note updated'
        : `Lock note updated on ${tubeCount} tubes`;
      notifications.success(message);
      onSuccess?.();
      onClose();
    } catch {
      notifications.error('Failed to update lock note');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !bulkUpdateMutation.isPending) {
      e.preventDefault();
      void handleSave();
    }
  };

  // Check if note changed from initial value
  // For mixed notes, initialNote is empty so user must type something
  const hasChanges = lockNote.trim() !== initialNote;

  const buttonLabel = bulkUpdateMutation.isPending
    ? 'Saving...'
    : isSingleTube
      ? 'Save'
      : `Update ${tubeCount} Tubes`;

  const title = isSingleTube ? 'Edit Lock Note' : `Edit Lock Note (${tubeCount} tubes)`;

  return (
    <BaseModal title={title} icon={<Pencil size={24} />} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        {/* Mixed notes warning */}
        {hasMixedNotes && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border-l-4 border-l-amber-500 rounded-lg shadow-sm px-3 py-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <p>Saving will overwrite existing notes.</p>
          </div>
        )}

        {/* Lock Note Input */}
        <div>
          <label
            htmlFor="lockNote"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1"
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
            placeholder={
              hasMixedNotes ? 'Enter new note for all tubes...' : 'e.g., Project X - Donor 123'
            }
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action-focus focus:border-action-focus"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">Provides context for the lock.</p>
            <p className="text-xs text-gray-500">{lockNote.length}/100</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={bulkUpdateMutation.isPending || !hasChanges}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Pencil size={16} />
            {buttonLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
