/**
 * Matching Category IDs
 *
 * Category IDs whose name matches a search query, plus the direct children of
 * any matched top-level category.
 */

interface SearchableCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export function collectMatchingCategoryIds<C extends SearchableCategory>(
  categories: C[],
  query: string
): Set<string> {
  const lowerQuery = query.toLowerCase();
  const directMatches = categories.filter(c => c.name.toLowerCase().includes(lowerQuery));
  const ids = new Set<string>();
  for (const cat of directMatches) {
    ids.add(cat.id);
    if (!cat.parentId) {
      categories.filter(c => c.parentId === cat.id).forEach(c => ids.add(c.id));
    }
  }
  return ids;
}
