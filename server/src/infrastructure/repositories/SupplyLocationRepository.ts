/**
 * Supply Location Repository
 *
 * PostgreSQL implementation for named storage zones where supplies are kept.
 */

import type { SupplyLocation } from '@domain/entities/SupplyLocation';
import type { SupplyLocationRepository as ISupplyLocationRepository } from '@domain/repositories/SupplyLocationRepository';
import type { SupplyLocationRow } from '@infrastructure/database/mappers/SupplyLocationMapper';
import { SupplyLocationMapper } from '@infrastructure/database/mappers/SupplyLocationMapper';
import type { Queryable } from '@infrastructure/database/Queryable';

const COLUMNS = 'id, lab_id, name, description, sort_order, created_at, updated_at';

export class SupplyLocationRepository implements ISupplyLocationRepository {
  constructor(private db: Queryable) {}

  async findById(id: string, labId: string): Promise<SupplyLocation | null> {
    const row = await this.db.queryOne<SupplyLocationRow>(
      `SELECT ${COLUMNS} FROM supply_locations WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? SupplyLocationMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<SupplyLocation[]> {
    const rows = await this.db.queryMany<SupplyLocationRow>(
      `SELECT ${COLUMNS} FROM supply_locations WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return SupplyLocationMapper.fromRows(rows);
  }

  async save(location: SupplyLocation): Promise<void> {
    const row = SupplyLocationMapper.toRow(location);
    await this.db.execute(
      `
      INSERT INTO supply_locations (${COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `,
      [
        row.id,
        row.lab_id,
        row.name,
        row.description,
        row.sort_order,
        row.created_at,
        row.updated_at,
      ]
    );
  }
}
