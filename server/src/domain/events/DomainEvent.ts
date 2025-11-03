/**
 * Base Domain Event
 * 
 * Abstract base class for all domain events in the system.
 * Domain events represent something meaningful that happened in the domain.
 */

import { randomUUID } from 'crypto';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly version: number;

  constructor(version: number = 1) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.version = version;
  }

  /**
   * Returns the name of this domain event.
   * Used for event routing and handling.
   */
  abstract eventName(): string;

  /**
   * Returns the aggregate root ID this event relates to.
   */
  abstract getAggregateId(): string;

  /**
   * Converts the event to a serializable format for persistence.
   */
  toData(): DomainEventData {
    return {
      eventId: this.eventId,
      eventName: this.eventName(),
      aggregateId: this.getAggregateId(),
      occurredOn: this.occurredOn.toISOString(),
      version: this.version,
      data: this.getEventData()
    };
  }

  /**
   * Returns the event-specific data for serialization.
   * Override this method in concrete event implementations.
   */
  protected getEventData(): Record<string, any> {
    return {};
  }
}

export interface DomainEventData {
  eventId: string;
  eventName: string;
  aggregateId: string;
  occurredOn: string;
  version: number;
  data: Record<string, any>;
}
