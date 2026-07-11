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
    super(labId);
  }

  eventName(): string {
    return 'LabCreated';
  }

  getAggregateId(): string {
    return this.labId;
  }
}

export class LabRenamedEvent extends DomainEvent {
  constructor(
    public readonly labId: string,
    public readonly oldName: string,
    public readonly newName: string,
    public readonly renamedBy: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'LabRenamed';
  }

  getAggregateId(): string {
    return this.labId;
  }
}

export class LabActivatedEvent extends DomainEvent {
  constructor(
    public readonly labId: string,
    public readonly activatedBy: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'LabActivated';
  }

  getAggregateId(): string {
    return this.labId;
  }
}

export class LabDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly labId: string,
    public readonly deactivatedBy: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'LabDeactivated';
  }

  getAggregateId(): string {
    return this.labId;
  }
}

export class InviteCodeCreatedEvent extends DomainEvent {
  constructor(
    public readonly codeId: string,
    public readonly labId: string,
    public readonly createdBy: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'InviteCodeCreated';
  }

  getAggregateId(): string {
    return this.codeId;
  }
}
