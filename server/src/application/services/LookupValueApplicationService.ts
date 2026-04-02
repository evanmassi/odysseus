/**
 * Lookup Value Application Service
 *
 * Orchestrates CRUD for admin-managed dropdown values (species, source).
 */

import { LookupValue } from '@domain/entities/LookupValue';
import type { LookupCategory } from '@domain/entities/LookupValue';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';

export class LookupValueApplicationService {
  constructor(
    private lookupValueRepository: LookupValueRepository,
    private equipmentItemRepository?: EquipmentItemRepository,
  ) {}

  async getActiveByCategory(labId: string, category: LookupCategory): Promise<ReturnType<LookupValue['toData']>[]> {
    const values = await this.lookupValueRepository.findActiveByCategoryForDropdown(category, labId);
    return values.map(v => v.toData());
  }

  async getAllByCategory(labId: string, category: LookupCategory): Promise<Array<ReturnType<LookupValue['toData']> & { tubeCount: number }>> {
    const values = await this.lookupValueRepository.findByCategory(category, labId);
    const tubeCountMap = await this.lookupValueRepository.countTubesUsingValues(
      category,
      values.map(v => v.value),
      labId
    );
    return values.map(v => ({ ...v.toData(), tubeCount: tubeCountMap.get(v.value) ?? 0 }));
  }

  async create(labId: string, category: LookupCategory, value: string): Promise<ReturnType<LookupValue['toData']>> {
    const existing = await this.lookupValueRepository.findByCategoryAndValue(category, value.trim(), labId);
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

    const existing = await this.lookupValueRepository.findByCategoryAndValue(entity.category, newValue.trim(), labId);
    if (existing) {
      throw new ValidationError(`A ${entity.category} value "${newValue.trim()}" already exists`);
    }

    entity.rename(newValue);
    await this.lookupValueRepository.save(entity);

    // Cascade rename to the appropriate table based on category
    if (entity.category === 'equipment_maintenance_type' && this.equipmentItemRepository) {
      await this.equipmentItemRepository.renameMaintenanceType(oldValue, entity.value, labId);
    } else {
      await this.lookupValueRepository.renameTubeValues(entity.category, oldValue, entity.value, labId);
    }

    return entity.toData();
  }

  async delete(labId: string, id: string): Promise<void> {
    const entity = await this.lookupValueRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    // Check usage in the appropriate table based on category
    let usageCount: number;
    if (entity.category === 'equipment_maintenance_type' && this.equipmentItemRepository) {
      usageCount = await this.equipmentItemRepository.countMaintenanceEntriesUsingType(entity.value, labId);
    } else {
      usageCount = await this.lookupValueRepository.countTubesUsingValue(entity.category, entity.value, labId);
    }

    if (usageCount > 0) {
      const isEquipment = entity.category === 'equipment_maintenance_type';
      const label = isEquipment
        ? (usageCount === 1 ? 'maintenance log entry' : 'maintenance log entries')
        : (usageCount === 1 ? 'tube' : 'tubes');
      const verb = usageCount === 1 ? 'references' : 'reference';
      throw new ValidationError(
        `Cannot delete "${entity.value}" — ${usageCount} ${label} still ${verb} it`
      );
    }

    await this.lookupValueRepository.delete(id);
  }
}
