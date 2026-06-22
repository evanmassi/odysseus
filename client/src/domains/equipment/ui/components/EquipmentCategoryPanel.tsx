/**
 * Equipment Category Panel
 *
 * Collapsible category sections with nested subcategories and equipment item cards.
 */

import { useState, useMemo, useCallback } from 'react';

import {
  ChevronRight,
  CornerDownRight,
  Folder,
  FolderOpen,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';

import { Button, OverflowMenu } from '@shared/ui';
import { NavTreeLines } from '@shared/ui/components/tree-lines';

import { EquipmentItemRow } from './EquipmentItemRow';

import '@shared/ui/components/nav-tree/nav-tree.css';

import type { EquipmentCategory, EquipmentItem } from '@odysseus/shared-schemas';
import type { OverflowMenuItem } from '@shared/ui/primitives/menus/types';

interface EquipmentCategoryPanelProps {
  categories: EquipmentCategory[];
  items: EquipmentItem[];
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
  showDecommissioned: boolean;
  searchQuery: string;
  isAdmin: boolean;
  onAddCategory: () => void;
  onAddSubcategory: (parentId: string) => void;
  onRenameCategory: (category: EquipmentCategory) => void;
  onDeleteCategory: (category: EquipmentCategory) => void;
  sortField: 'name' | 'manufacturer' | 'dateAdded';
  sortDirection: 'asc' | 'desc';
}

export function EquipmentCategoryPanel({
  categories,
  items,
  selectedItemId,
  onSelectItem,
  showDecommissioned,
  searchQuery,
  isAdmin,
  onAddCategory,
  onAddSubcategory,
  onRenameCategory,
  onDeleteCategory,
  sortField,
  sortDirection,
}: EquipmentCategoryPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const topLevelCategories = useMemo(
    () =>
      categories
        .filter(c => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, EquipmentCategory[]>();
    categories
      .filter(c => c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .forEach(c => {
        const list = map.get(c.parentId!) ?? [];
        list.push(c);
        map.set(c.parentId!, list);
      });
    return map;
  }, [categories]);

  const isSearching = searchQuery.trim().length > 0;

  const matchingCategoryIds = useMemo(() => {
    if (!isSearching) return new Set<string>();
    const query = searchQuery.toLowerCase();
    const directMatches = categories.filter(c => c.name.toLowerCase().includes(query));
    const ids = new Set<string>();
    for (const cat of directMatches) {
      ids.add(cat.id);
      if (!cat.parentId) {
        categories.filter(c => c.parentId === cat.id).forEach(c => ids.add(c.id));
      }
    }
    return ids;
  }, [categories, searchQuery, isSearching]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (!showDecommissioned) {
      result = result.filter(i => i.status !== 'decommissioned');
    }

    if (isSearching) {
      const query = searchQuery.toLowerCase();
      /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching */
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(query) ||
          i.manufacturer?.toLowerCase().includes(query) ||
          i.model?.toLowerCase().includes(query) ||
          i.serialNumber?.toLowerCase().includes(query) ||
          i.assetTag?.toLowerCase().includes(query) ||
          i.location?.toLowerCase().includes(query) ||
          matchingCategoryIds.has(i.categoryId)
      );
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    }

    return result;
  }, [items, showDecommissioned, searchQuery, isSearching, matchingCategoryIds]);

  const sortItems = useCallback(
    (a: EquipmentItem, b: EquipmentItem): number => {
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
          return (bDate - aDate) * dir;
        }
        default:
          return 0;
      }
    },
    [sortField, sortDirection]
  );

  const itemsByCategoryId = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    filteredItems.forEach(item => {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    });
    for (const [key, list] of map) {
      map.set(key, list.sort(sortItems));
    }
    return map;
  }, [filteredItems, sortItems]);

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

  const getCategoryMenuItems = (cat: EquipmentCategory, itemCount: number): OverflowMenuItem[] => [
    {
      icon: SquarePen,
      label: 'Rename',
      onClick: () => onRenameCategory(cat),
    },
    {
      icon: Trash2,
      label: 'Remove',
      onClick: () => onDeleteCategory(cat),
      danger: true,
      disabled: itemCount > 0,
    },
  ];

  if (topLevelCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <p className="text-body-sm">No equipment categories yet.</p>
        {isAdmin && (
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
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddCategory}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Category
          </Button>
        </div>
      )}

      {filteredItems.length === 0 && isSearching && (
        <p className="text-body-sm text-muted-foreground text-center py-6">
          No equipment matching &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      <div data-tree-id="equipment" className="nav-tree relative flex flex-col gap-1">
        <NavTreeLines treeId="equipment" expandedCategoryIds={expandedCategoryIds} />
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
                {isAdmin && (
                  <div
                    className="flex flex-shrink-0 items-center"
                    role="presentation"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <OverflowMenu
                      items={getCategoryMenuItems(category, totalCount)}
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
                  <span className="text-foreground/25">{totalCount === 1 ? 'unit' : 'units'}</span>
                </span>
                <span className="flex-1" />
                {isAdmin && (
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
                        selectedItemId={selectedItemId}
                        onSelectItem={onSelectItem}
                        isAdmin={isAdmin}
                        onRename={onRenameCategory}
                        onDelete={onDeleteCategory}
                        forceExpanded={isSearching ? true : undefined}
                      />
                    );
                  })}

                  {/* Direct items (categories without subcategories) sit at the mid tier */}
                  {subs.length === 0 && directItems.length > 0 && (
                    <div className="nav-tree-well">
                      {directItems.map(item => (
                        <div key={item.id} data-level="l2" data-id={item.id}>
                          <EquipmentItemRow
                            item={item}
                            isSelected={item.id === selectedItemId}
                            onSelect={onSelectItem}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {totalCount === 0 && (
                    <p className="text-caption text-card-foreground/30 italic text-center py-3">
                      No equipment
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

interface SubcategorySectionProps {
  subcategory: EquipmentCategory;
  items: EquipmentItem[];
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
  isAdmin: boolean;
  onRename: (category: EquipmentCategory) => void;
  onDelete: (category: EquipmentCategory) => void;
  forceExpanded?: boolean;
}

function SubcategorySection({
  subcategory,
  items,
  selectedItemId,
  onSelectItem,
  isAdmin,
  onRename,
  onDelete,
  forceExpanded,
}: SubcategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const effectiveExpanded = forceExpanded ?? isExpanded;

  const menuItems: OverflowMenuItem[] = [
    { icon: SquarePen, label: 'Rename', onClick: () => onRename(subcategory) },
    {
      icon: Trash2,
      label: 'Remove',
      onClick: () => onDelete(subcategory),
      danger: true,
      disabled: items.length > 0,
    },
  ];

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
        {isAdmin && (
          <div
            className="flex flex-shrink-0 items-center"
            role="presentation"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <OverflowMenu
              items={menuItems}
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
          <span className="text-foreground/25">{items.length === 1 ? 'unit' : 'units'}</span>
        </span>
      </div>

      {effectiveExpanded && items.length > 0 && (
        <div className="nav-tree-children">
          <div className="nav-tree-well">
            {items.map(item => (
              <div key={item.id} data-level="l3" data-id={item.id}>
                <EquipmentItemRow
                  item={item}
                  isSelected={item.id === selectedItemId}
                  onSelect={onSelectItem}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && items.length === 0 && (
        <p className="text-caption text-card-foreground/30 italic py-2 text-center">No equipment</p>
      )}
    </div>
  );
}
