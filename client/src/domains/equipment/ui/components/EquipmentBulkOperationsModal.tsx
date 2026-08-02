/**
 * Equipment Bulk Operations Modal
 *
 * Binds the equipment catalog to the shared bulk chassis: which tabs it offers, what each
 * renders, and which mutation the confirmed action runs.
 */

import { useState, useCallback } from 'react';

import { Wrench, RefreshCw, FolderInput } from 'lucide-react';

import {
  useEquipmentBulkUpdateMutation,
  type EquipmentBulkAction,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button } from '@shared/ui';
import {
  BulkOperationsModal,
  type BulkCategoryTreeSelectorLabels,
} from '@shared/ui/components/inventory';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { EquipmentBulkMaintenanceTab } from './bulk-operations/EquipmentBulkMaintenanceTab';
import { EquipmentBulkRelocateTab } from './bulk-operations/EquipmentBulkRelocateTab';
import { EquipmentBulkStatusTab } from './bulk-operations/EquipmentBulkStatusTab';

import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentBulkStatusRequest,
  EquipmentBulkRelocateRequest,
  CreateEquipmentMaintenanceLogRequest,
  EquipmentBulkResponse,
} from '@odysseus/shared-schemas';

type BulkActionType = 'maintenance' | 'status' | 'relocate';

interface EquipmentBulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: EquipmentItem[];
  categories: EquipmentCategory[];
}

const isEquipmentSelectable = (item: EquipmentItem) => item.status !== 'decommissioned';

const getEquipmentSecondaryText = (item: EquipmentItem) => [item.manufacturer, item.assetTag];

const TABS = [
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: <Wrench size={12} />,
    layout: 'selector' as const,
  },
  { id: 'status', label: 'Status', icon: <RefreshCw size={12} />, layout: 'selector' as const },
  {
    id: 'relocate',
    label: 'Relocate',
    icon: <FolderInput size={12} />,
    layout: 'selector' as const,
  },
];

const BULK_SELECTOR_LABELS: BulkCategoryTreeSelectorLabels = {
  countNoun: ['unit', 'units'],
  filterPlaceholder: 'Filter equipment…',
  filterAriaLabel: 'Filter equipment',
  selectAllLabel: 'All Equipment',
  selectAllAriaLabel: 'Select all equipment',
  noMatch: 'No equipment matching',
};

export function EquipmentBulkOperationsModal({
  isOpen,
  onClose,
  items,
  categories,
}: EquipmentBulkOperationsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BulkActionType>('maintenance');
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

  return (
    <>
      <BulkOperationsModal
        isOpen={isOpen}
        onClose={handleClose}
        items={items}
        categories={categories}
        tabs={TABS}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isPending={bulkMutation.isPending}
        isSelectable={isEquipmentSelectable}
        getSecondaryText={getEquipmentSecondaryText}
        selectorLabels={BULK_SELECTOR_LABELS}
        onReset={() => setIsFormValid(false)}
        selectorAction={() => undefined}
        renderSelectorFooterAction={() => (
          <Button
            type="submit"
            form="bulk-action-form"
            size="sm"
            disabled={selectedIds.size === 0 || !isFormValid}
            isLoading={bulkMutation.isPending}
          >
            {actionLabels[actionType]} for {selectedIds.size} {itemLabel}
          </Button>
        )}
        renderTab={tabId => {
          switch (tabId) {
            case 'maintenance':
              return (
                <EquipmentBulkMaintenanceTab
                  onSubmit={handleMaintenanceSubmit}
                  onValidityChange={setIsFormValid}
                />
              );
            case 'status':
              return (
                <EquipmentBulkStatusTab
                  onSubmit={handleStatusSubmit}
                  onValidityChange={setIsFormValid}
                />
              );
            case 'relocate':
              return (
                <EquipmentBulkRelocateTab
                  categories={categories}
                  onSubmit={handleRelocateSubmit}
                  onValidityChange={setIsFormValid}
                />
              );
            default:
              return null;
          }
        }}
      />

      {pendingAction && (
        <ConfirmDialog
          isOpen={true}
          variant="warning"
          title="Confirm Bulk Operation"
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
