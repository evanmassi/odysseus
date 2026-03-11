/**
 * Event Bus Interface
 *
 * Contract for publishing and subscribing to domain events.
 * Uses DomainEventMap for compile-time type safety on subscriptions.
 */

import type { DomainEvent } from '@domain/events/DomainEvent';
import type { DomainEventMap, DomainEventName } from '@domain/events/DomainEventMap';

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;

  publishAll(events: DomainEvent[]): Promise<void>;

  subscribe<K extends DomainEventName>(
    eventName: K,
    handler: EventHandler<DomainEventMap[K]>
  ): void;

  unsubscribe<K extends DomainEventName>(
    eventName: K,
    handler: EventHandler<DomainEventMap[K]>
  ): void;

  /** For monitoring active subscription counts. */
  getSubscriptions(): Map<string, number>;
}

export type EventHandler<T extends DomainEvent> =
  | ((event: T) => Promise<void>)
  | { handle(event: T): Promise<void> };
