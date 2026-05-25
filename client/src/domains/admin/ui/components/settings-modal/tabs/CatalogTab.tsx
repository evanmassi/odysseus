/**
 * Catalog Tab
 *
 * Admin interface for managing lookup values (species, source, media, specimen type dropdowns).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronRight,
  SquarePen,
  Plus,
  RefreshCw,
  Trash2,
  X,
  BookOpen,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { logger } from '@infra/logger';
import { AlertBanner, Button, Chip, Tooltip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Input } from '@shared/ui/primitives';
import { notifications } from '@shared/utils';

import { adminService } from '../../../../services/AdminService';

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
  title: string;
  values: LookupValueWithCount[];
  loading: boolean;
  onAdd: (value: string) => Promise<void>;
  onRename: (id: string, newValue: string) => Promise<void>;
  onDelete: (id: string, value: string) => void;
  deletingId: string | null;
  readOnly?: boolean;
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
                if (e.key === 'Enter') void handleRenameSave();
                if (e.key === 'Escape') setEditingId(null);
              }}
              size="xs"
              fullWidth
            />
          );
        }
        return <span className="font-display text-sm text-card-foreground">{item.value}</span>;
      },
    },
    {
      id: 'usageCount',
      header: CATEGORY_USAGE_LABELS[category].header,
      sortable: true,
      width: 80,
      render: (_, item) => {
        return (
          <Chip
            size="sm"
            color={item.usageCount > 0 ? 'primary' : 'default'}
            className={item.usageCount > 0 ? 'border border-action' : 'border border-border'}
          >
            {item.usageCount}
          </Chip>
        );
      },
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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-card-foreground capitalize">{title}</h4>

      <Table
        columns={columns}
        toolbar={{
          right: (
            <>
              <Chip size="sm" color="info">
                {values.length} {CATEGORY_PLURAL_LABELS[category] ?? category}
              </Chip>
              <Input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !readOnly) void handleAdd();
                }}
                placeholder={`Add new ${CATEGORY_SINGULAR_LABELS[category] ?? category}...`}
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
        className="w-auto"
        emptyMessage={`No ${CATEGORY_PLURAL_LABELS[category] ?? category} yet`}
        loadingMessage={`Loading ${CATEGORY_PLURAL_LABELS[category] ?? category}...`}
        aria-label={`${title} list`}
      />
    </div>
  );
}

interface CatalogTabProps {
  onTabFooter?: (footer: React.ReactNode) => void;
  readOnly?: boolean;
}

export function CatalogTab({ onTabFooter, readOnly = false }: CatalogTabProps) {
  const queryClient = useQueryClient();
  const labId = useLabId();
  const location = useLocation();
  const isSuppliesRoute = location.pathname.startsWith('/lab/supplies');
  const isLabRoute = location.pathname.startsWith('/lab');
  const isBiobankRoute = !isLabRoute;
  const [biobankExpanded, setBiobankExpanded] = useState(isBiobankRoute);
  const [equipmentExpanded, setEquipmentExpanded] = useState(isLabRoute && !isSuppliesRoute);
  const [suppliesExpanded, setSuppliesExpanded] = useState(isSuppliesRoute);
  const [speciesValues, setSpeciesValues] = useState<LookupValueWithCount[]>([]);
  const [sourceValues, setSourceValues] = useState<LookupValueWithCount[]>([]);
  const [mediaValues, setMediaValues] = useState<LookupValueWithCount[]>([]);
  const [specimenTypeValues, setSpecimenTypeValues] = useState<LookupValueWithCount[]>([]);
  const [equipmentMaintenanceTypeValues, setEquipmentMaintenanceTypeValues] = useState<
    LookupValueWithCount[]
  >([]);
  const [supplyItemPropertyValues, setSupplyItemPropertyValues] = useState<LookupValueWithCount[]>(
    []
  );
  const [supplyStockUnitValues, setSupplyStockUnitValues] = useState<LookupValueWithCount[]>([]);
  const [supplyVendorValues, setSupplyVendorValues] = useState<LookupValueWithCount[]>([]);
  const [supplyManufacturerValues, setSupplyManufacturerValues] = useState<LookupValueWithCount[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    id: string;
    value: string;
    category: LookupCategory;
  } | null>(null);

  const setterForCategory: Record<
    LookupCategory,
    React.Dispatch<React.SetStateAction<LookupValueWithCount[]>>
  > = useMemo(
    () => ({
      species: setSpeciesValues,
      source: setSourceValues,
      media: setMediaValues,
      specimen_type: setSpecimenTypeValues,
      equipment_maintenance_type: setEquipmentMaintenanceTypeValues,
      supply_item_property: setSupplyItemPropertyValues,
      supply_stock_unit: setSupplyStockUnitValues,
      supply_vendor: setSupplyVendorValues,
      supply_manufacturer: setSupplyManufacturerValues,
    }),
    []
  );

  const loadValues = useCallback(async () => {
    setLoading(true);
    try {
      const [
        species,
        sources,
        media,
        specimenTypes,
        equipmentMaintenanceTypes,
        supplyItemProperties,
        supplyStockUnits,
        supplyVendors,
        supplyManufacturers,
      ] = await Promise.all([
        adminService.getLookupValues('species'),
        adminService.getLookupValues('source'),
        adminService.getLookupValues('media'),
        adminService.getLookupValues('specimen_type'),
        adminService.getLookupValues('equipment_maintenance_type'),
        adminService.getLookupValues('supply_item_property'),
        adminService.getLookupValues('supply_stock_unit'),
        adminService.getLookupValues('supply_vendor'),
        adminService.getLookupValues('supply_manufacturer'),
      ]);
      setSpeciesValues(species);
      setSourceValues(sources);
      setMediaValues(media);
      setSpecimenTypeValues(specimenTypes);
      setEquipmentMaintenanceTypeValues(equipmentMaintenanceTypes);
      setSupplyItemPropertyValues(supplyItemProperties);
      setSupplyStockUnitValues(supplyStockUnits);
      setSupplyVendorValues(supplyVendors);
      setSupplyManufacturerValues(supplyManufacturers);
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

  useEffect(() => {
    onTabFooter?.(
      <AlertBanner variant="info" spacing="none" className="text-xs">
        Entries referenced by tubes cannot be deleted. Renaming an entry updates all tubes that use
        it.
      </AlertBanner>
    );
  }, [onTabFooter]);

  const handleAdd = async (category: LookupCategory, value: string) => {
    try {
      const created = await adminService.createLookupValue(category, value);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.byCategory(labId, category),
      });
      setterForCategory[category](prev => [...prev, { ...created, usageCount: 0 }]);
      notifications.success(`Added "${value}" to ${CATEGORY_PLURAL_LABELS[category] ?? category}`);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to add ${CATEGORY_SINGULAR_LABELS[category] ?? category}`;
      notifications.error(msg);
    }
  };

  const handleRename = async (category: LookupCategory, id: string, newValue: string) => {
    try {
      const updated = await adminService.renameLookupValue(id, newValue);
      void queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
      setterForCategory[category](prev =>
        prev.map(item => (item.id === id ? { ...updated, usageCount: item.usageCount } : item))
      );
      notifications.success(`Renamed to "${newValue}"`);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to rename ${CATEGORY_SINGULAR_LABELS[category] ?? category}`;
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
        queryKey: queryKeys.lookups.byCategory(labId, confirmDialog.category),
      });
      setterForCategory[confirmDialog.category](prev =>
        prev.filter(item => item.id !== confirmDialog.id)
      );
      notifications.success(`Deleted "${confirmDialog.value}"`);
      setConfirmDialog(null);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to delete ${CATEGORY_SINGULAR_LABELS[confirmDialog.category] ?? confirmDialog.category}`;
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

      <div className="space-y-4">
        {/* Biobank Catalogs */}
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent/50 transition-colors text-left"
            onClick={() => setBiobankExpanded(!biobankExpanded)}
          >
            {biobankExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="text-sm font-semibold text-secondary-foreground">Biobank</span>
          </button>
          {biobankExpanded && (
            <div className="p-3 space-y-6">
              <CategorySection
                category="species"
                title="Species"
                values={speciesValues}
                loading={loading}
                onAdd={value => handleAdd('species', value)}
                onRename={(id, newValue) => handleRename('species', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('species', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
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
                readOnly={readOnly}
              />
              <CategorySection
                category="media"
                title="Media Types"
                values={mediaValues}
                loading={loading}
                onAdd={value => handleAdd('media', value)}
                onRename={(id, newValue) => handleRename('media', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('media', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
              />
              <CategorySection
                category="specimen_type"
                title="Specimens"
                values={specimenTypeValues}
                loading={loading}
                onAdd={value => handleAdd('specimen_type', value)}
                onRename={(id, newValue) => handleRename('specimen_type', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('specimen_type', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>

        {/* Equipment Catalogs */}
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent/50 transition-colors text-left"
            onClick={() => setEquipmentExpanded(!equipmentExpanded)}
          >
            {equipmentExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="text-sm font-semibold text-secondary-foreground">Equipment</span>
          </button>
          {equipmentExpanded && (
            <div className="p-3 space-y-6">
              <CategorySection
                category="equipment_maintenance_type"
                title="Maintenance Activities"
                values={equipmentMaintenanceTypeValues}
                loading={loading}
                onAdd={value => handleAdd('equipment_maintenance_type', value)}
                onRename={(id, newValue) =>
                  handleRename('equipment_maintenance_type', id, newValue)
                }
                onDelete={(id, value) =>
                  handleDeleteRequest('equipment_maintenance_type', id, value)
                }
                deletingId={deletingId}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>

        {/* Supplies Catalogs */}
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent/50 transition-colors text-left"
            onClick={() => setSuppliesExpanded(!suppliesExpanded)}
          >
            {suppliesExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="text-sm font-semibold text-secondary-foreground">Supplies</span>
          </button>
          {suppliesExpanded && (
            <div className="p-3 space-y-6">
              <CategorySection
                category="supply_item_property"
                title="Item Properties"
                values={supplyItemPropertyValues}
                loading={loading}
                onAdd={value => handleAdd('supply_item_property', value)}
                onRename={(id, newValue) => handleRename('supply_item_property', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('supply_item_property', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
              />
              <CategorySection
                category="supply_stock_unit"
                title="Stock Units"
                values={supplyStockUnitValues}
                loading={loading}
                onAdd={value => handleAdd('supply_stock_unit', value)}
                onRename={(id, newValue) => handleRename('supply_stock_unit', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('supply_stock_unit', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
              />
              <CategorySection
                category="supply_vendor"
                title="Vendors"
                values={supplyVendorValues}
                loading={loading}
                onAdd={value => handleAdd('supply_vendor', value)}
                onRename={(id, newValue) => handleRename('supply_vendor', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('supply_vendor', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
              />
              <CategorySection
                category="supply_manufacturer"
                title="Manufacturers"
                values={supplyManufacturerValues}
                loading={loading}
                onAdd={value => handleAdd('supply_manufacturer', value)}
                onRename={(id, newValue) => handleRename('supply_manufacturer', id, newValue)}
                onDelete={(id, value) => handleDeleteRequest('supply_manufacturer', id, value)}
                deletingId={deletingId}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title={`Delete ${CATEGORY_SINGULAR_LABELS[confirmDialog.category] ?? confirmDialog.category}`}
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
