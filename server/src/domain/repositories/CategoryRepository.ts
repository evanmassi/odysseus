/**
 * Category Repository Interface
 *
 * Data access contract for a lab-managed category hierarchy. Generic over the concrete category so
 * every catalog shares the contract without sharing a type.
 */

import type { Category } from '@domain/entities/Category';

export interface CategoryRepository<T extends Category> {
  findById(id: string, labId: string): Promise<T | null>;
  findByLabId(labId: string): Promise<T[]>;
  save(category: T): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  hasChildren(id: string, labId: string): Promise<boolean>;
  /** True when the category or any of its subcategories still holds an item. */
  hasItemsIncludingChildren(id: string, labId: string): Promise<boolean>;
}
