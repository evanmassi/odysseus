/**
 * Attribute Value Queries
 *
 * The attribute values table behind an inventory item, composed by the equipment, supply, and
 * reagent item repositories. They expose it through their own contracts; only the SQL is shared.
 */

import type { AttributeValueRow } from '@domain/repositories/AttributeRepository';
import type { Queryable } from '@infrastructure/database/Queryable';

const COLUMNS = 'id, item_id, definition_id, value_option_id, value_text, value_number';

interface AttributeValueDbRow {
  id: string;
  item_id: string;
  definition_id: string;
  value_option_id: string | null;
  value_text: string | null;
  value_number: string | null;
}

function toRow(row: AttributeValueDbRow): AttributeValueRow {
  return {
    id: row.id,
    itemId: row.item_id,
    definitionId: row.definition_id,
    valueOptionId: row.value_option_id ?? undefined,
    valueText: row.value_text ?? undefined,
    valueNumber: row.value_number != null ? parseFloat(row.value_number) : undefined,
  };
}

export class AttributeValueQueries {
  /**
   * @param valuesTable - the catalog's attribute values table
   * @param itemsTable - the catalog's items table, joined to scope a lab-wide read
   *
   * Both are interpolated into SQL, so they must only ever come from a constant at the composing
   * repository — never from a request.
   */
  constructor(
    private db: Queryable,
    private valuesTable: string,
    private itemsTable: string
  ) {}

  async findByItemId(itemId: string): Promise<AttributeValueRow[]> {
    const rows = await this.db.queryMany<AttributeValueDbRow>(
      `SELECT ${COLUMNS} FROM ${this.valuesTable} WHERE item_id = $1`,
      [itemId]
    );
    return rows.map(toRow);
  }

  async findByLabId(labId: string): Promise<AttributeValueRow[]> {
    const rows = await this.db.queryMany<AttributeValueDbRow>(
      `
      SELECT v.id, v.item_id, v.definition_id, v.value_option_id, v.value_text, v.value_number
      FROM ${this.valuesTable} v
      JOIN ${this.itemsTable} i ON i.id = v.item_id
      WHERE i.lab_id = $1
    `,
      [labId]
    );
    return rows.map(toRow);
  }

  /** Replaces a definition's values for one item wholesale — an empty list clears them. */
  async replace(itemId: string, definitionId: string, values: AttributeValueRow[]): Promise<void> {
    await this.db.transaction(async client => {
      await client.query(
        `DELETE FROM ${this.valuesTable} WHERE item_id = $1 AND definition_id = $2`,
        [itemId, definitionId]
      );
      for (const value of values) {
        await client.query(
          `INSERT INTO ${this.valuesTable} (${COLUMNS})
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            value.id,
            value.itemId,
            value.definitionId,
            value.valueOptionId ?? null,
            value.valueText ?? null,
            value.valueNumber ?? null,
          ]
        );
      }
    });
  }
}
