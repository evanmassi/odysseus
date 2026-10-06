import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Plus, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import {
  EMPTY_ATTRIBUTES,
  useAttributesQuery,
  useCreateAttributeDefinitionMutation,
  useCreateAttributeOptionMutation,
  useCreateCustomUnitMutation,
  useCustomUnitsQuery,
  useDeleteAttributeDefinitionMutation,
  useDeleteAttributeOptionMutation,
  useDeleteCustomUnitMutation,
  useLabLocationsQuery,
  LabLocationModal,
  useUpdateCustomUnitMutation,
  useUpdateAttributeDefinitionMutation,
  useUpdateAttributeOptionMutation,
} from '@domains/lab-management';
import { AlertBanner, Button, ScrollArea } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { EMPTY_CATALOG, useCatalogValuesQuery } from '../../../../hooks/useCatalogValuesQuery';
import {
  useCreateLookupValueMutation,
  useDeleteLookupValueMutation,
  useRenameLookupValueMutation,
} from '../../../../hooks/useLookupValueMutations';

import { AttributeDefinitionModal } from './AttributeDefinitionModal';
import { AttributeSection } from './AttributeSection';
import { CatalogEntryTable } from './CatalogEntryTable';
import { CatalogRail, type CatalogLeaf } from './CatalogRail';
import { CustomUnitSection, type CustomUnitEntry } from './CustomUnitSection';
import { LocationCatalogPanel } from './LocationCatalogPanel';

import type {
  AttributeOptionWithUsage,
  CreateAttributeDefinitionRequest,
  LookupCategory,
  UnitKindValue,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

const CATEGORY_SINGULAR_LABELS: Record<LookupCategory, string> = {
  species: 'species',
  source: 'source',
  media: 'media type',
  specimen_type: 'specimen',
  equipment_maintenance_type: 'maintenance activity',
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
  reagent_type: { header: 'Items', singular: 'item', plural: 'items' },
  vendor: { header: 'Items', singular: 'item', plural: 'items' },
  manufacturer: { header: 'Items', singular: 'item', plural: 'items' },
};

const LOOKUP_GROUP = 'Dropdown Lists';
const ATTRIBUTE_GROUP = 'Item Attributes';
const UNIT_GROUP = 'Units';
const LOCATION_GROUP = 'Places';

const LOOKUP_LEAVES: Array<{ category: LookupCategory; title: string; usedBy?: string[] }> = [
  { category: 'equipment_maintenance_type', title: 'Maintenance Activities' },
  {
    category: 'manufacturer',
    title: 'Manufacturers',
    usedBy: ['Supplies', 'Reagents', 'Equipment'],
  },
  { category: 'media', title: 'Media Types' },
  { category: 'reagent_type', title: 'Reagent Types' },
  { category: 'source', title: 'Sources' },
  { category: 'species', title: 'Species' },
  { category: 'specimen_type', title: 'Specimens' },
  { category: 'vendor', title: 'Vendors', usedBy: ['Supplies', 'Reagents', 'Equipment'] },
];

const UNITS_LEAF_ID = 'units';
const LOCATIONS_LEAF_ID = 'locations';
const lookupLeafId = (category: LookupCategory) => `lookup:${category}`;
const attributeLeafId = (definitionId: string) => `attr:${definitionId}`;

function leafForRoute(pathname: string): string {
  if (pathname.startsWith('/lab/reagents')) return lookupLeafId('reagent_type');
  // PITFALL: supplies has no lookup of its own left; vendor is the list it actually curates.
  if (pathname.startsWith('/lab/supplies')) return lookupLeafId('vendor');
  if (pathname.startsWith('/lab/equipment')) return lookupLeafId('equipment_maintenance_type');
  return lookupLeafId('species');
}

type PendingDelete =
  | { kind: 'lookup'; id: string; label: string; category: LookupCategory }
  | { kind: 'option'; id: string; label: string }
  | { kind: 'definition'; id: string; label: string }
  | { kind: 'unit'; id: string; label: string };

const DELETE_COPY: Record<PendingDelete['kind'], { noun: string; consequence: string }> = {
  lookup: { noun: 'entry', consequence: 'This action cannot be undone.' },
  option: { noun: 'option', consequence: 'It will no longer be offered on reagent forms.' },
  definition: {
    noun: 'attribute',
    consequence: 'Its options are removed with it. This action cannot be undone.',
  },
  unit: { noun: 'unit', consequence: 'It will no longer be offered on any unit field.' },
};

interface CatalogTabProps {
  onTabFooter?: (footer: React.ReactNode) => void;
  onTabAction?: (action: React.ReactNode) => void;
  readOnly?: boolean;
}

export function CatalogTab({ onTabFooter, onTabAction, readOnly = false }: CatalogTabProps) {
  const location = useLocation();
  const [selected, setSelected] = useState(() => leafForRoute(location.pathname));
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const { data: catalog = EMPTY_CATALOG, isLoading, isError, refetch } = useCatalogValuesQuery();
  const {
    data: attributes = EMPTY_ATTRIBUTES,
    isLoading: isLoadingAttributes,
    isError: isAttributesError,
    refetch: refetchAttributes,
  } = useAttributesQuery();
  const {
    data: customUnits = [],
    isLoading: isLoadingUnits,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useCustomUnitsQuery();

  const { data: locations = [] } = useLabLocationsQuery();

  const createMutation = useCreateLookupValueMutation();
  const renameMutation = useRenameLookupValueMutation();
  const deleteMutation = useDeleteLookupValueMutation();
  const createDefinitionMutation = useCreateAttributeDefinitionMutation();
  const updateDefinitionMutation = useUpdateAttributeDefinitionMutation();
  const deleteDefinitionMutation = useDeleteAttributeDefinitionMutation();
  const createOptionMutation = useCreateAttributeOptionMutation();
  const updateOptionMutation = useUpdateAttributeOptionMutation();
  const deleteOptionMutation = useDeleteAttributeOptionMutation();
  const createUnitMutation = useCreateCustomUnitMutation();
  const updateUnitMutation = useUpdateCustomUnitMutation();
  const deleteUnitMutation = useDeleteCustomUnitMutation();

  const isDeleting =
    deleteMutation.isPending ||
    deleteOptionMutation.isPending ||
    deleteDefinitionMutation.isPending ||
    deleteUnitMutation.isPending;
  const deletingId = isDeleting ? (pendingDelete?.id ?? null) : null;

  useEffect(() => {
    onTabFooter?.(
      <AlertBanner variant="info" spacing="none" className="text-body-sm">
        Entries in use cannot be deleted. Renaming an entry updates every record that references it.
      </AlertBanner>
    );
  }, [onTabFooter]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchAttributes(), refetchUnits()]);
    setIsRefreshing(false);
  }, [refetch, refetchAttributes, refetchUnits]);

  useEffect(() => {
    onTabAction?.(
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refreshAll()}
          leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
        >
          Refresh
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsDefinitionModalOpen(true)}
          disabled={readOnly}
          leftIcon={<Plus size={14} />}
        >
          Add Attribute
        </Button>
      </div>
    );
  }, [onTabAction, isRefreshing, refreshAll, readOnly]);

  // PITFALL: mutateAsync so the child form can await the result and keep the typed value on failure.
  const handleAddLookup = async (category: LookupCategory, value: string) => {
    await createMutation.mutateAsync({ category, value });
    notifications.success(`Added "${value}" to ${CATEGORY_PLURAL_LABELS[category]}`);
  };

  const handleRenameLookup = (category: LookupCategory, id: string, newValue: string) => {
    renameMutation.mutate(
      { category, id, value: newValue },
      {
        onSuccess: () => {
          notifications.success(`Renamed to "${newValue}"`);
        },
      }
    );
  };

  const handleAddOption = async (definitionId: string, value: string) => {
    await createOptionMutation.mutateAsync({ definitionId, data: { value } });
    notifications.success(`Added "${value}"`);
  };

  const handleRenameOption = (id: string, value: string) => {
    updateOptionMutation.mutate(
      { id, data: { value } },
      {
        onSuccess: () => {
          notifications.success(`Renamed to "${value}"`);
        },
      }
    );
  };

  const handleCreateDefinition = (data: CreateAttributeDefinitionRequest) =>
    createDefinitionMutation.mutateAsync(data, {
      onSuccess: definition => setSelected(attributeLeafId(definition.id)),
    });

  const handleAddUnit = async (label: string, kind: UnitKindValue) => {
    await createUnitMutation.mutateAsync({ label, kind });
    notifications.success(`Added "${label}"`);
  };

  const handleRenameUnit = (id: string, label: string) => {
    updateUnitMutation.mutate(
      { id, data: { label } },
      {
        onSuccess: () => {
          notifications.success(`Renamed to "${label}"`);
        },
      }
    );
  };

  const handleUnitKindChange = (id: string, kind: UnitKindValue) => {
    updateUnitMutation.mutate({ id, data: { kind } });
  };

  const executeDelete = () => {
    const target = pendingDelete;
    if (!target) return;

    const onSuccess = () => notifications.success(`Deleted "${target.label}"`);
    const onSettled = () => setPendingDelete(null);

    switch (target.kind) {
      case 'lookup':
        deleteMutation.mutate(
          { category: target.category, id: target.id },
          { onSuccess, onSettled }
        );
        return;
      case 'option':
        deleteOptionMutation.mutate(target.id, { onSuccess, onSettled });
        return;
      case 'definition':
        deleteDefinitionMutation.mutate(target.id, {
          onSuccess: () => {
            onSuccess();
            const next = attributes.definitions
              .filter(definition => definition.id !== target.id)
              .sort((a, b) => a.name.localeCompare(b.name))[0];
            setSelected(next ? attributeLeafId(next.id) : UNITS_LEAF_ID);
          },
          onSettled,
        });
        return;
      case 'unit':
        deleteUnitMutation.mutate(target.id, { onSuccess, onSettled });
    }
  };

  const reagentTypeOptions = useMemo<SelectOption[]>(
    () => catalog.reagent_type.map(value => ({ value: value.value, label: value.value })),
    [catalog.reagent_type]
  );

  const optionsByDefinition = useMemo(() => {
    const map = new Map<string, AttributeOptionWithUsage[]>();
    attributes.options.forEach(option => {
      const list = map.get(option.definitionId) ?? [];
      list.push(option);
      map.set(option.definitionId, list);
    });
    return map;
  }, [attributes.options]);

  const unitEntries = useMemo<CustomUnitEntry[]>(
    () =>
      customUnits.map(unit => ({
        id: unit.id,
        value: unit.label,
        kind: unit.kind,
        usageCount: unit.usageCount,
      })),
    [customUnits]
  );

  const leaves = useMemo<CatalogLeaf[]>(
    () => [
      ...LOOKUP_LEAVES.map(leaf => ({
        id: lookupLeafId(leaf.category),
        title: leaf.title,
        group: LOOKUP_GROUP,
        count: catalog[leaf.category].length,
        usedBy: leaf.usedBy,
      })),
      ...[...attributes.definitions]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(definition => ({
          id: attributeLeafId(definition.id),
          title: definition.name,
          group: ATTRIBUTE_GROUP,
          count:
            definition.valueType === 'select' || definition.valueType === 'multi_select'
              ? (optionsByDefinition.get(definition.id)?.length ?? 0)
              : undefined,
        })),
      { id: UNITS_LEAF_ID, title: 'Custom Units', group: UNIT_GROUP, count: customUnits.length },
      {
        id: LOCATIONS_LEAF_ID,
        title: 'Locations',
        group: LOCATION_GROUP,
        count: locations.length,
        usedBy: ['equipment', 'supplies', 'reagents'],
      },
    ],
    [catalog, attributes.definitions, optionsByDefinition, customUnits.length, locations.length]
  );

  const activeLeafId = leaves.some(leaf => leaf.id === selected) ? selected : leaves[0].id;
  const activeLookup = LOOKUP_LEAVES.find(leaf => lookupLeafId(leaf.category) === activeLeafId);
  const activeDefinition = attributes.definitions.find(
    definition => attributeLeafId(definition.id) === activeLeafId
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4">
      {/* PITFALL: without this banner, a failed fetch looks the same as a lab that has nothing yet. */}
      {(isError || isAttributesError || isUnitsError) && (
        <AlertBanner variant="error" spacing="none" className="text-body-sm">
          Some vocabularies could not be loaded. Use Refresh to try again.
        </AlertBanner>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        <CatalogRail leaves={leaves} selected={activeLeafId} onSelect={setSelected} />

        <ScrollArea className="min-h-0 min-w-0 flex-1">
          {activeLookup && (
            <CatalogEntryTable
              key={activeLeafId}
              entries={catalog[activeLookup.category]}
              labels={{
                singular: CATEGORY_SINGULAR_LABELS[activeLookup.category],
                plural: CATEGORY_PLURAL_LABELS[activeLookup.category],
                usageHeader: CATEGORY_USAGE_LABELS[activeLookup.category].header,
                usageSingular: CATEGORY_USAGE_LABELS[activeLookup.category].singular,
                usagePlural: CATEGORY_USAGE_LABELS[activeLookup.category].plural,
              }}
              ariaLabel={`${activeLookup.title} list`}
              loading={isLoading}
              onAdd={value => handleAddLookup(activeLookup.category, value)}
              onRename={(id, newValue) => handleRenameLookup(activeLookup.category, id, newValue)}
              onDelete={(id, label) =>
                setPendingDelete({ kind: 'lookup', id, label, category: activeLookup.category })
              }
              deletingId={deletingId}
              readOnly={readOnly}
              toolbarNote={
                activeLookup.usedBy ? `used by ${activeLookup.usedBy.join(' · ')}` : undefined
              }
            />
          )}

          {activeDefinition && (
            <AttributeSection
              key={activeLeafId}
              definition={activeDefinition}
              options={optionsByDefinition.get(activeDefinition.id) ?? []}
              reagentTypeOptions={reagentTypeOptions}
              loading={isLoadingAttributes}
              itemsUsingCount={activeDefinition.usageCount}
              onScopeChange={appliesToTypes =>
                updateDefinitionMutation.mutate({
                  id: activeDefinition.id,
                  data: { appliesToTypes },
                })
              }
              onPromptChange={promptOnForm =>
                updateDefinitionMutation.mutate({
                  id: activeDefinition.id,
                  data: { promptOnForm },
                })
              }
              onDeleteDefinition={() =>
                setPendingDelete({
                  kind: 'definition',
                  id: activeDefinition.id,
                  label: activeDefinition.name,
                })
              }
              onAddOption={value => handleAddOption(activeDefinition.id, value)}
              onRenameOption={handleRenameOption}
              onDeleteOption={(id, label) => setPendingDelete({ kind: 'option', id, label })}
              deletingOptionId={deletingId}
              readOnly={readOnly}
            />
          )}

          {activeLeafId === LOCATIONS_LEAF_ID && (
            <LocationCatalogPanel
              locations={locations}
              readOnly={readOnly}
              onManage={() => setIsLocationModalOpen(true)}
            />
          )}

          {activeLeafId === UNITS_LEAF_ID && (
            <CustomUnitSection
              entries={unitEntries}
              loading={isLoadingUnits}
              onAdd={handleAddUnit}
              onRename={handleRenameUnit}
              onKindChange={handleUnitKindChange}
              onDelete={(id, label) => setPendingDelete({ kind: 'unit', id, label })}
              deletingId={deletingId}
              readOnly={readOnly}
            />
          )}
        </ScrollArea>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title={`Delete ${DELETE_COPY[pendingDelete.kind].noun}`}
          message={`Are you sure you want to delete "${pendingDelete.label}"? ${DELETE_COPY[pendingDelete.kind].consequence}`}
          confirmText="Delete"
          onConfirm={executeDelete}
          onCancel={() => setPendingDelete(null)}
          isLoading={isDeleting}
        />
      )}

      <AttributeDefinitionModal
        isOpen={isDefinitionModalOpen}
        reagentTypeOptions={reagentTypeOptions}
        isPending={createDefinitionMutation.isPending}
        onClose={() => setIsDefinitionModalOpen(false)}
        onCreate={handleCreateDefinition}
      />

      <LabLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}
