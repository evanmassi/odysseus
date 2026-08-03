/**
 * Equipment Tab
 *
 * Main composition for the equipment management page with category browser,
 * detail panel, and form overlays in a 60/40 split layout.
 */

import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Eye, EyeOff, Layers, Microscope, Plus, SlidersHorizontal } from 'lucide-react';

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
import { useAttributesQuery, useLabLocationsQuery } from '@domains/lab-management';
import {
  AccentTick,
  Button,
  HeaderStrip,
  InfoPanelEmpty,
  PanelHeader,
  SearchInput,
  Tooltip,
} from '@shared/ui';
import {
  CategoryManager,
  useCatalogCategories,
  AttributeFilterPanel,
  countAttributeFilters,
  matchesAttributeFilters,
  EMPTY_ATTRIBUTE_FILTERS,
  type AttributeFilters,
  CategoryTreePanel,
  type CategoryTreePanelLabels,
  INVENTORY_SORT_OPTIONS,
  searchCatalogItems,
  SortControls,
  type InventorySortField,
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

/** Location is searchable by name, as it was when the column held the text itself. */
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

  // The chip names the place; the path is what the free-text column used to spell out.
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

  return (
    <div className="flex justify-center h-full min-h-0 px-4 pb-4 pt-2">
      <div className="flex gap-4 h-full min-h-0 w-full max-w-[1700px]">
        <ConsolePanel
          intensity="soft"
          className="flex max-h-full min-h-0 min-w-0 flex-1 flex-col self-start"
        >
          <div className="flex-shrink-0 border-b border-line-faint pr-4">
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

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-line-faint px-3 py-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search equipment…"
              size="sm"
              className="w-64 min-w-[9rem]"
              aria-label="Search equipment"
            />
            <div className="flex flex-wrap items-center gap-2">
              <SortControls
                value={sortField}
                onChange={setSortField}
                direction={sortDirection}
                onToggleDirection={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
                options={INVENTORY_SORT_OPTIONS}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterOpen(open => !open)}
                aria-expanded={isFilterOpen}
                className={`h-8 flex-shrink-0 text-label-sm ${
                  isFilterOpen || activeFilterCount > 0
                    ? 'border border-primary/55 bg-primary/[0.10] text-primary'
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
            {isAdmin && (
              <div className="ml-auto flex items-center gap-2">
                <Tooltip content="Bulk Operations" side="bottom">
                  <Button
                    variant="secondary"
                    size="sm"
                    iconOnly
                    onClick={() => setIsBulkModalOpen(true)}
                    className="h-8 flex-shrink-0"
                    aria-label="Bulk Operations"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                <Button
                  size="sm"
                  onClick={handleAddEquipment}
                  className="h-8 flex-shrink-0"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Equipment
                </Button>
              </div>
            )}
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
                searchQuery={searchQuery}
                isAdmin={isAdmin}
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
                onAddCategory={categoryState.onAddCategory}
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
              onEdit={handleEditItem}
              onDecommission={handleDecommission}
              onAddMaintenance={handleAddMaintenance}
              onEditMaintenance={handleEditMaintenance}
              onDeleted={handleItemDeleted}
              categoryName={categoryNameMap.get(
                items.find(i => i.id === rightPanel.itemId)?.categoryId ?? ''
              )}
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
