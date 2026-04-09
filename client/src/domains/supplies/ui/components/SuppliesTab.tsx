/**
 * Supplies Tab
 *
 * Main composition for the supplies management page with category browser,
 * detail panel, and form overlays in a 60/40 split layout.
 */

import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Package,
  MapPin,
  Layers,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useSupplyCategoriesQuery, useSupplyProductsQuery } from '@domains/supplies/hooks';
import { useDeleteSupplyCategoryMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Select, Tooltip, OverflowMenu } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { SupplyBulkUpdateModal } from './SupplyBulkUpdateModal';
import { SupplyCategoryModal } from './SupplyCategoryModal';
import { SupplyCategoryPanel } from './SupplyCategoryPanel';
import { SupplyLocationModal } from './SupplyLocationModal';
import { SupplyLowStockAlertPanel } from './SupplyLowStockAlertPanel';
import { SupplyProductForm } from './SupplyProductForm';
import { SupplyProductInfoPanel } from './SupplyProductInfoPanel';
import { SupplyQuickScanBar } from './SupplyQuickScanBar';
import { SupplyTransactionForm } from './SupplyTransactionForm';

import type { TransactionPrefill } from './SupplyTransactionForm';
import type { SupplyCategory, SupplyProductWithStock } from '@odysseus/shared-schemas';
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
  | { type: 'info'; productId: string }
  | { type: 'edit'; product?: SupplyProductWithStock }
  | {
      type: 'transaction';
      productId: string;
      initialTab?: TransactionTab;
      prefill?: TransactionPrefill;
    };

export function SuppliesTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const { data: categories = [] } = useSupplyCategoriesQuery();
  const { data: products = [] } = useSupplyProductsQuery();
  const deleteCategoryMutation = useDeleteSupplyCategoryMutation();

  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
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

  const handleSelectProduct = useCallback((id: string) => {
    setSelectedProductId(id);
    setRightPanel({ type: 'info', productId: id });
  }, []);

  const handleAddProduct = useCallback(() => {
    setRightPanel({ type: 'edit' });
  }, []);

  const handleEditProduct = useCallback(() => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      setRightPanel({ type: 'edit', product });
    }
  }, [selectedProductId, products]);

  const handleRecordTransaction = useCallback(() => {
    if (selectedProductId) {
      setRightPanel({ type: 'transaction', productId: selectedProductId });
    }
  }, [selectedProductId]);

  const handleScanViewProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setRightPanel({ type: 'info', productId });
  }, []);

  const handleScanRecordTransaction = useCallback(
    (productId: string, initialTab: TransactionTab) => {
      setSelectedProductId(productId);
      setRightPanel({ type: 'transaction', productId, initialTab });
    },
    []
  );

  const handleVoidAndReplace = useCallback(
    (productId: string, initialTab: TransactionTab, prefill: TransactionPrefill) => {
      setSelectedProductId(productId);
      setRightPanel({ type: 'transaction', productId, initialTab, prefill });
    },
    []
  );

  const handleFormComplete = useCallback(() => {
    if (selectedProductId) {
      setRightPanel({ type: 'info', productId: selectedProductId });
    } else {
      setRightPanel(undefined);
    }
  }, [selectedProductId]);

  const handleProductDeleted = useCallback(() => {
    setSelectedProductId(undefined);
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
      notifications.error('Cannot remove — category still contains products');
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
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-search w-full pl-8"
                />
              </div>
              <SupplyQuickScanBar
                products={products}
                onViewProduct={handleScanViewProduct}
                onRecordTransaction={handleScanRecordTransaction}
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <OverflowMenu items={bulkMenuItems} size="sm" aria-label="Actions" />
                <Button
                  size="sm"
                  onClick={handleAddProduct}
                  className="h-8"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Product
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

          <SupplyLowStockAlertPanel onSelectProduct={handleSelectProduct} />

          {/* Category list */}
          <ScrollArea className="flex-1">
            <SupplyCategoryPanel
              categories={categories}
              products={products}
              selectedProductId={selectedProductId}
              onSelectProduct={handleSelectProduct}
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
                <p className="text-card-foreground/40 text-sm">Select a product to view details</p>
              </div>
            </div>
          )}

          {rightPanel?.type === 'info' && (
            <SupplyProductInfoPanel
              productId={rightPanel.productId}
              onEdit={handleEditProduct}
              onRecordTransaction={handleRecordTransaction}
              onVoidAndReplace={handleVoidAndReplace}
              onDeleted={handleProductDeleted}
              categoryName={categoryNameMap.get(
                products.find(p => p.id === rightPanel.productId)?.categoryId ?? ''
              )}
            />
          )}

          {rightPanel?.type === 'edit' && (
            <SupplyProductForm
              product={rightPanel.product}
              categories={categories}
              onSubmit={handleFormComplete}
              onCancel={handleFormComplete}
            />
          )}

          {rightPanel?.type === 'transaction' &&
            (() => {
              const txnProduct = products.find(p => p.id === rightPanel.productId);
              return (
                <SupplyTransactionForm
                  key={`${rightPanel.productId}-${rightPanel.initialTab ?? 'received'}-${rightPanel.prefill ? 'prefill' : ''}`}
                  productId={rightPanel.productId}
                  productName={txnProduct?.name ?? ''}
                  manufacturer={txnProduct?.manufacturer}
                  catalogNumber={txnProduct?.catalogNumber}
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
        products={products}
        categories={categories}
      />
    </div>
  );
}
