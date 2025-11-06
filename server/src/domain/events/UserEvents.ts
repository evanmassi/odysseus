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

export class UserLoggedInEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserLoggedIn';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username
    };
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserLoggedOut';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username
    };
  }
}

export class UserLinkedToResearcherEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly researcherId: string,
    public readonly researcherName: string,
    public readonly linkedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserLinkedToResearcher';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      researcherId: this.researcherId,
      researcherName: this.researcherName,
      linkedBy: this.linkedBy
    };
  }
}

export class UserUnlinkedFromResearcherEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly researcherId: string,
    public readonly researcherName: string,
    public readonly unlinkedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserUnlinkedFromResearcher';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      researcherId: this.researcherId,
      researcherName: this.researcherName,
      unlinkedBy: this.unlinkedBy
    };
  }
}
