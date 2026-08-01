/**
 * Equipment Bulk Update Modal
 *
 * Multi-select equipment items across categories and apply a bulk action:
 * log maintenance, change status, or relocate to a different category.
 */

import { useState, useCallback } from 'react';

import { Layers, Wrench, RefreshCw, FolderInput } from 'lucide-react';

import {
  useEquipmentBulkUpdateMutation,
  type EquipmentBulkAction,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { AccentTick, Button, Tabs, Tab } from '@shared/ui';
import {
  BulkCategoryTreeSelector,
  type BulkCategoryTreeSelectorLabels,
} from '@shared/ui/components/inventory';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { EquipmentBulkMaintenanceTab } from './bulk-update-tabs/EquipmentBulkMaintenanceTab';
import { EquipmentBulkRelocateTab } from './bulk-update-tabs/EquipmentBulkRelocateTab';
import { EquipmentBulkStatusTab } from './bulk-update-tabs/EquipmentBulkStatusTab';

import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentBulkStatusRequest,
  EquipmentBulkRelocateRequest,
  CreateEquipmentMaintenanceLogRequest,
  EquipmentBulkResponse,
} from '@odysseus/shared-schemas';

type BulkActionType = 'maintenance' | 'status' | 'relocate';

interface EquipmentBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: EquipmentItem[];
  categories: EquipmentCategory[];
}

const isEquipmentSelectable = (item: EquipmentItem) => item.status !== 'decommissioned';

const getEquipmentSecondaryText = (item: EquipmentItem) => [item.manufacturer, item.assetTag];

const BULK_SELECTOR_LABELS: BulkCategoryTreeSelectorLabels = {
  countNoun: ['unit', 'units'],
  filterPlaceholder: 'Filter equipment…',
  filterAriaLabel: 'Filter equipment',
  selectAllLabel: 'All Equipment',
  selectAllAriaLabel: 'Select all equipment',
  noMatch: 'No equipment matching',
};

export function EquipmentBulkUpdateModal({
  isOpen,
  onClose,
  items,
  categories,
}: EquipmentBulkUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BulkActionType>('maintenance');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [pendingAction, setPendingAction] = useState<EquipmentBulkAction | null>(null);
  const bulkMutation = useEquipmentBulkUpdateMutation();

  const handleResult = useCallback(
    (result: EquipmentBulkResponse) => {
      notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Updated' });
      setSelectedIds(new Set());
      onClose();
    },
    [onClose]
  );

  const handleMaintenanceSubmit = useCallback(
    (data: CreateEquipmentMaintenanceLogRequest) => {
      setPendingAction({ type: 'maintenance', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const handleStatusSubmit = useCallback(
    (data: EquipmentBulkStatusRequest['data']) => {
      setPendingAction({ type: 'status', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const handleRelocateSubmit = useCallback(
    (data: EquipmentBulkRelocateRequest['data']) => {
      setPendingAction({ type: 'relocate', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const confirmAction = useCallback(() => {
    if (!pendingAction) return;
    bulkMutation.mutate(pendingAction, {
      onSuccess: result => {
        handleResult(result);
        setPendingAction(null);
      },
      onError: () => {
        setPendingAction(null);
      },
    });
  }, [pendingAction, bulkMutation, handleResult]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setActionType('maintenance');
    setSearchQuery('');
    setIsFormValid(false);
    setPendingAction(null);
    onClose();
  }, [onClose]);

  const actionLabels: Record<BulkActionType, string> = {
    maintenance: 'Log Maintenance',
    status: 'Change Status',
    relocate: 'Relocate',
  };

  const itemLabel = selectedIds.size === 1 ? 'item' : 'items';

  const selectableCount = items.filter(i => i.status !== 'decommissioned').length;

  const locator = (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <AccentTick />
        <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
          {selectedIds.size} <span className="text-foreground/45">selected</span>
        </span>
      </span>
      <span className="flex-1" />
      <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/45">
        {selectableCount} total
      </span>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="bulk-action-form"
        variant="primary"
        size="sm"
        disabled={selectedIds.size === 0 || !isFormValid}
        isLoading={bulkMutation.isPending}
      >
        {actionLabels[actionType]} for {selectedIds.size} {itemLabel}
      </Button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Bulk Update"
        icon={<Layers className="w-4 h-4" />}
        onClose={handleClose}
        size="lg"
        fixedHeight
        locator={locator}
        contentClassName="p-0 h-full"
        footer={footer}
      >
        <div className="flex h-full min-h-0">
          <div className="w-2/5 border-r border-border p-4 flex flex-col min-h-0 overflow-auto bg-muted/30">
            <BulkCategoryTreeSelector
              categories={categories}
              items={items}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSelectable={isEquipmentSelectable}
              getSecondaryText={getEquipmentSecondaryText}
              labels={BULK_SELECTOR_LABELS}
            />
          </div>

          <div className="w-3/5 flex flex-col min-h-0">
            <div className="flex-shrink-0 border-b border-border">
              <Tabs
                value={actionType}
                onChange={v => setActionType(v as BulkActionType)}
                orientation="horizontal"
              >
                <Tab id="maintenance" icon={<Wrench className="w-3.5 h-3.5" />}>
                  Maintenance
                </Tab>
                <Tab id="status" icon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Status
                </Tab>
                <Tab id="relocate" icon={<FolderInput className="w-3.5 h-3.5" />}>
                  Relocate
                </Tab>
              </Tabs>
            </div>

            <ScrollArea className="flex-1 min-h-0 p-4">
              {actionType === 'maintenance' && (
                <EquipmentBulkMaintenanceTab
                  onSubmit={handleMaintenanceSubmit}
                  onValidityChange={setIsFormValid}
                />
              )}
              {actionType === 'status' && (
                <EquipmentBulkStatusTab
                  onSubmit={handleStatusSubmit}
                  onValidityChange={setIsFormValid}
                />
              )}
              {actionType === 'relocate' && (
                <EquipmentBulkRelocateTab
                  categories={categories}
                  onSubmit={handleRelocateSubmit}
                  onValidityChange={setIsFormValid}
                />
              )}
            </ScrollArea>
          </div>
        </div>
      </BaseModal>

      {pendingAction && (
        <ConfirmDialog
          isOpen={true}
          variant="warning"
          title="Confirm Bulk Update"
          message={`${actionLabels[pendingAction.type]} for ${pendingAction.itemIds.length} ${pendingAction.itemIds.length === 1 ? 'item' : 'items'}?`}
          confirmText="Apply"
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
          isLoading={bulkMutation.isPending}
        />
      )}
    </>
  );
}
