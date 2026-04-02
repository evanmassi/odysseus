/**
 * Equipment Tab
 *
 * Main composition for the equipment management page with category browser,
 * detail panel, and form overlays in a 60/40 split layout.
 */

import { useState, useMemo, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Plus, Search, Eye, EyeOff } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useEquipmentCategoriesQuery, useEquipmentItemsQuery } from '@domains/equipment/hooks';
import {
  useAddEquipmentDocumentMutation,
  useDeleteEquipmentCategoryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { EquipmentCategoryModal } from './EquipmentCategoryModal';
import { EquipmentCategoryPanel } from './EquipmentCategoryPanel';
import { EquipmentEditForm } from './EquipmentEditForm';
import { EquipmentItemInfoPanel } from './EquipmentItemInfoPanel';
import { EquipmentMaintenanceForm } from './EquipmentMaintenanceForm';

import type {
  EquipmentCategory,
  EquipmentItem,
  EquipmentMaintenanceLog,
} from '@odysseus/shared-schemas';

type RightPanelView =
  | { type: 'info'; itemId: string }
  | { type: 'edit'; item?: EquipmentItem }
  | { type: 'decommission'; itemId: string }
  | { type: 'addDocument'; itemId: string }
  | { type: 'maintenance'; itemId: string; entry?: EquipmentMaintenanceLog };

export function EquipmentTab() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const { data: categories = [] } = useEquipmentCategoriesQuery();
  const { data: items = [] } = useEquipmentItemsQuery();
  const addDocumentMutation = useAddEquipmentDocumentMutation();
  const deleteCategoryMutation = useDeleteEquipmentCategoryMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDecommissioned, setShowDecommissioned] = useState(false);
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
    (entryId: string) => {
      if (!selectedItemId) return;
      // The entry details will be fetched by the form via the detail query
      setRightPanel({
        type: 'maintenance',
        itemId: selectedItemId,
        entry: { id: entryId } as EquipmentMaintenanceLog,
      });
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

  const handleAddDocumentSubmit = useCallback(async () => {
    if (!selectedItemId) return;
    const label = window.prompt('Document label (e.g., "User Manual"):');
    if (!label?.trim()) return;
    const url = window.prompt('Document URL:');
    if (!url?.trim()) return;
    try {
      await addDocumentMutation.mutateAsync({
        itemId: selectedItemId,
        data: { label: label.trim(), url: url.trim() },
      });
      notifications.success('Document added');
      setRightPanel({ type: 'info', itemId: selectedItemId });
    } catch {
      notifications.error('Failed to add document');
    }
  }, [selectedItemId, addDocumentMutation]);

  return (
    <div className="flex gap-4 h-full min-h-0 p-4">
      {/* Left Panel: Category Browser */}
      <div className="w-[60%] min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-2 mb-3 flex-shrink-0 px-0.5">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDecommissioned(!showDecommissioned)}
            className="h-8 text-xs"
            leftIcon={
              showDecommissioned ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )
            }
          >
            {showDecommissioned ? 'Hide' : 'Show'} Decommissioned
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleAddEquipment}
              className="h-8"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Equipment
            </Button>
          )}
        </div>

        {/* Category list */}
        <ScrollArea className="flex-1">
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
          />
        </ScrollArea>
      </div>

      {/* Right Panel: Detail / Edit / Maintenance */}
      <div className="w-[40%] flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-l border-border">
        {!rightPanel && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select an equipment item to view details
          </div>
        )}

        {rightPanel?.type === 'info' && (
          <EquipmentItemInfoPanel
            itemId={rightPanel.itemId}
            onEdit={handleEditItem}
            onDecommission={handleDecommission}
            onAddDocument={() => void handleAddDocumentSubmit()}
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
  );
}
