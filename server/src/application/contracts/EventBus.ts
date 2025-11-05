/**
 * Event Bus Interface
 * 
 * Defines the contract for publishing and subscribing to domain events.
 * This interface allows for different event bus implementations
 * (in-memory, message queue, etc.) without changing the application logic.
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export interface EventBus {
  /**
   * Publishes a domain event to all registered handlers.
   * 
   * @param event The domain event to publish
   * @returns Promise that resolves when all handlers have processed the event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events in sequence.
   * 
   * @param events Array of domain events to publish
   * @returns Promise that resolves when all events have been processed
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribes an event handler to a specific event type.
   * 
   * @param eventName Name of the event to subscribe to
   * @param handler Function to handle the event
   */
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;

  /**
   * Unsubscribes an event handler from a specific event type.
   * 
   * @param eventName Name of the event to unsubscribe from
   * @param handler Function to remove from handlers
   */
  unsubscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;

  /**
   * Gets all active subscriptions (for debugging/monitoring).
   * 
   * @returns Map of event names to handler counts
   */
  getSubscriptions(): Map<string, number>;
}

/**
 * Event Handler Type
 *
 * Accepts both function handlers and object handlers with a handle() method.
 * This provides flexibility for different handler patterns.
 */
export type EventHandler<T extends DomainEvent> =
  | ((event: T) => Promise<void>)
  | { handle(event: T): Promise<void> };
