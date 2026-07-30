/**
 * Catalog Tab
 *
 * Admin interface for the lab's dropdown vocabularies: a rail of every editable list
 * beside the entries of the one selected.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { AlertBanner, Button } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { EMPTY_CATALOG, useCatalogValuesQuery } from '../../../../hooks/useCatalogValuesQuery';
import {
  useCreateLookupValueMutation,
  useDeleteLookupValueMutation,
  useRenameLookupValueMutation,
} from '../../../../hooks/useLookupValueMutations';

import { CatalogEntryTable } from './CatalogEntryTable';
import { CatalogRail, type CatalogLeaf } from './CatalogRail';

import type { LookupCategory } from '@odysseus/shared-schemas';

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

const LOOKUP_GROUP = 'Dropdown Lists';

// Alphabetical by title. Leaves group by the mechanism behind them, not by meaning — a
// taxonomy of meaning can't place the lab-defined attribute vocabularies.
const LOOKUP_LEAVES: Array<{ category: LookupCategory; title: string; usedBy?: string[] }> = [
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

interface CatalogTabProps {
  onTabFooter?: (footer: React.ReactNode) => void;
  /** Lifts the refresh control into the tab header — it refetches every list, not the visible one. */
  onTabAction?: (action: React.ReactNode) => void;
  readOnly?: boolean;
}

export function CatalogTab({ onTabFooter, onTabAction, readOnly = false }: CatalogTabProps) {
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

  useEffect(() => {
    onTabAction?.(
      <Button
        variant="secondary"
        size="sm"
        onClick={() => refetch()}
        isLoading={isFetching}
        leftIcon={<RefreshCw size={14} />}
      >
        Refresh
      </Button>
    );
  }, [onTabAction, isFetching, refetch]);

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

  const leaves = useMemo<CatalogLeaf[]>(
    () =>
      LOOKUP_LEAVES.map(leaf => ({
        id: leaf.category,
        title: leaf.title,
        group: LOOKUP_GROUP,
        count: catalog[leaf.category].length,
        usedBy: leaf.usedBy,
      })),
    [catalog]
  );

  const activeLeaf = LOOKUP_LEAVES.find(leaf => leaf.category === selected) ?? LOOKUP_LEAVES[0];
  const activeCategory = activeLeaf.category;

  return (
    <div className="space-y-2">
      <div className="flex min-h-0 gap-4">
        <CatalogRail
          leaves={leaves}
          selected={activeCategory}
          onSelect={id => setSelected(id as LookupCategory)}
        />

        <div className="min-w-0 flex-1">
          <CatalogEntryTable
            key={activeCategory}
            entries={catalog[activeCategory]}
            labels={{
              singular: CATEGORY_SINGULAR_LABELS[activeCategory],
              plural: CATEGORY_PLURAL_LABELS[activeCategory],
              usageHeader: CATEGORY_USAGE_LABELS[activeCategory].header,
              usageSingular: CATEGORY_USAGE_LABELS[activeCategory].singular,
              usagePlural: CATEGORY_USAGE_LABELS[activeCategory].plural,
            }}
            ariaLabel={`${activeLeaf.title} list`}
            loading={isLoading}
            onAdd={value => handleAdd(activeCategory, value)}
            onRename={(id, newValue) => handleRename(activeCategory, id, newValue)}
            onDelete={(id, value) => handleDeleteRequest(activeCategory, id, value)}
            deletingId={deletingId}
            readOnly={readOnly}
            toolbarNote={activeLeaf.usedBy ? `used by ${activeLeaf.usedBy.join(' · ')}` : undefined}
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
