/**
 * Location Repository
 *
 * PostgreSQL implementation for the lab-wide location tree.
 */

import type { Location } from '@domain/entities/Location';
import type { LocationRepository as ILocationRepository } from '@domain/repositories/LocationRepository';
import type { LocationRow } from '@infrastructure/database/mappers/LocationMapper';
import { LocationMapper } from '@infrastructure/database/mappers/LocationMapper';
import type { Queryable } from '@infrastructure/database/Queryable';

const COLUMNS = 'id, lab_id, name, description, parent_id, sort_order, created_at, updated_at';

export class LocationRepository implements ILocationRepository {
  constructor(private db: Queryable) {}

  async findById(id: string, labId: string): Promise<Location | null> {
    const row = await this.db.queryOne<LocationRow>(
      `SELECT ${COLUMNS} FROM locations WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? LocationMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<Location[]> {
    const rows = await this.db.queryMany<LocationRow>(
      `SELECT ${COLUMNS} FROM locations WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return LocationMapper.fromRows(rows);
  }

  async save(location: Location): Promise<void> {
    const row = LocationMapper.toRow(location);
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
