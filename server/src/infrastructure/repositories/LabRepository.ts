/**
 * Lab Repository
 *
 * Data access for lab tenants with upsert support.
 */

import type { Lab } from '@domain/entities/Lab';
import type { LabRepository as ILabRepository } from '@domain/repositories/LabRepository';
import type { LabRow } from '@infrastructure/database/mappers/LabMapper';
import { LabMapper } from '@infrastructure/database/mappers/LabMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const LAB_COLUMNS = 'id, name, slug, is_active, is_demo, created_at, updated_at, demo_limits';

export class LabRepository implements ILabRepository {

  constructor(private context: PostgresContext) {}

  async findById(id: string): Promise<Lab | null> {
    const row = await this.context.queryOne<LabRow>(
      `SELECT ${LAB_COLUMNS} FROM labs WHERE id = $1`,
      [id]
    );
    return row ? LabMapper.fromRow(row) : null;
  }

  async findBySlug(slug: string): Promise<Lab | null> {
    const row = await this.context.queryOne<LabRow>(
      `SELECT ${LAB_COLUMNS} FROM labs WHERE slug = $1`,
      [slug]
    );
    return row ? LabMapper.fromRow(row) : null;
  }

  async findAll(): Promise<Lab[]> {
    const rows = await this.context.queryMany<LabRow>(
      `SELECT ${LAB_COLUMNS} FROM labs ORDER BY created_at ASC`
    );
    return LabMapper.fromRows(rows);
  }

  async findActive(): Promise<Lab[]> {
    const rows = await this.context.queryMany<LabRow>(
      `SELECT ${LAB_COLUMNS} FROM labs WHERE is_active = TRUE ORDER BY name ASC`
    );
    return LabMapper.fromRows(rows);
  }

  async save(lab: Lab): Promise<void> {
    const row = LabMapper.toRow(lab);
    await this.context.execute(
      `INSERT INTO labs (id, name, slug, is_active, is_demo, created_at, updated_at, demo_limits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         is_active = EXCLUDED.is_active,
         is_demo = EXCLUDED.is_demo,
         updated_at = EXCLUDED.updated_at,
         demo_limits = EXCLUDED.demo_limits`,
      [row.id, row.name, row.slug, row.is_active, row.is_demo, row.created_at, row.updated_at,
       row.demo_limits ? JSON.stringify(row.demo_limits) : null]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM labs WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const row = await this.context.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM labs WHERE id = $1) as exists',
      [id]
    );
    return row?.exists ?? false;
  }
}
