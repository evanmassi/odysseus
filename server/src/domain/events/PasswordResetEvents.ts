import { DomainEvent } from './DomainEvent';

export class PasswordResetByAdminEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly adminUserId: string,
    public readonly requirePasswordChange: boolean
  ) {
    super();
  }

  eventName(): string {
    return 'PasswordResetByAdmin';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
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
    super();
  }

  eventName(): string {
    return 'PasswordResetTokenGenerated';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
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
    super();
  }

  eventName(): string {
    return 'PasswordResetCompleted';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId
    };
  }
}
