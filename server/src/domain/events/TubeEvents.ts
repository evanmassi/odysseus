/**
 * Tube Domain Events
 * 
 * Events that occur within the Tube aggregate.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import { Location } from '@domain/valueObjects/Location';
import { SampleData } from '@domain/valueObjects/SampleData';

export class TubeCreatedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly location: Location,
    public readonly sampleData: SampleData,
    public readonly createdBy: string
  ) {
    super(1);
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
    public readonly updatedBy: string
  ) {
    super(1);
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
    public readonly movedBy: string
  ) {
    super(1);
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
    public readonly sampleData: SampleData
  ) {
    super(1);
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

export class BulkTubesUpdatedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly updatedBy: string,
    public readonly changesSummary: Record<string, unknown>
  ) {
    super(1);
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
