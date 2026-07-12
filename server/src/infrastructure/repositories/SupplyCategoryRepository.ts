/**
 * Supply Category Repository
 *
 * PostgreSQL implementation for the lab-managed supply category hierarchy.
 */

import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { SupplyCategoryRepository as ISupplyCategoryRepository } from '@domain/repositories/SupplyCategoryRepository';
import type { SupplyCategoryRow } from '@infrastructure/database/mappers/SupplyCategoryMapper';
import { SupplyCategoryMapper } from '@infrastructure/database/mappers/SupplyCategoryMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';

const COLUMNS = 'id, lab_id, name, parent_id, sort_order, created_at, updated_at';

export class SupplyCategoryRepository implements ISupplyCategoryRepository {

  constructor(private db: Queryable) {}

  async findById(id: string, labId: string): Promise<SupplyCategory | null> {
    const row = await this.db.queryOne<SupplyCategoryRow>(
      `SELECT ${COLUMNS} FROM supply_categories WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? SupplyCategoryMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<SupplyCategory[]> {
    const rows = await this.db.queryMany<SupplyCategoryRow>(
      `SELECT ${COLUMNS} FROM supply_categories WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return SupplyCategoryMapper.fromRows(rows);
  }

  async save(category: SupplyCategory): Promise<void> {
    const row = SupplyCategoryMapper.toRow(category);
    await this.db.execute(`
      INSERT INTO supply_categories (${COLUMNS})
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
      'DELETE FROM supply_categories WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_categories WHERE parent_id = $1 AND lab_id = $2',
      [id, labId]
    );
    return parseCount(row) > 0;
  }

  async hasItemsIncludingChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM supply_items
      WHERE lab_id = $2
        AND category_id IN (
          SELECT id FROM supply_categories WHERE id = $1 AND lab_id = $2
          UNION ALL
          SELECT id FROM supply_categories WHERE parent_id = $1 AND lab_id = $2
        )
    `, [id, labId]);
    return parseCount(row) > 0;
  }
}
