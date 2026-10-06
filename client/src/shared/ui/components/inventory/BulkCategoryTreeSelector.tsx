import { useMemo, useCallback } from 'react';

import { CornerDownRight, FolderOpen } from 'lucide-react';

import { collectMatchingCategoryIds } from '@shared/utils/collectMatchingCategoryIds';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import { Checkbox, Divider, ScrollArea, SearchInput, TruncatedText } from '../../primitives';
import { NavTreeLines } from '../tree-lines';

import { TreeRowRail } from './TreeRowRail';

interface BulkTreeCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

interface BulkTreeItem {
  id: string;
  name: string;
  categoryId: string;
  manufacturer?: string;
}

export interface BulkCategoryTreeSelectorLabels {
  countNoun: [string, string];
  filterPlaceholder: string;
  filterAriaLabel: string;
  selectAllLabel: string;
  selectAllAriaLabel: string;
  noMatch: string;
}

interface BulkCategoryTreeSelectorProps<T extends BulkTreeItem, C extends BulkTreeCategory> {
  items: T[];
  categories: C[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSelectable: (item: T) => boolean;
  getSecondaryText: (item: T) => Array<string | undefined>;
  labels: BulkCategoryTreeSelectorLabels;
}

interface CategoryGroup<T, C> {
  category: C;
  items: T[];
  subcategories: Array<{ category: C; items: T[] }>;
}

function buildCategoryGroups<T extends BulkTreeItem, C extends BulkTreeCategory>(
  categories: C[],
  items: T[],
  isSelectable: (item: T) => boolean
): CategoryGroup<T, C>[] {
  const selectable = items.filter(isSelectable);
  const topLevel = categories.filter(c => !c.parentId).sort(compareByOrderThenName);

  return topLevel
    .map(parent => {
      const subs = categories.filter(c => c.parentId === parent.id).sort(compareByOrderThenName);

      const directItems = selectable.filter(i => i.categoryId === parent.id);
      const subcategories = subs.map(sub => ({
        category: sub,
        items: selectable.filter(i => i.categoryId === sub.id),
      }));

      return { category: parent, items: directItems, subcategories };
    })
    .filter(g => g.items.length > 0 || g.subcategories.some(s => s.items.length > 0));
}

function getAllItemIds<T extends BulkTreeItem>(group: CategoryGroup<T, unknown>): string[] {
  return [
    ...group.items.map(i => i.id),
    ...group.subcategories.flatMap(s => s.items.map(i => i.id)),
  ];
}

function BulkSelectItem<T extends BulkTreeItem>({
  item,
  level,
  selected,
  secondaryText,
  onToggle,
}: {
  item: T;
  level: 'l2' | 'l3';
  selected: boolean;
  secondaryText: Array<string | undefined>;
  onToggle: () => void;
}) {
  const identity = secondaryText.filter(Boolean);

  return (
    <div data-level={level} data-id={item.id}>
      <div className={`nav-tree-row row-glow nav-tree-row--item ${selected ? 'is-selected' : ''}`}>
        <Checkbox checked={selected} onChange={onToggle} aria-label={`Select ${item.name}`} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <TruncatedText
            text={item.name}
            className="font-display text-body font-medium leading-tight text-card-foreground"
          />
          {identity.length > 0 && (
            <span className="truncate font-mono text-data-sm tracking-[0.02em] text-muted-foreground">
              {identity.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1 text-foreground/30">·</span>}
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

export function BulkCategoryTreeSelector<T extends BulkTreeItem, C extends BulkTreeCategory>({
  items,
  categories,
  selectedIds,
  onSelectionChange,
  searchQuery,
  onSearchChange,
  isSelectable,
  getSecondaryText,
  labels,
}: BulkCategoryTreeSelectorProps<T, C>) {
  const matchingCategoryIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    return collectMatchingCategoryIds(categories, searchQuery);
  }, [categories, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        (i.manufacturer?.toLowerCase().includes(q) ?? false) ||
        matchingCategoryIds.has(i.categoryId)
    );
  }, [items, searchQuery, matchingCategoryIds]);

  const groups = useMemo(
    () => buildCategoryGroups(categories, filteredItems, isSelectable),
    [categories, filteredItems, isSelectable]
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
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
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
        placeholder={labels.filterPlaceholder}
        size="sm"
        className="mb-2 flex-shrink-0"
        inputClassName="text-body-sm"
        aria-label={labels.filterAriaLabel}
      />
      <div className="mb-3 flex-shrink-0">
        <div className="mr-2 flex items-center gap-2 border-x border-transparent px-2 pb-2">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={toggleAll}
            aria-label={labels.selectAllAriaLabel}
          />
          <span className="text-body-sm font-medium text-card-foreground flex-1">
            {labels.selectAllLabel}
          </span>
          <span className="whitespace-nowrap font-mono text-data-sm tracking-[0.04em] text-foreground/70">
            {selectedCount}/{allSelectableIds.length}{' '}
            <span className="text-muted-foreground/60">
              {allSelectableIds.length === 1 ? labels.countNoun[0] : labels.countNoun[1]}
            </span>
          </span>
        </div>
        <Divider tone="neutral" className="relative" />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div data-tree-id="bulk-select" className="nav-tree relative flex flex-col gap-2 pr-2">
          <NavTreeLines treeId="bulk-select" />
          {groups.length === 0 && searchQuery && (
            <p className="text-body-sm text-muted-foreground text-center py-4">
              {labels.noMatch} &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          {groups.map(group => {
            const groupIds = getAllItemIds(group);
            const groupAllChecked = groupIds.every(id => selectedIds.has(id));
            const groupSomeChecked = groupIds.some(id => selectedIds.has(id));
            const subcategoriesWithItems = group.subcategories.filter(s => s.items.length > 0);

            return (
              <div key={group.category.id} data-level="l1" data-id={group.category.id}>
                <div className="nav-tree-row row-glow nav-tree-row--category">
                  <Checkbox
                    checked={groupAllChecked}
                    indeterminate={groupSomeChecked && !groupAllChecked}
                    onChange={() => toggleCategory(groupIds)}
                    aria-label={`Select all in ${group.category.name}`}
                  />
                  <FolderOpen size={16} className="flex-shrink-0 text-muted-foreground" />
                  <TruncatedText
                    text={group.category.name}
                    className="nav-tree-row__label font-display text-body-lg font-semibold text-secondary-foreground"
                  />
                  <TreeRowRail count={groupIds.length} countNoun={labels.countNoun} />
                </div>

                <div className="nav-tree-children">
                  {subcategoriesWithItems.map(sub => {
                    const subIds = sub.items.map(i => i.id);
                    const subAllChecked = subIds.every(id => selectedIds.has(id));
                    const subSomeChecked = subIds.some(id => selectedIds.has(id));

                    return (
                      <div key={sub.category.id} data-level="l2" data-id={sub.category.id}>
                        <div className="nav-tree-row row-glow nav-tree-row--subcategory">
                          <Checkbox
                            checked={subAllChecked}
                            indeterminate={subSomeChecked && !subAllChecked}
                            onChange={() => toggleCategory(subIds)}
                            aria-label={`Select all in ${sub.category.name}`}
                          />
                          <CornerDownRight
                            size={14}
                            className="flex-shrink-0 text-muted-foreground"
                          />
                          <TruncatedText
                            text={sub.category.name}
                            className="nav-tree-row__label font-display text-body font-medium"
                          />
                          <TreeRowRail
                            count={subIds.length}
                            countNoun={labels.countNoun}
                            isSubtle
                          />
                        </div>
                        <div className="nav-tree-children">
                          <div className="nav-tree-well">
                            {sub.items.map(item => (
                              <BulkSelectItem
                                key={item.id}
                                item={item}
                                level="l3"
                                selected={selectedIds.has(item.id)}
                                secondaryText={getSecondaryText(item)}
                                onToggle={() => toggleItem(item.id)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {group.items.length > 0 && (
                    <div className="nav-tree-well">
                      {group.items.map(item => (
                        <BulkSelectItem
                          key={item.id}
                          item={item}
                          level="l2"
                          selected={selectedIds.has(item.id)}
                          secondaryText={getSecondaryText(item)}
                          onToggle={() => toggleItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
