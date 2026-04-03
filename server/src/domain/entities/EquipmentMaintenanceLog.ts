/**
 * Equipment Maintenance Log Entry
 *
 * Records a maintenance event (PM, repair, calibration, etc.) for an equipment item.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

interface MaintenanceLogCreateData {
  itemId: string;
  datePerformed: string;
  maintenanceType: string;
  performedBy?: string;
  technician?: string;
  description?: string;
  nextScheduledDate?: string;
  cost?: number;
  notes?: string;
}

// null = clear field, undefined = preserve current value
interface MaintenanceLogUpdateData {
  datePerformed?: string | null;
  maintenanceType?: string | null;
  performedBy?: string | null;
  technician?: string | null;
  description?: string | null;
  nextScheduledDate?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export class EquipmentMaintenanceLog {
  private constructor(
    private readonly _id: string,
    private readonly _itemId: string,
    private _datePerformed: string,
    private _maintenanceType: string,
    private _performedBy: string | undefined,
    private _technician: string | undefined,
    private _description: string | undefined,
    private _nextScheduledDate: string | undefined,
    private _cost: number | undefined,
    private _notes: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  static create(data: MaintenanceLogCreateData): EquipmentMaintenanceLog {
    return new EquipmentMaintenanceLog(
      generateId('eqlog'),
      data.itemId,
      data.datePerformed,
      data.maintenanceType,
      data.performedBy,
      data.technician,
      data.description,
      data.nextScheduledDate,
      data.cost,
      data.notes,
      new Date(),
      new Date()
    );
  }

  static fromData(data: {
    id: string;
    itemId: string;
    datePerformed: string;
    maintenanceType: string;
    performedBy?: string;
    technician?: string;
    description?: string;
    nextScheduledDate?: string;
    cost?: number;
    notes?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
  }): EquipmentMaintenanceLog {
    return new EquipmentMaintenanceLog(
      data.id,
      data.itemId,
      data.datePerformed,
      data.maintenanceType,
      data.performedBy,
      data.technician,
      data.description,
      data.nextScheduledDate,
      data.cost,
      data.notes,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt
    );
  }

  private validate(): void {
    if (!this._maintenanceType || this._maintenanceType.trim().length === 0) {
      throw new ValidationError('Maintenance type is required');
    }
  }

  update(data: MaintenanceLogUpdateData): void {
    if (data.datePerformed !== undefined) this._datePerformed = data.datePerformed ?? this._datePerformed;
    if (data.maintenanceType !== undefined) this._maintenanceType = data.maintenanceType ?? this._maintenanceType;
    if (data.performedBy !== undefined) this._performedBy = data.performedBy ?? undefined;
    if (data.technician !== undefined) this._technician = data.technician ?? undefined;
    if (data.description !== undefined) this._description = data.description ?? undefined;
    if (data.nextScheduledDate !== undefined) this._nextScheduledDate = data.nextScheduledDate ?? undefined;
    if (data.cost !== undefined) this._cost = data.cost ?? undefined;
    if (data.notes !== undefined) this._notes = data.notes ?? undefined;

    this.validate();
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get itemId(): string { return this._itemId; }
  get datePerformed(): string { return this._datePerformed; }
  get maintenanceType(): string { return this._maintenanceType; }
  get performedBy(): string | undefined { return this._performedBy; }
  get technician(): string | undefined { return this._technician; }
  get description(): string | undefined { return this._description; }
  get nextScheduledDate(): string | undefined { return this._nextScheduledDate; }
  get cost(): number | undefined { return this._cost; }
  get notes(): string | undefined { return this._notes; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}
