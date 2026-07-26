/**
 * Document
 *
 * Link to an external document held against an inventory item, shared by the equipment and supply
 * catalogs. Subclasses hold no behaviour — they exist so the two catalogs' documents stay distinct
 * types and cannot be written to each other's tables.
 */

import { ValidationError } from '@domain/errors/ValidationError';

import type { DocumentType } from '@odysseus/shared-schemas';

export interface DocumentCreateData {
  itemId: string;
  label: string;
  url: string;
  notes?: string;
  docType?: DocumentType;
}

export interface DocumentData {
  id: string;
  itemId: string;
  label: string;
  url: string;
  notes?: string;
  docType?: DocumentType;
  createdAt: string | Date;
}

/** Rehydrates a persisted row into a concrete document. */
export type DocumentFactory<T extends Document> = (data: DocumentData) => T;

export abstract class Document {
  protected constructor(
    private readonly _id: string,
    private readonly _itemId: string,
    private readonly _label: string,
    private readonly _url: string,
    private readonly _notes: string | undefined,
    private readonly _createdAt: Date,
    private readonly _docType: DocumentType | undefined
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this._label || this._label.trim().length === 0) {
      throw new ValidationError('Document label is required');
    }
    if (!this._url || this._url.trim().length === 0) {
      throw new ValidationError('Document URL is required');
    }
  }

  get id(): string {
    return this._id;
  }
  get itemId(): string {
    return this._itemId;
  }
  get label(): string {
    return this._label;
  }
  get url(): string {
    return this._url;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get docType(): DocumentType | undefined {
    return this._docType;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
}
