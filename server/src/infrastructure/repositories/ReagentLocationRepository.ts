/**
 * Reagent Location Repository
 *
 * PostgreSQL implementation for named reagent storage zones.
 */

import type { ReagentLocation } from '@domain/entities/ReagentLocation';
import type { ReagentLocationRepository as IReagentLocationRepository } from '@domain/repositories/ReagentLocationRepository';
import type { ReagentLocationRow } from '@infrastructure/database/mappers/ReagentLocationMapper';
import { ReagentLocationMapper } from '@infrastructure/database/mappers/ReagentLocationMapper';
import type { Queryable } from '@infrastructure/database/Queryable';

const COLUMNS = 'id, lab_id, name, description, sort_order, created_at, updated_at';

export class ReagentLocationRepository implements IReagentLocationRepository {
  constructor(private db: Queryable) {}

  async findById(id: string, labId: string): Promise<ReagentLocation | null> {
    const row = await this.db.queryOne<ReagentLocationRow>(
      `SELECT ${COLUMNS} FROM reagent_locations WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ReagentLocationMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<ReagentLocation[]> {
    const rows = await this.db.queryMany<ReagentLocationRow>(
      `SELECT ${COLUMNS} FROM reagent_locations WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return ReagentLocationMapper.fromRows(rows);
  }

  async save(location: ReagentLocation): Promise<void> {
    const row = ReagentLocationMapper.toRow(location);
    await this.db.execute(
      `
      INSERT INTO reagent_locations (${COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `,
      [row.id, row.lab_id, row.name, row.description, row.sort_order, row.created_at, row.updated_at]
    );
  }
}
