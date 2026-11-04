import type { Lab } from '@domain/entities/Lab';
import type { LabRepository as ILabRepository } from '@domain/repositories/LabRepository';
import type { LabRow } from '@infrastructure/database/mappers/LabMapper';
import { LabMapper } from '@infrastructure/database/mappers/LabMapper';
import type { Queryable } from '@infrastructure/database/Queryable';

const LAB_COLUMNS = 'id, name, slug, is_active, is_demo, created_at, updated_at, demo_limits';

export class LabRepository implements ILabRepository {
  constructor(private context: Queryable) {}

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

  async save(lab: Lab): Promise<void> {
    const row = LabMapper.toRow(lab);
    // PITFALL: users.lab_is_active mirrors labs.is_active so the username unique index can see it; write is_active only here.
    await this.context.execute(
      `WITH saved AS (
         INSERT INTO labs (id, name, slug, is_active, is_demo, created_at, updated_at, demo_limits)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           is_active = EXCLUDED.is_active,
           is_demo = EXCLUDED.is_demo,
           updated_at = EXCLUDED.updated_at,
           demo_limits = EXCLUDED.demo_limits
         RETURNING id, is_active
       )
       UPDATE users SET lab_is_active = saved.is_active
       FROM saved
       WHERE users.lab_id = saved.id AND users.lab_is_active <> saved.is_active`,
      [
        row.id,
        row.name,
        row.slug,
        row.is_active,
        row.is_demo,
        row.created_at,
        row.updated_at,
        row.demo_limits ? JSON.stringify(row.demo_limits) : null,
      ]
    );
  }
}
