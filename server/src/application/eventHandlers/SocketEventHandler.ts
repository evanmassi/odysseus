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
  LabNameChangedEvent,
  RackLabelUpdatedEvent,
  BoxLabelUpdatedEvent,
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent
} from '@domain/events/ConfigurationEvents';
import {
  UserApprovedEvent,
  UserDeletedEvent,
  UserRoleChangedEvent,
  UserCreatedEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent
} from '@domain/events/UserEvents';
import {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeLocationChangedEvent,
  TubeDeletedEvent,
  BulkTubesUpdatedEvent
} from '@domain/events/TubeEvents';
import {
  TubesLockedEvent,
  TubesUnlockedEvent,
  TubeAccessSharedEvent,
  TubeAccessRevokedEvent
} from '@domain/events/TubeLockEvents';
import {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent
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
   * Subscribe to domain events for real-time Socket.IO updates.
   * Arrow functions preserve type safety with DomainEventMap.
   */
  private subscribeToEvents(): void {
    // Configuration events - debounced to batch rapid changes
    this.eventBus.subscribe('TankAdded', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('TankUpdated', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('TankDeleted', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('RackAdded', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('RackUpdated', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('RackDeleted', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxAdded', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxUpdated', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxDeleted', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('LabNameChanged', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('RackLabelUpdated', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxLabelUpdated', (e) => this.handleConfigurationChange(e));

    // Assignment events - also configuration changes
    this.eventBus.subscribe('RackAssigned', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('RackUnassigned', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('RackReassigned', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxAssigned', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxUnassigned', (e) => this.handleConfigurationChange(e));
    this.eventBus.subscribe('BoxReassigned', (e) => this.handleConfigurationChange(e));

    // User events
    this.eventBus.subscribe('UserApproved', (e) => this.handleUserApproved(e));
    this.eventBus.subscribe('UserDeleted', (e) => this.handleUserDeleted(e));
    this.eventBus.subscribe('UserRoleChanged', (e) => this.handleUserRoleChanged(e));
    this.eventBus.subscribe('UserCreated', (e) => this.handleUserCreated(e));
    this.eventBus.subscribe('UserLinkedToResearcher', (e) => this.handleUserLinkedToResearcher(e));
    this.eventBus.subscribe('UserUnlinkedFromResearcher', (e) => this.handleUserUnlinkedFromResearcher(e));

    // Tube CRUD events
    this.eventBus.subscribe('TubeCreated', (e) => this.handleTubeCreated(e));
    this.eventBus.subscribe('TubeUpdated', (e) => this.handleTubeUpdated(e));
    this.eventBus.subscribe('TubeLocationChanged', (e) => this.handleTubeUpdated(e));
    this.eventBus.subscribe('TubeDeleted', (e) => this.handleTubeDeleted(e));
    this.eventBus.subscribe('BulkTubesUpdated', (e) => this.handleBulkTubesUpdated(e));

    // Tube lock/access events
    this.eventBus.subscribe('TubesLocked', (e) => this.handleTubesLocked(e));
    this.eventBus.subscribe('TubesUnlocked', (e) => this.handleTubesUnlocked(e));
    this.eventBus.subscribe('TubeAccessShared', (e) => this.handleTubeAccessShared(e));
    this.eventBus.subscribe('TubeAccessRevoked', (e) => this.handleTubeAccessRevoked(e));

    // Researcher CRUD events
    this.eventBus.subscribe('ResearcherCreated', (e) => this.handleResearcherCreated(e));
    this.eventBus.subscribe('ResearcherUpdated', (e) => this.handleResearcherUpdated(e));
    this.eventBus.subscribe('ResearcherDeactivated', (e) => this.handleResearcherUpdated(e));
    this.eventBus.subscribe('ResearcherReactivated', (e) => this.handleResearcherUpdated(e));
    this.eventBus.subscribe('ResearcherDeleted', (e) => this.handleResearcherDeleted(e));

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
      | RackLabelUpdatedEvent
      | BoxLabelUpdatedEvent
      | RackAssignedEvent
      | RackUnassignedEvent
      | RackReassignedEvent
      | BoxAssignedEvent
      | BoxUnassignedEvent
      | BoxReassignedEvent
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
  // Emit socket events for real-time tube updates across all clients

  private async handleTubeCreated(event: TubeCreatedEvent): Promise<void> {
    try {
      // Convert value objects to plain data for serialization
      const locationData = event.location.toData();

      const payload = {
        tubeId: event.tubeId,
        location: locationData,
        createdBy: event.createdBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tube_created socket event', {
        tubeId: event.tubeId,
        location: locationData,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tube_created', payload);
    } catch (error) {
      logger.error('Failed to emit tube_created event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId
      });
    }
  }

  private async handleTubeUpdated(
    event: TubeUpdatedEvent | TubeLocationChangedEvent
  ): Promise<void> {
    try {
      // Get the correct "by" field based on event type
      const changedBy = event instanceof TubeLocationChangedEvent
        ? event.movedBy
        : event.updatedBy;

      // Convert value objects to plain data for serialization
      const oldLocationData = event.oldLocation.toData();
      const newLocationData = event.newLocation.toData();

      const payload = {
        tubeId: event.tubeId,
        oldLocation: oldLocationData,
        newLocation: newLocationData,
        updatedBy: changedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tube_updated socket event', {
        tubeId: event.tubeId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tube_updated', payload);
    } catch (error) {
      logger.error('Failed to emit tube_updated event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId
      });
    }
  }

  private async handleTubeDeleted(event: TubeDeletedEvent): Promise<void> {
    try {
      // Convert value objects to plain data for serialization
      const locationData = event.location.toData();

      const payload = {
        tubeId: event.tubeId,
        location: locationData,
        deletedBy: event.deletedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tube_deleted socket event', {
        tubeId: event.tubeId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tube_deleted', payload);
    } catch (error) {
      logger.error('Failed to emit tube_deleted event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId
      });
    }
  }

  private async handleBulkTubesUpdated(event: BulkTubesUpdatedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        operation: 'bulk_update',
        changesSummary: event.changesSummary,
        updatedBy: event.updatedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tubes_bulk_updated socket event', {
        count: event.tubeIds.length,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tubes_bulk_updated', payload);
    } catch (error) {
      logger.error('Failed to emit tubes_bulk_updated event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length
      });
    }
  }

  // RESEARCHER EVENT HANDLERS
  // Emit socket events for real-time researcher updates across all clients

  private async handleResearcherCreated(event: ResearcherCreatedEvent): Promise<void> {
    try {
      const payload = {
        researcherId: event.researcherId,
        eventType: 'ResearcherCreated',
        firstName: event.firstName,
        lastName: event.lastName,
        email: event.email,
        position: event.position,
        updatedBy: event.createdBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting researcher_created socket event', {
        researcherId: event.researcherId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('researcher_created', payload);
    } catch (error) {
      logger.error('Failed to emit researcher_created event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId
      });
    }
  }

  private async handleResearcherUpdated(
    event:
      | ResearcherUpdatedEvent
      | ResearcherDeactivatedEvent
      | ResearcherReactivatedEvent
  ): Promise<void> {
    try {
      const eventType = event.eventName();
      const socketEvent = eventType === 'ResearcherDeactivated' ? 'researcher_deactivated'
        : eventType === 'ResearcherReactivated' ? 'researcher_reactivated'
        : 'researcher_updated';

      // Get the correct "by" field based on event type
      let changedBy: string;
      if (event instanceof ResearcherDeactivatedEvent) {
        changedBy = event.deactivatedBy;
      } else if (event instanceof ResearcherReactivatedEvent) {
        changedBy = event.reactivatedBy;
      } else {
        changedBy = event.updatedBy;
      }

      const payload = {
        researcherId: event.researcherId,
        eventType,
        updatedBy: changedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug(`Emitting ${socketEvent} socket event`, {
        researcherId: event.researcherId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit(socketEvent, payload);
    } catch (error) {
      logger.error('Failed to emit researcher event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId,
        eventType: event.eventName()
      });
    }
  }

  private async handleResearcherDeleted(event: ResearcherDeletedEvent): Promise<void> {
    try {
      const payload = {
        researcherId: event.researcherId,
        eventType: 'ResearcherDeleted',
        firstName: event.firstName,
        lastName: event.lastName,
        deletedBy: event.deletedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting researcher_deleted socket event', {
        researcherId: event.researcherId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('researcher_deleted', payload);
    } catch (error) {
      logger.error('Failed to emit researcher_deleted event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId
      });
    }
  }

  // USER EVENT HANDLERS

  private async handleUserApproved(event: UserApprovedEvent): Promise<void> {
    try {
      const payload = {
        userId: event.userId,
        username: event.username,
        approvedBy: event.approvedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting user_approved socket event', {
        userId: event.userId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('user_approved', payload);
    } catch (error) {
      logger.error('Failed to emit user_approved event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId
      });
    }
  }

  private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    try {
      const payload = {
        userId: event.userId,
        username: event.username,
        deletedBy: event.deletedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting user_deleted socket event', {
        userId: event.userId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('user_deleted', payload);
    } catch (error) {
      logger.error('Failed to emit user_deleted event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId
      });
    }
  }

  private async handleUserRoleChanged(event: UserRoleChangedEvent): Promise<void> {
    try {
      const payload = {
        userId: event.userId,
        username: event.username,
        oldRole: event.oldRole.value,
        newRole: event.newRole.value,
        changedBy: event.changedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting user_role_changed socket event', {
        userId: event.userId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('user_role_changed', payload);
    } catch (error) {
      logger.error('Failed to emit user_role_changed event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId
      });
    }
  }

  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      const payload = {
        userId: event.userId,
        username: event.username,
        role: event.role.value,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting user_created socket event', {
        userId: event.userId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('user_created', payload);
    } catch (error) {
      logger.error('Failed to emit user_created event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId
      });
    }
  }

  private async handleUserLinkedToResearcher(event: UserLinkedToResearcherEvent): Promise<void> {
    try {
      const payload = {
        userId: event.userId,
        username: event.username,
        researcherId: event.researcherId,
        researcherName: event.researcherName,
        linkedBy: event.linkedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting user_linked_to_researcher socket event', {
        userId: event.userId,
        researcherId: event.researcherId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('user_linked_to_researcher', payload);
    } catch (error) {
      logger.error('Failed to emit user_linked_to_researcher event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId
      });
    }
  }

  private async handleUserUnlinkedFromResearcher(event: UserUnlinkedFromResearcherEvent): Promise<void> {
    try {
      const payload = {
        userId: event.userId,
        username: event.username,
        researcherId: event.researcherId,
        researcherName: event.researcherName,
        unlinkedBy: event.unlinkedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting user_unlinked_from_researcher socket event', {
        userId: event.userId,
        researcherId: event.researcherId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('user_unlinked_from_researcher', payload);
    } catch (error) {
      logger.error('Failed to emit user_unlinked_from_researcher event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId
      });
    }
  }

  // TUBE LOCK EVENT HANDLERS

  private async handleTubesLocked(event: TubesLockedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        lockedBy: event.lockedBy,
        lockNote: event.lockNote,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tubes_locked socket event', {
        count: event.tubeIds.length,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tubes_locked', payload);
    } catch (error) {
      logger.error('Failed to emit tubes_locked event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length
      });
    }
  }

  private async handleTubesUnlocked(event: TubesUnlockedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        unlockedBy: event.unlockedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tubes_unlocked socket event', {
        count: event.tubeIds.length,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tubes_unlocked', payload);
    } catch (error) {
      logger.error('Failed to emit tubes_unlocked event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length
      });
    }
  }

  private async handleTubeAccessShared(event: TubeAccessSharedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        addedUserIds: event.addedUserIds,
        tubeSharedUsers: event.tubeSharedUsers,
        sharedBy: event.sharedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tube_access_shared Socket event', {
        tubeCount: event.tubeIds.length,
        userCount: event.addedUserIds.length,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tube_access_shared', payload);
    } catch (error) {
      logger.error('Failed to emit tube_access_shared event', {
        error: error instanceof Error ? error.message : String(error),
        tubeIds: event.tubeIds
      });
    }
  }

  private async handleTubeAccessRevoked(event: TubeAccessRevokedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        revokedUserIds: event.revokedUserIds,
        tubeSharedUsers: event.tubeSharedUsers,
        revokedBy: event.revokedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tube_access_revoked Socket event', {
        tubeCount: event.tubeIds.length,
        userCount: event.revokedUserIds.length,
        connectedClients: this.io.sockets.sockets.size
      });

      this.io.emit('tube_access_revoked', payload);
    } catch (error) {
      logger.error('Failed to emit tube_access_revoked event', {
        error: error instanceof Error ? error.message : String(error),
        tubeIds: event.tubeIds
      });
    }
  }
}
