/**
 * Consumable Category Repository
 *
 * PostgreSQL implementation for the lab-managed consumable category hierarchy.
 */

import type { ConsumableCategory } from '@domain/entities/ConsumableCategory';
import type { ConsumableCategoryRepository as IConsumableCategoryRepository } from '@domain/repositories/ConsumableCategoryRepository';
import type { ConsumableCategoryRow } from '@infrastructure/database/mappers/ConsumableCategoryMapper';
import { ConsumableCategoryMapper } from '@infrastructure/database/mappers/ConsumableCategoryMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const COLUMNS = 'id, lab_id, name, parent_id, sort_order, created_at, updated_at';

export class ConsumableCategoryRepository implements IConsumableCategoryRepository {

  constructor(private db: PostgresContext) {}

  async findById(id: string, labId: string): Promise<ConsumableCategory | null> {
    const row = await this.db.queryOne<ConsumableCategoryRow>(
      `SELECT ${COLUMNS} FROM consumable_categories WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ConsumableCategoryMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<ConsumableCategory[]> {
    const rows = await this.db.queryMany<ConsumableCategoryRow>(
      `SELECT ${COLUMNS} FROM consumable_categories WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return ConsumableCategoryMapper.fromRows(rows);
  }

  async save(category: ConsumableCategory): Promise<void> {
    const row = ConsumableCategoryMapper.toRow(category);
    await this.db.execute(`
      INSERT INTO consumable_categories (${COLUMNS})
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
      'DELETE FROM consumable_categories WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_categories WHERE parent_id = $1 AND lab_id = $2',
      [id, labId]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  async hasProducts(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_products WHERE category_id = $1 AND lab_id = $2',
      [id, labId]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  async hasProductsIncludingChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM consumable_products
      WHERE lab_id = $2
        AND category_id IN (
          SELECT id FROM consumable_categories WHERE id = $1 AND lab_id = $2
          UNION ALL
          SELECT id FROM consumable_categories WHERE parent_id = $1 AND lab_id = $2
        )
    `, [id, labId]);
    return parseInt(row?.count ?? '0', 10) > 0;
  }
}
