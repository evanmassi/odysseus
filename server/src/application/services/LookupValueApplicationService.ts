/**
 * Lookup Value Application Service
 *
 * Orchestrates CRUD for admin-managed dropdown values (species, source).
 */

import { LookupValue, LookupCategory } from '@domain/entities/LookupValue';
import { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';

export class LookupValueApplicationService {
  constructor(private lookupValueRepository: LookupValueRepository) {}

  async getActiveByCategory(category: LookupCategory): Promise<ReturnType<LookupValue['toData']>[]> {
    const values = await this.lookupValueRepository.findActiveByCategoryForDropdown(category);
    return values.map(v => v.toData());
  }

  async getAllByCategory(category: LookupCategory): Promise<Array<ReturnType<LookupValue['toData']> & { tubeCount: number }>> {
    const values = await this.lookupValueRepository.findByCategory(category);
    const results = await Promise.all(
      values.map(async (v) => {
        const tubeCount = await this.lookupValueRepository.countTubesUsingValue(category, v.value);
        return { ...v.toData(), tubeCount };
      })
    );
    return results;
  }

  async create(category: LookupCategory, value: string): Promise<ReturnType<LookupValue['toData']>> {
    const existing = await this.lookupValueRepository.findByCategoryAndValue(category, value.trim());
    if (existing) {
      throw new ValidationError(`A ${category} value "${value.trim()}" already exists`);
    }

    const entity = LookupValue.create({ category, value });
    await this.lookupValueRepository.save(entity);
    return entity.toData();
  }

  async rename(id: string, newValue: string): Promise<ReturnType<LookupValue['toData']>> {
    const entity = await this.lookupValueRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const oldValue = entity.value;
    if (oldValue === newValue.trim()) {
      return entity.toData();
    }

    const existing = await this.lookupValueRepository.findByCategoryAndValue(entity.category, newValue.trim());
    if (existing) {
      throw new ValidationError(`A ${entity.category} value "${newValue.trim()}" already exists`);
    }

    entity.rename(newValue);
    await this.lookupValueRepository.save(entity);

    // Batch update all tubes referencing the old value
    await this.lookupValueRepository.renameTubeValues(entity.category, oldValue, entity.value);

    return entity.toData();
  }

  async delete(id: string): Promise<void> {
    const entity = await this.lookupValueRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const tubeCount = await this.lookupValueRepository.countTubesUsingValue(entity.category, entity.value);
    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot delete "${entity.value}" — ${tubeCount} tube${tubeCount === 1 ? '' : 's'} still reference it`
      );
    }

    await this.lookupValueRepository.delete(id);
  }
}
