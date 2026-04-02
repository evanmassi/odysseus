/**
 * Equipment Category Repository Interface
 *
 * Data access contract for the lab-managed equipment category hierarchy.
 */

import type { EquipmentCategory } from '@domain/entities/EquipmentCategory';

export interface EquipmentCategoryRepository {
  findById(id: string, labId: string): Promise<EquipmentCategory | null>;
  findByLabId(labId: string): Promise<EquipmentCategory[]>;
  save(category: EquipmentCategory): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  /** Checks if this category has subcategories. */
  hasChildren(id: string, labId: string): Promise<boolean>;

  /** Checks if this category has items directly assigned to it. */
  hasItems(id: string, labId: string): Promise<boolean>;

  /** Checks if this category or any of its subcategories have items. */
  hasItemsIncludingChildren(id: string, labId: string): Promise<boolean>;
}
