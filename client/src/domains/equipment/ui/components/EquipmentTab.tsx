import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Eye, EyeOff, Microscope, SlidersHorizontal } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import {
  useCreateEquipmentCategoryMutation,
  useDeleteEquipmentCategoryMutation,
  useUpdateEquipmentCategoryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import {
  useEquipmentCategoriesQuery,
  useEquipmentItemsQuery,
} from '@domains/equipment/hooks/useEquipmentQueries';
import { resolveEquipmentStatusTone } from '@domains/equipment/utils/equipmentStatus';
import { useAttributesQuery, useLabLocationsQuery } from '@domains/lab-management';
import { useDemoTaxonomyLock } from '@domains/storage';
import {
  AccentTick,
  Button,
  HeaderStrip,
  InfoPanelEmpty,
  PanelHeader,
  SearchInput,
} from '@shared/ui';
import {
  AttributeFilterPanel,
  type AttributeFilters,
  CatalogActionBar,
  CategoryManager,
  CategoryTreePanel,
  type CategoryTreePanelLabels,
  countAttributeFilters,
  EMPTY_ATTRIBUTE_FILTERS,
  INVENTORY_SORT_OPTIONS,
  type InventorySortField,
  matchesAttributeFilters,
  searchCatalogItems,
  SortControls,
  useCatalogCategories,
} from '@shared/ui/components/inventory';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import { EquipmentBulkOperationsModal } from './EquipmentBulkOperationsModal';
import { EquipmentDecommissionForm } from './EquipmentDecommissionForm';
import { EquipmentEditForm } from './EquipmentEditForm';
import { EquipmentItemInfoPanel } from './EquipmentItemInfoPanel';
import { EquipmentItemRow } from './EquipmentItemRow';
import { EquipmentMaintenanceAlertPanel } from './EquipmentMaintenanceAlertPanel';
import { EquipmentMaintenanceForm } from './EquipmentMaintenanceForm';

import type { EquipmentItem, EquipmentMaintenanceLog } from '@odysseus/shared-schemas';

const isEquipmentHidden = (item: EquipmentItem) => item.status === 'decommissioned';

const equipmentSearchFields = (item: EquipmentItem, locationName?: string) => [
  item.name,
  item.manufacturer,
  item.model,
  item.serialNumber,
  item.assetTag,
  locationName,
];

const TREE_LABELS: CategoryTreePanelLabels = {
  countNoun: ['unit', 'units'],
  emptyCategories: 'No equipment categories yet.',
  noSearchMatch: 'No equipment matching',
  emptyCategoryBody: 'No equipment',
};

type RightPanelView =
  | { type: 'info'; itemId: string }
  | { type: 'edit'; item?: EquipmentItem }
  | { type: 'decommission'; itemId: string }
  | { type: 'maintenance'; itemId: string; entry?: EquipmentMaintenanceLog };

export function EquipmentTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const isTaxonomyLocked = useDemoTaxonomyLock();

  const { data: categories = [] } = useEquipmentCategoriesQuery();
  const { data: items = [] } = useEquipmentItemsQuery();
  const { data: attributes } = useAttributesQuery();
  const { data: locations = [] } = useLabLocationsQuery();
  const createCategoryMutation = useCreateEquipmentCategoryMutation();
  const updateCategoryMutation = useUpdateEquipmentCategoryMutation();
  const deleteCategoryMutation = useDeleteEquipmentCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  const [filters, setFilters] = useState<AttributeFilters>(EMPTY_ATTRIBUTE_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<InventorySortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const locationNameMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);
  const categoryState = useCatalogCategories({
    categories,
    createMutation: createCategoryMutation,
    updateMutation: updateCategoryMutation,
    deleteMutation: deleteCategoryMutation,
  });
  const { categoryNameMap } = categoryState;

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItemId(id);
    setRightPanel({ type: 'info', itemId: id });
  }, []);

  const handleAddEquipment = useCallback(() => {
    setRightPanel({ type: 'edit' });
  }, []);

  const handleEditItem = useCallback(() => {
    if (!selectedItemId) return;
    const item = items.find(i => i.id === selectedItemId);
    if (item) {
      setRightPanel({ type: 'edit', item });
    }
  }, [selectedItemId, items]);

  const handleDecommission = useCallback(() => {
    if (selectedItemId) {
      setRightPanel({ type: 'decommission', itemId: selectedItemId });
    }
  }, [selectedItemId]);

  const handleAddMaintenance = useCallback(() => {
    if (selectedItemId) {
      setRightPanel({ type: 'maintenance', itemId: selectedItemId });
    }
  }, [selectedItemId]);

  const handleEditMaintenance = useCallback(
    (entry: EquipmentMaintenanceLog) => {
      if (!selectedItemId) return;
      setRightPanel({ type: 'maintenance', itemId: selectedItemId, entry });
    },
    [selectedItemId]
  );

  const handleFormComplete = useCallback(() => {
    if (selectedItemId) {
      setRightPanel({ type: 'info', itemId: selectedItemId });
    } else {
      setRightPanel(undefined);
    }
  }, [selectedItemId]);

  const handleItemDeleted = useCallback(() => {
    setSelectedItemId(undefined);
    setRightPanel(undefined);
  }, []);

  const activeFilterCount = countAttributeFilters(filters);
  const catalogItems = useMemo(
    () => (showDecommissioned ? items : items.filter(i => !isEquipmentHidden(i))),
    [items, showDecommissioned]
  );
  const visibleItems = useMemo(
    () =>
      activeFilterCount === 0
        ? catalogItems
        : catalogItems.filter(item => matchesAttributeFilters(item.attributeValues, filters)),
    [catalogItems, filters, activeFilterCount]
  );
  const treeItems = useMemo(
    () =>
      searchCatalogItems({
        items: visibleItems,
        categories,
        searchQuery,
        getSearchFields: item =>
          equipmentSearchFields(
            item,
            item.locationId ? locationNameMap.get(item.locationId) : undefined
          ),
      }),
    [visibleItems, categories, searchQuery, locationNameMap]
  );

  const unitCount = treeItems.length;
  const categoryCount = categories.filter(c => !c.parentId).length;

  const infoPanelItem =
    rightPanel?.type === 'info' ? items.find(item => item.id === rightPanel.itemId) : undefined;

  return (
    <div className="flex justify-center h-full min-h-0 px-4 pb-4 pt-2">
      <div className="flex gap-4 h-full min-h-0 w-full max-w-[1700px]">
        <ConsolePanel
          intensity="soft"
          className="flex max-h-full min-h-0 min-w-0 flex-1 flex-col self-start"
        >
          <div className="flex-shrink-0">
            <PanelHeader icon={<Microscope className="h-4 w-4" />} title="Equipment" />
          </div>

          <HeaderStrip className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <AccentTick />
              <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
                {unitCount}{' '}
                <span className="text-foreground/45">{unitCount === 1 ? 'unit' : 'units'}</span>
              </span>
            </span>
            <span className="flex-1" />
            <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/45">
              {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
            </span>
          </HeaderStrip>

          <div className="flex flex-shrink-0 flex-col gap-2 border-b border-line-faint px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search equipment…"
                size="sm"
                className="min-w-[9rem] max-w-64 flex-1"
                aria-label="Search equipment"
              />
              {isAdmin && (
                <CatalogActionBar
                  addItemLabel="Add Equipment"
                  isTaxonomyLocked={isTaxonomyLocked}
                  onBulkOperations={() => setIsBulkModalOpen(true)}
                  onAddCategory={categoryState.onAddCategory}
                  onAddItem={handleAddEquipment}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SortControls
                value={sortField}
                onChange={setSortField}
                direction={sortDirection}
                onToggleDirection={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
                options={INVENTORY_SORT_OPTIONS}
              />
              <Button
                variant={isFilterOpen || activeFilterCount > 0 ? 'ghost-primary' : 'ghost'}
                size="sm"
                onClick={() => setIsFilterOpen(open => !open)}
                aria-expanded={isFilterOpen}
                className={`h-8 flex-shrink-0 text-label-sm ${
                  isFilterOpen || activeFilterCount > 0
                    ? 'border border-primary/55 bg-primary/[0.10]'
                    : ''
                }`}
                leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              >
                Filter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDecommissioned(!showDecommissioned)}
                className="h-8 flex-shrink-0 text-label-sm"
                leftIcon={
                  showDecommissioned ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )
                }
              >
                {showDecommissioned ? 'Hide' : 'Show'} Decommissioned
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
            {isFilterOpen && (
              <AttributeFilterPanel
                definitions={attributes?.definitions ?? []}
                options={attributes?.options ?? []}
                items={catalogItems}
                matchCount={treeItems.length}
                filters={filters}
                activeCount={activeFilterCount}
                onChange={setFilters}
                onClearAll={() => setFilters(EMPTY_ATTRIBUTE_FILTERS)}
                emptyMessage="No equipment carries an attribute value yet — set some on a unit and its facets appear here."
              />
            )}
            <EquipmentMaintenanceAlertPanel
              items={items}
              categoryNameMap={categoryNameMap}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
            <ScrollArea className="min-h-0 flex-1">
              <CategoryTreePanel
                categories={categories}
                items={treeItems}
                selectedItemId={selectedItemId}
                searchQuery={searchQuery}
                isAdmin={isAdmin}
                isTaxonomyLocked={isTaxonomyLocked}
                sortField={sortField}
                sortDirection={sortDirection}
                renderItem={item => (
                  <EquipmentItemRow
                    item={item}
                    isSelected={item.id === selectedItemId}
                    onSelect={handleSelectItem}
                    locationName={
                      item.locationId ? locationNameMap.get(item.locationId) : undefined
                    }
                  />
                )}
                treeId="equipment"
                labels={TREE_LABELS}
                onAddSubcategory={categoryState.onAddSubcategory}
                onRenameCategory={categoryState.onRenameCategory}
                onDeleteCategory={categoryState.onDeleteCategory}
              />
            </ScrollArea>
          </div>
        </ConsolePanel>

        <div
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: 'clamp(420px, 35%, 530px)' }}
        >
          {!rightPanel && (
            <InfoPanelEmpty
              title="Equipment Information"
              emptyIcon={Microscope}
              emptyMessage="Select equipment to view details"
            />
          )}

          {rightPanel?.type === 'info' && (
            <EquipmentItemInfoPanel
              itemId={rightPanel.itemId}
              statusTone={infoPanelItem ? resolveEquipmentStatusTone(infoPanelItem) : 'muted'}
              onEdit={handleEditItem}
              onDecommission={handleDecommission}
              onAddMaintenance={handleAddMaintenance}
              onEditMaintenance={handleEditMaintenance}
              onDeleted={handleItemDeleted}
            />
          )}

          {rightPanel?.type === 'edit' && (
            <EquipmentEditForm
              item={rightPanel.item}
              categories={categories}
              onSubmit={handleFormComplete}
              onCancel={handleFormComplete}
            />
          )}

          {rightPanel?.type === 'decommission' && (
            <EquipmentDecommissionForm
              itemId={rightPanel.itemId}
              itemName={items.find(i => i.id === rightPanel.itemId)?.name ?? ''}
              onSubmit={handleFormComplete}
              onCancel={handleFormComplete}
            />
          )}

          {rightPanel?.type === 'maintenance' && (
            <EquipmentMaintenanceForm
              itemId={rightPanel.itemId}
              entry={rightPanel.entry}
              onSubmit={handleFormComplete}
              onCancel={handleFormComplete}
            />
          )}
        </div>

        <CategoryManager
          state={categoryState}
          categoryPlaceholder="e.g., Pipettes"
          subcategoryPlaceholder="e.g., Single Channel"
        />
      </div>

      <EquipmentBulkOperationsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        items={items}
        categories={categories}
      />
    </div>
  );
}
