import { DomainEvent } from './DomainEvent';
import type { FieldChange } from '@domain/types/FieldChange';

/**
 * Configuration Updated Event
 *
 * Fired when the entire configuration is updated.
 * Captures high-level changes for audit trail.
 */
export class ConfigurationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changesSummary: {
      tanksAdded: number;
      tanksUpdated: number;
      tanksDeleted: number;
      racksAdded: number;
      racksUpdated: number;
      racksDeleted: number;
      boxesAdded: number;
      boxesUpdated: number;
      boxesDeleted: number;
      labNameChanged: boolean;
    }
  ) {
    super();
  }

  eventName(): string {
    return 'ConfigurationUpdated';
  }

  getAggregateId(): string {
    return 'system-configuration';
  }
}

/**
 * Tank Updated Event
 *
 * Fired when a specific tank's properties are modified.
 */
export class TankUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly changes: FieldChange[]
  ) {
    super();
  }

  eventName(): string {
    return 'TankUpdated';
  }

  getAggregateId(): string {
    return this.tankId;
  }
}

/**
 * Tank Added Event
 *
 * Fired when a new tank is added to the configuration.
 */
export class TankAddedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string
  ) {
    super();
  }

  eventName(): string {
    return 'TankAdded';
  }

  getAggregateId(): string {
    return this.tankId;
  }
}

/**
 * Tank Deleted Event
 *
 * Fired when a tank is removed from the configuration.
 */
export class TankDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string
  ) {
    super();
  }

  eventName(): string {
    return 'TankDeleted';
  }

  getAggregateId(): string {
    return this.tankId;
  }
}

/**
 * Rack Added Event
 *
 * Fired when a new rack is added to a tank.
 */
export class RackAddedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string
  ) {
    super();
  }

  eventName(): string {
    return 'RackAdded';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Rack Deleted Event
 *
 * Fired when a rack is removed from a tank.
 */
export class RackDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string
  ) {
    super();
  }

  eventName(): string {
    return 'RackDeleted';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Rack Updated Event
 *
 * Fired when a specific rack's properties are modified.
 */
export class RackUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly changes: FieldChange[]
  ) {
    super();
  }

  eventName(): string {
    return 'RackUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Box Added Event
 *
 * Fired when a new box is added to a rack.
 */
export class BoxAddedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string
  ) {
    super();
  }

  eventName(): string {
    return 'BoxAdded';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Box Deleted Event
 *
 * Fired when a box is removed from a rack.
 */
export class BoxDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string
  ) {
    super();
  }

  eventName(): string {
    return 'BoxDeleted';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Box Updated Event
 *
 * Fired when a specific box's properties are modified.
 */
export class BoxUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    public readonly changes: FieldChange[]
  ) {
    super();
  }

  eventName(): string {
    return 'BoxUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Lab Name Changed Event
 *
 * Fired when the laboratory name is changed.
 */
export class LabNameChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly oldName: string,
    public readonly newName: string
  ) {
    super();
  }

  eventName(): string {
    return 'LabNameChanged';
  }

  getAggregateId(): string {
    return 'system-configuration';
  }
}

/**
 * Rack Assigned Event
 *
 * Fired when a rack is assigned to a user.
 */
export class RackAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly assignedUserId: string,
    public readonly assignedUsername: string
  ) {
    super();
  }

  eventName(): string {
    return 'RackAssigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Rack Unassigned Event
 *
 * Fired when a rack is unassigned from a user.
 */
export class RackUnassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly previousUserId: string,
    public readonly previousUsername: string
  ) {
    super();
  }

  eventName(): string {
    return 'RackUnassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Rack Reassigned Event
 *
 * Fired when a rack is reassigned from one user to another.
 */
export class RackReassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly previousUserId: string,
    public readonly previousUsername: string,
    public readonly newUserId: string,
    public readonly newUsername: string
  ) {
    super();
  }

  eventName(): string {
    return 'RackReassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Box Assigned Event
 *
 * Fired when a box is assigned to a user.
 */
export class BoxAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    public readonly assignedUserId: string,
    public readonly assignedUsername: string
  ) {
    super();
  }

  eventName(): string {
    return 'BoxAssigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Box Unassigned Event
 *
 * Fired when a box is unassigned from a user.
 */
export class BoxUnassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    public readonly previousUserId: string,
    public readonly previousUsername: string
  ) {
    super();
  }

  eventName(): string {
    return 'BoxUnassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Box Reassigned Event
 *
 * Fired when a box is reassigned from one user to another.
 */
export class BoxReassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    public readonly previousUserId: string,
    public readonly previousUsername: string,
    public readonly newUserId: string,
    public readonly newUsername: string
  ) {
    super();
  }

  eventName(): string {
    return 'BoxReassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Rack Label Updated Event
 *
 * Fired when a rack's custom label is updated.
 */
export class RackLabelUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly oldLabel: string | undefined,
    public readonly newLabel: string | undefined
  ) {
    super();
  }

  eventName(): string {
    return 'RackLabelUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

/**
 * Box Label Updated Event
 *
 * Fired when a box's custom label is updated.
 */
export class BoxLabelUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    public readonly oldLabel: string | undefined,
    public readonly newLabel: string | undefined
  ) {
    super();
  }

  eventName(): string {
    return 'BoxLabelUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

/**
 * Bulk Resources Unassigned Event
 *
 * Fired when multiple resources are unassigned from a user at once.
 */
export class BulkResourcesUnassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fromUserId: string,
    public readonly fromUsername: string,
    public readonly racksAffected: number,
    public readonly boxesAffected: number
  ) {
    super();
  }

  eventName(): string {
    return 'BulkResourcesUnassigned';
  }

  getAggregateId(): string {
    return 'system-configuration';
  }
}

/**
 * Bulk Resources Reassigned Event
 *
 * Fired when multiple resources are reassigned from one user to another.
 */
export class BulkResourcesReassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fromUserId: string,
    public readonly fromUsername: string,
    public readonly toUserId: string,
    public readonly toUsername: string,
    public readonly racksAffected: number,
    public readonly boxesAffected: number
  ) {
    super();
  }

  eventName(): string {
    return 'BulkResourcesReassigned';
  }

  getAggregateId(): string {
    return 'system-configuration';
  }
}

