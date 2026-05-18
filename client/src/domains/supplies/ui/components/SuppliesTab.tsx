/**
 * Supplies Tab
 *
 * Main composition for the supplies management page with category browser,
 * detail panel, and form overlays in a 60/40 split layout.
 */

import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Plus, Eye, EyeOff, ArrowUp, ArrowDown, Package, MapPin, Layers } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useSupplyCategoriesQuery, useSupplyItemsQuery } from '@domains/supplies/hooks';
import { useDeleteSupplyCategoryMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, SearchInput, Select, Tooltip, OverflowMenu } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { SupplyBulkUpdateModal } from './SupplyBulkUpdateModal';
import { SupplyCategoryModal } from './SupplyCategoryModal';
import { SupplyCategoryPanel } from './SupplyCategoryPanel';
import { SupplyItemForm } from './SupplyItemForm';
import { SupplyItemInfoPanel } from './SupplyItemInfoPanel';
import { SupplyLocationModal } from './SupplyLocationModal';
import { SupplyLowStockAlertPanel } from './SupplyLowStockAlertPanel';
import { SupplyQuickScanBar } from './SupplyQuickScanBar';
import { SupplyTransactionForm } from './SupplyTransactionForm';

import type { TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyCategory, SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';
import type { OverflowMenuItem } from '@shared/ui/primitives/menus/types';

type SortField = 'name' | 'manufacturer' | 'dateAdded';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'dateAdded', label: 'Date Added' },
];

type TransactionTab = 'received' | 'issued' | 'count' | 'disposed';

type RightPanelView =
  | { type: 'info'; itemId: string }
  | { type: 'edit'; item?: SupplyItemWithStock }
  | {
      type: 'transaction';
      itemId: string;
      initialTab?: TransactionTab;
      prefill?: TransactionPrefill;
    };

export function SuppliesTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const { data: categories = [] } = useSupplyCategoriesQuery();
  const { data: items = [] } = useSupplyItemsQuery();
  const deleteCategoryMutation = useDeleteSupplyCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    parentId?: string;
    parentName?: string;
    category?: SupplyCategory;
  }>({ isOpen: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    category?: SupplyCategory;
  }>({ isOpen: false });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      const parentName = c.parentId ? categories.find(p => p.id === c.parentId)?.name : undefined;
      map.set(c.id, parentName ? `${parentName} > ${c.name}` : c.name);
    });
    return map;
  }, [categories]);

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

  const handleScanRecordTransaction = useCallback((itemId: string, initialTab: TransactionTab) => {
    setSelectedItemId(itemId);
    setRightPanel({ type: 'transaction', itemId, initialTab });
  }, []);

  const handleVoidAndReplace = useCallback(
    (itemId: string, initialTab: TransactionTab, prefill: TransactionPrefill) => {
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

  const handleAddCategory = useCallback(() => {
    setCategoryModal({ isOpen: true });
  }, []);

  const handleAddSubcategory = useCallback(
    (parentId: string) => {
      const parent = categories.find(c => c.id === parentId);
      setCategoryModal({ isOpen: true, parentId, parentName: parent?.name });
    },
    [categories]
  );

  const handleRenameCategory = useCallback((category: SupplyCategory) => {
    setCategoryModal({ isOpen: true, parentId: category.parentId ?? undefined, category });
  }, []);

  const handleDeleteCategory = useCallback((category: SupplyCategory) => {
    setDeleteConfirm({ isOpen: true, category });
  }, []);

  const executeDeleteCategory = useCallback(async () => {
    if (!deleteConfirm.category) return;
    try {
      await deleteCategoryMutation.mutateAsync(deleteConfirm.category.id);
      notifications.success(`"${deleteConfirm.category.name}" removed`);
    } catch {
      notifications.error('Cannot remove — category still contains items');
    }
    setDeleteConfirm({ isOpen: false });
  }, [deleteConfirm.category, deleteCategoryMutation]);

  const bulkMenuItems: OverflowMenuItem[] = [
    { icon: MapPin, label: 'Manage Locations', onClick: () => setIsLocationModalOpen(true) },
    { icon: Layers, label: 'Bulk Operations', onClick: () => setIsBulkUpdateOpen(true) },
  ];

  return (
    <div className="flex justify-center h-full min-h-0 px-4 pb-4 pt-2">
      <div className="flex gap-4 h-full min-h-0 w-full max-w-[1700px]">
        {/* Left Panel: Category Browser */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Row 1: Search + Actions */}
          <div className="flex items-center justify-between gap-4 mb-2 flex-shrink-0 px-0.5">
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search supplies…"
                size="sm"
                className="w-64"
                aria-label="Search supplies"
              />
              <SupplyQuickScanBar
                items={items}
                onViewItem={handleScanViewItem}
                onRecordTransaction={handleScanRecordTransaction}
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <OverflowMenu items={bulkMenuItems} size="sm" aria-label="Actions" />
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Item
                </Button>
              </div>
            )}
          </div>

          {/* Row 2: Sort + Show Archived */}
          <div className="flex items-center gap-2 h-8 px-0.5 mb-2 flex-shrink-0">
            <span className="text-xs font-medium text-secondary-foreground">Sort:</span>
            <Select
              options={SORT_OPTIONS}
              value={sortField}
              onChange={value => setSortField(value as SortField)}
              size="xs"
              variant="default"
              aria-label="Sort field"
              className="w-32"
            />
            <Tooltip content={sortDirection === 'asc' ? 'Ascending' : 'Descending'} side="bottom">
              <button
                type="button"
                onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-1 text-secondary-foreground hover:text-accent-foreground hover:bg-secondary rounded transition-colors"
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="h-8 text-xs"
              leftIcon={
                showArchived ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />
              }
            >
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
          </div>

          <SupplyLowStockAlertPanel onSelectItem={handleSelectItem} />

          {/* Category list */}
          <ScrollArea className="flex-1">
            <SupplyCategoryPanel
              categories={categories}
              items={items}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
              showArchived={showArchived}
              searchQuery={searchQuery}
              isAdmin={isAdmin}
              onAddCategory={handleAddCategory}
              onAddSubcategory={handleAddSubcategory}
              onRenameCategory={handleRenameCategory}
              onDeleteCategory={handleDeleteCategory}
              sortField={sortField}
              sortDirection={sortDirection}
            />
          </ScrollArea>
        </div>

        {/* Right Panel: Detail / Edit / Transaction */}
        <div
          className="flex-shrink-0 flex flex-col min-h-0 overflow-hidden bg-card rounded-lg"
          style={{ width: 'clamp(420px, 35%, 530px)' }}
        >
          {!rightPanel && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-card-foreground/30" />
                </div>
                <p className="text-card-foreground/40 text-sm">Select a item to view details</p>
              </div>
            </div>
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

        <SupplyCategoryModal
          isOpen={categoryModal.isOpen}
          parentId={categoryModal.parentId}
          parentName={categoryModal.parentName}
          category={categoryModal.category}
          onClose={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))}
        />

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          variant="danger"
          title="Remove Category"
          message={`Are you sure you want to remove "${deleteConfirm.category?.name ?? ''}"? This action cannot be undone.`}
          confirmText="Remove"
          onConfirm={() => void executeDeleteCategory()}
          onCancel={() => setDeleteConfirm({ isOpen: false })}
        />

        <SupplyLocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
        />
      </div>

      <SupplyBulkUpdateModal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        items={items}
        categories={categories}
      />
    </div>
  );
}
