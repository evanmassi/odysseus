/**
 * Reagents Tab
 *
 * Main composition for the reagent catalog: category browser on the left,
 * item detail column on the right.
 */

import { useState, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Biohazard, Eye, EyeOff, MapPin } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { LocationModal } from '@domains/lab-management';
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
  OverflowMenu,
  PanelHeader,
  SearchInput,
} from '@shared/ui';
import {
  CategoryModal,
  CategoryTreePanel,
  INVENTORY_SORT_OPTIONS,
  SortControls,
  type CategoryTreePanelLabels,
  type InventorySortField,
} from '@shared/ui/components/inventory';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { ReagentItemRow } from './ReagentItemRow';

import type { ReagentCategory, ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { OverflowMenuItem } from '@shared/ui/primitives/menus/types';

const isReagentHidden = (item: ReagentItemWithStock) => item.status === 'archived';

const getReagentSearchFields = (item: ReagentItemWithStock) => [
  item.name,
  item.manufacturer,
  item.catalogNumber,
  item.vendorName,
  item.reagentType,
  item.casNumber,
];

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
  const createCategoryMutation = useCreateReagentCategoryMutation();
  const updateCategoryMutation = useUpdateReagentCategoryMutation();
  const deleteCategoryMutation = useDeleteReagentCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<InventorySortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    parentId?: string;
    parentName?: string;
    category?: ReagentCategory;
  }>({ isOpen: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    category?: ReagentCategory;
  }>({ isOpen: false });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

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

  const handleRenameCategory = useCallback((category: ReagentCategory) => {
    setCategoryModal({ isOpen: true, parentId: category.parentId ?? undefined, category });
  }, []);

  const handleDeleteCategory = useCallback((category: ReagentCategory) => {
    setDeleteConfirm({ isOpen: true, category });
  }, []);

  const executeDeleteCategory = useCallback(() => {
    const category = deleteConfirm.category;
    if (!category) return;
    deleteCategoryMutation.mutate(category.id, {
      onSuccess: () => {
        notifications.success(`"${category.name}" removed`);
      },
      onSettled: () => {
        setDeleteConfirm({ isOpen: false });
      },
    });
  }, [deleteConfirm.category, deleteCategoryMutation]);

  const actionMenuItems: OverflowMenuItem[] = [
    { icon: MapPin, label: 'Manage Locations', onClick: () => setIsLocationModalOpen(true) },
  ];

  const itemCount = showArchived ? items.length : items.filter(i => i.status !== 'archived').length;
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

          <div className="flex flex-shrink-0 items-center gap-2 border-b border-line-faint px-3 py-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search reagents…"
              size="sm"
              className="w-64"
              aria-label="Search reagents"
            />
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
              onClick={() => setShowArchived(!showArchived)}
              className="h-8 text-label-sm"
              leftIcon={
                showArchived ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />
              }
            >
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
            <span className="flex-1" />
            {isAdmin && <OverflowMenu items={actionMenuItems} size="sm" aria-label="Actions" />}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
            <ScrollArea className="min-h-0 flex-1">
              <CategoryTreePanel
                categories={categories}
                items={items}
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
                    onSelect={setSelectedItemId}
                  />
                )}
                treeId="reagents"
                labels={TREE_LABELS}
                onAddCategory={handleAddCategory}
                onAddSubcategory={handleAddSubcategory}
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            </ScrollArea>
          </div>
        </ConsolePanel>

        <div
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: 'clamp(420px, 35%, 530px)' }}
        >
          <InfoPanelEmpty
            title="Reagent Information"
            emptyIcon={Biohazard}
            emptyMessage="Select an item to view details"
          />
        </div>

        <CategoryModal
          isOpen={categoryModal.isOpen}
          parentId={categoryModal.parentId}
          parentName={categoryModal.parentName}
          category={categoryModal.category}
          onClose={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))}
          onCreate={(name, parentId) => createCategoryMutation.mutateAsync({ name, parentId })}
          onRename={(id, name) => updateCategoryMutation.mutateAsync({ id, data: { name } })}
          isPending={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          categoryPlaceholder="e.g., Antibodies"
          subcategoryPlaceholder="e.g., Primary"
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

        <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      </div>
    </div>
  );
}
