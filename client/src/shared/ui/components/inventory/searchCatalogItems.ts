/**
 * Catalog Item Search
 *
 * Free-text narrowing over injected item fields plus category names, shared by the
 * catalog toolbars so the header count and the tree it labels never disagree.
 */

import { collectMatchingCategoryIds } from '@shared/utils/collectMatchingCategoryIds';

interface SearchableItem {
  categoryId: string;
}

interface SearchableCategory {
  id: string;
  name: string;
  parentId: string | null;
}

interface SearchCatalogItemsParams<T extends SearchableItem, C extends SearchableCategory> {
  items: T[];
  categories: C[];
  searchQuery: string;
  getSearchFields: (item: T) => Array<string | undefined>;
}

export function searchCatalogItems<T extends SearchableItem, C extends SearchableCategory>({
  items,
  categories,
  searchQuery,
  getSearchFields,
}: SearchCatalogItemsParams<T, C>): T[] {
  if (searchQuery.trim().length === 0) return items;

  const query = searchQuery.toLowerCase();
  const matchingCategoryIds = collectMatchingCategoryIds(categories, searchQuery);

  return items.filter(
    item =>
      getSearchFields(item).some(field => field?.toLowerCase().includes(query)) ||
      matchingCategoryIds.has(item.categoryId)
  );
}
