/**
 * Consumable Category Panel
 *
 * Collapsible category sections with nested subcategories and consumable product cards.
 */

import { useState, useMemo, useCallback } from 'react';

import { ChevronDown, ChevronRight, Plus, SquarePen, Trash2 } from 'lucide-react';

import { Button, OverflowMenu } from '@shared/ui';

import { ConsumableProductRow } from './ConsumableProductRow';

import type { ConsumableCategory, ConsumableProductWithStock } from '@odysseus/shared-schemas';
import type { OverflowMenuItem } from '@shared/ui/primitives/menus/types';

interface ConsumableCategoryPanelProps {
  categories: ConsumableCategory[];
  products: ConsumableProductWithStock[];
  selectedProductId?: string;
  onSelectProduct: (id: string) => void;
  showArchived: boolean;
  searchQuery: string;
  isAdmin: boolean;
  onAddCategory: () => void;
  onAddSubcategory: (parentId: string) => void;
  onRenameCategory: (category: ConsumableCategory) => void;
  onDeleteCategory: (category: ConsumableCategory) => void;
  sortField: 'name' | 'manufacturer' | 'dateAdded';
  sortDirection: 'asc' | 'desc';
}

export function ConsumableCategoryPanel({
  categories,
  products,
  selectedProductId,
  onSelectProduct,
  showArchived,
  searchQuery,
  isAdmin,
  onAddCategory,
  onAddSubcategory,
  onRenameCategory,
  onDeleteCategory,
  sortField,
  sortDirection,
}: ConsumableCategoryPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const topLevelCategories = useMemo(
    () =>
      categories
        .filter(c => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, ConsumableCategory[]>();
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

  const filteredProducts = useMemo(() => {
    let result = products;

    if (!showArchived) {
      result = result.filter(p => p.status !== 'archived');
    }

    if (isSearching) {
      const query = searchQuery.toLowerCase();
      /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching */
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.manufacturer?.toLowerCase().includes(query) ||
          p.catalogNumber?.toLowerCase().includes(query) ||
          p.vendorName?.toLowerCase().includes(query) ||
          matchingCategoryIds.has(p.categoryId)
      );
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    }

    return result;
  }, [products, showArchived, searchQuery, isSearching, matchingCategoryIds]);

  const sortProducts = useCallback(
    (a: ConsumableProductWithStock, b: ConsumableProductWithStock): number => {
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

  const productsByCategoryId = useMemo(() => {
    const map = new Map<string, ConsumableProductWithStock[]>();
    filteredProducts.forEach(product => {
      const list = map.get(product.categoryId) ?? [];
      list.push(product);
      map.set(product.categoryId, list);
    });
    for (const [key, list] of map) {
      map.set(key, list.sort(sortProducts));
    }
    return map;
  }, [filteredProducts, sortProducts]);

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

  const getCategoryProductCount = (categoryId: string): number => {
    const directCount = productsByCategoryId.get(categoryId)?.length ?? 0;
    const subs = subcategoriesByParent.get(categoryId) ?? [];
    const subCount = subs.reduce(
      (sum, sub) => sum + (productsByCategoryId.get(sub.id)?.length ?? 0),
      0
    );
    return directCount + subCount;
  };

  const getCategoryMenuItems = (
    cat: ConsumableCategory,
    productCount: number
  ): OverflowMenuItem[] => [
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
      disabled: productCount > 0,
    },
  ];

  if (topLevelCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <p className="text-sm">No consumable categories yet.</p>
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

      {filteredProducts.length === 0 && isSearching && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No products matching &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {topLevelCategories.map(category => {
        const subs = subcategoriesByParent.get(category.id) ?? [];
        const totalCount = getCategoryProductCount(category.id);
        const directProducts = productsByCategoryId.get(category.id) ?? [];
        const isExpanded = isSearching ? totalCount > 0 : expandedCategories.has(category.id);

        if (isSearching && totalCount === 0) return null;

        return (
          <div key={category.id} className="rounded-lg border border-border overflow-hidden">
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

            {isExpanded && (
              <div className="px-2 py-2 space-y-2">
                {subs.map(sub => {
                  const subProducts = productsByCategoryId.get(sub.id) ?? [];
                  if (isSearching && subProducts.length === 0) return null;
                  return (
                    <SubcategorySection
                      key={sub.id}
                      subcategory={sub}
                      products={subProducts}
                      selectedProductId={selectedProductId}
                      onSelectProduct={onSelectProduct}
                      isAdmin={isAdmin}
                      onRename={onRenameCategory}
                      onDelete={onDeleteCategory}
                      forceExpanded={isSearching ? true : undefined}
                    />
                  );
                })}

                {subs.length === 0 && directProducts.length > 0 && (
                  <div className="space-y-1.5">
                    {directProducts.map(product => (
                      <ConsumableProductRow
                        key={product.id}
                        product={product}
                        isSelected={product.id === selectedProductId}
                        onSelect={onSelectProduct}
                      />
                    ))}
                  </div>
                )}

                {totalCount === 0 && (
                  <p className="text-xs text-card-foreground/30 italic text-center py-3">
                    No products
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
  subcategory: ConsumableCategory;
  products: ConsumableProductWithStock[];
  selectedProductId?: string;
  onSelectProduct: (id: string) => void;
  isAdmin: boolean;
  onRename: (category: ConsumableCategory) => void;
  onDelete: (category: ConsumableCategory) => void;
  forceExpanded?: boolean;
}

function SubcategorySection({
  subcategory,
  products,
  selectedProductId,
  onSelectProduct,
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
      disabled: products.length > 0,
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
        {effectiveExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
        <span className="text-xs text-muted-foreground">({products.length})</span>
      </div>

      {effectiveExpanded && products.length > 0 && (
        <div className="ml-2 mt-1 space-y-1.5">
          {products.map(product => (
            <ConsumableProductRow
              key={product.id}
              product={product}
              isSelected={product.id === selectedProductId}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
