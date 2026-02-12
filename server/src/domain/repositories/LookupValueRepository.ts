/**
 * Lookup Value Repository Interface
 *
 * Data access contract for admin-managed dropdown values.
 */

import { LookupValue, LookupCategory } from '@domain/entities/LookupValue';

export interface LookupValueRepository {
  findById(id: string): Promise<LookupValue | null>;
  findByCategory(category: LookupCategory): Promise<LookupValue[]>;
  findActiveByCategoryForDropdown(category: LookupCategory): Promise<LookupValue[]>;
  findByCategoryAndValue(category: LookupCategory, value: string): Promise<LookupValue | null>;
  save(entity: LookupValue): Promise<void>;
  delete(id: string): Promise<boolean>;
  countTubesUsingValue(category: LookupCategory, value: string): Promise<number>;
  renameTubeValues(category: LookupCategory, oldValue: string, newValue: string): Promise<number>;
}
