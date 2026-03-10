/**
 * Lab Domain Events
 *
 * Events related to lab tenant management and invite codes.
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class LabCreatedEvent extends DomainEvent {
  constructor(
    public readonly labId: string,
    public readonly name: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'LabCreated';
  }

  getAggregateId(): string {
    return this.labId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      labId: this.labId,
      name: this.name,
    };
  }
}

export class InviteCodeCreatedEvent extends DomainEvent {
  constructor(
    public readonly codeId: string,
    public readonly labId: string,
    public readonly createdBy: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'InviteCodeCreated';
  }

  getAggregateId(): string {
    return this.codeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      codeId: this.codeId,
      labId: this.labId,
      createdBy: this.createdBy,
    };
  }
}

export class InviteCodeUsedEvent extends DomainEvent {
  constructor(
    public readonly codeId: string,
    public readonly labId: string,
    public readonly userId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'InviteCodeUsed';
  }

  getAggregateId(): string {
    return this.codeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      codeId: this.codeId,
      labId: this.labId,
      userId: this.userId,
    };
  }
}
