/**
 * Custom Unit Repository
 *
 * PostgreSQL implementation for the lab's custom units. Units are referenced by label
 * across every column that stores one, so usage counting and renaming both fan out over
 * the same table/column map — rewriting a subset would detach packaging chains, which
 * walk `parent_unit` to `unit_name` to `stock_unit` by string equality.
 */

import type {
  CustomUnitRepository as ICustomUnitRepository,
  CustomUnitRow,
  CustomUnitUsageRow,
} from '@domain/repositories/CustomUnitRepository';
import type {
  CustomUnitDbRow,
  CustomUnitUsageDbRow,
} from '@infrastructure/database/mappers/CustomUnitMapper';
import { CustomUnitMapper } from '@infrastructure/database/mappers/CustomUnitMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';

import type { UnitKindValue } from '@odysseus/shared-schemas';

const COLUMNS = 'id, lab_id, label, kind, sort_order, created_at, updated_at';
const COLUMNS_ALIASED = 'c.id, c.lab_id, c.label, c.kind, c.sort_order, c.created_at, c.updated_at';

interface UnitColumnSource {
  table: string;
  columns: string[];
  /** Lab scope for the table, where `$1` is the lab id. */
  labScope: string;
}

const REAGENT_ITEM_SCOPE = 'item_id IN (SELECT id FROM reagent_items WHERE lab_id = $1)';

const UNIT_COLUMNS: UnitColumnSource[] = [
  {
    table: 'supply_items',
    columns: ['stock_unit', 'reorder_unit', 'reorder_threshold_unit'],
    labScope: 'lab_id = $1',
  },
  {
    table: 'supply_packaging_levels',
    columns: ['unit_name', 'parent_unit'],
    labScope: 'item_id IN (SELECT id FROM supply_items WHERE lab_id = $1)',
  },
  {
    table: 'reagent_items',
    columns: ['stock_unit', 'reorder_unit', 'reorder_threshold_unit', 'concentration_unit'],
    labScope: 'lab_id = $1',
  },
  { table: 'reagent_lots', columns: ['concentration_unit'], labScope: REAGENT_ITEM_SCOPE },
  {
    table: 'reagent_packaging_levels',
    columns: ['unit_name', 'parent_unit'],
    labScope: REAGENT_ITEM_SCOPE,
  },
];

const eachUnitColumn = <T>(map: (table: string, column: string, labScope: string) => T): T[] =>
  UNIT_COLUMNS.flatMap(source =>
    source.columns.map(column => map(source.table, column, source.labScope))
  );

const USED_LABELS = eachUnitColumn(
  (table, column, labScope) =>
    `SELECT ${column} AS label FROM ${table} WHERE ${labScope} AND ${column} IS NOT NULL`
).join(' UNION ALL ');

const USAGE_MATCHES = eachUnitColumn(
  (table, column, labScope) => `SELECT 1 FROM ${table} WHERE ${labScope} AND ${column} = $2`
).join(' UNION ALL ');

export class CustomUnitRepository implements ICustomUnitRepository {
  constructor(private db: Queryable) {}

  async findByLabId(labId: string): Promise<CustomUnitUsageRow[]> {
    const rows = await this.db.queryMany<CustomUnitUsageDbRow>(
      `
      WITH used AS (${USED_LABELS})
      SELECT ${COLUMNS_ALIASED}, COALESCE(u.n, 0)::int AS usage_count
      FROM custom_units c
      LEFT JOIN (SELECT label, COUNT(*)::int AS n FROM used GROUP BY label) u ON u.label = c.label
      WHERE c.lab_id = $1
      ORDER BY c.sort_order, c.label
    `,
      [labId]
    );
    return rows.map(row => CustomUnitMapper.usageFromRow(row));
  }

  async findById(id: string, labId: string): Promise<CustomUnitRow | null> {
    const row = await this.db.queryOne<CustomUnitDbRow>(
      `SELECT ${COLUMNS} FROM custom_units WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? CustomUnitMapper.fromRow(row) : null;
  }

  async findByLabel(label: string, labId: string): Promise<CustomUnitRow | null> {
    const row = await this.db.queryOne<CustomUnitDbRow>(
      `SELECT ${COLUMNS} FROM custom_units WHERE lab_id = $1 AND LOWER(label) = LOWER($2)`,
      [labId, label]
    );
    return row ? CustomUnitMapper.fromRow(row) : null;
  }

  // Insert-only: the label is the sole mutable field and it changes through `rename`, which
  // has to move every referencing column with it.
  async create(unit: CustomUnitRow): Promise<void> {
    const row = CustomUnitMapper.toRow(unit);
    await this.db.execute(
      `INSERT INTO custom_units (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.id, row.lab_id, row.label, row.kind, row.sort_order, row.created_at, row.updated_at]
    );
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM custom_units WHERE id = $1 AND lab_id = $2', [
      id,
      labId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async countUsage(label: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM (${USAGE_MATCHES}) matches`,
      [labId, label]
    );
    return parseCount(row);
  }

  // No cascade: the dimension lives only here, and the service refuses the change while any
  // item still holds the label.
  async changeKind(unit: CustomUnitRow, kind: UnitKindValue): Promise<CustomUnitRow> {
    const result = await this.db.query<CustomUnitDbRow>(
      `UPDATE custom_units SET kind = $2, updated_at = NOW()
       WHERE lab_id = $1 AND id = $3 RETURNING ${COLUMNS}`,
      [unit.labId, kind, unit.id]
    );
    return CustomUnitMapper.fromRow(result.rows[0]);
  }

  async rename(unit: CustomUnitRow, label: string): Promise<CustomUnitRow> {
    return this.db.transaction(async client => {
      // Timestamps are left alone, as migration 032 did: the unit is the same unit under a
      // corrected name, and bumping updated_at would read as an edit to every item.
      for (const source of UNIT_COLUMNS) {
        for (const column of source.columns) {
          await client.query(
            `UPDATE ${source.table} SET ${column} = $2 WHERE ${source.labScope} AND ${column} = $3`,
            [unit.labId, label, unit.label]
          );
        }
      }

      const result = await client.query<CustomUnitDbRow>(
        `UPDATE custom_units SET label = $2, updated_at = NOW()
         WHERE lab_id = $1 AND id = $3 RETURNING ${COLUMNS}`,
        [unit.labId, label, unit.id]
      );
      return CustomUnitMapper.fromRow(result.rows[0]);
    });
  }
}
