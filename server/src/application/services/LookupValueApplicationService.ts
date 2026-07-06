/**
 * Lookup Value Application Service
 *
 * Orchestrates CRUD for admin-managed dropdown values (species, source).
 */

import { LookupValue } from '@domain/entities/LookupValue';
import type { LookupCategory } from '@domain/entities/LookupValue';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { DonorRepository } from '@domain/repositories/DonorRepository';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';

export class LookupValueApplicationService {
  constructor(
    private lookupValueRepository: LookupValueRepository,
    private equipmentItemRepository?: EquipmentItemRepository,
    private donorRepository?: DonorRepository,
    private supplyItemRepository?: SupplyItemRepository,
  ) {}

  async getActiveByCategory(labId: string, category: LookupCategory): Promise<ReturnType<LookupValue['toData']>[]> {
    const values = await this.lookupValueRepository.findActiveByCategoryForDropdown(category, labId);
    return values.map(v => v.toData());
  }

  async getAllByCategory(labId: string, category: LookupCategory): Promise<Array<ReturnType<LookupValue['toData']> & { usageCount: number }>> {
    const values = await this.lookupValueRepository.findByCategory(category, labId);
    const countMap = await this.getUsageCounts(category, values.map(v => v.value), labId);
    return values.map(v => ({ ...v.toData(), usageCount: countMap.get(v.value) ?? 0 }));
  }

  private async getUsageCounts(category: LookupCategory, values: string[], labId: string): Promise<Map<string, number>> {
    if (values.length === 0) return new Map();

    if (category === 'equipment_maintenance_type' && this.equipmentItemRepository) {
      const counts = new Map<string, number>();
      for (const value of values) {
        counts.set(value, await this.equipmentItemRepository.countMaintenanceEntriesUsingType(value, labId));
      }
      return counts;
    }

    if (category === 'specimen_type' && this.donorRepository) {
      const counts = new Map<string, number>();
      for (const value of values) {
        counts.set(value, await this.donorRepository.countCollectionEntriesUsingSpecimenType(value, labId));
      }
      return counts;
    }

    if (this.supplyItemRepository) {
      const countFn = this.getSupplyCountFn(category);
      if (countFn) {
        const counts = new Map<string, number>();
        for (const value of values) {
          counts.set(value, await countFn(value, labId));
        }
        return counts;
      }
    }

    return this.lookupValueRepository.countTubesUsingValues(category, values, labId);
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
    const entity = await this.lookupValueRepository.findById(id, labId);
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

    if (entity.category === 'equipment_maintenance_type' && this.equipmentItemRepository) {
      await this.equipmentItemRepository.renameMaintenanceType(oldValue, entity.value, labId);
    } else if (entity.category === 'specimen_type' && this.donorRepository) {
      await this.donorRepository.renameSpecimenType(oldValue, entity.value, labId);
    } else if (this.supplyItemRepository) {
      const renamed = await this.renameSupplyValue(entity.category, oldValue, entity.value, labId);
      if (!renamed) {
        await this.lookupValueRepository.renameTubeValues(entity.category, oldValue, entity.value, labId);
      }
    } else {
      await this.lookupValueRepository.renameTubeValues(entity.category, oldValue, entity.value, labId);
    }

    return entity.toData();
  }

  async delete(labId: string, id: string): Promise<void> {
    const entity = await this.lookupValueRepository.findById(id, labId);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const usageCount = (await this.getUsageCounts(entity.category, [entity.value], labId)).get(entity.value) ?? 0;

    if (usageCount > 0) {
      const labelMap: Partial<Record<LookupCategory, [string, string]>> = {
        equipment_maintenance_type: ['maintenance log entry', 'maintenance log entries'],
        specimen_type: ['collection entry', 'collection entries'],
        supply_item_property: ['item', 'items'],
        supply_stock_unit: ['item', 'items'],
        supply_vendor: ['item', 'items'],
        supply_manufacturer: ['item', 'items'],
      };
      const [singular, plural] = labelMap[entity.category] ?? ['tube', 'tubes'];
      const label = usageCount === 1 ? singular : plural;
      const verb = usageCount === 1 ? 'references' : 'reference';
      throw new ValidationError(
        `Cannot delete "${entity.value}" — ${usageCount} ${label} still ${verb} it`
      );
    }

    await this.lookupValueRepository.delete(id);
  }

  private getSupplyCountFn(category: LookupCategory): ((value: string, labId: string) => Promise<number>) | undefined {
    if (!this.supplyItemRepository) return undefined;
    const repo = this.supplyItemRepository;
    switch (category) {
      case 'supply_item_property': return (v, l) => repo.countItemsUsingProperty(v, l);
      case 'supply_stock_unit': return (v, l) => repo.countItemsUsingStockUnit(v, l);
      case 'supply_vendor': return (v, l) => repo.countItemsUsingVendor(v, l);
      case 'supply_manufacturer': return (v, l) => repo.countItemsUsingManufacturer(v, l);
      default: return undefined;
    }
  }

  private async renameSupplyValue(category: LookupCategory, oldValue: string, newValue: string, labId: string): Promise<boolean> {
    if (!this.supplyItemRepository) return false;
    const repo = this.supplyItemRepository;
    switch (category) {
      case 'supply_item_property': await repo.renameProperty(oldValue, newValue, labId); return true;
      case 'supply_stock_unit': await repo.renameStockUnit(oldValue, newValue, labId); return true;
      case 'supply_vendor': await repo.renameVendor(oldValue, newValue, labId); return true;
      case 'supply_manufacturer': await repo.renameManufacturer(oldValue, newValue, labId); return true;
      default: return false;
    }
  }
}
