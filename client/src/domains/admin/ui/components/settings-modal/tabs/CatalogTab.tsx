/**
 * Catalog Tab
 *
 * Admin interface for the lab's dropdown vocabularies: a rail of every editable list
 * beside the entries of the one selected.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { Check, SquarePen, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { AlertBanner, Button, Chip, SubsectionHeader, Table, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Input } from '@shared/ui/primitives';
import { notifications } from '@shared/utils';

import { EMPTY_CATALOG, useCatalogValuesQuery } from '../../../../hooks/useCatalogValuesQuery';
import {
  useCreateLookupValueMutation,
  useDeleteLookupValueMutation,
  useRenameLookupValueMutation,
} from '../../../../hooks/useLookupValueMutations';

import { CatalogRail, type CatalogLeaf } from './CatalogRail';

import type { LookupCategory, LookupValueWithCount } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

const CATEGORY_SINGULAR_LABELS: Record<LookupCategory, string> = {
  species: 'species',
  source: 'source',
  media: 'media type',
  specimen_type: 'specimen',
  equipment_maintenance_type: 'maintenance activity',
  supply_item_property: 'product property',
  reagent_type: 'reagent type',
  vendor: 'vendor',
  manufacturer: 'manufacturer',
};

const CATEGORY_PLURAL_LABELS: Record<LookupCategory, string> = {
  species: 'species',
  source: 'sources',
  media: 'media types',
  specimen_type: 'specimens',
  equipment_maintenance_type: 'maintenance activities',
  supply_item_property: 'product properties',
  reagent_type: 'reagent types',
  vendor: 'vendors',
  manufacturer: 'manufacturers',
};

const CATEGORY_USAGE_LABELS: Record<
  LookupCategory,
  { header: string; singular: string; plural: string }
> = {
  species: { header: 'Tubes', singular: 'tube', plural: 'tubes' },
  source: { header: 'Tubes', singular: 'tube', plural: 'tubes' },
  media: { header: 'Tubes', singular: 'tube', plural: 'tubes' },
  specimen_type: {
    header: 'Collections',
    singular: 'collection entry',
    plural: 'collection entries',
  },
  equipment_maintenance_type: { header: 'Entries', singular: 'log entry', plural: 'log entries' },
  supply_item_property: { header: 'Items', singular: 'item', plural: 'items' },
  reagent_type: { header: 'Items', singular: 'item', plural: 'items' },
  vendor: { header: 'Items', singular: 'item', plural: 'items' },
  manufacturer: { header: 'Items', singular: 'item', plural: 'items' },
};

// Alphabetical by title — the rail is flat because the lab-defined attribute vocabularies
// Phase 7 adds can't be slotted into a fixed taxonomy.
const CATALOG_LEAVES: CatalogLeaf[] = [
  { category: 'equipment_maintenance_type', title: 'Maintenance Activities' },
  {
    category: 'manufacturer',
    title: 'Manufacturers',
    usedBy: ['Supplies', 'Reagents', 'Equipment'],
  },
  { category: 'media', title: 'Media Types' },
  { category: 'supply_item_property', title: 'Product Properties' },
  { category: 'reagent_type', title: 'Reagent Types' },
  { category: 'source', title: 'Sources' },
  { category: 'species', title: 'Species' },
  { category: 'specimen_type', title: 'Specimens' },
  { category: 'vendor', title: 'Vendors', usedBy: ['Supplies', 'Reagents', 'Equipment'] },
];

/** The list a route lands on, so opening the catalog from a suite starts where you are. */
function leafForRoute(pathname: string): LookupCategory {
  if (pathname.startsWith('/lab/reagents')) return 'reagent_type';
  if (pathname.startsWith('/lab/supplies')) return 'supply_item_property';
  if (pathname.startsWith('/lab/equipment')) return 'equipment_maintenance_type';
  return 'species';
}

interface CategorySectionProps {
  category: LookupCategory;
  title: string;
  usedBy?: string[];
  values: LookupValueWithCount[];
  loading: boolean;
  onAdd: (value: string) => Promise<void>;
  onRename: (id: string, newValue: string) => void;
  onDelete: (id: string, value: string) => void;
  deletingId: string | null;
  readOnly?: boolean;
}

function CategorySection({
  category,
  title,
  usedBy,
  values,
  loading,
  onAdd,
  onRename,
  onDelete,
  deletingId,
  readOnly = false,
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
    } catch {
      // Add failed — keep the typed value so the user can retry; the global handler toasts.
    } finally {
      setAdding(false);
    }
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
    const original = values.find(v => v.id === editingId);
    if (original && trimmed === original.value) {
      setEditingId(null);
      return;
    }
    onRename(editingId, trimmed);
    setEditingId(null);
  };

  const sortedValues = useMemo(() => {
    if (!sortConfig) return values;
    return [...values].sort((a, b) => {
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
  }, [values, sortConfig]);

  const columns: TableColumn<LookupValueWithCount>[] = [
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
    {
      id: 'usageCount',
      header: CATEGORY_USAGE_LABELS[category].header,
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
                  : `${item.usageCount} ${item.usageCount === 1 ? CATEGORY_USAGE_LABELS[category].singular : CATEGORY_USAGE_LABELS[category].plural} reference this`
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
        left: (
          <SubsectionHeader
            title={title}
            meta={`// ${values.length} ${values.length === 1 ? 'entry' : 'entries'}${
              usedBy ? ` · used by ${usedBy.join(' · ')}` : ''
            }`}
            accent
            className="phosphor-text"
          />
        ),
        right: (
          <>
            <Input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !readOnly) void handleAdd();
              }}
              placeholder={`Add new ${CATEGORY_SINGULAR_LABELS[category]}...`}
              size="sm"
              disabled={readOnly}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleAdd()}
              disabled={readOnly || !newValue.trim() || adding}
              isLoading={adding}
              leftIcon={<Plus size={14} />}
            >
              Add
            </Button>
          </>
        ),
      }}
      data={sortedValues}
      hoverable
      sortable
      sortConfig={sortConfig}
      onSort={setSortConfig}
      loading={loading}
      emptyMessage={`No ${CATEGORY_PLURAL_LABELS[category]} yet`}
      loadingMessage={`Loading ${CATEGORY_PLURAL_LABELS[category]}...`}
      aria-label={`${title} list`}
    />
  );
}

interface CatalogTabProps {
  onTabFooter?: (footer: React.ReactNode) => void;
  readOnly?: boolean;
}

export function CatalogTab({ onTabFooter, readOnly = false }: CatalogTabProps) {
  const location = useLocation();
  const [selected, setSelected] = useState<LookupCategory>(() => leafForRoute(location.pathname));
  const [confirmDialog, setConfirmDialog] = useState<{
    id: string;
    value: string;
    category: LookupCategory;
  } | null>(null);

  const { data: catalog = EMPTY_CATALOG, isLoading, isFetching, refetch } = useCatalogValuesQuery();
  const createMutation = useCreateLookupValueMutation();
  const renameMutation = useRenameLookupValueMutation();
  const deleteMutation = useDeleteLookupValueMutation();

  const deletingId = deleteMutation.isPending ? (confirmDialog?.id ?? null) : null;

  useEffect(() => {
    onTabFooter?.(
      <AlertBanner variant="info" spacing="none" className="text-body-sm">
        Entries in use cannot be deleted. Renaming an entry updates every record that references it.
      </AlertBanner>
    );
  }, [onTabFooter]);

  // mutateAsync so the child form can await the result and keep the typed value on failure.
  const handleAdd = async (category: LookupCategory, value: string) => {
    await createMutation.mutateAsync({ category, value });
    notifications.success(`Added "${value}" to ${CATEGORY_PLURAL_LABELS[category]}`);
  };

  const handleRename = (category: LookupCategory, id: string, newValue: string) => {
    renameMutation.mutate(
      { category, id, value: newValue },
      {
        onSuccess: () => {
          notifications.success(`Renamed to "${newValue}"`);
        },
      }
    );
  };

  const handleDeleteRequest = (category: LookupCategory, id: string, value: string) => {
    setConfirmDialog({ id, value, category });
  };

  const executeDelete = () => {
    const target = confirmDialog;
    if (!target) return;
    deleteMutation.mutate(
      { category: target.category, id: target.id },
      {
        onSuccess: () => {
          notifications.success(`Deleted "${target.value}"`);
        },
        onSettled: () => {
          setConfirmDialog(null);
        },
      }
    );
  };

  const counts = useMemo(
    () =>
      Object.fromEntries(
        CATALOG_LEAVES.map(leaf => [leaf.category, catalog[leaf.category].length])
      ) as Record<LookupCategory, number>,
    [catalog]
  );

  const activeLeaf = CATALOG_LEAVES.find(leaf => leaf.category === selected) ?? CATALOG_LEAVES[0];

  return (
    <div className="space-y-2">
      <div className="mb-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => refetch()}
          isLoading={isFetching}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      <div className="flex min-h-0 gap-4">
        <CatalogRail
          leaves={CATALOG_LEAVES}
          counts={counts}
          selected={activeLeaf.category}
          onSelect={setSelected}
        />

        <div className="min-w-0 flex-1">
          <CategorySection
            key={activeLeaf.category}
            category={activeLeaf.category}
            title={activeLeaf.title}
            usedBy={activeLeaf.usedBy}
            values={catalog[activeLeaf.category]}
            loading={isLoading}
            onAdd={value => handleAdd(activeLeaf.category, value)}
            onRename={(id, newValue) => handleRename(activeLeaf.category, id, newValue)}
            onDelete={(id, value) => handleDeleteRequest(activeLeaf.category, id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title={`Delete ${CATEGORY_SINGULAR_LABELS[confirmDialog.category] ?? confirmDialog.category}`}
          message={`Are you sure you want to delete "${confirmDialog.value}" from ${CATEGORY_PLURAL_LABELS[confirmDialog.category] ?? confirmDialog.category}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={executeDelete}
          onCancel={() => setConfirmDialog(null)}
          isLoading={deletingId === confirmDialog.id}
        />
      )}
    </div>
  );
}
