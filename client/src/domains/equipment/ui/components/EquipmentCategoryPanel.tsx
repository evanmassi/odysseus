/**
 * Equipment Category Panel
 *
 * Collapsible category sections with nested subcategories and equipment item cards.
 */

import { useState, useMemo } from 'react';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { Button } from '@shared/ui';

import { EquipmentItemRow } from './EquipmentItemRow';

import type { EquipmentCategory, EquipmentItem } from '@odysseus/shared-schemas';

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
          i.internalId?.toLowerCase().includes(query) ||
          i.location?.toLowerCase().includes(query)
      );
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    }

    return result;
  }, [items, showDecommissioned, searchQuery]);

  const itemsByCategoryId = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    filteredItems.forEach(item => {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    });
    return map;
  }, [filteredItems]);

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

  if (topLevelCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <p className="text-sm">No equipment categories yet.</p>
        {isAdmin && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onAddCategory}>
            <Plus size={14} className="mr-1" />
            Add Category
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isAdmin && (
        <div className="flex justify-end px-1">
          <Button variant="secondary" size="sm" onClick={onAddCategory}>
            <Plus size={14} className="mr-1" />
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
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent/50 transition-colors text-left"
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-sm font-semibold text-secondary-foreground">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground">({totalCount})</span>
              </div>
              {isAdmin && subs.length === 0 && (
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
                  >
                    <Plus size={12} className="mr-1" />
                    Subcategory
                  </Button>
                </div>
              )}
            </button>

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

                {/* Add subcategory button when subcategories exist */}
                {isAdmin && subs.length > 0 && (
                  <div className="flex justify-center pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddSubcategory(category.id)}
                      className="h-6 text-xs text-muted-foreground"
                    >
                      <Plus size={12} className="mr-1" />
                      Add Subcategory
                    </Button>
                  </div>
                )}

                {totalCount === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No equipment in this category
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
}

function SubcategorySection({
  subcategory,
  items,
  selectedItemId,
  onSelectItem,
}: SubcategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="ml-2">
      <button
        type="button"
        className="w-full flex items-center gap-1.5 px-2 py-1 text-left hover:bg-accent/30 rounded transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs font-medium text-secondary-foreground">{subcategory.name}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </button>

      {isExpanded && items.length > 0 && (
        <div className="ml-4 mt-1 space-y-1.5">
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
        <p className="ml-4 text-xs text-muted-foreground py-2">No equipment</p>
      )}
    </div>
  );
}
