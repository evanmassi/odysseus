import { useState, useMemo, useEffect, useRef } from 'react';

import { SquarePen } from 'lucide-react';

import { useBulkUpdateTubesMutation } from '@domains/tubes/hooks';
import { AlertBanner, Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import { LockNoteField } from './LockNoteField';

import type { TubeData } from '@domains/tubes/types';

// PITFALL: callers must pass only tubes locked by the current user.
export interface TubeLockNoteModalProps {
  isOpen?: boolean;
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

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setLockNote(initialNote);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialNote]);

  const tubeIds = useMemo(() => tubes.map(t => t.id), [tubes]);
  const tubeCount = tubes.length;
  const isSingleTube = tubeCount === 1;

  const handleSave = () => {
    bulkUpdateMutation.mutate(
      { tubeIds, updates: { lockNote: lockNote.trim() || undefined } },
      {
        onSuccess: () => {
          const message = isSingleTube
            ? 'Lock note updated'
            : `Lock note updated on ${tubeCount} tubes`;
          notifications.success(message);
          onSuccess?.();
          onClose();
        },
      }
    );
  };

  // PITFALL: with mixed notes initialNote is empty, so saving requires typing a new note.
  const hasChanges = lockNote.trim() !== initialNote;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hasChanges && !bulkUpdateMutation.isPending) {
      e.preventDefault();
      handleSave();
    }
  };

  const title = isSingleTube ? 'Edit Lock Note' : `Edit Lock Note (${tubeCount} tubes)`;

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      icon={<SquarePen size={24} />}
      onClose={onClose}
      size="sm"
    >
      <div className="space-y-4">
        {hasMixedNotes && (
          <AlertBanner variant="warning" spacing="none">
            Saving will overwrite existing notes.
          </AlertBanner>
        )}

        <LockNoteField
          value={lockNote}
          onValueChange={setLockNote}
          onKeyDown={handleKeyDown}
          placeholder={hasMixedNotes ? 'Enter new note for all tubes...' : undefined}
        />

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
            leftIcon={<SquarePen size={16} />}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
