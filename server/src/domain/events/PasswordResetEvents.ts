/**
 * Password Reset Domain Events
 *
 * Events emitted during password reset operations.
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class PasswordResetByAdminEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly adminUserId: string,
    public readonly requirePasswordChange: boolean
  ) {
    super(1);
  }

  eventName(): string {
    return 'PasswordResetByAdmin';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      adminUserId: this.adminUserId,
      requirePasswordChange: this.requirePasswordChange
    };
  }
}

export class PasswordResetTokenGeneratedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly adminUserId: string,
    public readonly expiresAt: Date
  ) {
    super(1);
  }

  eventName(): string {
    return 'PasswordResetTokenGenerated';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      adminUserId: this.adminUserId,
      expiresAt: this.expiresAt.toISOString()
    };
  }
}

export class PasswordResetCompletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'PasswordResetCompleted';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId
    };
  }
}
