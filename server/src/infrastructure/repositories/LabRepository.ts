import { Lab } from '@domain/entities/Lab';
import { LabRepository as ILabRepository } from '@domain/repositories/LabRepository';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { LabMapper, LabRow } from '@infrastructure/database/mappers/LabMapper';

const LAB_COLUMNS = 'id, name, slug, is_active, is_demo, created_at, updated_at';

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
      `INSERT INTO labs (id, name, slug, is_active, is_demo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         slug = $3,
         is_active = $4,
         is_demo = $5,
         updated_at = $7`,
      [row.id, row.name, row.slug, row.is_active, row.is_demo, row.created_at, row.updated_at]
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
    const row = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM labs WHERE id = $1',
      [id]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }
}
