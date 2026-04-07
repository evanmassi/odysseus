/**
 * Tube Domain Events
 * 
 * Events that occur within the Tube aggregate.
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
    super(1, labId);
  }

  eventName(): string {
    return 'TubeCreated';
  }

  getAggregateId(): string {
    return this.tubeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeId: this.tubeId,
      location: this.location.toData(),
      sampleData: this.sampleData.toData(),
      createdBy: this.createdBy
    };
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
    super(1, labId);
  }

  eventName(): string {
    return 'TubeUpdated';
  }

  getAggregateId(): string {
    return this.tubeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeId: this.tubeId,
      oldLocation: this.oldLocation.toData(),
      newLocation: this.newLocation.toData(),
      oldSampleData: this.oldSampleData.toData(),
      newSampleData: this.newSampleData.toData(),
      updatedBy: this.updatedBy
    };
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
    super(1, labId);
  }

  eventName(): string {
    return 'TubeLocationChanged';
  }

  getAggregateId(): string {
    return this.tubeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeId: this.tubeId,
      oldLocation: this.oldLocation.toData(),
      newLocation: this.newLocation.toData(),
      movedBy: this.movedBy
    };
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
    super(1, labId);
  }

  eventName(): string {
    return 'TubeDeleted';
  }

  getAggregateId(): string {
    return this.tubeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeId: this.tubeId,
      location: this.location.toData(),
      deletedBy: this.deletedBy,
      sampleData: this.sampleData.toData(),
    };
  }
}

export class BulkTubesCreatedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly createdBy: string,
    labId: string,
    public readonly perItemData: BulkTubeCreatedDetail[] = []
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'BulkTubesCreated';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      createdBy: this.createdBy
    };
  }
}

export class BulkTubesDeletedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly deletedBy: string,
    labId: string,
    public readonly perItemData: BulkTubeDeletedDetail[] = []
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'BulkTubesDeleted';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      deletedBy: this.deletedBy
    };
  }
}

export class BulkTubesMovedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly sourceTankIds: string[],
    public readonly destinationTankIds: string[],
    public readonly movedBy: string,
    labId: string,
    public readonly perItemData: BulkTubeMovedDetail[] = []
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'BulkTubesMoved';
  }

  getAggregateId(): string {
    return `bulk-${this.tubeIds.join(',')}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      sourceTankIds: this.sourceTankIds,
      destinationTankIds: this.destinationTankIds,
      movedBy: this.movedBy
    };
  }
}

export class BulkTubesUpdatedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly updatedBy: string,
    public readonly changesSummary: Record<string, unknown>,
    labId: string,
    public readonly perItemData: BulkTubeUpdatedDetail[] = []
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'BulkTubesUpdated';
  }

  getAggregateId(): string {
    // For bulk operations, we use a composite identifier
    return `bulk-${this.tubeIds.join(',')}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      updatedBy: this.updatedBy,
      changesSummary: this.changesSummary
    };
  }
}
