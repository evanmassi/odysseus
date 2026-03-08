/**
 * Tube Lock Note Modal
 *
 * Edits the lock note on one or more tubes owned by the current user.
 */

import { useState, useMemo, useEffect, useRef } from 'react';

import { Pencil, Notebook } from 'lucide-react';

import { useBulkUpdateTubesMutation } from '@domains/tubes/hooks';
import { AlertBanner, Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils/notifications';

import type { TubeData } from '@domains/tubes/types';

export interface TubeLockNoteModalProps {
  isOpen?: boolean;
  /** Must all be locked by current user */
  tubes: TubeData[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function TubeLockNoteModal({
  isOpen = true,
  tubes,
  onClose,
  onSuccess,
}: TubeLockNoteModalProps) {
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
  const prevIsOpenRef = useRef(isOpen);

  // Prevents stale data from previous interactions
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Modal just opened - reset form to current initial value
      setLockNote(initialNote);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialNote]);

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

  // For mixed notes, initialNote is empty so user must type something
  const hasChanges = lockNote.trim() !== initialNote;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hasChanges && !bulkUpdateMutation.isPending) {
      e.preventDefault();
      void handleSave();
    }
  };

  const title = isSingleTube ? 'Edit Lock Note' : `Edit Lock Note (${tubeCount} tubes)`;

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      icon={<Pencil size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-4">
        {hasMixedNotes && (
          <AlertBanner variant="warning" spacing="none">
            Saving will overwrite existing notes.
          </AlertBanner>
        )}

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
              placeholder={
                hasMixedNotes ? 'Enter new note for all tubes...' : 'e.g., Project X - Donor 123'
              }
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

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
            isLoading={bulkUpdateMutation.isPending}
            loadingText="Saving..."
            leftIcon={<Pencil size={16} />}
          >
            {isSingleTube ? 'Save' : `Update ${tubeCount} Tubes`}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
