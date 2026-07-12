/**
 * In-Memory Event Bus Implementation
 *
 * In-process event bus for single-instance deployments.
 * For distributed systems, replace with a message queue implementation.
 */

import type { EventBus, EventHandler } from '@application/contracts/EventBus';
import type { DomainEvent } from '@domain/events/DomainEvent';
import type { DomainEventMap, DomainEventName } from '@domain/events/DomainEventMap';
import { logger } from '@infrastructure/logging/logger';

// Runtime can't verify generic types across Map storage
type AnyEventHandler = EventHandler<DomainEvent>;

function handlerName(handler: AnyEventHandler): string {
  return typeof handler === 'function' ? handler.name : handler.constructor.name;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, AnyEventHandler[]>();
  private isProcessing = false;
  private eventQueue: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    logger.debug('Publishing domain event', {
      eventName: event.eventName(),
      aggregateId: event.getAggregateId(),
      handlerCount: this.handlers.get(event.eventName())?.length ?? 0
    });

    this.eventQueue.push(event);

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
    const handlers = this.handlers.get(eventName) ?? [];

    if (handlers.length === 0) {
      logger.warn('No handlers registered for domain event', { eventName });
      return;
    }

    logger.debug('Processing domain event', {
      eventName,
      handlerCount: handlers.length
    });

    const handlerPromises = handlers.map(async (handler) => {
      try {
        if (typeof handler === 'function') {
          await handler(event);
        } else {
          await handler.handle(event);
        }

        logger.debug('Event handler completed successfully', {
          eventName,
          eventId: event.eventId,
          handler: handlerName(handler)
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Event handler failed', {
          eventName,
          eventId: event.eventId,
          handler: handlerName(handler),
          error: errorMessage,
          stack: errorStack
        });

        // One handler failure shouldn't stop others
      }
    });

    await Promise.all(handlerPromises);

    logger.debug('Domain event processing completed', {
      eventName,
      eventId: event.eventId,
      handlerCount: handlers.length
    });
  }

  subscribe<K extends DomainEventName>(
    eventName: K,
    handler: EventHandler<DomainEventMap[K]>
  ): void {
    const existingHandlers = this.handlers.get(eventName) ?? [];
    existingHandlers.push(handler as AnyEventHandler);
    this.handlers.set(eventName, existingHandlers);

    logger.debug('Event handler subscribed', {
      eventName,
      handler: handlerName(handler as AnyEventHandler),
      totalHandlers: existingHandlers.length
    });
  }

}
