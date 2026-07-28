/**
 * Attribute Repository
 *
 * PostgreSQL implementation for lab-wide attribute definitions and options.
 */

import type { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import type {
  AttributeRepository as IAttributeRepository,
  AttributeOptionRow,
} from '@domain/repositories/AttributeRepository';
import type {
  AttributeDefinitionDbRow,
  AttributeOptionDbRow,
} from '@infrastructure/database/mappers/AttributeMapper';
import { AttributeMapper } from '@infrastructure/database/mappers/AttributeMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';

const DEFINITION_COLUMNS = `id, lab_id, name, value_type, applies_to_catalog, applies_to_type,
  sort_order, is_system, system_key, prompt_on_form, created_at, updated_at`;
const OPTION_COLUMNS = 'id, definition_id, value, sort_order';
const OPTION_COLUMNS_ALIASED = 'o.id, o.definition_id, o.value, o.sort_order';

export class AttributeRepository implements IAttributeRepository {
  constructor(private db: Queryable) {}

  async findDefinitionById(id: string, labId: string): Promise<AttributeDefinition | null> {
    const row = await this.db.queryOne<AttributeDefinitionDbRow>(
      `SELECT ${DEFINITION_COLUMNS} FROM attribute_definitions WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? AttributeMapper.definitionFromRow(row) : null;
  }

  async findDefinitionsByLabId(labId: string): Promise<AttributeDefinition[]> {
    const rows = await this.db.queryMany<AttributeDefinitionDbRow>(
      `SELECT ${DEFINITION_COLUMNS} FROM attribute_definitions WHERE lab_id = $1 ORDER BY sort_order, name`,
      [labId]
    );
    return AttributeMapper.definitionsFromRows(rows);
  }

  async findDefinitionByName(name: string, labId: string): Promise<AttributeDefinition | null> {
    const row = await this.db.queryOne<AttributeDefinitionDbRow>(
      `SELECT ${DEFINITION_COLUMNS} FROM attribute_definitions WHERE lab_id = $1 AND name = $2`,
      [labId, name]
    );
    return row ? AttributeMapper.definitionFromRow(row) : null;
  }

  async saveDefinition(definition: AttributeDefinition): Promise<void> {
    const row = AttributeMapper.definitionToRow(definition);
    await this.db.execute(
      `
      INSERT INTO attribute_definitions (${DEFINITION_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        applies_to_catalog = EXCLUDED.applies_to_catalog,
        applies_to_type = EXCLUDED.applies_to_type,
        sort_order = EXCLUDED.sort_order,
        prompt_on_form = EXCLUDED.prompt_on_form,
        updated_at = EXCLUDED.updated_at
    `,
      [
        row.id,
        row.lab_id,
        row.name,
        row.value_type,
        row.applies_to_catalog,
        row.applies_to_type,
        row.sort_order,
        row.is_system,
        row.system_key,
        row.prompt_on_form,
        row.created_at,
        row.updated_at,
      ]
    );
  }

  async deleteDefinition(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM attribute_definitions WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findOptionsByLabId(labId: string): Promise<AttributeOptionRow[]> {
    const rows = await this.db.queryMany<AttributeOptionDbRow>(
      `
      SELECT ${OPTION_COLUMNS_ALIASED}
      FROM attribute_options o
      JOIN attribute_definitions d ON d.id = o.definition_id
      WHERE d.lab_id = $1
      ORDER BY o.sort_order, o.value
    `,
      [labId]
    );
    return AttributeMapper.optionsFromRows(rows);
  }

  async findOptionById(id: string, labId: string): Promise<AttributeOptionRow | null> {
    const row = await this.db.queryOne<AttributeOptionDbRow>(
      `
      SELECT ${OPTION_COLUMNS_ALIASED}
      FROM attribute_options o
      JOIN attribute_definitions d ON d.id = o.definition_id
      WHERE o.id = $1 AND d.lab_id = $2
    `,
      [id, labId]
    );
    return row ? AttributeMapper.optionFromRow(row) : null;
  }

  async saveOption(option: AttributeOptionRow): Promise<void> {
    await this.db.execute(
      `
      INSERT INTO attribute_options (${OPTION_COLUMNS})
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        value = EXCLUDED.value,
        sort_order = EXCLUDED.sort_order
    `,
      [option.id, option.definitionId, option.value, option.sortOrder]
    );
  }

  async deleteOption(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      `
      DELETE FROM attribute_options o
      USING attribute_definitions d
      WHERE o.definition_id = d.id AND o.id = $1 AND d.lab_id = $2
    `,
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async countItemsUsingDefinition(definitionId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(DISTINCT item_id) as count FROM reagent_attribute_values WHERE definition_id = $1',
      [definitionId]
    );
    return parseCount(row);
  }

  async countItemsUsingOption(optionId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(DISTINCT item_id) as count FROM reagent_attribute_values WHERE value_option_id = $1',
      [optionId]
    );
    return parseCount(row);
  }
}
