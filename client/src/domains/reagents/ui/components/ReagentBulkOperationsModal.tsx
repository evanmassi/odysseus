/**
 * Reagent Bulk Operations Modal
 *
 * Binds the reagent catalog to the shared bulk chassis: which tabs it offers, what each renders,
 * and which mutation a selector tab runs.
 */

import { useCallback, useState } from 'react';

import { Archive, Ban, FolderInput, PackageMinus, PackagePlus, Printer } from 'lucide-react';

import { useReagentBulkUpdateMutation } from '@domains/reagents/hooks';
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

import { ReagentBulkIssueTab } from './bulk-operations/ReagentBulkIssueTab';
import { ReagentBulkReceiveTab } from './bulk-operations/ReagentBulkReceiveTab';
import { ReagentBulkVoidTab } from './bulk-operations/ReagentBulkVoidTab';
import { ReagentPrintOptionsPanel } from './bulk-operations/ReagentPrintOptionsPanel';
import { useReagentPrintLabels } from './bulk-operations/useReagentPrintLabels';

import type { ReagentCategory, ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReagentBulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReagentItemWithStock[];
  categories: ReagentCategory[];
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
  countNoun: ['reagent', 'reagents'],
  filterPlaceholder: 'Filter reagents…',
  filterAriaLabel: 'Filter reagents',
  selectAllLabel: 'All Reagents',
  selectAllAriaLabel: 'Select all reagents',
  noMatch: 'No reagents matching',
};

const isSelectable = (item: ReagentItemWithStock) => item.status === 'active';
const getSecondaryText = (item: ReagentItemWithStock) => [item.manufacturer, item.catalogNumber];

export function ReagentBulkOperationsModal({
  isOpen,
  onClose,
  items,
  categories,
}: ReagentBulkOperationsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const bulkMutation = useReagentBulkUpdateMutation();
  const labelState = useReagentPrintLabels(items, selectedIds);
  const printState = usePrintTabState(selectedIds, labelState.fetchLabels);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setTargetCategoryId('');
    printState.resetAll();
    labelState.reset();
    onClose();
  }, [onClose, printState, labelState]);

  const runBulk = useCallback(
    (action: Parameters<typeof bulkMutation.mutate>[0]) => {
      bulkMutation.mutate(action, {
        onSuccess: result => {
          notifyBulkResult(result, { entityLabel: 'reagents', actionVerb: 'Updated' });
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
          labelState.reset();
        }}
        selectorAction={tabId =>
          tabId === 'archive'
            ? {
                verb: 'Archive',
                title: 'Confirm Archive',
                isDanger: true,
                run: itemIds => runBulk({ type: 'archive', itemIds }),
              }
            : tabId === 'reassign-category'
              ? {
                  verb: 'Reassign',
                  title: 'Confirm Category Reassignment',
                  isReady: !!targetCategoryId,
                  run: itemIds =>
                    runBulk({ type: 'reassign-category', itemIds, categoryId: targetCategoryId }),
                }
              : undefined
        }
        renderSelectorFooterAction={tabId =>
          tabId === 'print' ? (
            <Button
              size="sm"
              onClick={() => void printState.handlePreviewPrint()}
              disabled={!printState.canPreview || labelState.labelCount === 0}
              isLoading={printState.isLoading}
              leftIcon={<Printer size={16} />}
            >
              Preview &amp; Print ({labelState.labelCount})
            </Button>
          ) : undefined
        }
        renderTab={tabId => {
          switch (tabId) {
            case 'receive':
              return <ReagentBulkReceiveTab items={items} onComplete={handleClose} />;
            case 'issue':
              return <ReagentBulkIssueTab items={items} onComplete={handleClose} />;
            case 'void':
              return <ReagentBulkVoidTab items={items} onComplete={handleClose} />;
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
                  countNoun={['reagent', 'reagents']}
                  state={printState}
                  renderExtraOptions={
                    <ReagentPrintOptionsPanel
                      items={items}
                      selectedIds={selectedIds}
                      state={labelState}
                    />
                  }
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
