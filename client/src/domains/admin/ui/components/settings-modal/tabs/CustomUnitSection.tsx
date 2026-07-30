/**
 * Custom Unit Section
 *
 * The pane behind the Custom Units leaf: the lab's supplement to the fixed unit registry,
 * for the tail the registry doesn't enumerate. A unit's dimension decides which fields offer it.
 */

import { useState } from 'react';

import { Select } from '@shared/ui/primitives';
import { CUSTOM_UNIT_KIND_OPTIONS, unitKindLabel } from '@shared/utils/unitOptions';

import { CatalogEntryTable, type CatalogEntry } from './CatalogEntryTable';

import type { UnitKindValue } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui';

export interface CustomUnitEntry extends CatalogEntry {
  kind: UnitKindValue;
}

interface CustomUnitSectionProps {
  entries: CustomUnitEntry[];
  loading?: boolean;
  onAdd: (label: string, kind: UnitKindValue) => Promise<void>;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string, label: string) => void;
  deletingId?: string | null;
  readOnly?: boolean;
}

export function CustomUnitSection({
  entries,
  loading = false,
  onAdd,
  onRename,
  onDelete,
  deletingId,
  readOnly = false,
}: CustomUnitSectionProps) {
  const [kind, setKind] = useState<UnitKindValue | ''>('');

  const kindColumn: TableColumn<CustomUnitEntry> = {
    id: 'kind',
    header: 'Measures',
    width: 180,
    render: (_, item) => (
      <span className="font-display text-body-sm text-muted-foreground">
        {unitKindLabel(item.kind)}
      </span>
    ),
  };

  const handleAdd = async (label: string) => {
    if (!kind) return;
    await onAdd(label, kind);
    setKind('');
  };

  return (
    <CatalogEntryTable
      entries={entries}
      labels={{
        singular: 'unit',
        plural: 'custom units',
        usageHeader: 'Items',
        usageSingular: 'item',
        usagePlural: 'items',
      }}
      ariaLabel="Custom units"
      loading={loading}
      onAdd={handleAdd}
      onRename={onRename}
      onDelete={onDelete}
      deletingId={deletingId}
      readOnly={readOnly}
      extraColumns={[kindColumn]}
      addDisabled={!kind}
      addSlot={
        <div className="w-52 flex-shrink-0">
          <Select
            options={CUSTOM_UNIT_KIND_OPTIONS}
            value={kind}
            onChange={value => setKind((String(value ?? '') || '') as UnitKindValue | '')}
            placeholder="What it measures..."
            size="sm"
            fullWidth
            aria-label="What the unit measures"
          />
        </div>
      }
      toolbarNote="rendered verbatim · never converted"
    />
  );
}
