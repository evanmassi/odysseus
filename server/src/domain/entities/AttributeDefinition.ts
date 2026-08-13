/**
 * Item Attribute Definition
 *
 * A lab-defined metadata field ("Fluorophore", "Hazard Class") scoped to a catalog and to any number
 * of reagent types — none meaning all of them. System definitions are seeded per lab and may be
 * extended but not deleted.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

import type { AttributeCatalog, AttributeValueType } from '@odysseus/shared-schemas';

interface DefinitionCreateData {
  labId: string;
  name: string;
  valueType: AttributeValueType;
  appliesToCatalog?: AttributeCatalog;
  appliesToTypes?: string[];
  sortOrder?: number;
  promptOnForm?: boolean;
  isSystem?: boolean;
  systemKey?: string;
}

interface DefinitionUpdateData {
  name?: string | null;
  appliesToCatalog?: AttributeCatalog | null;
  appliesToTypes?: string[] | null;
  sortOrder?: number | null;
  promptOnForm?: boolean | null;
}

export class AttributeDefinition {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _name: string,
    private readonly _valueType: AttributeValueType,
    private _appliesToCatalog: AttributeCatalog | undefined,
    private _appliesToTypes: string[],
    private _sortOrder: number,
    private readonly _isSystem: boolean,
    private readonly _systemKey: string | undefined,
    private _promptOnForm: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: DefinitionCreateData): AttributeDefinition {
    const now = new Date();
    return new AttributeDefinition(
      generateId('adef'),
      data.labId,
      data.name.trim(),
      data.valueType,
      data.appliesToCatalog,
      data.appliesToTypes ?? [],
      data.sortOrder ?? 0,
      data.isSystem ?? false,
      data.systemKey,
      data.promptOnForm ?? false,
      now,
      now
    );
  }

  static fromData(data: {
    id: string;
    labId: string;
    name: string;
    valueType: AttributeValueType;
    appliesToCatalog?: AttributeCatalog;
    appliesToTypes: string[];
    sortOrder: number;
    isSystem: boolean;
    systemKey?: string;
    promptOnForm: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): AttributeDefinition {
    return new AttributeDefinition(
      data.id,
      data.labId,
      data.name,
      data.valueType,
      data.appliesToCatalog,
      data.appliesToTypes,
      data.sortOrder,
      data.isSystem,
      data.systemKey,
      data.promptOnForm,
      toDomainDate(data.createdAt),
      toDomainDate(data.updatedAt)
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Attribute name is required');
    }
  }

  update(data: DefinitionUpdateData): void {
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.appliesToCatalog !== undefined)
      this._appliesToCatalog = data.appliesToCatalog ?? undefined;
    if (data.appliesToTypes !== undefined) this._appliesToTypes = data.appliesToTypes ?? [];
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder ?? this._sortOrder;
    if (data.promptOnForm !== undefined)
      this._promptOnForm = data.promptOnForm ?? this._promptOnForm;

    this.validate();
    this._updatedAt = new Date();
  }

  /** Only select-style attributes draw from a curated option list. */
  get usesOptions(): boolean {
    return this._valueType === 'select' || this._valueType === 'multi_select';
  }

  get id(): string {
    return this._id;
  }
  get labId(): string {
    return this._labId;
  }
  get name(): string {
    return this._name;
  }
  get valueType(): AttributeValueType {
    return this._valueType;
  }
  get appliesToCatalog(): AttributeCatalog | undefined {
    return this._appliesToCatalog;
  }
  get appliesToTypes(): string[] {
    return [...this._appliesToTypes];
  }
  get sortOrder(): number {
    return this._sortOrder;
  }
  get isSystem(): boolean {
    return this._isSystem;
  }
  get systemKey(): string | undefined {
    return this._systemKey;
  }
  get promptOnForm(): boolean {
    return this._promptOnForm;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
}
