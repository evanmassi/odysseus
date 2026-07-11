/**
 * Domain Event Base Class
 *
 * All concrete events extend this for consistent identity and routing.
 */

import { randomUUID } from 'crypto';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly labId?: string;
  public partOfBulkOperation: boolean = false;

  constructor(labId?: string) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.labId = labId;
  }

  abstract eventName(): string;

  abstract getAggregateId(): string;
}
