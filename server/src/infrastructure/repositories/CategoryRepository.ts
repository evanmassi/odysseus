/**
 * Category Repository
 *
 * PostgreSQL implementation of a lab-managed category hierarchy, shared by the equipment and
 * supply catalogs. The two differ only in their tables and in which concrete category they hold.
 */

import type { Category, CategoryFactory } from '@domain/entities/Category';
import type { CategoryRepository as ICategoryRepository } from '@domain/repositories/CategoryRepository';
import type { CategoryRow } from '@infrastructure/database/mappers/CategoryMapper';
import { CategoryMapper } from '@infrastructure/database/mappers/CategoryMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';

/**
 * The tables a catalog's categories live in. Interpolated into SQL, so these must only ever come
 * from the constants below — never from a request.
 */
export interface CategoryTables {
  categories: string;
  items: string;
}

export const EQUIPMENT_CATEGORY_TABLES: CategoryTables = {
  categories: 'equipment_categories',
  items: 'equipment_items',
};

export const SUPPLY_CATEGORY_TABLES: CategoryTables = {
  categories: 'supply_categories',
  items: 'supply_items',
};

const COLUMNS = 'id, lab_id, name, parent_id, sort_order, created_at, updated_at';

export class CategoryRepository<T extends Category> implements ICategoryRepository<T> {

  constructor(
    private db: Queryable,
    private tables: CategoryTables,
    private fromData: CategoryFactory<T>
  ) {}

  async findById(id: string, labId: string): Promise<T | null> {
    const row = await this.db.queryOne<CategoryRow>(
      `SELECT ${COLUMNS} FROM ${this.tables.categories} WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? CategoryMapper.fromRow(row, this.fromData) : null;
  }

  async findByLabId(labId: string): Promise<T[]> {
    const rows = await this.db.queryMany<CategoryRow>(
      `SELECT ${COLUMNS} FROM ${this.tables.categories} WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return CategoryMapper.fromRows(rows, this.fromData);
  }

  async save(category: T): Promise<void> {
    const row = CategoryMapper.toRow(category);
    await this.db.execute(`
      INSERT INTO ${this.tables.categories} (${COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `, [row.id, row.lab_id, row.name, row.parent_id, row.sort_order, row.created_at, row.updated_at]);
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      `DELETE FROM ${this.tables.categories} WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tables.categories} WHERE parent_id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return parseCount(row) > 0;
  }

  async hasItemsIncludingChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM ${this.tables.items}
      WHERE lab_id = $2
        AND category_id IN (
          SELECT id FROM ${this.tables.categories} WHERE id = $1 AND lab_id = $2
          UNION ALL
          SELECT id FROM ${this.tables.categories} WHERE parent_id = $1 AND lab_id = $2
        )
    `, [id, labId]);
    return parseCount(row) > 0;
  }
}
