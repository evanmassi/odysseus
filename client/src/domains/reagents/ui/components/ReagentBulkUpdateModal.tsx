/**
 * Reagent Bulk Update Modal
 *
 * Binds the reagent catalog to the shared bulk chassis. Receive, issue, void and print arrive in
 * later sub-commits and slot into the same tab list.
 */

import { useCallback, useState } from 'react';

import { Archive, FolderInput } from 'lucide-react';

import { useReagentBulkUpdateMutation } from '@domains/reagents/hooks';
import {
  BulkArchiveTab,
  BulkOperationsModal,
  BulkReassignTab,
  type BulkCategoryTreeSelectorLabels,
} from '@shared/ui/components/inventory';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import type { ReagentCategory, ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReagentBulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReagentItemWithStock[];
  categories: ReagentCategory[];
}

const TABS = [
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
        tabId === 'reassign-category'
          ? {
              verb: 'Reassign',
              title: 'Confirm Category Reassignment',
              isReady: !!targetCategoryId,
              run: itemIds =>
                runBulk({ type: 'reassign-category', itemIds, categoryId: targetCategoryId }),
            }
          : {
              verb: 'Archive',
              title: 'Confirm Archive',
              isDanger: true,
              run: itemIds => runBulk({ type: 'archive', itemIds }),
            }
      }
      renderTab={tabId =>
        tabId === 'reassign-category' ? (
          <BulkReassignTab
            categories={categories}
            selectedCount={selectedIds.size}
            targetCategoryId={targetCategoryId}
            onTargetChange={setTargetCategoryId}
          />
        ) : (
          <BulkArchiveTab selectedCount={selectedIds.size} />
        )
      }
    />
  );
}
