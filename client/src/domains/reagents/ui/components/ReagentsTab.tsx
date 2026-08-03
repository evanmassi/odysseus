/**
 * Reagents Tab
 *
 * Main composition for the reagent catalog: category browser on the left,
 * item detail column on the right.
 */

import { useState, useCallback, useMemo } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Biohazard, Eye, EyeOff, Layers, Plus, SlidersHorizontal } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useAttributesQuery } from '@domains/lab-management';
import {
  useCreateReagentCategoryMutation,
  useDeleteReagentCategoryMutation,
  useReagentCategoriesQuery,
  useReagentItemsQuery,
  useUpdateReagentCategoryMutation,
} from '@domains/reagents/hooks';
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
  CategoryTreePanel,
  INVENTORY_SORT_OPTIONS,
  SortControls,
  type CategoryTreePanelLabels,
  type InventorySortField,
} from '@shared/ui/components/inventory';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import {
  countActiveFilters,
  matchesReagentFilters,
  EMPTY_REAGENT_FILTERS,
  type ReagentFilters,
} from '../../utils/reagentAttributeFilter';

import { ReagentAttributeFilterPanel } from './ReagentAttributeFilterPanel';
import { ReagentBulkOperationsModal } from './ReagentBulkOperationsModal';
import { ReagentExpiryAlertPanel } from './ReagentExpiryAlertPanel';
import { ReagentItemForm } from './ReagentItemForm';
import { ReagentItemInfoPanel } from './ReagentItemInfoPanel';
import { ReagentItemRow } from './ReagentItemRow';
import { ReagentLowStockAlertPanel } from './ReagentLowStockAlertPanel';
import { ReagentQuickScanBar } from './ReagentQuickScanBar';
import { ReagentTransactionForm } from './ReagentTransactionForm';

import type { TransactionMode, TransactionPrefill } from './ReagentTransactionForm';
import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

const isReagentHidden = (item: ReagentItemWithStock) => item.status === 'archived';

const getReagentSearchFields = (item: ReagentItemWithStock) => [
  item.name,
  item.manufacturer,
  item.catalogNumber,
  item.vendorName,
  item.reagentType,
  item.casNumber,
];

type RightPanelView =
  | { type: 'info'; itemId: string }
  | { type: 'edit'; item?: ReagentItemWithStock }
  | {
      type: 'transaction';
      itemId: string;
      initialTab?: TransactionMode;
      prefill?: TransactionPrefill;
    };

const TREE_LABELS: CategoryTreePanelLabels = {
  countNoun: ['item', 'items'],
  emptyCategories: 'No reagent categories yet.',
  noSearchMatch: 'No reagents matching',
  emptyCategoryBody: 'No reagents',
};

export function ReagentsTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const { data: categories = [] } = useReagentCategoriesQuery();
  const { data: items = [] } = useReagentItemsQuery();
  const { data: attributes } = useAttributesQuery();
  const createCategoryMutation = useCreateReagentCategoryMutation();
  const updateCategoryMutation = useUpdateReagentCategoryMutation();
  const deleteCategoryMutation = useDeleteReagentCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<InventorySortField>('name');
  const [filters, setFilters] = useState<ReagentFilters>(EMPTY_REAGENT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  const handleEditItem = useCallback(() => {
    const selected = items.find(i => i.id === selectedItemId);
    if (selected) setRightPanel({ type: 'edit', item: selected });
  }, [items, selectedItemId]);

  const handleRecordTransaction = useCallback(() => {
    if (selectedItemId) setRightPanel({ type: 'transaction', itemId: selectedItemId });
  }, [selectedItemId]);

  const handleVoidAndReplace = useCallback(
    (itemId: string, initialTab: TransactionMode, prefill: TransactionPrefill) => {
      setSelectedItemId(itemId);
      setRightPanel({ type: 'transaction', itemId, initialTab, prefill });
    },
    []
  );

  const handleScannedItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setRightPanel({ type: 'info', itemId });
  }, []);

  const handleScannedTransaction = useCallback(
    (itemId: string, initialTab: TransactionMode, prefill?: TransactionPrefill) => {
      setSelectedItemId(itemId);
      setRightPanel({ type: 'transaction', itemId, initialTab, prefill });
    },
    []
  );

  const handleFormComplete = useCallback(() => {
    setRightPanel(selectedItemId ? { type: 'info', itemId: selectedItemId } : undefined);
  }, [selectedItemId]);

  const handleItemDeleted = useCallback(() => {
    setSelectedItemId(undefined);
    setRightPanel(undefined);
  }, []);

  const activeFilterCount = countActiveFilters(filters);
  const visibleItems = useMemo(
    () => (activeFilterCount === 0 ? items : items.filter(i => matchesReagentFilters(i, filters))),
    [items, filters, activeFilterCount]
  );

  const itemCount = showArchived
    ? visibleItems.length
    : visibleItems.filter(i => i.status !== 'archived').length;
  const categoryCount = categories.filter(c => !c.parentId).length;

  return (
    <div className="flex justify-center h-full min-h-0 px-4 pb-4 pt-2">
      <div className="flex gap-4 h-full min-h-0 w-full max-w-[1700px]">
        <ConsolePanel
          intensity="soft"
          className="flex max-h-full min-h-0 min-w-0 flex-1 flex-col self-start"
        >
          <div className="flex-shrink-0 border-b border-line-faint pr-4">
            <PanelHeader icon={<Biohazard className="h-4 w-4" />} title="Reagents" />
          </div>

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

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-line-faint px-3 py-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search reagents…"
              size="sm"
              className="w-64 min-w-[9rem]"
              aria-label="Search reagents"
            />
            <div className="flex items-center gap-2">
              <ReagentQuickScanBar
                items={items}
                onViewItem={handleScannedItem}
                onRecordTransaction={handleScannedTransaction}
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
                aria-pressed={isFilterOpen || activeFilterCount > 0}
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
                  onClick={() => setRightPanel({ type: 'edit' })}
                  className="h-8 flex-shrink-0"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Item
                </Button>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
            {isFilterOpen && (
              <ReagentAttributeFilterPanel
                definitions={attributes?.definitions ?? []}
                options={attributes?.options ?? []}
                items={items}
                matchCount={visibleItems.length}
                filters={filters}
                onChange={setFilters}
              />
            )}
            <ReagentExpiryAlertPanel
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
            <ReagentLowStockAlertPanel
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
            <ScrollArea className="min-h-0 flex-1">
              <CategoryTreePanel
                categories={categories}
                items={visibleItems}
                searchQuery={searchQuery}
                isAdmin={isAdmin}
                sortField={sortField}
                sortDirection={sortDirection}
                showHidden={showArchived}
                isHidden={isReagentHidden}
                getSearchFields={getReagentSearchFields}
                renderItem={item => (
                  <ReagentItemRow
                    item={item}
                    isSelected={item.id === selectedItemId}
                    onSelect={handleSelectItem}
                  />
                )}
                treeId="reagents"
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
              title="Reagent Information"
              emptyIcon={Biohazard}
              emptyMessage="Select an item to view details"
            />
          )}

          {rightPanel?.type === 'info' && (
            <ReagentItemInfoPanel
              itemId={rightPanel.itemId}
              onEdit={handleEditItem}
              onRecordTransaction={handleRecordTransaction}
              onVoidAndReplace={handleVoidAndReplace}
              onDeleted={handleItemDeleted}
              categoryName={categoryNameMap.get(
                items.find(i => i.id === rightPanel.itemId)?.categoryId ?? ''
              )}
            />
          )}

          {rightPanel?.type === 'edit' && (
            <ReagentItemForm
              item={rightPanel.item}
              categories={categories}
              onSubmit={handleFormComplete}
              onCancel={handleFormComplete}
            />
          )}

          {rightPanel?.type === 'transaction' &&
            (() => {
              const txnItem = items.find(i => i.id === rightPanel.itemId);
              return (
                <ReagentTransactionForm
                  key={`${rightPanel.itemId}-${rightPanel.initialTab ?? 'received'}-${rightPanel.prefill ? 'prefill' : ''}`}
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
          categoryPlaceholder="e.g., Antibodies"
          subcategoryPlaceholder="e.g., Primary"
        />

        <ReagentBulkOperationsModal
          isOpen={isBulkUpdateOpen}
          onClose={() => setIsBulkUpdateOpen(false)}
          items={items}
          categories={categories}
        />
      </div>
    </div>
  );
}
