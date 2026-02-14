/**
 * Catalog Tab
 *
 * Admin interface for managing lookup values (species, source dropdowns).
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, RefreshCw, Trash2, X, BookOpen } from 'lucide-react';

import { queryKeys } from '@app/queryKeys';
import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, Button, Chip, Tooltip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { Input } from '@shared/ui/primitives';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';

import type { LookupCategory, LookupValueWithCount } from '@odysseus/shared-schemas';
import type { TableColumn, TableRow, SortConfig } from '@shared/ui';

interface CategorySectionProps {
  category: LookupCategory;
  title: string;
  values: LookupValueWithCount[];
  loading: boolean;
  onAdd: (value: string) => Promise<void>;
  onRename: (id: string, newValue: string) => Promise<void>;
  onDelete: (id: string, value: string) => void;
  deletingId: string | null;
}

function CategorySection({
  category,
  title,
  values,
  loading,
  onAdd,
  onRename,
  onDelete,
  deletingId,
}: CategorySectionProps) {
  const [newValue, setNewValue] = useState('');
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
    } finally {
      setAdding(false);
    }
  };

  const handleRenameStart = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
    requestAnimationFrame(() => editInputRef.current?.focus());
  };

  const handleRenameSave = async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const original = values.find(v => v.id === editingId);
    if (original && trimmed === original.value) {
      setEditingId(null);
      return;
    }
    try {
      await onRename(editingId, trimmed);
    } finally {
      setEditingId(null);
    }
  };

  const sortedValues = useMemo(() => {
    if (!sortConfig) return values;
    return [...values].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.columnId) {
        case 'value':
          return a.value.localeCompare(b.value) * dir;
        case 'tubeCount':
          return (a.tubeCount - b.tubeCount) * dir;
        default:
          return 0;
      }
    });
  }, [values, sortConfig]);

  const columns: TableColumn<TableRow>[] = [
    {
      id: 'value',
      header: 'Name',
      sortable: true,
      render: (_, row) => {
        const item = row as unknown as LookupValueWithCount;
        if (editingId === item.id) {
          return (
            <Input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleRenameSave();
                if (e.key === 'Escape') setEditingId(null);
              }}
              size="xs"
              fullWidth
            />
          );
        }
        return <span className="text-sm text-card-foreground">{item.value}</span>;
      },
    },
    {
      id: 'tubeCount',
      header: 'Tubes',
      sortable: true,
      width: 80,
      render: (_, row) => {
        const item = row as unknown as LookupValueWithCount;
        return (
          <Chip
            size="sm"
            color={item.tubeCount > 0 ? 'primary' : 'default'}
            className={item.tubeCount > 0 ? 'border border-action' : 'border border-border'}
          >
            {item.tubeCount}
          </Chip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 100,
      render: (_, row) => {
        const item = row as unknown as LookupValueWithCount;
        const canDelete = item.tubeCount === 0;
        if (editingId === item.id) {
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => void handleRenameSave()}
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
                aria-label={`Rename ${item.value}`}
              >
                <Pencil size={14} />
              </Button>
            </Tooltip>
            <Tooltip
              content={
                canDelete
                  ? 'Delete'
                  : `${item.tubeCount} tube${item.tubeCount === 1 ? '' : 's'} reference this ${category}`
              }
              side="bottom"
            >
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() => onDelete(item.id, item.value)}
                disabled={!canDelete}
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground capitalize">{title}</h4>
        <span className="text-xs text-muted-foreground">
          {values.length} {category === 'species' ? 'species' : 'sources'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void handleAdd();
          }}
          placeholder={`Add new ${category}...`}
          size="sm"
          fullWidth
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleAdd()}
          disabled={!newValue.trim() || adding}
          isLoading={adding}
          leftIcon={<Plus size={14} />}
        >
          Add
        </Button>
      </div>

      <Table
        columns={columns}
        data={sortedValues as TableRow[]}
        size="sm"
        variant="default"
        hoverable
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={setSortConfig}
        loading={loading}
        emptyMessage={`No ${category === 'species' ? 'species' : 'sources'} yet`}
        loadingMessage={`Loading ${category === 'species' ? 'species' : 'sources'}...`}
        aria-label={`${title} list`}
      />
    </div>
  );
}

export function CatalogTab() {
  const queryClient = useQueryClient();
  const [speciesValues, setSpeciesValues] = useState<LookupValueWithCount[]>([]);
  const [sourceValues, setSourceValues] = useState<LookupValueWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    id: string;
    value: string;
    category: LookupCategory;
  } | null>(null);

  const loadValues = useCallback(async () => {
    setLoading(true);
    try {
      const [species, sources] = await Promise.all([
        adminService.getLookupValues('species'),
        adminService.getLookupValues('source'),
      ]);
      setSpeciesValues(species);
      setSourceValues(sources);
    } catch (error) {
      logger.error('Failed to load lookup values', { error });
      notifications.error('Failed to load catalog values');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadValues();
  }, [loadValues]);

  const handleAdd = async (category: LookupCategory, value: string) => {
    try {
      await adminService.createLookupValue(category, value);
      void queryClient.invalidateQueries({ queryKey: queryKeys.lookups.byCategory(category) });
      notifications.success(`Added "${value}" to ${category}`);
      await loadValues();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to add ${category}`;
      notifications.error(msg);
    }
  };

  const handleRename = async (category: LookupCategory, id: string, newValue: string) => {
    try {
      await adminService.renameLookupValue(id, newValue);
      void queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      notifications.success(`Renamed to "${newValue}"`);
      await loadValues();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to rename ${category}`;
      notifications.error(msg);
    }
  };

  const handleDeleteRequest = (category: LookupCategory, id: string, value: string) => {
    setConfirmDialog({ id, value, category });
  };

  const executeDelete = async () => {
    if (!confirmDialog) return;
    setDeletingId(confirmDialog.id);
    try {
      await adminService.deleteLookupValue(confirmDialog.id);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.byCategory(confirmDialog.category),
      });
      notifications.success(`Deleted "${confirmDialog.value}"`);
      setConfirmDialog(null);
      await loadValues();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to delete ${confirmDialog.category}`;
      notifications.error(msg);
      setConfirmDialog(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center space-x-2">
          <BookOpen size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Catalog</h3>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadValues()}
          isLoading={loading}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      <AlertBanner variant="info" spacing="none" className="text-xs">
        Entries referenced by tubes cannot be deleted. Renaming an entry updates all tubes that use
        it.
      </AlertBanner>

      <div className="grid grid-cols-2 gap-6">
        <CategorySection
          category="species"
          title="Species"
          values={speciesValues}
          loading={loading}
          onAdd={value => handleAdd('species', value)}
          onRename={(id, newValue) => handleRename('species', id, newValue)}
          onDelete={(id, value) => handleDeleteRequest('species', id, value)}
          deletingId={deletingId}
        />

        <CategorySection
          category="source"
          title="Sources"
          values={sourceValues}
          loading={loading}
          onAdd={value => handleAdd('source', value)}
          onRename={(id, newValue) => handleRename('source', id, newValue)}
          onDelete={(id, value) => handleDeleteRequest('source', id, value)}
          deletingId={deletingId}
        />
      </div>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title={`Delete ${confirmDialog.category === 'species' ? 'Species' : 'Source'}`}
          message={`Are you sure you want to delete "${confirmDialog.value}" from ${confirmDialog.category}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => void executeDelete()}
          onCancel={() => setConfirmDialog(null)}
          isLoading={deletingId === confirmDialog.id}
        />
      )}
    </div>
  );
}
