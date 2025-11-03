/**
 * Email Verification Domain Events
 *
 * Events that occur during email verification processes
 */

import { DomainEvent } from './DomainEvent';

export class VerificationEmailSentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'VerificationEmailSent';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}

export class EmailVerifiedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'EmailVerified';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}

export class VerificationEmailResentEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'VerificationEmailResent';
  }

  getAggregateId(): string {
    return this.userId;
  }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}
