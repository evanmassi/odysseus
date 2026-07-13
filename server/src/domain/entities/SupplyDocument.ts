/**
 * Supply Document
 *
 * A Document against a supply item (SOP, spec sheet, item page). Behaviour lives on the base class.
 */

import { Document, type DocumentCreateData, type DocumentData } from '@domain/entities/Document';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

export class SupplyDocument extends Document {
  static create(data: DocumentCreateData): SupplyDocument {
    return new SupplyDocument(
      generateId('sdoc'),
      data.itemId,
      data.label,
      data.url,
      data.notes,
      new Date()
    );
  }

  static fromData(data: DocumentData): SupplyDocument {
    return new SupplyDocument(
      data.id,
      data.itemId,
      data.label,
      data.url,
      data.notes,
      toDomainDate(data.createdAt)
    );
  }
}
