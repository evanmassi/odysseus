/**
 * Catalog Tab
 *
 * Admin interface for managing lookup values (species, source, media, specimen type dropdowns).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { Check, ChevronRight, SquarePen, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import {
  AlertBanner,
  Button,
  Chip,
  NubDivider,
  SubsectionHeader,
  Table,
  Tooltip,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Input } from '@shared/ui/primitives';
import { notifications } from '@shared/utils';

import { EMPTY_CATALOG, useCatalogValuesQuery } from '../../../../hooks/useCatalogValuesQuery';
import {
  useCreateLookupValueMutation,
  useDeleteLookupValueMutation,
  useRenameLookupValueMutation,
} from '../../../../hooks/useLookupValueMutations';

import type { LookupCategory, LookupValueWithCount } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

const CATEGORY_SINGULAR_LABELS: Record<LookupCategory, string> = {
  species: 'species',
  source: 'source',
  media: 'media type',
  specimen_type: 'specimen',
  equipment_maintenance_type: 'maintenance activity',
  supply_item_property: 'product property',
  supply_stock_unit: 'stock unit',
  supply_vendor: 'vendor',
  supply_manufacturer: 'manufacturer',
};

const CATEGORY_PLURAL_LABELS: Record<LookupCategory, string> = {
  species: 'species',
  source: 'sources',
  media: 'media types',
  specimen_type: 'specimens',
  equipment_maintenance_type: 'maintenance activities',
  supply_item_property: 'product properties',
  supply_stock_unit: 'stock units',
  supply_vendor: 'vendors',
  supply_manufacturer: 'manufacturers',
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
  supply_stock_unit: { header: 'Items', singular: 'item', plural: 'items' },
  supply_vendor: { header: 'Items', singular: 'item', plural: 'items' },
  supply_manufacturer: { header: 'Items', singular: 'item', plural: 'items' },
};

interface CategorySectionProps {
  category: LookupCategory;
  index: number;
  title: string;
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
  index,
  title,
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
            index={index}
            title={title}
            meta={`// ${values.length} ${values.length === 1 ? 'entry' : 'entries'}`}
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

interface CatalogGroupProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CatalogGroup({ title, count, expanded, onToggle, children }: CatalogGroupProps) {
  return (
    <div className="overflow-hidden border border-line-faint">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="relative flex w-full items-center gap-2 bg-[hsl(var(--primary)/0.07)] px-3 py-2 text-left transition-[background-color,filter] hover:brightness-[0.97] dark:bg-shade/35 dark:hover:bg-shade/45 dark:hover:brightness-100"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
        />
        <ChevronRight
          size={11}
          className={`flex-shrink-0 text-foreground/40 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <span
          aria-hidden
          className="h-[11px] w-0.5 flex-shrink-0 bg-primary dark:shadow-[0_0_6px_-1px_hsl(var(--primary)/0.6)]"
        />
        <span className="type-label text-label-md tracking-label-wide text-foreground">
          {title}
        </span>
        <span aria-hidden className="font-mono text-data-sm text-foreground/30">
          {'//'}
        </span>
        <span className="font-mono text-data-sm tracking-data text-foreground/55">
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
        <NubDivider tone="primary" className="absolute inset-x-0 -bottom-px" />
      </button>
      {expanded && <div className="space-y-3 p-3">{children}</div>}
    </div>
  );
}

interface CatalogTabProps {
  onTabFooter?: (footer: React.ReactNode) => void;
  readOnly?: boolean;
}

export function CatalogTab({ onTabFooter, readOnly = false }: CatalogTabProps) {
  const location = useLocation();
  const isSuppliesRoute = location.pathname.startsWith('/lab/supplies');
  const isLabRoute = location.pathname.startsWith('/lab');
  const isBiobankRoute = !isLabRoute;
  const [biobankExpanded, setBiobankExpanded] = useState(isBiobankRoute);
  const [equipmentExpanded, setEquipmentExpanded] = useState(isLabRoute && !isSuppliesRoute);
  const [suppliesExpanded, setSuppliesExpanded] = useState(isSuppliesRoute);
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

  const biobankCount =
    catalog.species.length +
    catalog.source.length +
    catalog.media.length +
    catalog.specimen_type.length;
  const equipmentCount = catalog.equipment_maintenance_type.length;
  const suppliesCount =
    catalog.supply_item_property.length +
    catalog.supply_stock_unit.length +
    catalog.supply_vendor.length +
    catalog.supply_manufacturer.length;

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

      <div className="space-y-3">
        <CatalogGroup
          title="Biobank"
          count={biobankCount}
          expanded={biobankExpanded}
          onToggle={() => setBiobankExpanded(!biobankExpanded)}
        >
          <CategorySection
            category="species"
            index={1}
            title="Species"
            values={catalog.species}
            loading={isLoading}
            onAdd={value => handleAdd('species', value)}
            onRename={(id, newValue) => handleRename('species', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('species', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
          <CategorySection
            category="source"
            index={2}
            title="Sources"
            values={catalog.source}
            loading={isLoading}
            onAdd={value => handleAdd('source', value)}
            onRename={(id, newValue) => handleRename('source', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('source', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
          <CategorySection
            category="media"
            index={3}
            title="Media Types"
            values={catalog.media}
            loading={isLoading}
            onAdd={value => handleAdd('media', value)}
            onRename={(id, newValue) => handleRename('media', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('media', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
          <CategorySection
            category="specimen_type"
            index={4}
            title="Specimens"
            values={catalog.specimen_type}
            loading={isLoading}
            onAdd={value => handleAdd('specimen_type', value)}
            onRename={(id, newValue) => handleRename('specimen_type', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('specimen_type', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
        </CatalogGroup>

        <CatalogGroup
          title="Equipment"
          count={equipmentCount}
          expanded={equipmentExpanded}
          onToggle={() => setEquipmentExpanded(!equipmentExpanded)}
        >
          <CategorySection
            category="equipment_maintenance_type"
            index={1}
            title="Maintenance Activities"
            values={catalog.equipment_maintenance_type}
            loading={isLoading}
            onAdd={value => handleAdd('equipment_maintenance_type', value)}
            onRename={(id, newValue) => handleRename('equipment_maintenance_type', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('equipment_maintenance_type', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
        </CatalogGroup>

        <CatalogGroup
          title="Supplies"
          count={suppliesCount}
          expanded={suppliesExpanded}
          onToggle={() => setSuppliesExpanded(!suppliesExpanded)}
        >
          <CategorySection
            category="supply_item_property"
            index={1}
            title="Item Properties"
            values={catalog.supply_item_property}
            loading={isLoading}
            onAdd={value => handleAdd('supply_item_property', value)}
            onRename={(id, newValue) => handleRename('supply_item_property', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('supply_item_property', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
          <CategorySection
            category="supply_stock_unit"
            index={2}
            title="Stock Units"
            values={catalog.supply_stock_unit}
            loading={isLoading}
            onAdd={value => handleAdd('supply_stock_unit', value)}
            onRename={(id, newValue) => handleRename('supply_stock_unit', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('supply_stock_unit', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
          <CategorySection
            category="supply_vendor"
            index={3}
            title="Vendors"
            values={catalog.supply_vendor}
            loading={isLoading}
            onAdd={value => handleAdd('supply_vendor', value)}
            onRename={(id, newValue) => handleRename('supply_vendor', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('supply_vendor', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
          <CategorySection
            category="supply_manufacturer"
            index={4}
            title="Manufacturers"
            values={catalog.supply_manufacturer}
            loading={isLoading}
            onAdd={value => handleAdd('supply_manufacturer', value)}
            onRename={(id, newValue) => handleRename('supply_manufacturer', id, newValue)}
            onDelete={(id, value) => handleDeleteRequest('supply_manufacturer', id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
          />
        </CatalogGroup>
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
