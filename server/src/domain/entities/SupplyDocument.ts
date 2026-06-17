/**
 * Supply Document
 *
 * Link to an external document (SOP, spec sheet, item page) associated with a supply item.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export class SupplyDocument {
  private constructor(
    private readonly _id: string,
    private readonly _itemId: string,
    private readonly _label: string,
    private readonly _url: string,
    private readonly _notes: string | undefined,
    private readonly _createdAt: Date
  ) {
    this.validate();
  }

  static create(data: {
    itemId: string;
    label: string;
    url: string;
    notes?: string;
  }): SupplyDocument {
    return new SupplyDocument(
      generateId('sdoc'),
      data.itemId,
      data.label,
      data.url,
      data.notes,
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    itemId: string;
    label: string;
    url: string;
    notes?: string;
    createdAt: string | Date;
  }): SupplyDocument {
    return new SupplyDocument(
      data.id,
      data.itemId,
      data.label,
      data.url,
      data.notes,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt
    );
  }

  private validate(): void {
    if (!this._label || this._label.trim().length === 0) {
      throw new ValidationError('Document label is required');
    }
    if (!this._url || this._url.trim().length === 0) {
      throw new ValidationError('Document URL is required');
    }
  }

  get id(): string { return this._id; }
  get itemId(): string { return this._itemId; }
  get label(): string { return this._label; }
  get url(): string { return this._url; }
  get notes(): string | undefined { return this._notes; }
  get createdAt(): Date { return new Date(this._createdAt); }
}
