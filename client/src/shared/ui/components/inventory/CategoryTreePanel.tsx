/**
 * Category Tree Panel
 *
 * Collapsible category sections with nested subcategories and item cards, shared
 * by all three inventory catalogs. Callers pass the already-narrowed item list;
 * item rendering and the labels are injected per domain.
 */

import { useState, useMemo, useCallback, type ReactNode } from 'react';

import {
  ChevronRight,
  CornerDownRight,
  Folder,
  FolderOpen,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';

import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import { Button, OverflowMenu, type OverflowMenuItem } from '../../primitives';
import { DemoLockIndicator } from '../info-display/DemoLockIndicator';
import { NavTreeLines } from '../tree-lines';

interface TreeCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

interface TreeItem {
  id: string;
  name: string;
  categoryId: string;
  manufacturer?: string;
  createdAt: string | Date;
}

export interface CategoryTreePanelLabels {
  /** Singular/plural count noun, e.g. ['unit', 'units']. */
  countNoun: [string, string];
  emptyCategories: string;
  /** Prefix for the no-search-match line; the quoted query is appended. */
  noSearchMatch: string;
  emptyCategoryBody: string;
}

interface CategoryTreePanelProps<T extends TreeItem, C extends TreeCategory> {
  categories: C[];
  /** Already narrowed by the caller; drives the rows and the header count alike. */
  items: T[];
  /** Not applied here — it force-opens matching categories and names the empty state. */
  searchQuery: string;
  isAdmin: boolean;
  /** A seeded demo lab freezes its vocabulary, so management is withdrawn rather than left to fail. */
  isTaxonomyLocked: boolean;
  sortField: 'name' | 'manufacturer' | 'dateAdded';
  sortDirection: 'asc' | 'desc';
  renderItem: (item: T) => ReactNode;
  treeId: string;
  labels: CategoryTreePanelLabels;
  onAddCategory: () => void;
  onAddSubcategory: (parentId: string) => void;
  onRenameCategory: (category: C) => void;
  onDeleteCategory: (category: C) => void;
}

function buildCategoryMenuItems<C>(
  category: C,
  hasItems: boolean,
  onRename: (category: C) => void,
  onDelete: (category: C) => void
): OverflowMenuItem[] {
  return [
    { icon: SquarePen, label: 'Rename', onClick: () => onRename(category) },
    {
      icon: Trash2,
      label: 'Remove',
      onClick: () => onDelete(category),
      danger: true,
      disabled: hasItems,
    },
  ];
}

export function CategoryTreePanel<T extends TreeItem, C extends TreeCategory>({
  categories,
  items,
  searchQuery,
  isAdmin,
  isTaxonomyLocked,
  sortField,
  sortDirection,
  renderItem,
  treeId,
  labels,
  onAddCategory,
  onAddSubcategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryTreePanelProps<T, C>) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const canManageCategories = isAdmin && !isTaxonomyLocked;

  const topLevelCategories = useMemo(
    () => categories.filter(c => !c.parentId).sort(compareByOrderThenName),
    [categories]
  );

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, C[]>();
    categories
      .filter(c => c.parentId)
      .sort(compareByOrderThenName)
      .forEach(c => {
        const list = map.get(c.parentId!) ?? [];
        list.push(c);
        map.set(c.parentId!, list);
      });
    return map;
  }, [categories]);

  const isSearching = searchQuery.trim().length > 0;

  const sortItems = useCallback(
    (a: T, b: T): number => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name': {
          const nameCompare = a.name.localeCompare(b.name);
          if (nameCompare !== 0) return nameCompare * dir;
          return (a.manufacturer ?? '').localeCompare(b.manufacturer ?? '') * dir;
        }
        case 'manufacturer': {
          const mfgCompare = (a.manufacturer ?? '').localeCompare(b.manufacturer ?? '');
          if (mfgCompare !== 0) return mfgCompare * dir;
          return a.name.localeCompare(b.name) * dir;
        }
        case 'dateAdded': {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return (aDate - bDate) * dir;
        }
        default:
          return 0;
      }
    },
    [sortField, sortDirection]
  );

  const itemsByCategoryId = useMemo(() => {
    const map = new Map<string, T[]>();
    items.forEach(item => {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    });
    for (const [key, list] of map) {
      map.set(key, list.sort(sortItems));
    }
    return map;
  }, [items, sortItems]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getCategoryItemCount = useCallback(
    (categoryId: string): number => {
      const directCount = itemsByCategoryId.get(categoryId)?.length ?? 0;
      const subs = subcategoriesByParent.get(categoryId) ?? [];
      const subCount = subs.reduce(
        (sum, sub) => sum + (itemsByCategoryId.get(sub.id)?.length ?? 0),
        0
      );
      return directCount + subCount;
    },
    [itemsByCategoryId, subcategoriesByParent]
  );

  // Categories the tree currently shows expanded — search force-opens any with
  // matches; otherwise honor the manual toggle. Drives the SVG tree-line redraw.
  const expandedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const category of topLevelCategories) {
      const expanded = isSearching
        ? getCategoryItemCount(category.id) > 0
        : expandedCategories.has(category.id);
      if (expanded) ids.add(category.id);
    }
    return ids;
  }, [topLevelCategories, isSearching, getCategoryItemCount, expandedCategories]);

  const [countSingular, countPlural] = labels.countNoun;

  if (topLevelCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <p className="text-body-sm">{labels.emptyCategories}</p>
        {canManageCategories && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={onAddCategory}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Category
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="pt-1">
      {isAdmin && (
        <div className="mb-2 flex justify-end px-1">
          {isTaxonomyLocked ? (
            <DemoLockIndicator side="left" />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAddCategory}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Category
            </Button>
          )}
        </div>
      )}

      {items.length === 0 && isSearching && (
        <p className="text-body-sm text-muted-foreground text-center py-6">
          {labels.noSearchMatch} &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      <div data-tree-id={treeId} className="nav-tree relative flex flex-col gap-1">
        <NavTreeLines treeId={treeId} expandedCategoryIds={expandedCategoryIds} />
        {topLevelCategories.map(category => {
          const subs = subcategoriesByParent.get(category.id) ?? [];
          const totalCount = getCategoryItemCount(category.id);
          const directItems = itemsByCategoryId.get(category.id) ?? [];
          const isExpanded = isSearching ? totalCount > 0 : expandedCategories.has(category.id);

          if (isSearching && totalCount === 0) return null;

          return (
            <div key={category.id} data-level="l1" data-id={category.id}>
              <div
                className={`nav-tree-row nav-tree-row--category ${isExpanded ? 'is-open' : ''}`}
                onClick={() => toggleCategory(category.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') toggleCategory(category.id);
                }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <ChevronRight
                  size={11}
                  className={`nav-tree-row__chevron ${isExpanded ? 'rotate-90' : ''}`}
                />
                {canManageCategories && (
                  <div
                    className="flex flex-shrink-0 items-center"
                    role="presentation"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <OverflowMenu
                      items={buildCategoryMenuItems(
                        category,
                        totalCount > 0,
                        onRenameCategory,
                        onDeleteCategory
                      )}
                      dividerBefore={['Remove']}
                      size="sm"
                      aria-label={`Actions for ${category.name}`}
                    />
                  </div>
                )}
                {isExpanded ? (
                  <FolderOpen size={14} className="flex-shrink-0 text-primary" />
                ) : (
                  <Folder size={14} className="flex-shrink-0 text-muted-foreground" />
                )}
                <span
                  className={`nav-tree-row__label font-display text-body-sm ${
                    isExpanded ? 'text-foreground' : 'text-secondary-foreground'
                  }`}
                >
                  {category.name}
                </span>
                <span
                  aria-hidden
                  className="flex-shrink-0 font-mono text-data-sm text-foreground/30"
                >
                  {'//'}
                </span>
                <span className="nav-tree-row__count font-mono text-data-sm tracking-[0.04em]">
                  {totalCount}{' '}
                  <span className="text-foreground/25">
                    {totalCount === 1 ? countSingular : countPlural}
                  </span>
                </span>
                <span className="flex-1" />
                {canManageCategories && (
                  <div
                    className="flex flex-shrink-0 items-center"
                    role="presentation"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddSubcategory(category.id)}
                      className="h-6 text-label-sm"
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      Subcategory
                    </Button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="nav-tree-children">
                  {subs.map(sub => {
                    const subItems = itemsByCategoryId.get(sub.id) ?? [];
                    if (isSearching && subItems.length === 0) return null;
                    return (
                      <SubcategorySection
                        key={sub.id}
                        subcategory={sub}
                        items={subItems}
                        canManage={canManageCategories}
                        onRename={onRenameCategory}
                        onDelete={onDeleteCategory}
                        renderItem={renderItem}
                        labels={labels}
                        forceExpanded={isSearching ? true : undefined}
                      />
                    );
                  })}

                  {/* Direct items (categories without subcategories) sit at the mid tier */}
                  {subs.length === 0 && directItems.length > 0 && (
                    <div className="nav-tree-well">
                      {directItems.map(item => (
                        <div key={item.id} data-level="l2" data-id={item.id}>
                          {renderItem(item)}
                        </div>
                      ))}
                    </div>
                  )}

                  {totalCount === 0 && (
                    <p className="text-caption text-card-foreground/30 italic text-center py-3">
                      {labels.emptyCategoryBody}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SubcategorySectionProps<T extends TreeItem, C extends TreeCategory> {
  subcategory: C;
  items: T[];
  canManage: boolean;
  onRename: (category: C) => void;
  onDelete: (category: C) => void;
  renderItem: (item: T) => ReactNode;
  labels: CategoryTreePanelLabels;
  forceExpanded?: boolean;
}

function SubcategorySection<T extends TreeItem, C extends TreeCategory>({
  subcategory,
  items,
  canManage,
  onRename,
  onDelete,
  renderItem,
  labels,
  forceExpanded,
}: SubcategorySectionProps<T, C>) {
  const [isExpanded, setIsExpanded] = useState(true);
  const effectiveExpanded = forceExpanded ?? isExpanded;
  const [countSingular, countPlural] = labels.countNoun;

  return (
    <div data-level="l2" data-id={subcategory.id}>
      <div
        className={`nav-tree-row nav-tree-row--subcategory ${effectiveExpanded ? 'is-open' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={e => {
          if (e.key === 'Enter') setIsExpanded(!isExpanded);
        }}
        role="button"
        tabIndex={0}
        aria-expanded={effectiveExpanded}
      >
        <ChevronRight
          size={11}
          className={`nav-tree-row__chevron ${effectiveExpanded ? 'rotate-90' : ''}`}
        />
        {canManage && (
          <div
            className="flex flex-shrink-0 items-center"
            role="presentation"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <OverflowMenu
              items={buildCategoryMenuItems(subcategory, items.length > 0, onRename, onDelete)}
              dividerBefore={['Remove']}
              size="sm"
              aria-label={`Actions for ${subcategory.name}`}
            />
          </div>
        )}
        <CornerDownRight
          size={12}
          className={`flex-shrink-0 ${effectiveExpanded ? 'text-primary' : 'text-muted-foreground'}`}
        />
        <span className="nav-tree-row__label font-display text-caption">{subcategory.name}</span>
        <span aria-hidden className="flex-shrink-0 font-mono text-data-sm text-foreground/30">
          {'//'}
        </span>
        <span className="nav-tree-row__count font-mono text-data-sm tracking-[0.04em]">
          {items.length}{' '}
          <span className="text-foreground/25">
            {items.length === 1 ? countSingular : countPlural}
          </span>
        </span>
      </div>

      {effectiveExpanded && items.length > 0 && (
        <div className="nav-tree-children">
          <div className="nav-tree-well">
            {items.map(item => (
              <div key={item.id} data-level="l3" data-id={item.id}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && items.length === 0 && (
        <p className="text-caption text-card-foreground/30 italic py-2 text-center">
          {labels.emptyCategoryBody}
        </p>
      )}
    </div>
  );
}
