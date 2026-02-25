/**
 * Lookup Value Repository Interface
 *
 * Data access contract for admin-managed dropdown values.
 */

import { LookupValue, LookupCategory } from '@domain/entities/LookupValue';

export interface LookupValueRepository {
  findById(id: string): Promise<LookupValue | null>;
  findByCategory(category: LookupCategory): Promise<LookupValue[]>;
  findByCategoryForLab(category: LookupCategory, labId: string): Promise<LookupValue[]>;
  findActiveByCategoryForDropdown(category: LookupCategory): Promise<LookupValue[]>;
  findActiveByCategoryForLabDropdown(category: LookupCategory, labId: string): Promise<LookupValue[]>;
  findByCategoryAndValue(category: LookupCategory, value: string): Promise<LookupValue | null>;
  findByCategoryValueAndLab(category: LookupCategory, value: string, labId: string): Promise<LookupValue | null>;
  save(entity: LookupValue): Promise<void>;
  delete(id: string): Promise<boolean>;
  countTubesUsingValue(category: LookupCategory, value: string): Promise<number>;
  countTubesUsingValueInLab(category: LookupCategory, value: string, labId: string): Promise<number>;
  renameTubeValues(category: LookupCategory, oldValue: string, newValue: string): Promise<number>;
  renameTubeValuesInLab(category: LookupCategory, oldValue: string, newValue: string, labId: string): Promise<number>;
}
