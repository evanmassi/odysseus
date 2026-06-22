/**
 * Equipment Tab
 *
 * Main composition for the equipment management page with category browser,
 * detail panel, and form overlays in a 60/40 split layout.
 */

import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Layers, Plus, Eye, EyeOff, ArrowUp, ArrowDown, Microscope } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useEquipmentCategoriesQuery, useEquipmentItemsQuery } from '@domains/equipment/hooks';
import { useDeleteEquipmentCategoryMutation } from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, HeaderStrip, PanelHeader, SearchInput, Select, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { EquipmentBulkUpdateModal } from './EquipmentBulkUpdateModal';
import { EquipmentCategoryModal } from './EquipmentCategoryModal';
import { EquipmentCategoryPanel } from './EquipmentCategoryPanel';
import { EquipmentDecommissionForm } from './EquipmentDecommissionForm';
import { EquipmentEditForm } from './EquipmentEditForm';
import { EquipmentInfoPanelEmpty } from './EquipmentInfoPanelEmpty';
import { EquipmentItemInfoPanel } from './EquipmentItemInfoPanel';
import { EquipmentMaintenanceAlertPanel } from './EquipmentMaintenanceAlertPanel';
import { EquipmentMaintenanceForm } from './EquipmentMaintenanceForm';

import type {
  EquipmentCategory,
  EquipmentItem,
  EquipmentMaintenanceLog,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

type SortField = 'name' | 'manufacturer' | 'dateAdded';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'dateAdded', label: 'Date Added' },
];

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
  const deleteCategoryMutation = useDeleteEquipmentCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    parentId?: string;
    parentName?: string;
    category?: EquipmentCategory;
  }>({ isOpen: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    category?: EquipmentCategory;
  }>({ isOpen: false });

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

  const handleRenameCategory = useCallback((category: EquipmentCategory) => {
    setCategoryModal({ isOpen: true, parentId: category.parentId ?? undefined, category });
  }, []);

  const handleDeleteCategory = useCallback((category: EquipmentCategory) => {
    setDeleteConfirm({ isOpen: true, category });
  }, []);

  const executeDeleteCategory = useCallback(async () => {
    if (!deleteConfirm.category) return;
    try {
      await deleteCategoryMutation.mutateAsync(deleteConfirm.category.id);
      notifications.success(`"${deleteConfirm.category.name}" removed`);
    } catch {
      notifications.error('Cannot remove — category still contains equipment');
    }
    setDeleteConfirm({ isOpen: false });
  }, [deleteConfirm.category, deleteCategoryMutation]);

  const unitCount = showDecommissioned
    ? items.length
    : items.filter(i => i.status !== 'decommissioned').length;
  const categoryCount = categories.filter(c => !c.parentId).length;

  return (
    <div className="flex justify-center h-full min-h-0 px-4 pb-4 pt-2">
      <div className="flex gap-4 h-full min-h-0 w-full max-w-[1700px]">
        {/* Left Panel: Equipment list chassis */}
        <ConsolePanel
          intensity="soft"
          className="flex max-h-full min-h-0 min-w-0 flex-1 flex-col self-start"
        >
          <div className="flex-shrink-0 border-b border-line-faint pr-4">
            <PanelHeader icon={<Microscope className="h-4 w-4" />} title="Equipment" />
          </div>

          {/* Locator strip: inventory counts */}
          <HeaderStrip className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-0.5 flex-shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
              />
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

          {/* Toolbar: search · sort · decommissioned · actions — the table's own header */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-line-faint px-3 py-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search equipment…"
              size="sm"
              className="w-64"
              aria-label="Search equipment"
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
              onClick={() => setShowDecommissioned(!showDecommissioned)}
              className="h-8 text-label-sm"
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
            <span className="flex-1" />
            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="h-8"
                  leftIcon={<Layers className="h-3.5 w-3.5" />}
                >
                  Bulk Update
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddEquipment}
                  className="h-8"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Equipment
                </Button>
              </>
            )}
          </div>

          {/* Body: pinned maintenance alerts + scrolling category tree */}
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
            <EquipmentMaintenanceAlertPanel
              items={items}
              categoryNameMap={categoryNameMap}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
            <ScrollArea className="min-h-0 flex-1">
              <EquipmentCategoryPanel
                categories={categories}
                items={items}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
                showDecommissioned={showDecommissioned}
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

        {/* Right Panel: Detail / Edit / Maintenance */}
        <div
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: 'clamp(420px, 35%, 530px)' }}
        >
          {!rightPanel && <EquipmentInfoPanelEmpty />}

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

        <EquipmentCategoryModal
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
      </div>

      <EquipmentBulkUpdateModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        items={items}
        categories={categories}
      />
    </div>
  );
}
