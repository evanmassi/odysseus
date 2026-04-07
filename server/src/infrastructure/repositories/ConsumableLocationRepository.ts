/**
 * Consumable Location Repository
 *
 * PostgreSQL implementation for named storage zones where consumables are kept.
 */

import type { ConsumableLocation } from '@domain/entities/ConsumableLocation';
import type { ConsumableLocationRepository as IConsumableLocationRepository } from '@domain/repositories/ConsumableLocationRepository';
import type { ConsumableLocationRow } from '@infrastructure/database/mappers/ConsumableLocationMapper';
import { ConsumableLocationMapper } from '@infrastructure/database/mappers/ConsumableLocationMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const COLUMNS = 'id, lab_id, name, description, sort_order, created_at, updated_at';

export class ConsumableLocationRepository implements IConsumableLocationRepository {

  constructor(private db: PostgresContext) {}

  async findById(id: string, labId: string): Promise<ConsumableLocation | null> {
    const row = await this.db.queryOne<ConsumableLocationRow>(
      `SELECT ${COLUMNS} FROM consumable_locations WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ConsumableLocationMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<ConsumableLocation[]> {
    const rows = await this.db.queryMany<ConsumableLocationRow>(
      `SELECT ${COLUMNS} FROM consumable_locations WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return ConsumableLocationMapper.fromRows(rows);
  }

  async save(location: ConsumableLocation): Promise<void> {
    const row = ConsumableLocationMapper.toRow(location);
    await this.db.execute(`
      INSERT INTO consumable_locations (${COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `, [row.id, row.lab_id, row.name, row.description, row.sort_order, row.created_at, row.updated_at]);
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM consumable_locations WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasStock(id: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_stock WHERE location_id = $1 AND quantity > 0',
      [id]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }
}
