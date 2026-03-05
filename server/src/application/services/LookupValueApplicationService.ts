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

  async getActiveByCategory(labId: string, category: LookupCategory): Promise<ReturnType<LookupValue['toData']>[]> {
    const values = await this.lookupValueRepository.findActiveByCategoryForLabDropdown(category, labId);
    return values.map(v => v.toData());
  }

  async getAllByCategory(labId: string, category: LookupCategory): Promise<Array<ReturnType<LookupValue['toData']> & { tubeCount: number }>> {
    const values = await this.lookupValueRepository.findByCategoryForLab(category, labId);
    const results = await Promise.all(
      values.map(async (v) => {
        const tubeCount = await this.lookupValueRepository.countTubesUsingValueInLab(category, v.value, labId);
        return { ...v.toData(), tubeCount };
      })
    );
    return results;
  }

  async create(labId: string, category: LookupCategory, value: string): Promise<ReturnType<LookupValue['toData']>> {
    const existing = await this.lookupValueRepository.findByCategoryValueAndLab(category, value.trim(), labId);
    if (existing) {
      throw new ValidationError(`A ${category} value "${value.trim()}" already exists`);
    }

    const entity = LookupValue.create({ category, value, labId });
    await this.lookupValueRepository.save(entity);
    return entity.toData();
  }

  async rename(labId: string, id: string, newValue: string): Promise<ReturnType<LookupValue['toData']>> {
    const entity = await this.lookupValueRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const oldValue = entity.value;
    if (oldValue === newValue.trim()) {
      return entity.toData();
    }

    const existing = await this.lookupValueRepository.findByCategoryValueAndLab(entity.category, newValue.trim(), labId);
    if (existing) {
      throw new ValidationError(`A ${entity.category} value "${newValue.trim()}" already exists`);
    }

    entity.rename(newValue);
    await this.lookupValueRepository.save(entity);

    await this.lookupValueRepository.renameTubeValuesInLab(entity.category, oldValue, entity.value, labId);

    return entity.toData();
  }

  async delete(labId: string, id: string): Promise<void> {
    const entity = await this.lookupValueRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const tubeCount = await this.lookupValueRepository.countTubesUsingValueInLab(entity.category, entity.value, labId);
    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot delete "${entity.value}" — ${tubeCount} tube${tubeCount === 1 ? '' : 's'} still reference it`
      );
    }

    await this.lookupValueRepository.delete(id);
  }
}
