/**
 * Donor Domain Events
 *
 * Events within the Donor aggregate for audit logging and socket broadcasts.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

export class DonorCreatedEvent extends DomainEvent {
  constructor(
    public readonly donorId: string,
    public readonly donorSourceId: string | undefined,
    public readonly donorInternalId: string | undefined,
    public readonly isCurated: boolean,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'DonorCreated';
  }

  getAggregateId(): string {
    return this.donorId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      donorId: this.donorId,
      donorSourceId: this.donorSourceId,
      donorInternalId: this.donorInternalId,
      isCurated: this.isCurated,
      createdBy: this.createdBy
    };
  }
}

export class DonorUpdatedEvent extends DomainEvent {
  constructor(
    public readonly donorId: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'DonorUpdated';
  }

  getAggregateId(): string {
    return this.donorId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      donorId: this.donorId,
      changes: this.changes,
      updatedBy: this.updatedBy
    };
  }
}

export class DonorDeletedEvent extends DomainEvent {
  constructor(
    public readonly donorId: string,
    public readonly donorSourceId: string | undefined,
    public readonly donorInternalId: string | undefined,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'DonorDeleted';
  }

  getAggregateId(): string {
    return this.donorId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      donorId: this.donorId,
      donorSourceId: this.donorSourceId,
      donorInternalId: this.donorInternalId,
      deletedBy: this.deletedBy
    };
  }
}
