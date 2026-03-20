/**
 * Collection History Timeline
 *
 * Chronological list of sample collection events with admin add/edit/delete.
 */

import { useState } from 'react';

import { Pencil, Plus, Trash2 } from 'lucide-react';

import {
  useAddCollectionHistoryMutation,
  useUpdateCollectionHistoryMutation,
  useDeleteCollectionHistoryMutation,
} from '@domains/donors/hooks/useDonorMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, DatePicker, Select, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import type { DonorCollectionHistory } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface CollectionHistoryTimelineProps {
  history: DonorCollectionHistory[];
  donorId: string;
  isAdmin: boolean;
  onHistoryChange: () => void;
}

export function CollectionHistoryTimeline({
  history,
  donorId,
  isAdmin,
  onHistoryChange,
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

  const specimenTypeOptions: SelectOption[] = [
    { value: '', label: 'Select specimen type...' },
    ...specimenTypeValues.map(v => ({ value: v.value, label: v.value })),
  ];

  const sourceOptions: SelectOption[] = [
    { value: '', label: 'Select source...' },
    ...sourceValues.map(v => ({ value: v.value, label: v.value })),
  ];

  const addMutation = useAddCollectionHistoryMutation();
  const updateMutation = useUpdateCollectionHistoryMutation();
  const deleteMutation = useDeleteCollectionHistoryMutation();

  const hasAnyField = !!(newDate || newSpecimenType || newSource);

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
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewDate('');
          setNewSpecimenType('');
          setNewSource('');
          onHistoryChange();
        },
      }
    );
  };

  const handleDelete = (historyId: string) => setPendingDeleteId(historyId);

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteMutation.mutate(pendingDeleteId, {
      onSuccess: () => {
        setPendingDeleteId(null);
        onHistoryChange();
      },
    });
  };

  const handleEditStart = (entry: DonorCollectionHistory) => {
    setEditingId(entry.id);
    setEditDate(
      entry.collectionDate ? new Date(entry.collectionDate).toISOString().split('T')[0] : ''
    );
    setEditSpecimenType(entry.specimenType ?? '');
    setEditSource(entry.source ?? '');
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const entry = history.find(e => e.id === editingId);
    if (!entry) return;

    const originalDate = entry.collectionDate
      ? new Date(entry.collectionDate).toISOString().split('T')[0]
      : '';
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
          onHistoryChange();
        },
      }
    );
  };

  const handleEditCancel = () => setEditingId(null);

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-2 pl-1">
      {isAdding && (
        <div className="space-y-2 p-2 rounded-md bg-muted/30 border border-border/50">
          <DatePicker value={newDate} onChange={setNewDate} size="sm" />
          <Select
            options={specimenTypeOptions}
            value={newSpecimenType}
            onChange={v => setNewSpecimenType(String(v ?? ''))}
            fullWidth
            placeholder="Specimen type..."
          />
          <Select
            options={sourceOptions}
            value={newSource}
            onChange={v => setNewSource(String(v ?? ''))}
            fullWidth
            placeholder="Source..."
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="primary"
              onClick={handleAdd}
              disabled={!hasAnyField || addMutation.isPending}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {history.length === 0 && !isAdding ? (
        <p className="text-card-foreground/30 text-sm italic">No collection history</p>
      ) : (
        <div className="space-y-1.5">
          {history.map(entry =>
            editingId === entry.id ? (
              <div
                key={entry.id}
                className="space-y-2 p-2 rounded-md bg-muted/30 border border-border/50"
              >
                <DatePicker value={editDate} onChange={setEditDate} size="sm" />
                <Select
                  options={specimenTypeOptions}
                  value={editSpecimenType}
                  onChange={v => setEditSpecimenType(String(v ?? ''))}
                  fullWidth
                  placeholder="Specimen type..."
                />
                <Select
                  options={sourceOptions}
                  value={editSource}
                  onChange={v => setEditSource(String(v ?? ''))}
                  fullWidth
                  placeholder="Source..."
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleEditSave}
                    disabled={updateMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div key={entry.id} className="flex items-center gap-2 text-sm group">
                {entry.collectionDate && (
                  <span className="text-card-foreground/60 whitespace-nowrap">
                    {formatDate(entry.collectionDate)}
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
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete entry" side="left">
                      <Button
                        variant="ghost-danger"
                        size="xs"
                        iconOnly
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Tooltip>
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
          title="Delete Entry"
          message="Are you sure you want to delete this collection history entry? This action cannot be undone."
          confirmText="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
