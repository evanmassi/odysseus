/**
 * Reagent Bulk Update Modal
 *
 * Binds the reagent catalog to the shared bulk chassis. Void and print arrive in later
 * sub-commits and slot into the same tab list.
 */

import { useCallback, useState } from 'react';

import { Archive, FolderInput, PackageMinus, PackagePlus } from 'lucide-react';

import { useReagentBulkUpdateMutation } from '@domains/reagents/hooks';
import {
  BulkArchiveTab,
  BulkOperationsModal,
  BulkReassignTab,
  type BulkCategoryTreeSelectorLabels,
} from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import { ReagentBulkIssueTab } from './bulk-update-tabs/ReagentBulkIssueTab';
import { ReagentBulkReceiveTab } from './bulk-update-tabs/ReagentBulkReceiveTab';

import type { ReagentCategory, ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReagentBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReagentItemWithStock[];
  categories: ReagentCategory[];
}

const TABS = [
  { id: 'receive', label: 'Receive', icon: <PackagePlus size={12} />, layout: 'full' as const },
  { id: 'issue', label: 'Issue', icon: <PackageMinus size={12} />, layout: 'full' as const },
  {
    id: 'reassign-category',
    label: 'Reassign',
    icon: <FolderInput size={12} />,
    layout: 'selector' as const,
  },
  { id: 'archive', label: 'Archive', icon: <Archive size={12} />, layout: 'selector' as const },
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

export function ReagentBulkUpdateModal({
  isOpen,
  onClose,
  items,
  categories,
}: ReagentBulkUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const bulkMutation = useReagentBulkUpdateMutation();

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setTargetCategoryId('');
    onClose();
  }, [onClose]);

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
      onReset={() => setTargetCategoryId('')}
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
      renderTab={tabId => {
        switch (tabId) {
          case 'receive':
            return <ReagentBulkReceiveTab items={items} onComplete={handleClose} />;
          case 'issue':
            return <ReagentBulkIssueTab items={items} onComplete={handleClose} />;
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
          default:
            return null;
        }
      }}
    />
  );
}
