/**
 * Equipment Category
 *
 * A Category in the equipment catalog. Behaviour lives on the base class; this exists to keep
 * equipment categories from being interchangeable with supply ones.
 */

import { Category, toCategoryDate, type CategoryCreateData, type CategoryData } from '@domain/entities/Category';
import { generateId } from '@domain/utils/generateId';

export class EquipmentCategory extends Category {
  static create(data: CategoryCreateData): EquipmentCategory {
    return new EquipmentCategory(
      generateId('eqcat'),
      data.labId,
      data.name,
      data.parentId,
      data.sortOrder ?? 0,
      new Date(),
      new Date()
    );
  }

  static fromData(data: CategoryData): EquipmentCategory {
    return new EquipmentCategory(
      data.id,
      data.labId,
      data.name,
      data.parentId,
      data.sortOrder,
      toCategoryDate(data.createdAt),
      toCategoryDate(data.updatedAt)
    );
  }
}
