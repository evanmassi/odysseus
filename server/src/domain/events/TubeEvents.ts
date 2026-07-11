/**
 * Tube Domain Events
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import type { Location } from '@domain/value-objects/Location';
import type { SampleData } from '@domain/value-objects/SampleData';

export interface BulkTubeCreatedDetail {
  tubeId: string;
  location: ReturnType<Location['toData']>;
  sampleData: ReturnType<SampleData['toData']>;
}

export interface BulkTubeUpdatedDetail {
  tubeId: string;
  changes: FieldChange[];
  location: ReturnType<Location['toData']>;
}

export interface BulkTubeDeletedDetail {
  tubeId: string;
  location: ReturnType<Location['toData']>;
  sampleData: ReturnType<SampleData['toData']>;
}

export interface BulkTubeMovedDetail {
  tubeId: string;
  oldLocation: ReturnType<Location['toData']>;
  newLocation: ReturnType<Location['toData']>;
}

export class TubeCreatedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly location: Location,
    public readonly sampleData: SampleData,
    public readonly createdBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TubeCreated';
  }

  getAggregateId(): string {
    return this.tubeId;
  }
}

export class TubeUpdatedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly oldLocation: Location,
    public readonly newLocation: Location,
    public readonly oldSampleData: SampleData,
    public readonly newSampleData: SampleData,
    public readonly updatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TubeUpdated';
  }

  getAggregateId(): string {
    return this.tubeId;
  }
}

export class TubeLocationChangedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly oldLocation: Location,
    public readonly newLocation: Location,
    public readonly movedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TubeLocationChanged';
  }

  getAggregateId(): string {
    return this.tubeId;
  }
}

export class TubeDeletedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly location: Location,
    public readonly deletedBy: string,
    public readonly sampleData: SampleData,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'TubeDeleted';
  }

  getAggregateId(): string {
    return this.tubeId;
  }
}

export class BulkTubesCreatedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly createdBy: string,
    labId: string,
    public readonly perItemData: BulkTubeCreatedDetail[] = []
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BulkTubesCreated';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }
}

export class BulkTubesDeletedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly deletedBy: string,
    labId: string,
    public readonly perItemData: BulkTubeDeletedDetail[] = []
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BulkTubesDeleted';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }
}

export class BulkTubesMovedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly movedBy: string,
    labId: string,
    public readonly perItemData: BulkTubeMovedDetail[] = []
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BulkTubesMoved';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }
}

export class BulkTubesUpdatedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly updatedBy: string,
    public readonly changesSummary: Record<string, unknown>,
    labId: string,
    public readonly perItemData: BulkTubeUpdatedDetail[] = []
  ) {
    super(labId);
  }

  eventName(): string {
    return 'BulkTubesUpdated';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }
}
