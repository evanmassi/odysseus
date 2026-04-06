/**
 * Equipment Category Panel
 *
 * Collapsible category sections with nested subcategories and equipment item cards.
 */

import { useState, useMemo, useCallback } from 'react';

import { ChevronDown, ChevronRight, Plus, SquarePen, Trash2 } from 'lucide-react';

import { Button, OverflowMenu } from '@shared/ui';

import { EquipmentItemRow } from './EquipmentItemRow';

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

  const filteredItems = useMemo(() => {
    let result = items;

    if (!showDecommissioned) {
      result = result.filter(i => i.status !== 'decommissioned');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching */
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(query) ||
          i.manufacturer?.toLowerCase().includes(query) ||
          i.model?.toLowerCase().includes(query) ||
          i.serialNumber?.toLowerCase().includes(query) ||
          i.assetTag?.toLowerCase().includes(query) ||
          i.location?.toLowerCase().includes(query)
      );
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    }

    return result;
  }, [items, showDecommissioned, searchQuery]);

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

  const getCategoryItemCount = (categoryId: string): number => {
    const directCount = itemsByCategoryId.get(categoryId)?.length ?? 0;
    const subs = subcategoriesByParent.get(categoryId) ?? [];
    const subCount = subs.reduce(
      (sum, sub) => sum + (itemsByCategoryId.get(sub.id)?.length ?? 0),
      0
    );
    return directCount + subCount;
  };

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
        <p className="text-sm">No equipment categories yet.</p>
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
    <div className="space-y-2 pt-1">
      {isAdmin && (
        <div className="flex justify-end px-1">
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

      {topLevelCategories.map(category => {
        const isExpanded = expandedCategories.has(category.id);
        const subs = subcategoriesByParent.get(category.id) ?? [];
        const totalCount = getCategoryItemCount(category.id);
        const directItems = itemsByCategoryId.get(category.id) ?? [];

        return (
          <div key={category.id} className="rounded-lg border border-border overflow-hidden">
            {/* Category header */}
            <div
              className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent/50 transition-colors text-left cursor-pointer"
              onClick={() => toggleCategory(category.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') toggleCategory(category.id);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-1.5">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {isAdmin && (
                  <div
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
                <span className="text-sm font-semibold text-secondary-foreground">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground">({totalCount})</span>
              </div>
              {isAdmin && (
                <div
                  role="presentation"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddSubcategory(category.id)}
                    className="h-6 text-xs"
                    leftIcon={<Plus className="w-3 h-3" />}
                  >
                    Subcategory
                  </Button>
                </div>
              )}
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-2 py-2 space-y-2">
                {/* Subcategories */}
                {subs.map(sub => (
                  <SubcategorySection
                    key={sub.id}
                    subcategory={sub}
                    items={itemsByCategoryId.get(sub.id) ?? []}
                    selectedItemId={selectedItemId}
                    onSelectItem={onSelectItem}
                    isAdmin={isAdmin}
                    onRename={onRenameCategory}
                    onDelete={onDeleteCategory}
                  />
                ))}

                {/* Direct items (categories without subcategories) */}
                {subs.length === 0 && directItems.length > 0 && (
                  <div className="space-y-1.5">
                    {directItems.map(item => (
                      <EquipmentItemRow
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedItemId}
                        onSelect={onSelectItem}
                      />
                    ))}
                  </div>
                )}

                {totalCount === 0 && (
                  <p className="text-xs text-card-foreground/30 italic text-center py-3">
                    No equipment
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
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
}

function SubcategorySection({
  subcategory,
  items,
  selectedItemId,
  onSelectItem,
  isAdmin,
  onRename,
  onDelete,
}: SubcategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
    <div>
      <div
        className="w-full flex items-center gap-1.5 px-2 py-1 text-left hover:bg-accent/30 rounded transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={e => {
          if (e.key === 'Enter') setIsExpanded(!isExpanded);
        }}
        role="button"
        tabIndex={0}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {isAdmin && (
          <div
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
        <span className="text-xs font-medium text-secondary-foreground">{subcategory.name}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>

      {isExpanded && items.length > 0 && (
        <div className="ml-2 mt-1 space-y-1.5">
          {items.map(item => (
            <EquipmentItemRow
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              onSelect={onSelectItem}
            />
          ))}
        </div>
      )}

      {isExpanded && items.length === 0 && (
        <p className="text-xs text-card-foreground/30 italic py-2 text-center">No equipment</p>
      )}
    </div>
  );
}
