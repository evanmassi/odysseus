/**
 * Collection History Entry Form
 *
 * Inline editor for a single collection event, shared by the add and edit flows.
 */
import { Save } from 'lucide-react';

import { Button, DatePicker, Select } from '@shared/ui';

import type { SelectOption } from '@shared/ui/primitives/select/types';

const FIELD_LABEL =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground';

interface CollectionHistoryEntryFormProps {
  date: string;
  specimenType: string;
  source: string;
  specimenTypeOptions: SelectOption[];
  sourceOptions: SelectOption[];
  onDateChange: (value: string) => void;
  onSpecimenTypeChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
  isPending?: boolean;
}

export function CollectionHistoryEntryForm({
  date,
  specimenType,
  source,
  specimenTypeOptions,
  sourceOptions,
  onDateChange,
  onSpecimenTypeChange,
  onSourceChange,
  onSave,
  onCancel,
  saveDisabled = false,
  isPending = false,
}: CollectionHistoryEntryFormProps) {
  return (
    <div className="space-y-2.5 rounded-md border border-line-faint bg-shade/20 p-3">
      <div>
        <span className={FIELD_LABEL}>Date</span>
        <DatePicker
          value={date}
          onChange={onDateChange}
          size="sm"
          fullWidth
          aria-label="Collection date"
        />
      </div>
      <div>
        <span className={FIELD_LABEL}>Specimen Type</span>
        <Select
          options={specimenTypeOptions}
          value={specimenType}
          onChange={v => onSpecimenTypeChange(String(v ?? ''))}
          size="sm"
          fullWidth
          placeholder="Select specimen type…"
          aria-label="Specimen type"
        />
      </div>
      <div>
        <span className={FIELD_LABEL}>Source</span>
        <Select
          options={sourceOptions}
          value={source}
          onChange={v => onSourceChange(String(v ?? ''))}
          size="sm"
          fullWidth
          placeholder="Select source…"
          aria-label="Source"
        />
      </div>
      <div className="flex justify-end gap-1.5 pt-0.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onSave}
          disabled={saveDisabled || isPending}
          leftIcon={<Save className="h-3.5 w-3.5" />}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
