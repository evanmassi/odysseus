/**
 * Supply Document
 *
 * Link to an external document (SOP, spec sheet, product page) associated with a supply product.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export class SupplyDocument {
  private constructor(
    private readonly _id: string,
    private readonly _productId: string,
    private readonly _label: string,
    private readonly _url: string,
    private readonly _notes: string | undefined,
    private readonly _createdAt: Date
  ) {
    this.validate();
  }

  static create(data: {
    productId: string;
    label: string;
    url: string;
    notes?: string;
  }): SupplyDocument {
    return new SupplyDocument(
      generateId('sdoc'),
      data.productId,
      data.label,
      data.url,
      data.notes,
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    productId: string;
    label: string;
    url: string;
    notes?: string;
    createdAt: string | Date;
  }): SupplyDocument {
    return new SupplyDocument(
      data.id,
      data.productId,
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
  get productId(): string { return this._productId; }
  get label(): string { return this._label; }
  get url(): string { return this._url; }
  get notes(): string | undefined { return this._notes; }
  get createdAt(): Date { return new Date(this._createdAt); }
}
