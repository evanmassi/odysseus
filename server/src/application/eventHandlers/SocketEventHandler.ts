/**
 * Socket Event Handler
 *
 * Subscribes to domain events and emits Socket.IO events to connected clients.
 * Provides real-time updates for configuration, tubes, and researchers.
 *
 * Design principles:
 * - Real-time: Immediate notification to all connected clients
 * - Type-safe: Validated event payloads
 * - Non-blocking: Socket failures don't break main operations
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { Server as SocketIOServer } from 'socket.io';
import { logger } from '@utils/logger';
import {
  TankUpdatedEvent,
  TankAddedEvent,
  TankDeletedEvent,
  RackAddedEvent,
  RackDeletedEvent,
  RackUpdatedEvent,
  BoxAddedEvent,
  BoxDeletedEvent,
  BoxUpdatedEvent,
  LabNameChangedEvent
} from '@domain/events/ConfigurationEvents';
import {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeLocationChangedEvent,
  TubeDeletedEvent,
  BulkTubesUpdatedEvent
} from '@domain/events/TubeEvents';
import {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent
} from '@domain/events/ResearcherEvents';

/**
 * Socket Event Handler
 *
 * Bridges domain events to Socket.IO real-time updates.
 * Emits events to all connected clients for immediate synchronization.
 */
export class SocketEventHandler {
  // Debouncing for configuration changes
  private configUpdateTimer: NodeJS.Timeout | null = null;
  private pendingConfigEvents: Array<{ type: string; userId: string }> = [];
  private readonly DEBOUNCE_DELAY_MS = 2000; // 2 seconds

  constructor(
    private io: SocketIOServer,
    private eventBus: EventBus
  ) {
    this.subscribeToEvents();
  }

  /**
   * Subscribe to all relevant domain events for real-time updates
   */
  private subscribeToEvents(): void {
    // Configuration events
    this.eventBus.subscribe('TankAdded', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('TankUpdated', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('TankDeleted', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('RackAdded', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('RackUpdated', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('RackDeleted', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('BoxAdded', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('BoxUpdated', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('BoxDeleted', this.handleConfigurationChange.bind(this) as any);
    this.eventBus.subscribe('LabNameChanged', this.handleConfigurationChange.bind(this) as any);

    // Tube events
    this.eventBus.subscribe('TubeCreated', this.handleTubeCreated.bind(this) as any);
    this.eventBus.subscribe('TubeUpdated', this.handleTubeUpdated.bind(this) as any);
    this.eventBus.subscribe('TubeLocationChanged', this.handleTubeUpdated.bind(this) as any);
    this.eventBus.subscribe('TubeDeleted', this.handleTubeDeleted.bind(this) as any);
    this.eventBus.subscribe('BulkTubesUpdated', this.handleBulkTubesUpdated.bind(this) as any);

    // Researcher events
    this.eventBus.subscribe('ResearcherCreated', this.handleResearcherCreated.bind(this) as any);
    this.eventBus.subscribe('ResearcherUpdated', this.handleResearcherUpdated.bind(this) as any);
    this.eventBus.subscribe('ResearcherDeactivated', this.handleResearcherUpdated.bind(this) as any);
    this.eventBus.subscribe('ResearcherReactivated', this.handleResearcherUpdated.bind(this) as any);

    logger.info('SocketEventHandler subscribed to domain events');
  }

  // CONFIGURATION EVENT HANDLERS

  /**
   * Handle any configuration change event
   * Debounces rapid changes to avoid spamming clients with updates
   */
  private async handleConfigurationChange(
    event:
      | TankAddedEvent
      | TankUpdatedEvent
      | TankDeletedEvent
      | RackAddedEvent
      | RackUpdatedEvent
      | RackDeletedEvent
      | BoxAddedEvent
      | BoxUpdatedEvent
      | BoxDeletedEvent
      | LabNameChangedEvent
  ): Promise<void> {
    try {
      // Collect event information
      this.pendingConfigEvents.push({
        type: event.eventName(),
        userId: event.userId,
      });

      logger.debug('Configuration event queued for debounced emission', {
        eventType: event.eventName(),
        queueSize: this.pendingConfigEvents.length,
      });

      // Clear existing timer
      if (this.configUpdateTimer) {
        clearTimeout(this.configUpdateTimer);
      }

      // Emit after debounce delay (2 seconds of inactivity)
      this.configUpdateTimer = setTimeout(() => {
        this.emitConfigurationUpdate();
      }, this.DEBOUNCE_DELAY_MS);
    } catch (error) {
      logger.error('Failed to queue configuration event', {
        error: error instanceof Error ? error.message : String(error),
        eventType: event.eventName(),
      });
    }
  }

  /**
   * Emit batched configuration update to all connected clients
   */
  private emitConfigurationUpdate(): void {
    if (this.pendingConfigEvents.length === 0) {
      return;
    }

    try {
      // Get unique event types
      const eventTypes = [...new Set(this.pendingConfigEvents.map(e => e.type))];
      const lastEvent = this.pendingConfigEvents[this.pendingConfigEvents.length - 1];

      const payload = {
        eventTypes,
        eventCount: this.pendingConfigEvents.length,
        updatedAt: new Date().toISOString(),
        changedBy: lastEvent.userId,
      };

      logger.info('Emitting batched configuration_updated Socket event', {
        eventTypes,
        eventCount: this.pendingConfigEvents.length,
        connectedClients: this.io.sockets.sockets.size,
      });

      this.io.emit('configuration_updated', payload);

      // Clear pending events
      this.pendingConfigEvents = [];
      this.configUpdateTimer = null;
    } catch (error) {
      logger.error('Failed to emit configuration_updated event', {
        error: error instanceof Error ? error.message : String(error),
        eventCount: this.pendingConfigEvents.length,
      });
      // Don't rethrow - Socket failures shouldn't break domain operations
    }
  }

  // TUBE EVENT HANDLERS
  // Note: These are intentionally commented out as tube/researcher events are already
  // handled by existing Socket.IO emissions in controllers. Only configuration events
  // need real-time updates for cache invalidation.
  //
  // If you want to add Socket.IO emissions for tubes/researchers in the future,
  // you'll need to either:
  // 1. Pass full Tube/Researcher entities to the events (not recommended - breaks event design)
  // 2. Fetch the entities from repositories within these handlers (adds complexity)
  // 3. Keep the existing controller-based emissions (current approach)

  private async handleTubeCreated(event: TubeCreatedEvent): Promise<void> {
    // Tube created events are already handled by TubeController
    // No additional Socket emission needed here
  }

  private async handleTubeUpdated(
    event: TubeUpdatedEvent | TubeLocationChangedEvent
  ): Promise<void> {
    // Tube updated events are already handled by TubeController
    // No additional Socket emission needed here
  }

  private async handleTubeDeleted(event: TubeDeletedEvent): Promise<void> {
    // Tube deleted events are already handled by TubeController
    // No additional Socket emission needed here
  }

  private async handleBulkTubesUpdated(event: BulkTubesUpdatedEvent): Promise<void> {
    // Bulk tube update events are already handled by TubeController
    // No additional Socket emission needed here
  }

  // RESEARCHER EVENT HANDLERS
  // Note: Same as above - researcher events are already handled by ResearcherController

  private async handleResearcherCreated(event: ResearcherCreatedEvent): Promise<void> {
    // Researcher created events are already handled by ResearcherController
    // No additional Socket emission needed here
  }

  private async handleResearcherUpdated(
    event:
      | ResearcherUpdatedEvent
      | ResearcherDeactivatedEvent
      | ResearcherReactivatedEvent
  ): Promise<void> {
    // Researcher updated events are already handled by ResearcherController
    // No additional Socket emission needed here
  }
}
