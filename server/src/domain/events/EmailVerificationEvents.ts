/**
 * Email Verification Domain Events
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class VerificationEmailSentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'VerificationEmailSent';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class EmailVerifiedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'EmailVerified';
  }

  getAggregateId(): string {
    return this.userId;
  }
}

export class VerificationEmailResentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    labId?: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'VerificationEmailResent';
  }

  getAggregateId(): string {
    return this.userId;
  }
}
