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
    super(labId);
  }

  eventName(): string {
    return 'DonorCreated';
  }

  getAggregateId(): string {
    return this.donorId;
  }
}

export class DonorUpdatedEvent extends DomainEvent {
  constructor(
    public readonly donorId: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'DonorUpdated';
  }

  getAggregateId(): string {
    return this.donorId;
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
    super(labId);
  }

  eventName(): string {
    return 'DonorDeleted';
  }

  getAggregateId(): string {
    return this.donorId;
  }
}
