/**
 * Researcher Domain Events
 *
 * Events that occur within the Researcher aggregate.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChange';

export class ResearcherCreatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string | undefined,
    public readonly position: string | undefined,
    public readonly createdBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'ResearcherCreated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }

  protected getEventData(): Record<string, any> {
    return {
      researcherId: this.researcherId,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      position: this.position,
      createdBy: this.createdBy
    };
  }
}

export class ResearcherUpdatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'ResearcherUpdated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }

  protected getEventData(): Record<string, any> {
    return {
      researcherId: this.researcherId,
      firstName: this.firstName,
      lastName: this.lastName,
      changes: this.changes,
      updatedBy: this.updatedBy
    };
  }
}

export class ResearcherDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly tubeCount: number,
    public readonly deactivatedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'ResearcherDeactivated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }

  protected getEventData(): Record<string, any> {
    return {
      researcherId: this.researcherId,
      firstName: this.firstName,
      lastName: this.lastName,
      tubeCount: this.tubeCount,
      deactivatedBy: this.deactivatedBy
    };
  }
}

export class ResearcherReactivatedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly reactivatedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'ResearcherReactivated';
  }

  getAggregateId(): string {
    return this.researcherId;
  }

  protected getEventData(): Record<string, any> {
    return {
      researcherId: this.researcherId,
      firstName: this.firstName,
      lastName: this.lastName,
      reactivatedBy: this.reactivatedBy
    };
  }
}

export class ResearcherDeletedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly deletedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'ResearcherDeleted';
  }

  getAggregateId(): string {
    return this.researcherId;
  }

  protected getEventData(): Record<string, any> {
    return {
      researcherId: this.researcherId,
      firstName: this.firstName,
      lastName: this.lastName,
      deletedBy: this.deletedBy
    };
  }
}

/** Emitted when a researcher is approved due to user approval cascade */
export class ResearcherApprovedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly linkedUserId: string,
    public readonly approvedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'ResearcherApproved';
  }

  getAggregateId(): string {
    return this.researcherId;
  }

  protected getEventData(): Record<string, any> {
    return {
      researcherId: this.researcherId,
      firstName: this.firstName,
      lastName: this.lastName,
      linkedUserId: this.linkedUserId,
      approvedBy: this.approvedBy
    };
  }
}
