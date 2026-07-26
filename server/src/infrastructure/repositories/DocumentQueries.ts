/**
 * Document Queries
 *
 * The documents table behind an inventory item, composed by the equipment and supply item
 * repositories. They expose it through their own contracts; only the SQL is shared.
 */

import type { Document, DocumentFactory } from '@domain/entities/Document';
import type { DocumentRow } from '@infrastructure/database/mappers/DocumentMapper';
import { DocumentMapper } from '@infrastructure/database/mappers/DocumentMapper';
import type { Queryable } from '@infrastructure/database/Queryable';

import type { DocumentType } from '@odysseus/shared-schemas';

const COLUMNS = 'id, item_id, label, url, notes, doc_type, created_at';

export interface DocumentPatch {
  label?: string;
  url?: string;
  notes?: string | null;
  docType?: DocumentType | null;
}

export class DocumentQueries<T extends Document> {
  /**
   * @param table - the catalog's documents table. Interpolated into SQL, so it must only ever come
   *   from a constant at the composing repository — never from a request.
   */
  constructor(
    private db: Queryable,
    private table: string,
    private fromData: DocumentFactory<T>
  ) {}

  /** Newest first, matching every other time-ordered list — including the maintenance log. */
  async findByItemId(itemId: string): Promise<T[]> {
    const rows = await this.db.queryMany<DocumentRow>(
      `SELECT ${COLUMNS} FROM ${this.table} WHERE item_id = $1 ORDER BY created_at DESC`,
      [itemId]
    );
    return DocumentMapper.fromRows(rows, this.fromData);
  }

  async save(document: T): Promise<void> {
    const row = DocumentMapper.toRow(document);
    await this.db.execute(
      `
      INSERT INTO ${this.table} (${COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [row.id, row.item_id, row.label, row.url, row.notes, row.doc_type, row.created_at]
    );
  }

  /** Patches only the fields present. With nothing to change, returns the document unchanged. */
  async update(id: string, itemId: string, fields: DocumentPatch): Promise<T | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (fields.label !== undefined) {
      sets.push(`label = $${idx++}`);
      params.push(fields.label);
    }
    if (fields.url !== undefined) {
      sets.push(`url = $${idx++}`);
      params.push(fields.url);
    }
    if (fields.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      params.push(fields.notes);
    }
    if (fields.docType !== undefined) {
      sets.push(`doc_type = $${idx++}`);
      params.push(fields.docType);
    }

    if (sets.length === 0) {
      const existing = await this.db.queryOne<DocumentRow>(
        `SELECT ${COLUMNS} FROM ${this.table} WHERE id = $1 AND item_id = $2`,
        [id, itemId]
      );
      return existing ? DocumentMapper.fromRow(existing, this.fromData) : null;
    }

    params.push(id, itemId);
    const row = await this.db.queryOne<DocumentRow>(
      `UPDATE ${this.table} SET ${sets.join(', ')} WHERE id = $${idx} AND item_id = $${idx + 1} RETURNING ${COLUMNS}`,
      params
    );
    return row ? DocumentMapper.fromRow(row, this.fromData) : null;
  }

  async delete(id: string, itemId: string): Promise<boolean> {
    const result = await this.db.execute(
      `DELETE FROM ${this.table} WHERE id = $1 AND item_id = $2`,
      [id, itemId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
