/**
 * Lab Location Repository
 *
 * PostgreSQL implementation for the lab-wide location tree.
 */

import type { LabLocation } from '@domain/entities/LabLocation';
import type { LabLocationRepository as ILabLocationRepository } from '@domain/repositories/LabLocationRepository';
import type { LabLocationRow } from '@infrastructure/database/mappers/LabLocationMapper';
import { LabLocationMapper } from '@infrastructure/database/mappers/LabLocationMapper';
import type { Queryable } from '@infrastructure/database/Queryable';

const COLUMNS = 'id, lab_id, name, description, parent_id, sort_order, created_at, updated_at';

export class LabLocationRepository implements ILabLocationRepository {
  constructor(private db: Queryable) {}

  async findById(id: string, labId: string): Promise<LabLocation | null> {
    const row = await this.db.queryOne<LabLocationRow>(
      `SELECT ${COLUMNS} FROM locations WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? LabLocationMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<LabLocation[]> {
    const rows = await this.db.queryMany<LabLocationRow>(
      `SELECT ${COLUMNS} FROM locations WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return LabLocationMapper.fromRows(rows);
  }

  async save(location: LabLocation): Promise<void> {
    const row = LabLocationMapper.toRow(location);
    await this.db.execute(
      `
      INSERT INTO locations (${COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
    `,
      [
        row.id,
        row.lab_id,
        row.name,
        row.description,
        row.parent_id,
        row.sort_order,
        row.created_at,
        row.updated_at,
      ]
    );
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM locations WHERE id = $1 AND lab_id = $2', [
      id,
      labId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async hasChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM locations WHERE parent_id = $1 AND lab_id = $2) as exists`,
      [id, labId]
    );
    return row?.exists ?? false;
  }

  async isInUseIncludingChildren(id: string, labId: string): Promise<boolean> {
    const row = await this.db.queryOne<{ exists: boolean }>(
      `
      WITH RECURSIVE subtree AS (
        SELECT id FROM locations WHERE id = $1 AND lab_id = $2
        UNION ALL
        SELECT l.id FROM locations l JOIN subtree s ON l.parent_id = s.id
      )
      SELECT EXISTS (
        SELECT 1 FROM supply_stock WHERE location_id IN (SELECT id FROM subtree)
        UNION ALL
        SELECT 1 FROM reagent_lots WHERE location_id IN (SELECT id FROM subtree)
      ) as exists
    `,
      [id, labId]
    );
    return row?.exists ?? false;
  }
}
