/**
 * Supply Bulk Update Modal
 *
 * Unified bulk operations modal with tabbed actions: receive, issue, reassign
 * category, archive, void, and print. Item selector for reassign/archive/print
 * tabs; row-based forms for receive/issue; transaction selector for void.
 */

import { useState, useCallback } from 'react';

import {
  Layers,
  PackagePlus,
  PackageMinus,
  FolderInput,
  Archive,
  Ban,
  Printer,
} from 'lucide-react';

import { useSupplyBulkUpdateMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Tabs, Tab } from '@shared/ui';
import {
  BulkCategoryTreeSelector,
  type BulkCategoryTreeSelectorLabels,
} from '@shared/ui/components/inventory';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { notifications } from '@shared/utils/notifications';

import { BulkArchiveTab } from './bulk-update-tabs/BulkArchiveTab';
import { BulkIssueTab } from './bulk-update-tabs/BulkIssueTab';
import { BulkPrintTab, usePrintTabState } from './bulk-update-tabs/BulkPrintTab';
import { BulkReassignTab } from './bulk-update-tabs/BulkReassignTab';
import { BulkReceiveTab } from './bulk-update-tabs/BulkReceiveTab';
import { BulkVoidTab } from './bulk-update-tabs/BulkVoidTab';
import { SupplyBarcodeSheetModal } from './SupplyBarcodeSheetModal';

import type {
  SupplyCategory,
  SupplyItemWithStock,
  SupplyBulkResponse,
} from '@odysseus/shared-schemas';

type BulkActionType = 'receive' | 'issue' | 'reassign-category' | 'archive' | 'void' | 'print';

const SELECTOR_TABS = new Set<BulkActionType>(['reassign-category', 'archive', 'print']);

interface SupplyBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SupplyItemWithStock[];
  categories: SupplyCategory[];
}

const isSupplySelectable = (item: SupplyItemWithStock) => item.status === 'active';

const getSupplySecondaryText = (item: SupplyItemWithStock) => [
  item.manufacturer,
  item.catalogNumber,
];

const BULK_SELECTOR_LABELS: BulkCategoryTreeSelectorLabels = {
  countNoun: ['item', 'items'],
  filterPlaceholder: 'Filter items…',
  filterAriaLabel: 'Filter items',
  selectAllLabel: 'All Items',
  selectAllAriaLabel: 'Select all items',
  noMatch: 'No items matching',
};

export function SupplyBulkUpdateModal({
  isOpen,
  onClose,
  items,
  categories,
}: SupplyBulkUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BulkActionType>('receive');
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [pendingAction, setPendingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bulkMutation = useSupplyBulkUpdateMutation();
  const printState = usePrintTabState(items, selectedIds);

  const showSelector = SELECTOR_TABS.has(actionType);
  const selectableCount = items.filter(p => p.status === 'active').length;

  const locator = (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-2.5 w-0.5 flex-shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
        />
        <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
          {selectableCount} <span className="text-foreground/45">items</span>
        </span>
      </span>
      {showSelector && (
        <>
          <span className="flex-1" />
          <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/45">
            {selectedIds.size} selected
          </span>
        </>
      )}
    </div>
  );

  const handleResult = useCallback(
    (result: SupplyBulkResponse) => {
      notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Updated' });
      setSelectedIds(new Set());
      onClose();
    },
    [onClose]
  );

  const handleConfirm = useCallback(async () => {
    const itemIds = Array.from(selectedIds);
    try {
      let result: SupplyBulkResponse;
      if (actionType === 'reassign-category') {
        result = await bulkMutation.mutateAsync({
          type: 'reassign-category',
          itemIds,
          categoryId: targetCategoryId,
        });
      } else {
        result = await bulkMutation.mutateAsync({ type: 'archive', itemIds });
      }
      handleResult(result);
    } catch {
      notifications.error('Failed to update items');
    }
    setPendingAction(false);
  }, [selectedIds, actionType, targetCategoryId, bulkMutation, handleResult]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setActionType('receive');
    setTargetCategoryId('');
    setSearchQuery('');
    printState.resetAll();
    onClose();
  }, [onClose, printState]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActionType(tab as BulkActionType);
      setSelectedIds(new Set());
      setTargetCategoryId('');
      printState.resetAll();
    },
    [printState]
  );

  const isFormValid =
    actionType === 'archive' || (actionType === 'reassign-category' && !!targetCategoryId);

  // Selector-tab footer — runs the full modal width via BaseModal's footer slot
  // (the receive/issue/void tabs carry their own footers).
  const selectorFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      {actionType === 'print' ? (
        <Button
          size="sm"
          onClick={() => void printState.handlePreviewPrint()}
          disabled={!printState.canPreview}
          isLoading={printState.isLoading}
          leftIcon={<Printer size={16} />}
        >
          Preview & Print ({selectedIds.size})
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => setPendingAction(true)}
          disabled={selectedIds.size === 0 || !isFormValid}
          isLoading={bulkMutation.isPending}
          variant={actionType === 'archive' ? 'danger' : 'primary'}
        >
          {actionType === 'reassign-category' ? 'Reassign' : 'Archive'} ({selectedIds.size})
        </Button>
      )}
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Bulk Operations"
        icon={<Layers size={24} />}
        onClose={handleClose}
        size="lg"
        fixedHeight
        locator={locator}
        footer={showSelector ? selectorFooter : undefined}
        contentClassName="p-0 h-full"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-shrink-0 border-b border-border px-4">
            <Tabs
              value={actionType}
              onChange={handleTabChange}
              orientation="horizontal"
              className="!gap-0 !px-0 [&_button]:!px-2.5 [&_button]:flex-1 [&_button]:justify-center"
            >
              <Tab id="receive" icon={<PackagePlus size={14} />}>
                Receive
              </Tab>
              <Tab id="issue" icon={<PackageMinus size={14} />}>
                Issue
              </Tab>
              <Tab id="void" icon={<Ban size={14} />}>
                Void
              </Tab>
              <Tab id="reassign-category" icon={<FolderInput size={14} />}>
                Reassign
              </Tab>
              <Tab id="archive" icon={<Archive size={14} />}>
                Archive
              </Tab>
              <Tab id="print" icon={<Printer size={14} />}>
                Print
              </Tab>
            </Tabs>
          </div>

          {showSelector ? (
            <div className="flex flex-1 min-h-0">
              <div className="w-2/5 border-r border-border p-4 flex flex-col min-h-0 overflow-auto bg-muted/30">
                <BulkCategoryTreeSelector
                  items={items}
                  categories={categories}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isSelectable={isSupplySelectable}
                  getSecondaryText={getSupplySecondaryText}
                  labels={BULK_SELECTOR_LABELS}
                />
              </div>

              <div className="w-3/5 flex flex-col min-h-0 overflow-auto">
                <div className="px-4 pt-4 flex-1">
                  {actionType === 'reassign-category' && (
                    <BulkReassignTab
                      categories={categories}
                      selectedCount={selectedIds.size}
                      targetCategoryId={targetCategoryId}
                      onTargetChange={setTargetCategoryId}
                    />
                  )}
                  {actionType === 'archive' && <BulkArchiveTab selectedCount={selectedIds.size} />}
                  {actionType === 'print' && (
                    <BulkPrintTab selectedCount={selectedIds.size} state={printState} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              {actionType === 'receive' && (
                <BulkReceiveTab items={items} onComplete={handleClose} />
              )}
              {actionType === 'issue' && <BulkIssueTab items={items} onComplete={handleClose} />}
              {actionType === 'void' && <BulkVoidTab items={items} onComplete={handleClose} />}
            </div>
          )}
        </div>
      </BaseModal>

      <ConfirmDialog
        isOpen={pendingAction}
        variant={actionType === 'archive' ? 'danger' : 'warning'}
        title={
          actionType === 'reassign-category' ? 'Confirm Category Reassignment' : 'Confirm Archive'
        }
        message={`${actionType === 'reassign-category' ? 'Reassign' : 'Archive'} ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}?`}
        confirmText={actionType === 'reassign-category' ? 'Reassign' : 'Archive'}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPendingAction(false)}
      />

      {printState.isPreviewOpen && printState.printableLabels && (
        <SupplyBarcodeSheetModal
          isOpen={printState.isPreviewOpen}
          onClose={printState.closePreview}
          labels={printState.printableLabels}
          template={printState.currentTemplate}
          startingPosition={printState.startingPosition}
          format={printState.format}
        />
      )}
    </>
  );
}
