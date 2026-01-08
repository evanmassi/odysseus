/**
 * Event Bus Interface
 *
 * Contract for publishing and subscribing to domain events.
 * Uses DomainEventMap for compile-time type safety on subscriptions.
 */

import type { DomainEvent } from '@domain/events/DomainEvent';
import type { DomainEventMap, DomainEventName } from '@domain/events/DomainEventMap';

export interface EventBus {
  /**
   * Publish a domain event to all registered handlers.
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple domain events in sequence.
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe a handler to a specific event type.
   * TypeScript infers the correct event type from the event name.
   */
  subscribe<K extends DomainEventName>(
    eventName: K,
    handler: EventHandler<DomainEventMap[K]>
  ): void;

  /**
   * Unsubscribe a handler from a specific event type.
   */
  unsubscribe<K extends DomainEventName>(
    eventName: K,
    handler: EventHandler<DomainEventMap[K]>
  ): void;

  /**
   * Get active subscription counts for monitoring.
   */
  getSubscriptions(): Map<string, number>;
}

/**
 * Event handler type supporting both function and object-based handlers.
 */
export type EventHandler<T extends DomainEvent> =
  | ((event: T) => Promise<void>)
  | { handle(event: T): Promise<void> };
