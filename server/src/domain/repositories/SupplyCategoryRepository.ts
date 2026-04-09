/**
 * Supply Category Repository Interface
 *
 * Data access contract for the lab-managed supply category hierarchy.
 */

import type { SupplyCategory } from '@domain/entities/SupplyCategory';

export interface SupplyCategoryRepository {
  findById(id: string, labId: string): Promise<SupplyCategory | null>;
  findByLabId(labId: string): Promise<SupplyCategory[]>;
  save(category: SupplyCategory): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  hasChildren(id: string, labId: string): Promise<boolean>;
  hasProducts(id: string, labId: string): Promise<boolean>;
  hasProductsIncludingChildren(id: string, labId: string): Promise<boolean>;
}
