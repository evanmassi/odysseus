/**
 * Equipment Category Repository
 *
 * PostgreSQL implementation for the lab-managed equipment category hierarchy.
 */

import type { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import type { EquipmentCategoryRepository as IEquipmentCategoryRepository } from '@domain/repositories/EquipmentCategoryRepository';
import type { EquipmentCategoryRow } from '@infrastructure/database/mappers/EquipmentCategoryMapper';
import { EquipmentCategoryMapper } from '@infrastructure/database/mappers/EquipmentCategoryMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const COLUMNS = 'id, lab_id, name, parent_id, sort_order, created_at, updated_at';

export class EquipmentCategoryRepository implements IEquipmentCategoryRepository {

  constructor(private db: PostgresContext) {}

  async findById(id: string, labId: string): Promise<EquipmentCategory | null> {
    const row = await this.db.queryOne<EquipmentCategoryRow>(
      `SELECT ${COLUMNS} FROM equipment_categories WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? EquipmentCategoryMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<EquipmentCategory[]> {
    const rows = await this.db.queryMany<EquipmentCategoryRow>(
      `SELECT ${COLUMNS} FROM equipment_categories WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return EquipmentCategoryMapper.fromRows(rows);
  }

  async save(category: EquipmentCategory): Promise<void> {
    const row = EquipmentCategoryMapper.toRow(category);
    await this.db.execute(`
      INSERT INTO equipment_categories (${COLUMNS})
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
      'DELETE FROM equipment_categories WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM equipment_categories WHERE parent_id = $1 AND lab_id = $2',
      [id, labId]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  async hasItems(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM equipment_items WHERE category_id = $1 AND lab_id = $2',
      [id, labId]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  async hasItemsIncludingChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM equipment_items
      WHERE lab_id = $2
        AND category_id IN (
          SELECT id FROM equipment_categories WHERE id = $1 AND lab_id = $2
          UNION ALL
          SELECT id FROM equipment_categories WHERE parent_id = $1 AND lab_id = $2
        )
    `, [id, labId]);
    return parseInt(row?.count ?? '0', 10) > 0;
  }
}
