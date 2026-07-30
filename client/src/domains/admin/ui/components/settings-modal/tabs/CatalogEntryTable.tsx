/**
 * Catalog Entry Table
 *
 * The editable list behind every catalog leaf: inline rename, usage-gated delete, and a
 * reveal-to-add field. Serves lookup values, attribute options and custom units.
 */

import { useMemo, useRef, useState, type ReactNode } from 'react';

import { Check, Plus, SquarePen, Trash2, X } from 'lucide-react';

import { Button, Chip, Table, Tooltip } from '@shared/ui';
import { Input } from '@shared/ui/primitives';

import type { SortConfig, TableColumn } from '@shared/ui';

export interface CatalogEntry {
  id: string;
  value: string;
  usageCount: number;
}

export interface CatalogEntryLabels {
  singular: string;
  plural: string;
  usageHeader: string;
  usageSingular: string;
  usagePlural: string;
}

interface CatalogEntryTableProps<T extends CatalogEntry> {
  entries: T[];
  labels: CatalogEntryLabels;
  ariaLabel: string;
  loading?: boolean;
  onAdd: (value: string) => Promise<void>;
  onRename: (id: string, value: string) => void;
  onDelete: (id: string, value: string) => void;
  deletingId?: string | null;
  readOnly?: boolean;
  /** Columns inserted between the name and usage columns. */
  extraColumns?: TableColumn<T>[];
  /** Controls rendered beside the add field, e.g. a unit-kind picker. */
  addSlot?: ReactNode;
  /** Blocks the add action while a control in `addSlot` is unset. */
  addDisabled?: boolean;
  /** Note carried in the toolbar while the add field is closed. */
  toolbarNote?: string;
}

export function CatalogEntryTable<T extends CatalogEntry>({
  entries,
  labels,
  ariaLabel,
  loading = false,
  onAdd,
  onRename,
  onDelete,
  deletingId = null,
  readOnly = false,
  extraColumns,
  addSlot,
  addDisabled = false,
  toolbarNote,
}: CatalogEntryTableProps<T>) {
  const [newValue, setNewValue] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

  const handleAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAdd(trimmed);
      setNewValue('');
    } catch {
      // Add failed — keep the typed value so the user can retry; the global handler toasts.
    } finally {
      setAdding(false);
    }
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setNewValue('');
  };

  const handleRenameStart = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
    requestAnimationFrame(() => editInputRef.current?.focus());
  };

  const handleRenameSave = () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const original = entries.find(e => e.id === editingId);
    if (original && trimmed === original.value) {
      setEditingId(null);
      return;
    }
    onRename(editingId, trimmed);
    setEditingId(null);
  };

  const sortedEntries = useMemo(() => {
    if (!sortConfig) return entries;
    return [...entries].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.columnId) {
        case 'value':
          return a.value.localeCompare(b.value) * dir;
        case 'usageCount':
          return (a.usageCount - b.usageCount) * dir;
        default:
          return 0;
      }
    });
  }, [entries, sortConfig]);

  const columns: TableColumn<T>[] = [
    {
      id: 'value',
      header: 'Name',
      sortable: true,
      render: (_, item) => {
        if (editingId === item.id) {
          return (
            <Input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSave();
                if (e.key === 'Escape') setEditingId(null);
              }}
              size="xs"
              fullWidth
            />
          );
        }
        return <span className="font-display text-body-sm text-card-foreground">{item.value}</span>;
      },
    },
    ...(extraColumns ?? []),
    {
      id: 'usageCount',
      header: labels.usageHeader,
      sortable: true,
      width: 80,
      render: (_, item) =>
        item.usageCount > 0 ? (
          <Chip size="sm" color="primary" className="border border-action" numeric>
            {item.usageCount}
          </Chip>
        ) : (
          <span className="font-mono text-data text-muted-foreground/40">—</span>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 100,
      render: (_, item) => {
        const canDelete = item.usageCount === 0;
        if (editingId === item.id) {
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => handleRenameSave()}
                aria-label="Save"
                className="text-success-text hover:text-success-text-hover"
              >
                <Check size={14} />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => setEditingId(null)}
                aria-label="Cancel"
              >
                <X size={14} />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1">
            <Tooltip content="Rename" side="bottom">
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => handleRenameStart(item.id, item.value)}
                disabled={readOnly}
                aria-label={`Rename ${item.value}`}
              >
                <SquarePen size={14} />
              </Button>
            </Tooltip>
            <Tooltip
              content={
                canDelete
                  ? 'Delete'
                  : `${item.usageCount} ${item.usageCount === 1 ? labels.usageSingular : labels.usagePlural} reference this`
              }
              side="bottom"
            >
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() => onDelete(item.id, item.value)}
                disabled={readOnly || !canDelete}
                isLoading={deletingId === item.id}
                aria-label={`Delete ${item.value}`}
              >
                <Trash2 size={14} />
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      toolbar={{
        // While adding, the field takes the whole toolbar; otherwise the row carries only
        // the note, since the rail already names the list and counts it.
        // `w-full` not `flex-1`: the toolbar already contains a flex-1 spacer, and two
        // growing siblings would split the row in half.
        left: isAddOpen ? (
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                type="text"
                value={newValue}
                onValueChange={setNewValue}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleAdd();
                  if (e.key === 'Escape') closeAdd();
                }}
                placeholder={`Add new ${labels.singular}...`}
                size="sm"
                fullWidth
                /* eslint-disable-next-line jsx-a11y/no-autofocus -- Revealed on click; focus is expected */
                autoFocus
              />
            </div>
            {addSlot}
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleAdd()}
              disabled={!newValue.trim() || addDisabled || adding}
              isLoading={adding}
              leftIcon={<Plus size={14} />}
            >
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={closeAdd} aria-label="Cancel">
              <X size={14} />
            </Button>
          </div>
        ) : toolbarNote ? (
          <span className="type-label text-label-2xs tracking-label-wide text-foreground/40">
            {toolbarNote}
          </span>
        ) : undefined,
        right: isAddOpen ? undefined : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            disabled={readOnly}
            leftIcon={<Plus size={14} />}
          >
            Add
          </Button>
        ),
      }}
      data={sortedEntries}
      hoverable
      sortable
      sortConfig={sortConfig}
      onSort={setSortConfig}
      loading={loading}
      emptyMessage={`No ${labels.plural} yet`}
      loadingMessage={`Loading ${labels.plural}...`}
      aria-label={ariaLabel}
    />
  );
}
