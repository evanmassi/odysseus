/**
 * Email Verification Domain Events
 *
 * Events that occur during email verification processes
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class VerificationEmailSentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'VerificationEmailSent';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}

export class EmailVerifiedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'EmailVerified';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}

export class VerificationEmailResentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    labId?: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'VerificationEmailResent';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}
