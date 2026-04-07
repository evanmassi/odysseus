/**
 * Equipment Domain Events
 *
 * Events within the Equipment aggregate for audit logging.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

export class EquipmentItemCreatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentItemCreated';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      name: this.name,
      categoryId: this.categoryId,
      createdBy: this.createdBy,
    };
  }
}

export class EquipmentItemUpdatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentItemUpdated';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      changes: this.changes,
      updatedBy: this.updatedBy,
    };
  }
}

export class EquipmentItemDecommissionedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly reason: string | undefined,
    public readonly decommissionedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentItemDecommissioned';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      reason: this.reason,
      decommissionedBy: this.decommissionedBy,
    };
  }
}

export class EquipmentItemDeletedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentItemDeleted';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      name: this.name,
      deletedBy: this.deletedBy,
    };
  }
}

export class EquipmentCategoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly parentId: string | undefined,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentCategoryCreated';
  }

  getAggregateId(): string {
    return this.categoryId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      categoryId: this.categoryId,
      name: this.name,
      parentId: this.parentId,
      createdBy: this.createdBy,
    };
  }
}

export class EquipmentCategoryUpdatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentCategoryUpdated';
  }

  getAggregateId(): string {
    return this.categoryId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      categoryId: this.categoryId,
      name: this.name,
      updatedBy: this.updatedBy,
    };
  }
}

export class EquipmentCategoryDeletedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentCategoryDeleted';
  }

  getAggregateId(): string {
    return this.categoryId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      categoryId: this.categoryId,
      name: this.name,
      deletedBy: this.deletedBy,
    };
  }
}

export class EquipmentDocumentAddedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly label: string,
    public readonly addedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentDocumentAdded';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      label: this.label,
      addedBy: this.addedBy,
    };
  }
}

export class EquipmentDocumentRemovedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly removedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentDocumentRemoved';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      removedBy: this.removedBy,
    };
  }
}

export class EquipmentMaintenanceUpdatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly maintenanceType: string,
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentMaintenanceUpdated';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      maintenanceType: this.maintenanceType,
      updatedBy: this.updatedBy,
    };
  }
}

export class EquipmentMaintenanceDeletedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly maintenanceType: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentMaintenanceDeleted';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      maintenanceType: this.maintenanceType,
      deletedBy: this.deletedBy,
    };
  }
}

export class EquipmentBulkMaintenanceLoggedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly maintenanceType: string,
    public readonly datePerformed: string,
    public readonly loggedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentBulkMaintenanceLogged';
  }

  getAggregateId(): string {
    return `bulk-${this.itemIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemIds: this.itemIds,
      maintenanceType: this.maintenanceType,
      datePerformed: this.datePerformed,
      loggedBy: this.loggedBy,
    };
  }
}

export class EquipmentBulkStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly status: string,
    public readonly changedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentBulkStatusChanged';
  }

  getAggregateId(): string {
    return `bulk-${this.itemIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemIds: this.itemIds,
      status: this.status,
      changedBy: this.changedBy,
    };
  }
}

export class EquipmentBulkRelocatedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly categoryId: string,
    public readonly relocatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentBulkRelocated';
  }

  getAggregateId(): string {
    return `bulk-${this.itemIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemIds: this.itemIds,
      categoryId: this.categoryId,
      relocatedBy: this.relocatedBy,
    };
  }
}

export class EquipmentMaintenanceLoggedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly maintenanceType: string,
    public readonly datePerformed: string,
    public readonly loggedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EquipmentMaintenanceLogged';
  }

  getAggregateId(): string {
    return this.itemId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId,
      maintenanceType: this.maintenanceType,
      datePerformed: this.datePerformed,
      loggedBy: this.loggedBy,
    };
  }
}
