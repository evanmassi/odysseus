/**
 * Supplies Tab
 *
 * Main composition for the supplies management page with category browser,
 * detail panel, and form overlays in a 60/40 split layout.
 */

import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Eye, EyeOff, Layers, Package, Plus, SlidersHorizontal } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useAttributesQuery } from '@domains/lab-management';
import { useDemoTaxonomyLock } from '@domains/storage';
import { useSupplyCategoriesQuery, useSupplyItemsQuery } from '@domains/supplies/hooks';
import {
  useCreateSupplyCategoryMutation,
  useDeleteSupplyCategoryMutation,
  useUpdateSupplyCategoryMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
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

import { SupplyBulkOperationsModal } from './SupplyBulkOperationsModal';
import { SupplyItemForm } from './SupplyItemForm';
import { SupplyItemInfoPanel } from './SupplyItemInfoPanel';
import { SupplyItemRow } from './SupplyItemRow';
import { SupplyLowStockAlertPanel } from './SupplyLowStockAlertPanel';
import { SupplyQuickScanBar } from './SupplyQuickScanBar';
import { SupplyTransactionForm } from './SupplyTransactionForm';

import type { TransactionMode, TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

const isSupplyHidden = (item: SupplyItemWithStock) => item.status === 'archived';

const getSupplySearchFields = (item: SupplyItemWithStock) => [
  item.name,
  item.manufacturer,
  item.catalogNumber,
  item.vendorName,
];

const TREE_LABELS: CategoryTreePanelLabels = {
  countNoun: ['item', 'items'],
  emptyCategories: 'No supply categories yet.',
  noSearchMatch: 'No items matching',
  emptyCategoryBody: 'No items',
};

type RightPanelView =
  | { type: 'info'; itemId: string }
  | { type: 'edit'; item?: SupplyItemWithStock }
  | {
      type: 'transaction';
      itemId: string;
      initialTab?: TransactionMode;
      prefill?: TransactionPrefill;
    };

export function SuppliesTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const isTaxonomyLocked = useDemoTaxonomyLock();

  const { data: categories = [] } = useSupplyCategoriesQuery();
  const { data: items = [] } = useSupplyItemsQuery();
  const { data: attributes } = useAttributesQuery();
  const createCategoryMutation = useCreateSupplyCategoryMutation();
  const updateCategoryMutation = useUpdateSupplyCategoryMutation();
  const deleteCategoryMutation = useDeleteSupplyCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState<AttributeFilters>(EMPTY_ATTRIBUTE_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<InventorySortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);

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

  const handleAddItem = useCallback(() => {
    setRightPanel({ type: 'edit' });
  }, []);

  const handleEditItem = useCallback(() => {
    if (!selectedItemId) return;
    const item = items.find(p => p.id === selectedItemId);
    if (item) {
      setRightPanel({ type: 'edit', item });
    }
  }, [selectedItemId, items]);

  const handleRecordTransaction = useCallback(() => {
    if (selectedItemId) {
      setRightPanel({ type: 'transaction', itemId: selectedItemId });
    }
  }, [selectedItemId]);

  const handleScanViewItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setRightPanel({ type: 'info', itemId });
  }, []);

  const handleScanRecordTransaction = useCallback((itemId: string, initialTab: TransactionMode) => {
    setSelectedItemId(itemId);
    setRightPanel({ type: 'transaction', itemId, initialTab });
  }, []);

  const handleVoidAndReplace = useCallback(
    (itemId: string, initialTab: TransactionMode, prefill: TransactionPrefill) => {
      setSelectedItemId(itemId);
      setRightPanel({ type: 'transaction', itemId, initialTab, prefill });
    },
    []
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
    () => (showArchived ? items : items.filter(i => !isSupplyHidden(i))),
    [items, showArchived]
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
        getSearchFields: getSupplySearchFields,
      }),
    [visibleItems, categories, searchQuery]
  );

  const itemCount = treeItems.length;
  const categoryCount = categories.filter(c => !c.parentId).length;

  return (
    <div className="flex justify-center h-full min-h-0 px-4 pb-4 pt-2">
      <div className="flex gap-4 h-full min-h-0 w-full max-w-[1700px]">
        {/* Left Panel: Supplies list chassis */}
        <ConsolePanel
          intensity="soft"
          className="flex max-h-full min-h-0 min-w-0 flex-1 flex-col self-start"
        >
          <div className="flex-shrink-0 border-b border-line-faint pr-4">
            <PanelHeader icon={<Package className="h-4 w-4" />} title="Supplies" />
          </div>

          {/* Locator strip: inventory counts */}
          <HeaderStrip className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <AccentTick />
              <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
                {itemCount}{' '}
                <span className="text-foreground/45">{itemCount === 1 ? 'item' : 'items'}</span>
              </span>
            </span>
            <span className="flex-1" />
            <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/45">
              {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
            </span>
          </HeaderStrip>

          {/* Toolbar: search · scan · sort · archived · actions — the table's own header */}
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-line-faint px-3 py-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search supplies…"
              size="sm"
              className="w-64 min-w-[9rem]"
              aria-label="Search supplies"
            />
            <div className="flex items-center gap-2">
              <SupplyQuickScanBar
                items={items}
                onViewItem={handleScanViewItem}
                onRecordTransaction={handleScanRecordTransaction}
              />
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
                onClick={() => setShowArchived(!showArchived)}
                className="h-8 flex-shrink-0 text-label-sm"
                leftIcon={
                  showArchived ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )
                }
              >
                {showArchived ? 'Hide' : 'Show'} Archived
              </Button>
            </div>
            {isAdmin && (
              <div className="ml-auto flex items-center gap-2">
                <Tooltip content="Bulk Operations" side="bottom">
                  <Button
                    variant="secondary"
                    size="sm"
                    iconOnly
                    onClick={() => setIsBulkUpdateOpen(true)}
                    className="h-8 flex-shrink-0"
                    aria-label="Bulk Operations"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 flex-shrink-0"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Item
                </Button>
              </div>
            )}
          </div>

          {/* Body: pinned low-stock alerts + scrolling category tree */}
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
                emptyMessage="No item carries an attribute value yet — set some on an item and its facets appear here."
              />
            )}
            <SupplyLowStockAlertPanel
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
            <ScrollArea className="min-h-0 flex-1">
              <CategoryTreePanel
                categories={categories}
                items={treeItems}
                searchQuery={searchQuery}
                isAdmin={isAdmin}
                isTaxonomyLocked={isTaxonomyLocked}
                sortField={sortField}
                sortDirection={sortDirection}
                renderItem={item => (
                  <SupplyItemRow
                    item={item}
                    isSelected={item.id === selectedItemId}
                    onSelect={handleSelectItem}
                  />
                )}
                treeId="supplies"
                labels={TREE_LABELS}
                onAddCategory={categoryState.onAddCategory}
                onAddSubcategory={categoryState.onAddSubcategory}
                onRenameCategory={categoryState.onRenameCategory}
                onDeleteCategory={categoryState.onDeleteCategory}
              />
            </ScrollArea>
          </div>
        </ConsolePanel>

        {/* Right Panel: Detail / Edit / Transaction */}
        <div
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: 'clamp(420px, 35%, 530px)' }}
        >
          {!rightPanel && (
            <InfoPanelEmpty
              title="Supply Information"
              emptyIcon={Package}
              emptyMessage="Select an item to view details"
            />
          )}

          {rightPanel?.type === 'info' && (
            <SupplyItemInfoPanel
              itemId={rightPanel.itemId}
              onEdit={handleEditItem}
              onRecordTransaction={handleRecordTransaction}
              onVoidAndReplace={handleVoidAndReplace}
              onDeleted={handleItemDeleted}
              categoryName={categoryNameMap.get(
                items.find(p => p.id === rightPanel.itemId)?.categoryId ?? ''
              )}
            />
          )}

          {rightPanel?.type === 'edit' && (
            <SupplyItemForm
              item={rightPanel.item}
              categories={categories}
              onSubmit={handleFormComplete}
              onCancel={handleFormComplete}
            />
          )}

          {rightPanel?.type === 'transaction' &&
            (() => {
              const txnItem = items.find(p => p.id === rightPanel.itemId);
              return (
                <SupplyTransactionForm
                  key={`${rightPanel.itemId}-${rightPanel.initialTab ?? 'received'}-${JSON.stringify(rightPanel.prefill ?? '')}`}
                  itemId={rightPanel.itemId}
                  itemName={txnItem?.name ?? ''}
                  manufacturer={txnItem?.manufacturer}
                  catalogNumber={txnItem?.catalogNumber}
                  initialTab={rightPanel.initialTab}
                  prefill={rightPanel.prefill}
                  onSubmit={handleFormComplete}
                  onCancel={handleFormComplete}
                />
              );
            })()}
        </div>

        <CategoryManager
          state={categoryState}
          categoryPlaceholder="e.g., Pipette Tips"
          subcategoryPlaceholder="e.g., 15mL Conicals"
        />
      </div>

      <SupplyBulkOperationsModal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        items={items}
        categories={categories}
      />
    </div>
  );
}
