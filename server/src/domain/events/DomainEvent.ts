/**
 * Domain Event Base Class
 *
 * All concrete events extend this for consistent serialization and routing.
 */

import { randomUUID } from 'crypto';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly version: number;
  public readonly labId?: string;
  public partOfBulkOperation: boolean = false;

  constructor(version: number = 1, labId?: string) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.version = version;
    this.labId = labId;
  }

  abstract eventName(): string;

  abstract getAggregateId(): string;

  toData(): DomainEventData {
    return {
      eventId: this.eventId,
      eventName: this.eventName(),
      aggregateId: this.getAggregateId(),
      occurredOn: this.occurredOn.toISOString(),
      version: this.version,
      labId: this.labId,
      data: this.getEventData()
    };
  }

  protected getEventData(): Record<string, unknown> {
    return {};
  }
}

export interface DomainEventData {
  eventId: string;
  eventName: string;
  aggregateId: string;
  occurredOn: string;
  version: number;
  labId?: string;
  data: Record<string, unknown>;
}
