/**
 * Lookup Value Repository
 *
 * PostgreSQL implementation for admin-managed dropdown values.
 */

import { LookupValue, LookupCategory } from '@domain/entities/LookupValue';
import { LookupValueRepository as ILookupValueRepository } from '@domain/repositories/LookupValueRepository';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { LookupValueMapper, LookupValueRow } from '@infrastructure/database/mappers/LookupValueMapper';

const CATEGORY_COLUMN_MAP: Record<LookupCategory, string> = {
  species: 'species',
  vendor: 'vendor',
};

export class LookupValueRepository implements ILookupValueRepository {
  constructor(private context: PostgresContext) {}

  async findById(id: string): Promise<LookupValue | null> {
    const row = await this.context.queryOne<LookupValueRow>(
      'SELECT * FROM lookup_values WHERE id = $1',
      [id]
    );
    return row ? LookupValueMapper.fromRow(row) : null;
  }

  async findByCategory(category: LookupCategory): Promise<LookupValue[]> {
    const rows = await this.context.queryMany<LookupValueRow>(
      'SELECT * FROM lookup_values WHERE category = $1 ORDER BY sort_order, value',
      [category]
    );
    return LookupValueMapper.fromRows(rows);
  }

  async findActiveByCategoryForDropdown(category: LookupCategory): Promise<LookupValue[]> {
    const rows = await this.context.queryMany<LookupValueRow>(
      'SELECT * FROM lookup_values WHERE category = $1 AND is_active = TRUE ORDER BY sort_order, value',
      [category]
    );
    return LookupValueMapper.fromRows(rows);
  }

  async findByCategoryAndValue(category: LookupCategory, value: string): Promise<LookupValue | null> {
    const row = await this.context.queryOne<LookupValueRow>(
      'SELECT * FROM lookup_values WHERE category = $1 AND value = $2',
      [category, value]
    );
    return row ? LookupValueMapper.fromRow(row) : null;
  }

  async save(entity: LookupValue): Promise<void> {
    const row = LookupValueMapper.toRow(entity);
    await this.context.execute(`
      INSERT INTO lookup_values (id, category, value, sort_order, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        value = EXCLUDED.value,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    `, [row.id, row.category, row.value, row.sort_order, row.is_active, row.created_at, row.updated_at]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM lookup_values WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async countTubesUsingValue(category: LookupCategory, value: string): Promise<number> {
    const column = CATEGORY_COLUMN_MAP[category];
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tubes WHERE ${column} = $1`,
      [value]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async renameTubeValues(category: LookupCategory, oldValue: string, newValue: string): Promise<number> {
    const column = CATEGORY_COLUMN_MAP[category];
    const result = await this.context.execute(
      `UPDATE tubes SET ${column} = $1, updated_at = NOW() WHERE ${column} = $2`,
      [newValue, oldValue]
    );
    return result.rowCount ?? 0;
  }
}
