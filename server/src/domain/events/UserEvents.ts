/**
 * User Domain Events
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { UserRole } from '@domain/value-objects/UserRole';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly role: UserRole,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserCreated';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly changedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserPasswordChanged';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly oldRole: UserRole,
    public readonly newRole: UserRole,
    public readonly changedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserRoleChanged';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserDeletedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly deletedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserDeleted';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserLoggedInEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserLoggedIn';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserLoginFailedEvent extends DomainEvent {
  constructor(
    public readonly username: string,
    public readonly ipAddress: string | undefined,
    public readonly reason: string,
    public readonly userId?: string
  ) {
    super();
  }

  eventName(): string {
    return 'UserLoginFailed';
  }

  getAggregateId(): string {
    return this.userId ?? this.username;
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserLoggedOut';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserLinkedToResearcherEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly researcherId: string,
    public readonly researcherName: string,
    public readonly linkedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserLinkedToResearcher';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserUnlinkedFromResearcherEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly researcherId: string,
    public readonly researcherName: string,
    public readonly unlinkedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserUnlinkedFromResearcher';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly deactivatedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserDeactivated';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserSuspendedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly suspendedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserSuspended';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class UserReactivatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly previousStatus: 'deactivated' | 'suspended',
    public readonly reactivatedBy: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'UserReactivated';
  }

  getAggregateId(): string {
    return this.userId;
  }
}
