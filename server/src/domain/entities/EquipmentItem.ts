/**
 * Equipment Item
 *
 * Individual piece of lab equipment with tracking, maintenance scheduling,
 * and decommission lifecycle support.
 */

import { equipmentStatusValues, type EquipmentStatus } from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { toDomainDate } from '@domain/utils/toDomainDate';

interface ItemCreateData {
  labId: string;
  categoryId: string;
  name: string;
  serialNumber?: string;
  manufacturer?: string;
  vendorName?: string;
  vendorCatalogNumber?: string;
  model?: string;
  description?: string;
  locationId?: string;
  status?: EquipmentStatus;
  conditionNotes?: string;
  purchaseDate?: string;
  warrantyExpiration?: string;
  purchaseCost?: number;
  assetTag?: string;
  nextMaintenanceDate?: string;
  notes?: string;
}

// null = clear field, undefined = preserve current value
interface ItemUpdateData {
  categoryId?: string | null;
  name?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  vendorName?: string | null;
  vendorCatalogNumber?: string | null;
  model?: string | null;
  description?: string | null;
  locationId?: string | null;
  status?: EquipmentStatus | null;
  conditionNotes?: string | null;
  purchaseDate?: string | null;
  warrantyExpiration?: string | null;
  purchaseCost?: number | null;
  assetTag?: string | null;
  nextMaintenanceDate?: string | null;
  notes?: string | null;
}

export class EquipmentItem {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private _categoryId: string,
    private _name: string,
    private _serialNumber: string | undefined,
    private _manufacturer: string | undefined,
    private _vendorName: string | undefined,
    private _vendorCatalogNumber: string | undefined,
    private _model: string | undefined,
    private _description: string | undefined,
    private _locationId: string | undefined,
    private _status: EquipmentStatus,
    private _conditionNotes: string | undefined,
    private _purchaseDate: string | undefined,
    private _warrantyExpiration: string | undefined,
    private _purchaseCost: number | undefined,
    private _assetTag: string | undefined,
    private _nextMaintenanceDate: string | undefined,
    private _decommissionDate: string | undefined,
    private _decommissionReason: string | undefined,
    private _disposalMethod: string | undefined,
    private _notes: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: ItemCreateData): EquipmentItem {
    return new EquipmentItem(
      generateId('eqitem'),
      data.labId,
      data.categoryId,
      data.name,
      data.serialNumber,
      data.manufacturer,
      data.vendorName,
      data.vendorCatalogNumber,
      data.model,
      data.description,
      data.locationId,
      data.status ?? 'active',
      data.conditionNotes,
      data.purchaseDate,
      data.warrantyExpiration,
      data.purchaseCost,
      data.assetTag,
      data.nextMaintenanceDate,
      undefined,
      undefined,
      undefined,
      data.notes,
      new Date(),
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    labId: string;
    categoryId: string;
    name: string;
    serialNumber?: string;
    manufacturer?: string;
    vendorName?: string;
    vendorCatalogNumber?: string;
    model?: string;
    description?: string;
    locationId?: string;
    status: EquipmentStatus;
    conditionNotes?: string;
    purchaseDate?: string;
    warrantyExpiration?: string;
    purchaseCost?: number;
    assetTag?: string;
    nextMaintenanceDate?: string;
    decommissionDate?: string;
    decommissionReason?: string;
    disposalMethod?: string;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): EquipmentItem {
    return new EquipmentItem(
      data.id,
      data.labId,
      data.categoryId,
      data.name,
      data.serialNumber,
      data.manufacturer,
      data.vendorName,
      data.vendorCatalogNumber,
      data.model,
      data.description,
      data.locationId,
      data.status,
      data.conditionNotes,
      data.purchaseDate,
      data.warrantyExpiration,
      data.purchaseCost,
      data.assetTag,
      data.nextMaintenanceDate,
      data.decommissionDate,
      data.decommissionReason,
      data.disposalMethod,
      data.notes,
      toDomainDate(data.createdAt),
      toDomainDate(data.updatedAt)
    );
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Equipment name is required');
    }
    if (!this._categoryId) {
      throw new ValidationError('Category is required');
    }
    if (!equipmentStatusValues.includes(this._status)) {
      throw new ValidationError('That equipment status is not valid.');
    }
  }

  update(data: ItemUpdateData): void {
    if (data.categoryId !== undefined) this._categoryId = data.categoryId ?? this._categoryId;
    if (data.name !== undefined) this._name = data.name ?? this._name;
    if (data.serialNumber !== undefined) this._serialNumber = data.serialNumber ?? undefined;
    if (data.manufacturer !== undefined) this._manufacturer = data.manufacturer ?? undefined;
    if (data.vendorName !== undefined) this._vendorName = data.vendorName ?? undefined;
    if (data.vendorCatalogNumber !== undefined)
      this._vendorCatalogNumber = data.vendorCatalogNumber ?? undefined;
    if (data.model !== undefined) this._model = data.model ?? undefined;
    if (data.description !== undefined) this._description = data.description ?? undefined;
    if (data.locationId !== undefined) this._locationId = data.locationId ?? undefined;
    if (data.status !== undefined) this._status = data.status ?? this._status;
    if (data.conditionNotes !== undefined) this._conditionNotes = data.conditionNotes ?? undefined;
    if (data.purchaseDate !== undefined) this._purchaseDate = data.purchaseDate ?? undefined;
    if (data.warrantyExpiration !== undefined)
      this._warrantyExpiration = data.warrantyExpiration ?? undefined;
    if (data.purchaseCost !== undefined) this._purchaseCost = data.purchaseCost ?? undefined;
    if (data.assetTag !== undefined) this._assetTag = data.assetTag ?? undefined;
    if (data.nextMaintenanceDate !== undefined)
      this._nextMaintenanceDate = data.nextMaintenanceDate ?? undefined;
    if (data.notes !== undefined) this._notes = data.notes ?? undefined;

    this.validate();
    this._updatedAt = new Date();
  }

  decommission(date: string, reason?: string, disposalMethod?: string): void {
    this._status = 'decommissioned';
    this._decommissionDate = date;
    this._decommissionReason = reason;
    this._disposalMethod = disposalMethod;
    this._updatedAt = new Date();
  }

  /** Updates next maintenance date from latest maintenance log entry. */
  updateNextMaintenanceDate(date: string | undefined): void {
    this._nextMaintenanceDate = date;
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }
  get labId(): string {
    return this._labId;
  }
  get categoryId(): string {
    return this._categoryId;
  }
  get name(): string {
    return this._name;
  }
  get serialNumber(): string | undefined {
    return this._serialNumber;
  }
  get manufacturer(): string | undefined {
    return this._manufacturer;
  }
  get vendorName(): string | undefined {
    return this._vendorName;
  }
  get vendorCatalogNumber(): string | undefined {
    return this._vendorCatalogNumber;
  }
  get model(): string | undefined {
    return this._model;
  }
  get description(): string | undefined {
    return this._description;
  }
  get locationId(): string | undefined {
    return this._locationId;
  }
  get status(): EquipmentStatus {
    return this._status;
  }
  get conditionNotes(): string | undefined {
    return this._conditionNotes;
  }
  get purchaseDate(): string | undefined {
    return this._purchaseDate;
  }
  get warrantyExpiration(): string | undefined {
    return this._warrantyExpiration;
  }
  get purchaseCost(): number | undefined {
    return this._purchaseCost;
  }
  get assetTag(): string | undefined {
    return this._assetTag;
  }
  get nextMaintenanceDate(): string | undefined {
    return this._nextMaintenanceDate;
  }
  get decommissionDate(): string | undefined {
    return this._decommissionDate;
  }
  get decommissionReason(): string | undefined {
    return this._decommissionReason;
  }
  get disposalMethod(): string | undefined {
    return this._disposalMethod;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
}
