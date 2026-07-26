/**
 * Equipment Document
 *
 * A Document against an equipment item (manual, SOP, spec sheet). Behaviour lives on the base class.
 */

import { Document, type DocumentCreateData, type DocumentData } from '@domain/entities/Document';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

export class EquipmentDocument extends Document {
  static create(data: DocumentCreateData): EquipmentDocument {
    return new EquipmentDocument(
      generateId('eqdoc'),
      data.itemId,
      data.label,
      data.url,
      data.notes,
      new Date(),
      data.docType
    );
  }

  static fromData(data: DocumentData): EquipmentDocument {
    return new EquipmentDocument(
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
