/**
 * Bulk Category Tree Selector
 *
 * Multi-select tree of category → subcategory → item checkboxes for bulk
 * operations, shared by the equipment and supplies bulk-update modals.
 * Selectability, each item's secondary text, and the labels are injected per
 * domain; search is controlled by the caller.
 */

import { useMemo, useCallback } from 'react';

import { CornerDownRight, FolderOpen } from 'lucide-react';

import { collectMatchingCategoryIds } from '@shared/utils/collectMatchingCategoryIds';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import { Checkbox, NubDivider, ScrollArea, SearchInput } from '../../primitives';
import { BulkSelectTreeLines } from '../tree-lines';

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
  /** Singular/plural count noun, e.g. ['unit', 'units']. */
  countNoun: [string, string];
  filterPlaceholder: string;
  filterAriaLabel: string;
  selectAllLabel: string;
  selectAllAriaLabel: string;
  /** Prefix for the no-match line; the quoted query is appended. */
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
  const [countSingular, countPlural] = labels.countNoun;

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
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={toggleAll}
            aria-label={labels.selectAllAriaLabel}
          />
          <span className="text-body-sm font-medium text-card-foreground flex-1">
            {labels.selectAllLabel}
          </span>
          <span className="text-caption text-muted-foreground">
            {selectedCount}/{allSelectableIds.length} {countPlural}
          </span>
        </div>
        <NubDivider tone="neutral" className="relative" />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div data-tree-id="bulk-select" className="nav-tree-select relative space-y-2 pr-2">
          <BulkSelectTreeLines />
          {groups.length === 0 && searchQuery && (
            <p className="text-body-sm text-muted-foreground text-center py-4">
              {labels.noMatch} &ldquo;{searchQuery}&rdquo;
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
                    {groupIds.length} {groupIds.length === 1 ? countSingular : countPlural}
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
                        secondaryText={getSecondaryText(item)}
                        onToggle={() => toggleItem(item.id)}
                      />
                    ))}

                    {group.subcategories.map(sub => {
                      if (sub.items.length === 0) return null;
                      const subIds = sub.items.map(i => i.id);
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
                              {subIds.length} {subIds.length === 1 ? countSingular : countPlural}
                            </span>
                          </div>
                          <div className="ml-[30px]">
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
