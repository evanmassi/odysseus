/**
 * Reagent Category
 *
 * A Category in the reagent catalog. Behaviour lives on the base class; this exists to keep reagent
 * categories from being interchangeable with equipment or supply ones.
 */

import { Category, type CategoryCreateData, type CategoryData } from '@domain/entities/Category';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

export class ReagentCategory extends Category {
  static create(data: CategoryCreateData): ReagentCategory {
    return new ReagentCategory(
      generateId('rcat'),
      data.labId,
      data.name,
      data.parentId,
      data.sortOrder ?? 0,
      new Date(),
      new Date()
    );
  }

  static fromData(data: CategoryData): ReagentCategory {
    return new ReagentCategory(
      data.id,
      data.labId,
      data.name,
      data.parentId,
      data.sortOrder,
      toDomainDate(data.createdAt),
      toDomainDate(data.updatedAt)
    );
  }
}
