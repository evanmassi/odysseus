/**
 * Supply Bulk Update Modal
 *
 * Binds the supply catalog to the shared bulk chassis: which tabs it offers, what each renders,
 * and which mutation a selector tab runs.
 */

import { useCallback, useState } from 'react';

import { PackagePlus, PackageMinus, FolderInput, Archive, Ban, Printer } from 'lucide-react';

import { useSupplyBulkUpdateMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button } from '@shared/ui';
import { BarcodeSheetModal } from '@shared/ui/components/barcodes';
import {
  BulkArchiveTab,
  BulkOperationsModal,
  BulkPrintTab,
  BulkReassignTab,
  usePrintTabState,
  type BulkCategoryTreeSelectorLabels,
} from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { SupplyBulkIssueTab } from './bulk-update-tabs/SupplyBulkIssueTab';
import { SupplyBulkReceiveTab } from './bulk-update-tabs/SupplyBulkReceiveTab';
import { SupplyBulkVoidTab } from './bulk-update-tabs/SupplyBulkVoidTab';
import { fetchSupplyPrintLabels } from './bulk-update-tabs/supplyPrintLabels';

import type { SupplyCategory, SupplyItemWithStock } from '@odysseus/shared-schemas';

interface SupplyBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SupplyItemWithStock[];
  categories: SupplyCategory[];
}

const TABS = [
  { id: 'receive', label: 'Receive', icon: <PackagePlus size={12} />, layout: 'full' as const },
  { id: 'issue', label: 'Issue', icon: <PackageMinus size={12} />, layout: 'full' as const },
  { id: 'void', label: 'Void', icon: <Ban size={12} />, layout: 'full' as const },
  {
    id: 'reassign-category',
    label: 'Reassign',
    icon: <FolderInput size={12} />,
    layout: 'selector' as const,
  },
  { id: 'archive', label: 'Archive', icon: <Archive size={12} />, layout: 'selector' as const },
  { id: 'print', label: 'Print', icon: <Printer size={12} />, layout: 'selector' as const },
];

const SELECTOR_LABELS: BulkCategoryTreeSelectorLabels = {
  countNoun: ['item', 'items'],
  filterPlaceholder: 'Filter items…',
  filterAriaLabel: 'Filter items',
  selectAllLabel: 'All Items',
  selectAllAriaLabel: 'Select all items',
  noMatch: 'No items matching',
};

const isSelectable = (item: SupplyItemWithStock) => item.status === 'active';
const getSecondaryText = (item: SupplyItemWithStock) => [item.manufacturer, item.catalogNumber];

export function SupplyBulkUpdateModal({
  isOpen,
  onClose,
  items,
  categories,
}: SupplyBulkUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const bulkMutation = useSupplyBulkUpdateMutation();
  const fetchLabels = useCallback(
    (itemIds: string[]) => fetchSupplyPrintLabels(items, itemIds),
    [items]
  );
  const printState = usePrintTabState(selectedIds, fetchLabels);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setTargetCategoryId('');
    printState.resetAll();
    onClose();
  }, [onClose, printState]);

  const runBulk = useCallback(
    (action: Parameters<typeof bulkMutation.mutate>[0]) => {
      bulkMutation.mutate(action, {
        onSuccess: result => {
          notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Updated' });
          handleClose();
        },
      });
    },
    [bulkMutation, handleClose]
  );

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
        isSelectable={isSelectable}
        getSecondaryText={getSecondaryText}
        selectorLabels={SELECTOR_LABELS}
        onReset={() => {
          setTargetCategoryId('');
          printState.resetAll();
        }}
        selectorAction={tabId => {
          if (tabId === 'reassign-category') {
            return {
              verb: 'Reassign',
              title: 'Confirm Category Reassignment',
              isReady: !!targetCategoryId,
              run: itemIds =>
                runBulk({ type: 'reassign-category', itemIds, categoryId: targetCategoryId }),
            };
          }
          if (tabId === 'archive') {
            return {
              verb: 'Archive',
              title: 'Confirm Archive',
              isDanger: true,
              run: itemIds => runBulk({ type: 'archive', itemIds }),
            };
          }
          return undefined;
        }}
        renderSelectorFooterAction={tabId =>
          tabId === 'print' ? (
            <Button
              size="sm"
              onClick={() => void printState.handlePreviewPrint()}
              disabled={!printState.canPreview}
              isLoading={printState.isLoading}
              leftIcon={<Printer size={16} />}
            >
              Preview &amp; Print ({selectedIds.size})
            </Button>
          ) : undefined
        }
        renderTab={tabId => {
          switch (tabId) {
            case 'receive':
              return <SupplyBulkReceiveTab items={items} onComplete={handleClose} />;
            case 'issue':
              return <SupplyBulkIssueTab items={items} onComplete={handleClose} />;
            case 'void':
              return <SupplyBulkVoidTab items={items} onComplete={handleClose} />;
            case 'reassign-category':
              return (
                <BulkReassignTab
                  categories={categories}
                  selectedCount={selectedIds.size}
                  targetCategoryId={targetCategoryId}
                  onTargetChange={setTargetCategoryId}
                />
              );
            case 'archive':
              return <BulkArchiveTab selectedCount={selectedIds.size} />;
            case 'print':
              return (
                <BulkPrintTab
                  selectedCount={selectedIds.size}
                  countNoun={['item', 'items']}
                  state={printState}
                />
              );
            default:
              return null;
          }
        }}
      />

      {printState.isPreviewOpen && printState.printableLabels && (
        <BarcodeSheetModal
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
