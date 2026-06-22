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
import {
  Button,
  HeaderStrip,
  OverflowMenu,
  PanelHeader,
  SearchInput,
  Select,
  Tooltip,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { SupplyBulkUpdateModal } from './SupplyBulkUpdateModal';
import { SupplyCategoryModal } from './SupplyCategoryModal';
import { SupplyCategoryPanel } from './SupplyCategoryPanel';
import { SupplyInfoPanelEmpty } from './SupplyInfoPanelEmpty';
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

  const itemCount = showArchived ? items.length : items.filter(p => p.status !== 'archived').length;
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
              <span
                aria-hidden
                className="h-2.5 w-0.5 flex-shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
              />
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
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-line-faint px-3 py-2">
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
            <span className="flex-shrink-0 text-body-sm font-medium text-secondary-foreground">
              Sort
            </span>
            <Select
              options={SORT_OPTIONS}
              value={sortField}
              onChange={value => setSortField(value as SortField)}
              size="xs"
              aria-label="Sort field"
              className="w-32"
            />
            <Tooltip content={sortDirection === 'asc' ? 'Ascending' : 'Descending'} side="bottom">
              <button
                type="button"
                onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
                className="rounded p-1 text-secondary-foreground transition-colors hover:bg-secondary hover:text-accent-foreground"
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="h-8 text-label-sm"
              leftIcon={
                showArchived ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />
              }
            >
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
            <span className="flex-1" />
            {isAdmin && (
              <>
                <OverflowMenu items={bulkMenuItems} size="sm" aria-label="Actions" />
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Item
                </Button>
              </>
            )}
          </div>

          {/* Body: pinned low-stock alerts + scrolling category tree */}
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
            <SupplyLowStockAlertPanel
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
            <ScrollArea className="min-h-0 flex-1">
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
        </ConsolePanel>

        {/* Right Panel: Detail / Edit / Transaction */}
        <div
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: 'clamp(420px, 35%, 530px)' }}
        >
          {!rightPanel && <SupplyInfoPanelEmpty />}

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
