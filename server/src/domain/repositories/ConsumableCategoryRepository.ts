/**
 * Consumable Category Repository Interface
 *
 * Data access contract for the lab-managed consumable category hierarchy.
 */

import type { ConsumableCategory } from '@domain/entities/ConsumableCategory';

export interface ConsumableCategoryRepository {
  findById(id: string, labId: string): Promise<ConsumableCategory | null>;
  findByLabId(labId: string): Promise<ConsumableCategory[]>;
  save(category: ConsumableCategory): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  hasChildren(id: string, labId: string): Promise<boolean>;
  hasProducts(id: string, labId: string): Promise<boolean>;
  hasProductsIncludingChildren(id: string, labId: string): Promise<boolean>;
}
