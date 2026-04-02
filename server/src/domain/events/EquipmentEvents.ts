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
