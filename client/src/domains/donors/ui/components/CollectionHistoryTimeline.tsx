/**
 * Collection History Timeline
 *
 * Chronological list of sample collection events with admin add/edit/delete.
 */

import { useState } from 'react';

import { Plus, SquarePen, Trash2 } from 'lucide-react';

import {
  useAddCollectionHistoryMutation,
  useUpdateCollectionHistoryMutation,
  useDeleteCollectionHistoryMutation,
} from '@domains/donors/hooks/useDonorMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, lookupOptions, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { CollectionHistoryEntryForm } from './CollectionHistoryEntryForm';

import type { DonorCollectionHistory } from '@odysseus/shared-schemas';

interface CollectionHistoryTimelineProps {
  history: DonorCollectionHistory[];
  donorId: string;
  isAdmin: boolean;
  /** Entries inherit protection from the donor, which owns them. */
  isDeleteLocked: boolean;
}

export function CollectionHistoryTimeline({
  history,
  donorId,
  isAdmin,
  isDeleteLocked,
}: CollectionHistoryTimelineProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSpecimenType, setNewSpecimenType] = useState('');
  const [newSource, setNewSource] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSpecimenType, setEditSpecimenType] = useState('');
  const [editSource, setEditSource] = useState('');

  const { data: specimenTypeValues = [] } = useLookupValuesQuery('specimen_type');
  const { data: sourceValues = [] } = useLookupValuesQuery('source');

  const specimenTypeOptions = lookupOptions(specimenTypeValues, 'Select specimen type...');
  const sourceOptions = lookupOptions(sourceValues, 'Select source...');

  const addMutation = useAddCollectionHistoryMutation();
  const updateMutation = useUpdateCollectionHistoryMutation();
  const deleteMutation = useDeleteCollectionHistoryMutation();

  const hasAnyField = !!(newDate || newSpecimenType || newSource);

  const resetAddForm = () => {
    setIsAdding(false);
    setNewDate('');
    setNewSpecimenType('');
    setNewSource('');
  };

  const handleAdd = () => {
    if (!hasAnyField) return;

    addMutation.mutate(
      {
        donorId,
        data: {
          collectionDate: newDate || undefined,
          specimenType: newSpecimenType || undefined,
          source: newSource || undefined,
        },
      },
      { onSuccess: resetAddForm }
    );
  };

  const handleDelete = (historyId: string) => setPendingDeleteId(historyId);

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteMutation.mutate(pendingDeleteId, {
      onSuccess: () => {
        setPendingDeleteId(null);
      },
    });
  };

  const handleEditStart = (entry: DonorCollectionHistory) => {
    setEditingId(entry.id);
    setEditDate(entry.collectionDate ?? '');
    setEditSpecimenType(entry.specimenType ?? '');
    setEditSource(entry.source ?? '');
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const entry = history.find(e => e.id === editingId);
    if (!entry) return;

    const originalDate = entry.collectionDate ?? '';
    const dateChanged = editDate !== originalDate;
    const specimenChanged = editSpecimenType !== (entry.specimenType ?? '');
    const sourceChanged = editSource !== (entry.source ?? '');

    if (!dateChanged && !specimenChanged && !sourceChanged) {
      setEditingId(null);
      return;
    }

    const data = {
      ...(dateChanged ? { collectionDate: editDate || null } : {}),
      ...(specimenChanged ? { specimenType: editSpecimenType || null } : {}),
      ...(sourceChanged ? { source: editSource || null } : {}),
    };

    updateMutation.mutate(
      { historyId: editingId, data },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      }
    );
  };

  const handleEditCancel = () => setEditingId(null);

  return (
    <div className="space-y-2 pl-1">
      {isAdding && (
        <CollectionHistoryEntryForm
          date={newDate}
          specimenType={newSpecimenType}
          source={newSource}
          specimenTypeOptions={specimenTypeOptions}
          sourceOptions={sourceOptions}
          onDateChange={setNewDate}
          onSpecimenTypeChange={setNewSpecimenType}
          onSourceChange={setNewSource}
          onSave={handleAdd}
          onCancel={resetAddForm}
          saveDisabled={!hasAnyField}
          isPending={addMutation.isPending}
        />
      )}

      {history.length === 0 && !isAdding ? (
        <p className="text-card-foreground/30 text-body-sm italic">No collection history</p>
      ) : (
        <div className="space-y-1.5">
          {history.map(entry =>
            editingId === entry.id ? (
              <CollectionHistoryEntryForm
                key={entry.id}
                date={editDate}
                specimenType={editSpecimenType}
                source={editSource}
                specimenTypeOptions={specimenTypeOptions}
                sourceOptions={sourceOptions}
                onDateChange={setEditDate}
                onSpecimenTypeChange={setEditSpecimenType}
                onSourceChange={setEditSource}
                onSave={handleEditSave}
                onCancel={handleEditCancel}
                isPending={updateMutation.isPending}
              />
            ) : (
              <div
                key={entry.id}
                className="group flex items-center gap-2 text-body-sm font-medium"
              >
                {entry.collectionDate && (
                  <span className="text-card-foreground/60 whitespace-nowrap">
                    {formatDateForDisplay(entry.collectionDate)}
                  </span>
                )}
                {entry.specimenType && (
                  <>
                    {entry.collectionDate && <span className="text-card-foreground/30">·</span>}
                    <span className="text-card-foreground">{entry.specimenType}</span>
                  </>
                )}
                {entry.source && (
                  <>
                    {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: separator shown when either preceding field exists */}
                    {(entry.collectionDate || entry.specimenType) && (
                      <span className="text-card-foreground/30">·</span>
                    )}
                    <span className="text-card-foreground/60">{entry.source}</span>
                  </>
                )}
                {isAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex gap-0.5">
                    <Tooltip content="Edit entry" side="left">
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        onClick={() => handleEditStart(entry)}
                        aria-label="Edit entry"
                      >
                        <SquarePen className="w-3 h-3" />
                      </Button>
                    </Tooltip>
                    {!isDeleteLocked && (
                      <Tooltip content="Remove entry" side="left">
                        <Button
                          variant="ghost-danger"
                          size="xs"
                          iconOnly
                          onClick={() => handleDelete(entry.id)}
                          aria-label="Remove entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {isAdmin && !isAdding && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          leftIcon={<Plus className="w-3 h-3" />}
        >
          Add entry
        </Button>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title="Remove Entry"
          message="Are you sure you want to remove this collection history entry? This action cannot be undone."
          confirmText="Remove"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
