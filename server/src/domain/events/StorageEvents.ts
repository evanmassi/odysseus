/**
 * Storage Domain Events
 *
 * Events for lab storage hierarchy changes (tanks, racks, boxes, assignments, labels).
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

export class StorageUpdatedEvent extends DomainEvent {
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
    },
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'StorageUpdated';
  }

  getAggregateId(): string {
    return 'system-storage';
  }
}

export class TankUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly changes: FieldChange[],
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TankUpdated';
  }

  getAggregateId(): string {
    return this.tankId;
  }
}

export class TankAddedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TankAdded';
  }

  getAggregateId(): string {
    return this.tankId;
  }
}

export class TankDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TankDeleted';
  }

  getAggregateId(): string {
    return this.tankId;
  }
}

export class RackAddedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackAdded';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

export class RackDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackDeleted';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

export class RackUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly changes: FieldChange[],
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

export class BoxAddedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxAdded';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

export class BoxDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxDeleted';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

export class BoxUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly boxId: string,
    public readonly boxName: string,
    public readonly changes: FieldChange[],
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

export class RackAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly assignedUserId: string,
    public readonly assignedUsername: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackAssigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

export class RackUnassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly previousUserId: string,
    public readonly previousUsername: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackUnassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

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
    public readonly newUsername: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackReassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

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
    public readonly assignedUsername: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxAssigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

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
    public readonly previousUsername: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxUnassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

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
    public readonly newUsername: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxReassigned';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

export class RackLabelUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tankId: string,
    public readonly tankName: string,
    public readonly rackId: string,
    public readonly rackName: string,
    public readonly oldLabel: string | undefined,
    public readonly newLabel: string | undefined,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'RackLabelUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}`;
  }
}

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
    public readonly newLabel: string | undefined,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BoxLabelUpdated';
  }

  getAggregateId(): string {
    return `${this.tankId}-${this.rackId}-${this.boxId}`;
  }
}

export class BulkResourcesUnassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fromUserId: string,
    public readonly fromUsername: string,
    public readonly racksAffected: number,
    public readonly boxesAffected: number,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BulkResourcesUnassigned';
  }

  getAggregateId(): string {
    return 'system-storage';
  }
}

export class BulkResourcesReassignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fromUserId: string,
    public readonly fromUsername: string,
    public readonly toUserId: string,
    public readonly toUsername: string,
    public readonly racksAffected: number,
    public readonly boxesAffected: number,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BulkResourcesReassigned';
  }

  getAggregateId(): string {
    return 'system-storage';
  }
}

