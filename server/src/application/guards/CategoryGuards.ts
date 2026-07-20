/**
 * Category Guards
 *
 * Enforces the two-level category hierarchy shared by the equipment and supply catalogs.
 */

import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';

/** The slice of a category the depth rules read — satisfied by both domains' entities. */
interface NestableCategory {
  readonly parentId?: string;
}

/** The slice of a category repository the depth rules need — satisfied by both domains'. */
interface NestableCategoryRepository {
  findById(id: string, labId: string): Promise<NestableCategory | null>;
  hasChildren(id: string, labId: string): Promise<boolean>;
}

interface CategoryDepthOptions {
  labId: string;
  /** The parent the category is being placed under. Top-level (null/undefined) always passes. */
  parentId?: string | null;
  /** The category being reparented. Omit when creating — a new category has no children yet. */
  movingCategoryId?: string;
}

/**
 * Rejects any placement that would produce a third level: nesting under a subcategory, or nesting
 * a category that already has subcategories of its own.
 *
 * @throws NotFoundError when the parent doesn't exist in the lab
 * @throws ValidationError when the placement would exceed two levels
 */
export async function validateCategoryDepth(
  repository: NestableCategoryRepository,
  { labId, parentId, movingCategoryId }: CategoryDepthOptions
): Promise<void> {
  if (!parentId) return;

  const parent = await repository.findById(parentId, labId);
  if (!parent) {
    throw new NotFoundError('Parent category not found');
  }

  if (parent.parentId) {
    throw new ValidationError(
      'Cannot nest a category under a subcategory — the hierarchy is two levels deep'
    );
  }

  if (movingCategoryId && (await repository.hasChildren(movingCategoryId, labId))) {
    throw new ValidationError(
      'Cannot nest a category that has subcategories — the hierarchy is two levels deep'
    );
  }
}
