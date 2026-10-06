import { useCallback, useState, type ReactNode } from 'react';

import { Layers } from 'lucide-react';

import { AccentTick, Button, Tab, Tabs } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import {
  BulkCategoryTreeSelector,
  type BulkCategoryTreeSelectorLabels,
} from './BulkCategoryTreeSelector';
import { BulkFooterSlotContext } from './BulkTabFooter';

interface SelectableItem {
  id: string;
  name: string;
  categoryId: string;
  status: string;
  manufacturer?: string;
}

interface SelectableCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

interface BulkTab {
  id: string;
  label: string;
  icon: ReactNode;
  layout: 'selector' | 'full';
}

interface SelectorAction {
  verb: string;
  isDanger?: boolean;
  title: string;
  isReady?: boolean;
  run: (itemIds: string[]) => void;
}

interface BulkOperationsModalProps<
  TItem extends SelectableItem,
  TCategory extends SelectableCategory,
> {
  isOpen: boolean;
  onClose: () => void;
  items: TItem[];
  categories: TCategory[];
  tabs: BulkTab[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  renderTab: (tabId: string) => ReactNode;
  selectorAction: (tabId: string) => SelectorAction | undefined;
  renderSelectorFooterAction?: (tabId: string) => ReactNode;
  isPending: boolean;
  isSelectable: (item: TItem) => boolean;
  getSecondaryText: (item: TItem) => (string | undefined)[];
  selectorLabels: BulkCategoryTreeSelectorLabels;
  onReset?: () => void;
}

export function BulkOperationsModal<
  TItem extends SelectableItem,
  TCategory extends SelectableCategory,
>({
  isOpen,
  onClose,
  items,
  categories,
  tabs,
  selectedIds,
  onSelectionChange,
  renderTab,
  selectorAction,
  renderSelectorFooterAction,
  isPending,
  isSelectable,
  getSecondaryText,
  selectorLabels,
  onReset,
}: BulkOperationsModalProps<TItem, TCategory>) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);

  const showSelector = tabs.find(tab => tab.id === activeTab)?.layout === 'selector';
  const selectableCount = items.filter(isSelectable).length;
  const action = selectorAction(activeTab);

  const handleClose = useCallback(() => {
    onSelectionChange(new Set());
    setActiveTab(tabs[0].id);
    setSearchQuery('');
    onReset?.();
    onClose();
  }, [onClose, onReset, onSelectionChange, tabs]);

  // PITFALL: a tab change keeps the checked set on purpose; choosing between operations on one selection is the point of the tabs.
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      onReset?.();
    },
    [onReset]
  );

  const locator = (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <AccentTick />
        <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
          {selectableCount}{' '}
          <span className="text-foreground/45">{selectorLabels.countNoun[1]}</span>
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

  const selectorFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      {renderSelectorFooterAction?.(activeTab) ??
        (action && (
          <Button
            size="sm"
            onClick={() => setIsConfirming(true)}
            disabled={selectedIds.size === 0 || action.isReady === false}
            isLoading={isPending}
            variant={action.isDanger ? 'danger' : 'primary'}
          >
            {action.verb} ({selectedIds.size})
          </Button>
        ))}
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
        footer={showSelector ? selectorFooter : <div ref={setFooterSlot} />}
        contentClassName="p-0 h-full"
      >
        <BulkFooterSlotContext.Provider value={footerSlot}>
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-shrink-0 border-b border-border px-4">
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                orientation="horizontal"
                size="sm"
                className="!gap-0 !px-0 [&_button]:!px-2.5 [&_button]:flex-1 [&_button]:justify-center"
              >
                {tabs.map(tab => (
                  <Tab key={tab.id} id={tab.id} icon={tab.icon}>
                    {tab.label}
                  </Tab>
                ))}
              </Tabs>
            </div>

            {showSelector ? (
              <div className="flex flex-1 min-h-0">
                <div className="w-2/5 border-r border-border p-4 flex flex-col min-h-0 overflow-auto bg-muted/30">
                  <BulkCategoryTreeSelector
                    items={items}
                    categories={categories}
                    selectedIds={selectedIds}
                    onSelectionChange={onSelectionChange}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    isSelectable={isSelectable}
                    getSecondaryText={getSecondaryText}
                    labels={selectorLabels}
                  />
                </div>

                <div className="w-3/5 flex flex-col min-h-0 overflow-auto">
                  <div className="px-4 pt-4 flex-1">{renderTab(activeTab)}</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0">{renderTab(activeTab)}</div>
            )}
          </div>
        </BulkFooterSlotContext.Provider>
      </BaseModal>

      {action && (
        <ConfirmDialog
          isOpen={isConfirming}
          variant={action.isDanger ? 'danger' : 'warning'}
          title={action.title}
          message={`${action.verb} ${selectedIds.size} ${
            selectedIds.size === 1 ? selectorLabels.countNoun[0] : selectorLabels.countNoun[1]
          }?`}
          confirmText={action.verb}
          onConfirm={() => {
            setIsConfirming(false);
            action.run(Array.from(selectedIds));
          }}
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </>
  );
}
