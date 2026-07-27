/**
 * Reagent Document
 *
 * A Document against a reagent item (SDS, CoA, spec sheet, protocol). Behaviour lives on the base class.
 */

import { Document, type DocumentCreateData, type DocumentData } from '@domain/entities/Document';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

export class ReagentDocument extends Document {
  static create(data: DocumentCreateData): ReagentDocument {
    return new ReagentDocument(
      generateId('rdoc'),
      data.itemId,
      data.label,
      data.url,
      data.notes,
      new Date(),
      data.docType
    );
  }

  static fromData(data: DocumentData): ReagentDocument {
    return new ReagentDocument(
      data.id,
      data.itemId,
      data.label,
      data.url,
      data.notes,
      toDomainDate(data.createdAt),
      data.docType
    );
  }
}
