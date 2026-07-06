/**
 * Lookup Value Repository Interface
 *
 * Data access contract for admin-managed dropdown values.
 */

import type { LookupValue, LookupCategory } from '@domain/entities/LookupValue';

export interface LookupValueRepository {
  findById(id: string, labId: string): Promise<LookupValue | null>;
  findByCategory(category: LookupCategory, labId: string): Promise<LookupValue[]>;
  findActiveByCategoryForDropdown(category: LookupCategory, labId: string): Promise<LookupValue[]>;
  findByCategoryAndValue(category: LookupCategory, value: string, labId: string): Promise<LookupValue | null>;
  save(entity: LookupValue): Promise<void>;
  delete(id: string): Promise<boolean>;
  countTubesUsingValue(category: LookupCategory, value: string, labId: string): Promise<number>;
  countTubesUsingValues(category: LookupCategory, values: string[], labId: string): Promise<Map<string, number>>;
  renameTubeValues(category: LookupCategory, oldValue: string, newValue: string, labId: string): Promise<number>;
}
