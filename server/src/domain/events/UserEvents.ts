/**
 * User Domain Events
 *
 * Events that occur within the User aggregate.
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
    super(1, labId);
  }

  eventName(): string {
    return 'UserCreated';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
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
    public readonly changedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserPasswordChanged';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
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
    public readonly changedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserRoleChanged';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
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
    public readonly deletedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserDeleted';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
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
    public readonly username: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserLoggedIn';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username
    };
  }
}

export class UserLoginFailedEvent extends DomainEvent {
  constructor(
    public readonly username: string,
    public readonly ipAddress: string | undefined,
    public readonly reason: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'UserLoginFailed';
  }

  getAggregateId(): string {
    return this.username;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      username: this.username,
      ipAddress: this.ipAddress,
      reason: this.reason
    };
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserLoggedOut';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
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
    public readonly linkedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserLinkedToResearcher';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
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
    public readonly unlinkedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserUnlinkedFromResearcher';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username,
      researcherId: this.researcherId,
      researcherName: this.researcherName,
      unlinkedBy: this.unlinkedBy
    };
  }
}

export class UserApprovedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly approvedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserApproved';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username,
      approvedBy: this.approvedBy
    };
  }
}

export class UserRejectedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly rejectedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserRejected';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username,
      rejectedBy: this.rejectedBy
    };
  }
}

export class UserDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly deactivatedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserDeactivated';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username,
      deactivatedBy: this.deactivatedBy
    };
  }
}

export class UserSuspendedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly suspendedBy: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'UserSuspended';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username,
      suspendedBy: this.suspendedBy
    };
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
    super(1, labId);
  }

  eventName(): string {
    return 'UserReactivated';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      username: this.username,
      previousStatus: this.previousStatus,
      reactivatedBy: this.reactivatedBy
    };
  }
}
