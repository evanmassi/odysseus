/**
 * In-Memory Event Bus Implementation
 *
 * Simple, in-process event bus implementation for single-instance deployments.
 * For distributed systems, this should be replaced with a message queue implementation.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import { EventBus, EventHandler } from '@application/contracts/EventBus';
import { logger } from '@utils/logger';

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  private isProcessing = false;
  private eventQueue: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    logger.debug('Publishing domain event', {
      eventName: event.eventName(),
      eventId: event.eventId,
      aggregateId: event.getAggregateId()
    });

    // Add to queue for sequential processing
    this.eventQueue.push(event);

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    logger.debug('Publishing multiple domain events', {
      eventCount: events.length,
      eventNames: events.map(e => e.eventName())
    });

    // Add all events to queue
    this.eventQueue.push(...events);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: DomainEvent): Promise<void> {
    const eventName = event.eventName();
    const handlers = this.handlers.get(eventName) || [];

    if (handlers.length === 0) {
      logger.debug('No handlers registered for event', { eventName });
      return;
    }

    logger.debug('Processing domain event', {
      eventName,
      eventId: event.eventId,
      handlerCount: handlers.length
    });

    // Process all handlers in parallel
    const handlerPromises = handlers.map(async (handler) => {
      try {
        const handlerName = typeof handler === 'function' ? handler.name : handler.constructor.name;

        // Handle both function and object handlers
        if (typeof handler === 'function') {
          await handler(event);
        } else {
          await handler.handle(event);
        }

        logger.debug('Event handler completed successfully', {
          eventName,
          eventId: event.eventId,
          handler: handlerName
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const handlerName = typeof handler === 'function' ? handler.name : handler.constructor.name;

        logger.error('Event handler failed', {
          eventName,
          eventId: event.eventId,
          handler: handlerName,
          error: errorMessage,
          stack: errorStack
        });

        // Don't rethrow - one handler failure shouldn't stop others
        // In production, you might want to implement retry logic here
      }
    });

    await Promise.all(handlerPromises);

    logger.debug('Domain event processing completed', {
      eventName,
      eventId: event.eventId,
      successfulHandlers: handlers.length
    });
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const existingHandlers = this.handlers.get(eventName) || [];
    existingHandlers.push(handler);
    this.handlers.set(eventName, existingHandlers);

    const handlerName = typeof handler === 'function' ? handler.name : handler.constructor.name;
    logger.debug('Event handler subscribed', {
      eventName,
      handler: handlerName,
      totalHandlers: existingHandlers.length
    });
  }

  unsubscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const existingHandlers = this.handlers.get(eventName) || [];
    const updatedHandlers = existingHandlers.filter(h => h !== handler);

    if (updatedHandlers.length === 0) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.set(eventName, updatedHandlers);
    }

    const handlerName = typeof handler === 'function' ? handler.name : handler.constructor.name;
    logger.debug('Event handler unsubscribed', {
      eventName,
      handler: handlerName,
      remainingHandlers: updatedHandlers.length
    });
  }

  getSubscriptions(): Map<string, number> {
    const subscriptions = new Map<string, number>();
    
    for (const [eventName, handlers] of this.handlers.entries()) {
      subscriptions.set(eventName, handlers.length);
    }
    
    return subscriptions;
  }

  /**
   * Gets detailed subscription information for debugging.
   */
  getDetailedSubscriptions(): Record<string, string[]> {
    const details: Record<string, string[]> = {};

    for (const [eventName, handlers] of this.handlers.entries()) {
      details[eventName] = handlers.map(h =>
        typeof h === 'function' ? h.name : h.constructor.name
      );
    }

    return details;
  }

  /**
   * Clears all event handlers (useful for testing).
   */
  clear(): void {
    this.handlers.clear();
    this.eventQueue = [];
    this.isProcessing = false;
    
    logger.debug('Event bus cleared');
  }
}
