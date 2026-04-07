/**
 * Consumable Bulk Update Modal
 *
 * Multi-select products across categories and apply a bulk action:
 * reassign category or archive.
 */

import { useState, useMemo, useCallback } from 'react';

import { ChevronDown, ChevronRight, FolderInput, Archive, Search } from 'lucide-react';

import { useConsumableBulkUpdateMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { Button, Select, Checkbox, Tabs, Tab } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { notifications } from '@shared/utils/notifications';

import type {
  ConsumableCategory,
  ConsumableProductWithStock,
  ConsumableBulkResponse,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

type BulkActionType = 'reassign-category' | 'archive';

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
  const [actionType, setActionType] = useState<BulkActionType>('reassign-category');
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [pendingAction, setPendingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bulkMutation = useConsumableBulkUpdateMutation();

  const handleResult = useCallback(
    (result: ConsumableBulkResponse) => {
      notifyBulkResult(result, 'products');
      setSelectedIds(new Set());
      onClose();
    },
    [onClose]
  );

  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return activeProducts;
    const query = searchQuery.toLowerCase();
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching */
    return activeProducts.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.manufacturer?.toLowerCase().includes(query) ||
        p.catalogNumber?.toLowerCase().includes(query)
    );
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
  }, [activeProducts, searchQuery]);

  const topLevelCategories = useMemo(
    () =>
      categories
        .filter(c => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, ConsumableCategory[]>();
    categories
      .filter(c => c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .forEach(c => {
        const list = map.get(c.parentId!) ?? [];
        list.push(c);
        map.set(c.parentId!, list);
      });
    return map;
  }, [categories]);

  const productsByCategoryId = useMemo(() => {
    const map = new Map<string, ConsumableProductWithStock[]>();
    filteredProducts.forEach(p => {
      const list = map.get(p.categoryId) ?? [];
      list.push(p);
      map.set(p.categoryId, list);
    });
    return map;
  }, [filteredProducts]);

  const categoryOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [{ value: '', label: 'Select target category...' }];
    topLevelCategories.forEach(parent => {
      options.push({ value: parent.id, label: parent.name });
      (subcategoriesByParent.get(parent.id) ?? []).forEach(sub => {
        options.push({ value: sub.id, label: sub.name, description: parent.name });
      });
    });
    return options;
  }, [topLevelCategories, subcategoriesByParent]);

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInCategory = (categoryId: string) => {
    const categoryProducts = productsByCategoryId.get(categoryId) ?? [];
    const subs = subcategoriesByParent.get(categoryId) ?? [];
    const allProducts = [
      ...categoryProducts,
      ...subs.flatMap(s => productsByCategoryId.get(s.id) ?? []),
    ];
    const allSelected = allProducts.every(p => selectedIds.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      allProducts.forEach(p => (allSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

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
    setActionType('reassign-category');
    setTargetCategoryId('');
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const isFormValid =
    actionType === 'archive' || (actionType === 'reassign-category' && !!targetCategoryId);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Bulk Update"
        icon={<FolderInput size={24} />}
        onClose={handleClose}
        size="lg"
        fixedHeight
      >
        <div className="flex h-full min-h-0">
          {/* Left: Product selector */}
          <div className="w-[40%] border-r border-border flex flex-col min-h-0">
            <div className="relative p-2 flex-shrink-0">
              <Search className="absolute left-4 top-4 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-search w-full pl-7 text-xs"
              />
            </div>
            <div className="px-2 pb-1 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-2 pb-2 space-y-1">
                {topLevelCategories.map(cat => {
                  const directProducts = productsByCategoryId.get(cat.id) ?? [];
                  const subs = subcategoriesByParent.get(cat.id) ?? [];
                  const allProducts = [
                    ...directProducts,
                    ...subs.flatMap(s => productsByCategoryId.get(s.id) ?? []),
                  ];
                  if (allProducts.length === 0) return null;
                  const allSelected =
                    allProducts.length > 0 && allProducts.every(p => selectedIds.has(p.id));
                  const someSelected = allProducts.some(p => selectedIds.has(p.id));
                  return (
                    <CategoryGroup
                      key={cat.id}
                      name={cat.name}
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onToggle={() => toggleAllInCategory(cat.id)}
                    >
                      {subs.map(sub => {
                        const subProducts = productsByCategoryId.get(sub.id) ?? [];
                        if (subProducts.length === 0) return null;
                        return (
                          <div key={sub.id} className="ml-4">
                            <span className="text-xs font-medium text-muted-foreground">
                              {sub.name}
                            </span>
                            {subProducts.map(p => (
                              <ProductCheckbox
                                key={p.id}
                                product={p}
                                checked={selectedIds.has(p.id)}
                                onToggle={() => toggleProduct(p.id)}
                              />
                            ))}
                          </div>
                        );
                      })}
                      {directProducts.map(p => (
                        <ProductCheckbox
                          key={p.id}
                          product={p}
                          checked={selectedIds.has(p.id)}
                          onToggle={() => toggleProduct(p.id)}
                        />
                      ))}
                    </CategoryGroup>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Action form */}
          <div className="w-[60%] flex flex-col min-h-0">
            <div className="p-4 flex-shrink-0">
              <Tabs value={actionType} onChange={v => setActionType(v as BulkActionType)}>
                <Tab id="reassign-category" icon={<FolderInput size={14} />}>
                  Reassign Category
                </Tab>
                <Tab id="archive" icon={<Archive size={14} />}>
                  Archive
                </Tab>
              </Tabs>
            </div>

            <div className="px-4 flex-1">
              {actionType === 'reassign-category' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Move {selectedIds.size} selected product{selectedIds.size !== 1 ? 's' : ''} to a
                    different category.
                  </p>
                  <Select
                    label="Target Category"
                    options={categoryOptions}
                    value={targetCategoryId}
                    onChange={v => setTargetCategoryId(String(v ?? ''))}
                    fullWidth
                    renderOption={option => {
                      const isSub = !!option.description;
                      return isSub ? (
                        <span className="pl-4 text-sm">{option.label}</span>
                      ) : (
                        <span className="text-sm font-semibold">{option.label}</span>
                      );
                    }}
                  />
                </div>
              )}

              {actionType === 'archive' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Archive {selectedIds.size} selected product{selectedIds.size !== 1 ? 's' : ''}.
                    Archived products are hidden by default but their transaction history is
                    preserved.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setPendingAction(true)}
                disabled={selectedIds.size === 0 || !isFormValid}
                isLoading={bulkMutation.isPending}
              >
                {actionType === 'reassign-category' ? 'Reassign' : 'Archive'} ({selectedIds.size})
              </Button>
            </div>
          </div>
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

function CategoryGroup({
  name,
  checked,
  indeterminate,
  onToggle,
  children,
}: {
  name: string;
  checked: boolean;
  indeterminate: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <div className="flex items-center gap-1.5 py-0.5">
        <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="p-0.5">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <Checkbox checked={checked} indeterminate={indeterminate} onChange={onToggle} />
        <span className="text-xs font-semibold text-secondary-foreground">{name}</span>
      </div>
      {isExpanded && <div className="ml-4 space-y-0.5">{children}</div>}
    </div>
  );
}

function ProductCheckbox({
  product,
  checked,
  onToggle,
}: {
  product: ConsumableProductWithStock;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 pl-1">
      <Checkbox checked={checked} onChange={onToggle} />
      <span className="text-xs text-card-foreground truncate">{product.name}</span>
    </div>
  );
}
