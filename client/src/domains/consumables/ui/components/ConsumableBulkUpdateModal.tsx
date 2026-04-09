/**
 * Consumable Bulk Update Modal
 *
 * Unified bulk operations modal with tabbed actions: receive, consume, reassign
 * category, archive, and void. Product selector for reassign/archive tabs;
 * row-based forms for receive/consume; transaction selector for void.
 */

import { useState, useMemo, useCallback } from 'react';

import { Layers, Search, PackagePlus, PackageMinus, FolderInput, Archive, Ban } from 'lucide-react';

import { useConsumableBulkUpdateMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { Button, Checkbox, Tabs, Tab } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { notifications } from '@shared/utils/notifications';

import { BulkArchiveTab } from './bulk-update-tabs/BulkArchiveTab';
import { BulkConsumeTab } from './bulk-update-tabs/BulkConsumeTab';
import { BulkReassignTab } from './bulk-update-tabs/BulkReassignTab';
import { BulkReceiveTab } from './bulk-update-tabs/BulkReceiveTab';
import { BulkVoidTab } from './bulk-update-tabs/BulkVoidTab';

import type {
  ConsumableCategory,
  ConsumableProductWithStock,
  ConsumableBulkResponse,
} from '@odysseus/shared-schemas';

type BulkActionType = 'receive' | 'consume' | 'reassign-category' | 'archive' | 'void';

const SELECTOR_TABS = new Set<BulkActionType>(['reassign-category', 'archive']);

interface ConsumableBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ConsumableProductWithStock[];
  categories: ConsumableCategory[];
}

export function ConsumableBulkUpdateModal({
  isOpen,
  onClose,
  products,
  categories,
}: ConsumableBulkUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BulkActionType>('receive');
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [pendingAction, setPendingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bulkMutation = useConsumableBulkUpdateMutation();

  const showSelector = SELECTOR_TABS.has(actionType);

  const handleResult = useCallback(
    (result: ConsumableBulkResponse) => {
      notifyBulkResult(result, 'products');
      setSelectedIds(new Set());
      onClose();
    },
    [onClose]
  );

  const handleConfirm = useCallback(async () => {
    const productIds = Array.from(selectedIds);
    try {
      let result: ConsumableBulkResponse;
      if (actionType === 'reassign-category') {
        result = await bulkMutation.mutateAsync({
          type: 'reassign-category',
          productIds,
          categoryId: targetCategoryId,
        });
      } else {
        result = await bulkMutation.mutateAsync({ type: 'archive', productIds });
      }
      handleResult(result);
    } catch {
      notifications.error('Failed to update products');
    }
    setPendingAction(false);
  }, [selectedIds, actionType, targetCategoryId, bulkMutation, handleResult]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setActionType('receive');
    setTargetCategoryId('');
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const handleTabChange = useCallback((tab: string) => {
    setActionType(tab as BulkActionType);
    setSelectedIds(new Set());
    setTargetCategoryId('');
  }, []);

  const isFormValid =
    actionType === 'archive' || (actionType === 'reassign-category' && !!targetCategoryId);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Bulk Operations"
        icon={<Layers size={24} />}
        onClose={handleClose}
        size="lg"
        fixedHeight
        contentClassName="p-0 h-full"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-shrink-0 border-b border-border px-4">
            <Tabs
              value={actionType}
              onChange={handleTabChange}
              orientation="horizontal"
              className="!gap-0 !px-0 [&_button]:!px-2.5 [&_button]:flex-1 [&_button]:justify-center"
            >
              <Tab id="receive" icon={<PackagePlus size={14} />}>
                Receive
              </Tab>
              <Tab id="consume" icon={<PackageMinus size={14} />}>
                Consume
              </Tab>
              <Tab id="void" icon={<Ban size={14} />}>
                Void
              </Tab>
              <Tab id="reassign-category" icon={<FolderInput size={14} />}>
                Reassign
              </Tab>
              <Tab id="archive" icon={<Archive size={14} />}>
                Archive
              </Tab>
            </Tabs>
          </div>

          {showSelector ? (
            <div className="flex flex-1 min-h-0">
              <div className="w-2/5 border-r border-border p-4 flex flex-col min-h-0 overflow-auto bg-muted/30">
                <ProductSelector
                  products={products}
                  categories={categories}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>

              <div className="w-3/5 flex flex-col min-h-0">
                <div className="px-4 pt-4 flex-1">
                  {actionType === 'reassign-category' && (
                    <BulkReassignTab
                      categories={categories}
                      selectedCount={selectedIds.size}
                      targetCategoryId={targetCategoryId}
                      onTargetChange={setTargetCategoryId}
                    />
                  )}
                  {actionType === 'archive' && <BulkArchiveTab selectedCount={selectedIds.size} />}
                </div>

                <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
                  <Button variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setPendingAction(true)}
                    disabled={selectedIds.size === 0 || !isFormValid}
                    isLoading={bulkMutation.isPending}
                    variant={actionType === 'archive' ? 'danger' : 'primary'}
                  >
                    {actionType === 'reassign-category' ? 'Reassign' : 'Archive'} (
                    {selectedIds.size})
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              {actionType === 'receive' && (
                <BulkReceiveTab products={products} onComplete={handleClose} />
              )}
              {actionType === 'consume' && (
                <BulkConsumeTab products={products} onComplete={handleClose} />
              )}
              {actionType === 'void' && (
                <BulkVoidTab products={products} onComplete={handleClose} />
              )}
            </div>
          )}
        </div>
      </BaseModal>

      <ConfirmDialog
        isOpen={pendingAction}
        variant={actionType === 'archive' ? 'danger' : 'warning'}
        title={
          actionType === 'reassign-category' ? 'Confirm Category Reassignment' : 'Confirm Archive'
        }
        message={`${actionType === 'reassign-category' ? 'Reassign' : 'Archive'} ${selectedIds.size} product${selectedIds.size !== 1 ? 's' : ''}?`}
        confirmText={actionType === 'reassign-category' ? 'Reassign' : 'Archive'}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPendingAction(false)}
      />
    </>
  );
}

interface CategoryGroup {
  category: ConsumableCategory;
  products: ConsumableProductWithStock[];
  subcategories: Array<{
    category: ConsumableCategory;
    products: ConsumableProductWithStock[];
  }>;
}

function buildCategoryGroups(
  categories: ConsumableCategory[],
  products: ConsumableProductWithStock[]
): CategoryGroup[] {
  const active = products.filter(p => p.status === 'active');
  const topLevel = categories
    .filter(c => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return topLevel
    .map(parent => {
      const subs = categories
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      const directProducts = active.filter(p => p.categoryId === parent.id);
      const subcategories = subs.map(sub => ({
        category: sub,
        products: active.filter(p => p.categoryId === sub.id),
      }));

      return { category: parent, products: directProducts, subcategories };
    })
    .filter(g => g.products.length > 0 || g.subcategories.some(s => s.products.length > 0));
}

function getAllProductIds(group: CategoryGroup): string[] {
  return [
    ...group.products.map(p => p.id),
    ...group.subcategories.flatMap(s => s.products.map(p => p.id)),
  ];
}

function ProductSelector({
  products,
  categories,
  selectedIds,
  onSelectionChange,
  searchQuery,
  onSearchChange,
}: {
  products: ConsumableProductWithStock[];
  categories: ConsumableCategory[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const matchingCategoryIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const directMatches = categories.filter(c => c.name.toLowerCase().includes(q));
    const ids = new Set<string>();
    for (const cat of directMatches) {
      ids.add(cat.id);
      if (!cat.parentId) {
        categories.filter(c => c.parentId === cat.id).forEach(c => ids.add(c.id));
      }
    }
    return ids;
  }, [categories, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching
        (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
        matchingCategoryIds.has(p.categoryId)
    );
  }, [products, searchQuery, matchingCategoryIds]);

  const groups = useMemo(
    () => buildCategoryGroups(categories, filteredProducts),
    [categories, filteredProducts]
  );

  const allSelectableIds = useMemo(() => groups.flatMap(getAllProductIds), [groups]);

  const allSelected =
    allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.has(id));
  const someSelected = allSelectableIds.some(id => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allSelectableIds));
    }
  }, [allSelected, allSelectableIds, onSelectionChange]);

  const toggleCategory = useCallback(
    (categoryProductIds: string[]) => {
      const next = new Set(selectedIds);
      const allChecked = categoryProductIds.every(id => next.has(id));
      categoryProductIds.forEach(id => (allChecked ? next.delete(id) : next.add(id)));
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const toggleProduct = useCallback(
    (productId: string) => {
      const next = new Set(selectedIds);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const selectedCount = allSelectableIds.filter(id => selectedIds.has(id)).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative mb-2 flex-shrink-0">
        <Search className="absolute left-2 top-1.5 w-3 h-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter products..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="input-search w-full pl-7 text-xs"
        />
      </div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50 flex-shrink-0">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={toggleAll}
          aria-label="Select all products"
        />
        <span className="text-sm font-medium text-card-foreground flex-1">All Products</span>
        <span className="text-xs text-muted-foreground">
          {selectedCount}/{allSelectableIds.length}
        </span>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-2">
          {groups.length === 0 && searchQuery && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No products matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          {groups.map(group => {
            const groupIds = getAllProductIds(group);
            const groupAllChecked = groupIds.every(id => selectedIds.has(id));
            const groupSomeChecked = groupIds.some(id => selectedIds.has(id));
            const hasChildren =
              group.products.length > 0 || group.subcategories.some(s => s.products.length > 0);

            return (
              <div key={group.category.id}>
                <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/30 transition-colors">
                  <Checkbox
                    checked={groupAllChecked}
                    indeterminate={groupSomeChecked && !groupAllChecked}
                    onChange={() => toggleCategory(groupIds)}
                    aria-label={`Select all in ${group.category.name}`}
                  />
                  <span className="text-sm font-medium text-card-foreground">
                    {group.category.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{groupIds.length}</span>
                </div>

                {hasChildren && (
                  <div className="ml-3 border-l border-muted-foreground/30">
                    {group.products.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 py-1 pr-1 rounded-r hover:bg-accent/30 transition-colors"
                      >
                        <div className="w-2.5 border-b border-muted-foreground/30 flex-shrink-0" />
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-card-foreground/80 truncate block">
                            {product.name}
                          </span>
                          {product.manufacturer && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {product.manufacturer}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {group.subcategories.map(sub => {
                      if (sub.products.length === 0) return null;
                      const subIds = sub.products.map(p => p.id);
                      const subAllChecked = subIds.every(id => selectedIds.has(id));
                      const subSomeChecked = subIds.some(id => selectedIds.has(id));

                      return (
                        <div key={sub.category.id}>
                          <div className="flex items-center gap-2 py-1 pr-1 rounded-r hover:bg-accent/30 transition-colors">
                            <div className="w-2.5 border-b border-muted-foreground/30 flex-shrink-0" />
                            <Checkbox
                              checked={subAllChecked}
                              indeterminate={subSomeChecked && !subAllChecked}
                              onChange={() => toggleCategory(subIds)}
                              aria-label={`Select all in ${sub.category.name}`}
                            />
                            <span className="text-sm font-medium text-card-foreground/80">
                              {sub.category.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {subIds.length}
                            </span>
                          </div>
                          <div className="ml-[30px] border-l border-muted-foreground/30">
                            {sub.products.map(product => (
                              <div
                                key={product.id}
                                className="flex items-center gap-2 py-1 pr-1 rounded-r hover:bg-accent/30 transition-colors"
                              >
                                <div className="w-2.5 border-b border-muted-foreground/30 flex-shrink-0" />
                                <Checkbox
                                  checked={selectedIds.has(product.id)}
                                  onChange={() => toggleProduct(product.id)}
                                  aria-label={`Select ${product.name}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm text-card-foreground/80 truncate block">
                                    {product.name}
                                  </span>
                                  {product.manufacturer && (
                                    <span className="text-xs text-muted-foreground truncate block">
                                      {product.manufacturer}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
