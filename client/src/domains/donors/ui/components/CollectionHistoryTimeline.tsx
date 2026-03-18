/**
 * Collection History Timeline
 *
 * Chronological list of sample collection events with admin add/delete.
 */

import { useState } from 'react';

import { Plus, X } from 'lucide-react';

import {
  useAddCollectionHistoryMutation,
  useDeleteCollectionHistoryMutation,
} from '@domains/donors/hooks/useDonorMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, DatePicker, Select } from '@shared/ui';

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

  const handleDelete = (historyId: string) => {
    deleteMutation.mutate(historyId, { onSuccess: onHistoryChange });
  };

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
          {history.map(entry => (
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
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-muted-foreground/40 hover:text-danger-text"
                  title="Delete entry"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
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
    </div>
  );
}
