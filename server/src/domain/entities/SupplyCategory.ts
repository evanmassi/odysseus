/**
 * Supply Category
 *
 * A Category in the supply catalog. Behaviour lives on the base class; this exists to keep supply
 * categories from being interchangeable with equipment ones.
 */

import { Category, toCategoryDate, type CategoryCreateData, type CategoryData } from '@domain/entities/Category';
import { generateId } from '@domain/utils/generateId';

export class SupplyCategory extends Category {
  static create(data: CategoryCreateData): SupplyCategory {
    return new SupplyCategory(
      generateId('scat'),
      data.labId,
      data.name,
      data.parentId,
      data.sortOrder ?? 0,
      new Date(),
      new Date()
    );
  }

  static fromData(data: CategoryData): SupplyCategory {
    return new SupplyCategory(
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
