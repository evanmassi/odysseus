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
  useCreateEquipmentCategoryMutation,
  useAddEquipmentDocumentMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button } from '@shared/ui';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import { EquipmentCategoryPanel } from './EquipmentCategoryPanel';
import { EquipmentEditForm } from './EquipmentEditForm';
import { EquipmentItemInfoPanel } from './EquipmentItemInfoPanel';
import { EquipmentMaintenanceForm } from './EquipmentMaintenanceForm';

import type { EquipmentItem, EquipmentMaintenanceLog } from '@odysseus/shared-schemas';

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
  const createCategoryMutation = useCreateEquipmentCategoryMutation();
  const addDocumentMutation = useAddEquipmentDocumentMutation();

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [rightPanel, setRightPanel] = useState<RightPanelView | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDecommissioned, setShowDecommissioned] = useState(false);

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

  const handleAddCategory = useCallback(async () => {
    const name = window.prompt('Category name:');
    if (!name?.trim()) return;
    try {
      await createCategoryMutation.mutateAsync({ name: name.trim() });
      notifications.success(`Category "${name.trim()}" created`);
    } catch {
      notifications.error('Failed to create category');
    }
  }, [createCategoryMutation]);

  const handleAddSubcategory = useCallback(
    async (parentId: string) => {
      const name = window.prompt('Subcategory name:');
      if (!name?.trim()) return;
      try {
        await createCategoryMutation.mutateAsync({ name: name.trim(), parentId });
        notifications.success(`Subcategory "${name.trim()}" created`);
      } catch {
        notifications.error('Failed to create subcategory');
      }
    },
    [createCategoryMutation]
  );

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
            onAddCategory={() => void handleAddCategory()}
            onAddSubcategory={parentId => void handleAddSubcategory(parentId)}
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
    </div>
  );
}
