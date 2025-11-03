/**
 * User Domain Events
 * 
 * Events that occur within the User aggregate.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import { UserRole } from '@domain/valueObjects/UserRole';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly role: UserRole
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserCreated';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role.value
    };
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly changedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserPasswordChanged';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      changedBy: this.changedBy
    };
  }
}

export class UserRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly oldRole: UserRole,
    public readonly newRole: UserRole,
    public readonly changedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserRoleChanged';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      oldRole: this.oldRole.value,
      newRole: this.newRole.value,
      changedBy: this.changedBy
    };
  }
}

export class UserDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly deletedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserDeleted';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      deletedBy: this.deletedBy
    };
  }
}
