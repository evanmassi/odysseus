/**
 * Researcher Domain Events
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

export class ResearcherCreatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string | undefined,
    public readonly position: string | undefined,
    public readonly createdBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ResearcherCreated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }
}

export class ResearcherUpdatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ResearcherUpdated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }
}

export class ResearcherDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly tubeCount: number,
    public readonly deactivatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ResearcherDeactivated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }
}

export class ResearcherReactivatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly reactivatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ResearcherReactivated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }
}

export class ResearcherDeletedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ResearcherDeleted';
  }

  getAggregateId(): string {
    return this.researcherId;
  }
}
