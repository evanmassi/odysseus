/**
 * Password Reset Domain Events
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class PasswordResetByAdminEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly adminUserId: string,
    public readonly requirePasswordChange: boolean,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'PasswordResetByAdmin';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class PasswordResetTokenGeneratedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly adminUserId: string,
    public readonly expiresAt: Date,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'PasswordResetTokenGenerated';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class PasswordResetCompletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'PasswordResetCompleted';
  }

  getAggregateId(): string {
    return this.userId;
  }
}
