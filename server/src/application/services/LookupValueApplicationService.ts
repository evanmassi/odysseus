/**
 * Lookup Value Management Service
 *
 * Orchestrates CRUD for admin-managed dropdown catalog values.
 */

import { LookupValue } from '@domain/entities/LookupValue';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { DonorRepository } from '@domain/repositories/DonorRepository';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import type { ReagentItemRepository } from '@domain/repositories/ReagentItemRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';

import type { LookupCategory } from '@odysseus/shared-schemas';

type CatalogCountFn = (value: string, labId: string) => Promise<number>;
type CatalogRenameFn = (oldValue: string, newValue: string, labId: string) => Promise<unknown>;

export class LookupValueApplicationService {
  constructor(
    private lookupValueRepository: LookupValueRepository,
    private equipmentItemRepository?: EquipmentItemRepository,
    private donorRepository?: DonorRepository,
    private supplyItemRepository?: SupplyItemRepository,
    private storageRepository?: StorageRepository,
    private reagentItemRepository?: ReagentItemRepository
  ) {}

  /** Seeded demo labs lock the catalog to non-admins; system admins are exempt. */
  private async rejectIfSeededDemo(labId: string, user: User): Promise<void> {
    if (user.isSystemAdmin()) return;
    if (!user.isDemo) return;

    const config = await this.storageRepository?.getForLab(labId);
    if (config?.hasAnySeededResources()) {
      throw new ValidationError('Catalog is locked in seeded demo mode');
    }
  }

  async getActiveByCategory(
    labId: string,
    category: LookupCategory
  ): Promise<ReturnType<LookupValue['toData']>[]> {
    const values = await this.lookupValueRepository.findActiveByCategoryForDropdown(
      category,
      labId
    );
    return values.map(v => v.toData());
  }

  async getAllByCategory(
    labId: string,
    category: LookupCategory
  ): Promise<Array<ReturnType<LookupValue['toData']> & { usageCount: number }>> {
    const values = await this.lookupValueRepository.findByCategory(category, labId);
    const countMap = await this.getUsageCounts(
      category,
      values.map(v => v.value),
      labId
    );
    return values.map(v => ({ ...v.toData(), usageCount: countMap.get(v.value) ?? 0 }));
  }

  private async getUsageCounts(
    category: LookupCategory,
    values: string[],
    labId: string
  ): Promise<Map<string, number>> {
    if (values.length === 0) return new Map();

    if (category === 'equipment_maintenance_type' && this.equipmentItemRepository) {
      const counts = new Map<string, number>();
      for (const value of values) {
        counts.set(
          value,
          await this.equipmentItemRepository.countMaintenanceEntriesUsingType(value, labId)
        );
      }
      return counts;
    }

    if (category === 'specimen_type' && this.donorRepository) {
      const counts = new Map<string, number>();
      for (const value of values) {
        counts.set(
          value,
          await this.donorRepository.countCollectionEntriesUsingSpecimenType(value, labId)
        );
      }
      return counts;
    }

    const countFns = this.getCatalogCountFns(category);
    if (countFns.length > 0) {
      const counts = new Map<string, number>();
      for (const value of values) {
        const perCatalog = await Promise.all(countFns.map(fn => fn(value, labId)));
        counts.set(
          value,
          perCatalog.reduce((sum, n) => sum + n, 0)
        );
      }
      return counts;
    }

    return this.lookupValueRepository.countTubesUsingValues(category, values, labId);
  }

  async create(
    labId: string,
    category: LookupCategory,
    value: string,
    user: User
  ): Promise<ReturnType<LookupValue['toData']>> {
    await this.rejectIfSeededDemo(labId, user);

    const existing = await this.lookupValueRepository.findByCategoryAndValue(
      category,
      value.trim(),
      labId
    );
    if (existing) {
      throw new ValidationError(`A ${category} value "${value.trim()}" already exists`);
    }

    const entity = LookupValue.create({ category, value, labId });
    await this.lookupValueRepository.save(entity);
    return entity.toData();
  }

  async rename(
    labId: string,
    id: string,
    newValue: string,
    user: User
  ): Promise<ReturnType<LookupValue['toData']>> {
    await this.rejectIfSeededDemo(labId, user);

    const entity = await this.lookupValueRepository.findById(id, labId);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const oldValue = entity.value;
    if (oldValue === newValue.trim()) {
      return entity.toData();
    }

    const existing = await this.lookupValueRepository.findByCategoryAndValue(
      entity.category,
      newValue.trim(),
      labId
    );
    if (existing) {
      throw new ValidationError(`A ${entity.category} value "${newValue.trim()}" already exists`);
    }

    entity.rename(newValue);
    await this.lookupValueRepository.save(entity);

    if (entity.category === 'equipment_maintenance_type' && this.equipmentItemRepository) {
      await this.equipmentItemRepository.renameMaintenanceType(oldValue, entity.value, labId);
    } else if (entity.category === 'specimen_type' && this.donorRepository) {
      await this.donorRepository.renameSpecimenType(oldValue, entity.value, labId);
    } else {
      const renameFns = this.getCatalogRenameFns(entity.category);
      if (renameFns.length > 0) {
        await Promise.all(renameFns.map(fn => fn(oldValue, entity.value, labId)));
      } else {
        await this.lookupValueRepository.renameTubeValues(
          entity.category,
          oldValue,
          entity.value,
          labId
        );
      }
    }

    return entity.toData();
  }

  async delete(labId: string, id: string, user: User): Promise<void> {
    await this.rejectIfSeededDemo(labId, user);

    const entity = await this.lookupValueRepository.findById(id, labId);
    if (!entity) {
      throw new NotFoundError('Lookup value not found');
    }

    const usageCount =
      (await this.getUsageCounts(entity.category, [entity.value], labId)).get(entity.value) ?? 0;

    if (usageCount > 0) {
      const labelMap: Partial<Record<LookupCategory, [string, string]>> = {
        equipment_maintenance_type: ['maintenance log entry', 'maintenance log entries'],
        specimen_type: ['collection entry', 'collection entries'],
        reagent_type: ['item', 'items'],
        vendor: ['item', 'items'],
        manufacturer: ['item', 'items'],
      };
      const [singular, plural] = labelMap[entity.category] ?? ['tube', 'tubes'];
      const label = usageCount === 1 ? singular : plural;
      const verb = usageCount === 1 ? 'references' : 'reference';
      throw new ValidationError(
        `Cannot delete "${entity.value}" — ${usageCount} ${label} still ${verb} it`
      );
    }

    await this.lookupValueRepository.delete(id, labId);
  }

  private getCatalogCountFns(category: LookupCategory): CatalogCountFn[] {
    const supply = this.supplyItemRepository;
    const reagent = this.reagentItemRepository;
    const equipment = this.equipmentItemRepository;
    const fns: CatalogCountFn[] = [];

    switch (category) {
      case 'reagent_type':
        if (reagent) fns.push((v, l) => reagent.countItemsUsingReagentType(v, l));
        break;
      case 'vendor':
        if (supply) fns.push((v, l) => supply.countItemsUsingVendor(v, l));
        if (reagent) fns.push((v, l) => reagent.countItemsUsingVendor(v, l));
        if (equipment) fns.push((v, l) => equipment.countItemsUsingVendor(v, l));
        break;
      case 'manufacturer':
        if (supply) fns.push((v, l) => supply.countItemsUsingManufacturer(v, l));
        if (reagent) fns.push((v, l) => reagent.countItemsUsingManufacturer(v, l));
        if (equipment) fns.push((v, l) => equipment.countItemsUsingManufacturer(v, l));
        break;
    }

    return fns;
  }

  private getCatalogRenameFns(category: LookupCategory): CatalogRenameFn[] {
    const supply = this.supplyItemRepository;
    const reagent = this.reagentItemRepository;
    const equipment = this.equipmentItemRepository;
    const fns: CatalogRenameFn[] = [];

    switch (category) {
      case 'reagent_type':
        if (reagent) fns.push((o, n, l) => reagent.renameReagentType(o, n, l));
        break;
      case 'vendor':
        if (supply) fns.push((o, n, l) => supply.renameVendor(o, n, l));
        if (reagent) fns.push((o, n, l) => reagent.renameVendor(o, n, l));
        if (equipment) fns.push((o, n, l) => equipment.renameVendor(o, n, l));
        break;
      case 'manufacturer':
        if (supply) fns.push((o, n, l) => supply.renameManufacturer(o, n, l));
        if (reagent) fns.push((o, n, l) => reagent.renameManufacturer(o, n, l));
        if (equipment) fns.push((o, n, l) => equipment.renameManufacturer(o, n, l));
        break;
    }

    return fns;
  }
}
