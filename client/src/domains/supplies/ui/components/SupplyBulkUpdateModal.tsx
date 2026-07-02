/**
 * Supply Bulk Update Modal
 *
 * Unified bulk operations modal with tabbed actions: receive, issue, reassign
 * category, archive, void, and print. Item selector for reassign/archive/print
 * tabs; row-based forms for receive/issue; transaction selector for void.
 */

import { useState, useMemo, useCallback } from 'react';

import {
  Layers,
  PackagePlus,
  PackageMinus,
  FolderInput,
  Archive,
  Ban,
  Printer,
  FolderOpen,
  CornerDownRight,
} from 'lucide-react';

import { useSupplyBulkUpdateMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Checkbox, NubDivider, SearchInput, Tabs, Tab } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { BulkSelectTreeLines } from '@shared/ui/components/tree-lines';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
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
                <ItemSelector
                  items={items}
                  categories={categories}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
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

interface CategoryGroup {
  category: SupplyCategory;
  items: SupplyItemWithStock[];
  subcategories: Array<{
    category: SupplyCategory;
    items: SupplyItemWithStock[];
  }>;
}

function buildCategoryGroups(
  categories: SupplyCategory[],
  items: SupplyItemWithStock[]
): CategoryGroup[] {
  const active = items.filter(p => p.status === 'active');
  const topLevel = categories
    .filter(c => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return topLevel
    .map(parent => {
      const subs = categories
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      const directItems = active.filter(p => p.categoryId === parent.id);
      const subcategories = subs.map(sub => ({
        category: sub,
        items: active.filter(p => p.categoryId === sub.id),
      }));

      return { category: parent, items: directItems, subcategories };
    })
    .filter(g => g.items.length > 0 || g.subcategories.some(s => s.items.length > 0));
}

function getAllItemIds(group: CategoryGroup): string[] {
  return [
    ...group.items.map(p => p.id),
    ...group.subcategories.flatMap(s => s.items.map(p => p.id)),
  ];
}

function ItemSelector({
  items,
  categories,
  selectedIds,
  onSelectionChange,
  searchQuery,
  onSearchChange,
}: {
  items: SupplyItemWithStock[];
  categories: SupplyCategory[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const matchingCategoryIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const directMatches = categories.filter(c => c.name.toLowerCase().includes(q));
    const ids = new Set<string>();
    for (const cat of directMatches) {
      ids.add(cat.id);
      if (!cat.parentId) {
        categories.filter(c => c.parentId === cat.id).forEach(c => ids.add(c.id));
      }
    }
    return ids;
  }, [categories, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching
        (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
        matchingCategoryIds.has(p.categoryId)
    );
  }, [items, searchQuery, matchingCategoryIds]);

  const groups = useMemo(
    () => buildCategoryGroups(categories, filteredItems),
    [categories, filteredItems]
  );

  const allSelectableIds = useMemo(() => groups.flatMap(getAllItemIds), [groups]);

  const allSelected =
    allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.has(id));
  const someSelected = allSelectableIds.some(id => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allSelectableIds));
    }
  }, [allSelected, allSelectableIds, onSelectionChange]);

  const toggleCategory = useCallback(
    (categoryItemIds: string[]) => {
      const next = new Set(selectedIds);
      const allChecked = categoryItemIds.every(id => next.has(id));
      categoryItemIds.forEach(id => (allChecked ? next.delete(id) : next.add(id)));
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      const next = new Set(selectedIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const selectedCount = allSelectableIds.filter(id => selectedIds.has(id)).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Filter items…"
        size="sm"
        className="mb-2 flex-shrink-0"
        inputClassName="text-body-sm"
        aria-label="Filter items"
      />
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={toggleAll}
            aria-label="Select all items"
          />
          <span className="text-body-sm font-medium text-card-foreground flex-1">All Items</span>
          <span className="text-caption text-muted-foreground">
            {selectedCount}/{allSelectableIds.length} items
          </span>
        </div>
        <NubDivider tone="neutral" className="relative" />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div data-tree-id="bulk-select" className="nav-tree-select relative space-y-2 pr-2">
          <BulkSelectTreeLines />
          {groups.length === 0 && searchQuery && (
            <p className="text-body-sm text-muted-foreground text-center py-4">
              No items matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          {groups.map(group => {
            const groupIds = getAllItemIds(group);
            const groupAllChecked = groupIds.every(id => selectedIds.has(id));
            const groupSomeChecked = groupIds.some(id => selectedIds.has(id));
            const hasChildren =
              group.items.length > 0 || group.subcategories.some(s => s.items.length > 0);

            return (
              <div key={group.category.id} data-level="l1" data-id={group.category.id}>
                <div className="bulk-select-row flex items-center gap-2 py-1 pl-3 pr-1">
                  <Checkbox
                    checked={groupAllChecked}
                    indeterminate={groupSomeChecked && !groupAllChecked}
                    onChange={() => toggleCategory(groupIds)}
                    aria-label={`Select all in ${group.category.name}`}
                  />
                  <FolderOpen size={14} className="flex-shrink-0 text-muted-foreground" />
                  <span className="text-body-sm text-secondary-foreground">
                    {group.category.name}
                  </span>
                  <span className="text-caption text-muted-foreground ml-auto">
                    {groupIds.length} {groupIds.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {hasChildren && (
                  <div className="ml-3">
                    {group.items.map(item => (
                      <BulkSelectItem
                        key={item.id}
                        item={item}
                        level="l2"
                        selected={selectedIds.has(item.id)}
                        onToggle={() => toggleItem(item.id)}
                      />
                    ))}

                    {group.subcategories.map(sub => {
                      if (sub.items.length === 0) return null;
                      const subIds = sub.items.map(p => p.id);
                      const subAllChecked = subIds.every(id => selectedIds.has(id));
                      const subSomeChecked = subIds.some(id => selectedIds.has(id));

                      return (
                        <div key={sub.category.id} data-level="l2" data-id={sub.category.id}>
                          <div className="bulk-select-row flex items-center gap-2 py-1 pl-3 pr-1">
                            <Checkbox
                              checked={subAllChecked}
                              indeterminate={subSomeChecked && !subAllChecked}
                              onChange={() => toggleCategory(subIds)}
                              aria-label={`Select all in ${sub.category.name}`}
                            />
                            <CornerDownRight
                              size={13}
                              className="flex-shrink-0 text-muted-foreground"
                            />
                            <span className="text-body-sm text-secondary-foreground">
                              {sub.category.name}
                            </span>
                            <span className="text-caption text-muted-foreground ml-auto">
                              {subIds.length} {subIds.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="ml-[30px]">
                            {sub.items.map(item => (
                              <BulkSelectItem
                                key={item.id}
                                item={item}
                                level="l3"
                                selected={selectedIds.has(item.id)}
                                onToggle={() => toggleItem(item.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/** A single supply row in the selector — brighter than its containers, with mfr // cat#. */
function BulkSelectItem({
  item,
  level,
  selected,
  onToggle,
}: {
  item: SupplyItemWithStock;
  level: 'l2' | 'l3';
  selected: boolean;
  onToggle: () => void;
}) {
  const identity = [item.manufacturer, item.catalogNumber].filter(Boolean);

  return (
    <div data-level={level} data-id={item.id}>
      <div className="bulk-select-row flex items-center gap-2 py-1 pl-3 pr-1">
        <Checkbox checked={selected} onChange={onToggle} aria-label={`Select ${item.name}`} />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium text-card-foreground">
            {item.name}
          </span>
          {identity.length > 0 && (
            <span className="block truncate text-caption text-muted-foreground">
              {identity.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1 text-foreground/30">{'//'}</span>}
                  {part}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
