/**
 * Real-Time Event Broadcaster
 *
 * Bridges domain events to Socket.IO for live client updates across all entity types.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { PresenceService } from '@application/services/PresenceService';
import {
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent
} from '@domain/events/ResearcherEvents';
import type {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeletedEvent
} from '@domain/events/ResearcherEvents';
import type {
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
  BoxReassignedEvent,
  BulkResourcesUnassignedEvent,
  BulkResourcesReassignedEvent
} from '@domain/events/StorageEvents';
import { TubeLocationChangedEvent } from '@domain/events/TubeEvents';
import type {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeDeletedEvent,
  BulkTubesCreatedEvent,
  BulkTubesUpdatedEvent,
  BulkTubesDeletedEvent
} from '@domain/events/TubeEvents';
import type {
  TubesLockedEvent,
  TubesUnlockedEvent,
  TubeAccessSharedEvent,
  TubeAccessRevokedEvent
} from '@domain/events/TubeLockEvents';
import type {
  UserDeletedEvent,
  UserRoleChangedEvent,
  UserCreatedEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent
} from '@domain/events/UserEvents';
import { logger } from '@infrastructure/logging/logger';

import type { Server as SocketIOServer } from 'socket.io';

const SYSTEM_ADMIN_ROOM = 'system-admins';

export class SocketEventHandler {
  private configTimersByLab = new Map<string, NodeJS.Timeout>();
  private pendingEventsByLab = new Map<string, Array<{ type: string; userId: string }>>();
  private readonly DEBOUNCE_DELAY_MS = 2000;

  constructor(
    private io: SocketIOServer,
    private eventBus: EventBus,
    private presenceService: PresenceService
  ) {
    this.subscribeToEvents();
    this.setupPresenceHandlers();
  }

  private getLabRoomName(labId: string): string {
    return `lab:${labId}`;
  }

  private emitToLabRooms(labId: string | undefined, eventName: string, payload: unknown): void {
    if (labId) {
      this.io.to(this.getLabRoomName(labId)).emit(eventName, payload);
    } else {
      this.io.emit(eventName, payload);
    }
  }

  private emitSystemAdminUpdate(labId: string | undefined, trigger: string): void {
    if (!labId) return;
    this.io.to(SYSTEM_ADMIN_ROOM).emit('lab_data_changed', {
      labId,
      trigger,
      timestamp: new Date().toISOString(),
    });
  }

  private setupPresenceHandlers(): void {
    this.io.on('connection', (socket) => {
      if (socket.userId && socket.username) {
        try {
          this.presenceService.registerConnection(socket.userId, socket.id, socket.username, socket.labId);

          if (socket.labId) {
            const labRoom = this.getLabRoomName(socket.labId);
            void socket.join(labRoom);
            logger.debug('Socket joined lab room', { socketId: socket.id, room: labRoom, labId: socket.labId });
          } else {
            // System admins have no labId — join a shared room for cross-lab notifications
            void socket.join(SYSTEM_ADMIN_ROOM);
            logger.debug('Socket joined system admin room', { socketId: socket.id, userId: socket.userId });
          }

          const onlinePayload = {
            userId: socket.userId,
            onlineUserIds: socket.labId
              ? this.presenceService.getOnlineUserIdsForLab(socket.labId)
              : this.presenceService.getOnlineUserIds(),
            timestamp: new Date().toISOString()
          };
          this.emitToLabRooms(socket.labId, 'user_online', onlinePayload);

          logger.debug('Emitting user_online socket event', {
            userId: socket.userId,
            onlineCount: this.presenceService.getOnlineCount(),
            connectedClients: this.io.sockets.sockets.size
          });
        } catch (error) {
          logger.error('Failed to register presence on connection', {
            error: error instanceof Error ? error.message : String(error),
            userId: socket.userId,
            socketId: socket.id
          });
        }
      }

      // Handle explicit presence state requests from clients
      // Used after socket connects to get authoritative state (avoids race conditions)
      socket.on('request_presence', () => {
        try {
          const onlineUserIds = socket.labId
            ? this.presenceService.getOnlineUserIdsForLab(socket.labId)
            : this.presenceService.getOnlineUserIds();
          socket.emit('presence_state', {
            onlineUserIds,
            timestamp: new Date().toISOString()
          });

          logger.debug('Sent presence_state to client', {
            socketId: socket.id,
            userId: socket.userId,
            onlineCount: onlineUserIds.length
          });
        } catch (error) {
          logger.error('Failed to handle request_presence', {
            error: error instanceof Error ? error.message : String(error),
            socketId: socket.id
          });
        }
      });

      socket.on('disconnect', () => {
        if (!socket.userId) return;

        try {
          const userId = this.presenceService.removeConnection(socket.id);

          // Only emit user_offline if user is actually offline now
          // (user may still be connected on another tab)
          if (userId && !this.presenceService.isUserOnline(userId)) {
            const offlinePayload = {
              userId,
              onlineUserIds: socket.labId
                ? this.presenceService.getOnlineUserIdsForLab(socket.labId)
                : this.presenceService.getOnlineUserIds(),
              timestamp: new Date().toISOString()
            };
            this.emitToLabRooms(socket.labId, 'user_offline', offlinePayload);

            logger.debug('Emitting user_offline socket event', {
              userId,
              onlineCount: this.presenceService.getOnlineCount(),
              connectedClients: this.io.sockets.sockets.size
            });
          }
        } catch (error) {
          logger.error('Failed to handle presence on disconnect', {
            error: error instanceof Error ? error.message : String(error),
            userId: socket.userId,
            socketId: socket.id
          });
        }
      });
    });
  }

  private subscribeToEvents(): void {
    // Configuration events - debounced to batch rapid changes
    this.eventBus.subscribe('TankAdded', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('TankUpdated', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('TankDeleted', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('RackAdded', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('RackUpdated', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('RackDeleted', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxAdded', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxUpdated', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxDeleted', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('LabNameChanged', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('RackLabelUpdated', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxLabelUpdated', (e) => this.handleStorageChange(e));

    // Assignment events - also configuration changes
    this.eventBus.subscribe('RackAssigned', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('RackUnassigned', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('RackReassigned', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxAssigned', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxUnassigned', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BoxReassigned', (e) => this.handleStorageChange(e));

    // Bulk resource events - triggered during user deletion cascade
    this.eventBus.subscribe('BulkResourcesUnassigned', (e) => this.handleStorageChange(e));
    this.eventBus.subscribe('BulkResourcesReassigned', (e) => this.handleStorageChange(e));

    // Lab lifecycle events — system admin only
    this.eventBus.subscribe('LabCreated', async (e) => this.emitSystemAdminUpdate(e.labId, 'LabCreated'));
    this.eventBus.subscribe('LabRenamed', async (e) => this.emitSystemAdminUpdate(e.labId, 'LabRenamed'));
    this.eventBus.subscribe('LabActivated', async (e) => this.emitSystemAdminUpdate(e.labId, 'LabActivated'));
    this.eventBus.subscribe('LabDeactivated', async (e) => this.emitSystemAdminUpdate(e.labId, 'LabDeactivated'));

    // User status events — system admin only (lab-scoped events handled by existing user handlers)
    this.eventBus.subscribe('UserDeactivated', async (e) => this.emitSystemAdminUpdate(e.labId, 'UserDeactivated'));
    this.eventBus.subscribe('UserSuspended', async (e) => this.emitSystemAdminUpdate(e.labId, 'UserSuspended'));
    this.eventBus.subscribe('UserReactivated', async (e) => this.emitSystemAdminUpdate(e.labId, 'UserReactivated'));

    // User events
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
    this.eventBus.subscribe('BulkTubesCreated', (e) => this.handleBulkTubesCreated(e));
    this.eventBus.subscribe('BulkTubesUpdated', (e) => this.handleBulkTubesUpdated(e));
    this.eventBus.subscribe('BulkTubesDeleted', (e) => this.handleBulkTubesDeleted(e));

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
  }

  // CONFIGURATION EVENT HANDLERS

  /** Debounces rapid changes to avoid spamming clients with updates. */
  private async handleStorageChange(
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
      | BulkResourcesUnassignedEvent
      | BulkResourcesReassignedEvent
  ): Promise<void> {
    try {
      const labId = event.labId ?? 'unknown';

      if (!this.pendingEventsByLab.has(labId)) {
        this.pendingEventsByLab.set(labId, []);
      }
      this.pendingEventsByLab.get(labId)!.push({
        type: event.eventName(),
        userId: event.userId,
      });

      logger.debug('Storage configuration event queued for debounced emission', {
        eventType: event.eventName(),
        labId,
        queueSize: this.pendingEventsByLab.get(labId)!.length,
      });

      const existingTimer = this.configTimersByLab.get(labId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      this.configTimersByLab.set(labId, setTimeout(() => {
        this.emitStorageUpdate(labId);
      }, this.DEBOUNCE_DELAY_MS));
    } catch (error) {
      logger.error('Failed to queue configuration event', {
        error: error instanceof Error ? error.message : String(error),
        eventType: event.eventName(),
      });
    }
  }

  private emitStorageUpdate(labId: string): void {
    const pending = this.pendingEventsByLab.get(labId);
    if (!pending || pending.length === 0) {
      return;
    }

    try {
      const eventTypes = [...new Set(pending.map(e => e.type))];
      const lastEvent = pending[pending.length - 1];

      const payload = {
        eventTypes,
        eventCount: pending.length,
        updatedAt: new Date().toISOString(),
        changedBy: lastEvent.userId,
      };

      logger.debug('Emitting batched configuration_updated socket event', {
        eventTypes,
        eventCount: pending.length,
        labId,
        connectedClients: this.io.sockets.sockets.size,
      });

      this.emitToLabRooms(labId === 'unknown' ? undefined : labId, 'configuration_updated', payload);
    } catch (error) {
      logger.error('Failed to emit configuration_updated event', {
        error: error instanceof Error ? error.message : String(error),
        labId,
        eventCount: pending.length,
      });
    } finally {
      this.pendingEventsByLab.delete(labId);
      this.configTimersByLab.delete(labId);
    }
  }

  // TUBE EVENT HANDLERS

  private async handleTubeCreated(event: TubeCreatedEvent): Promise<void> {
    try {
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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tube_created', payload);
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
      const changedBy = event instanceof TubeLocationChangedEvent
        ? event.movedBy
        : event.updatedBy;

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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tube_updated', payload);
    } catch (error) {
      logger.error('Failed to emit tube_updated event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId
      });
    }
  }

  private async handleTubeDeleted(event: TubeDeletedEvent): Promise<void> {
    try {
      const locationData = event.location.toData();

      const payload = {
        tubeId: event.tubeId,
        location: locationData,
        deletedBy: event.deletedBy,
        updatedAt: new Date().toISOString()
      };

      logger.debug('Emitting tube_deleted socket event', {
        tubeId: event.tubeId,
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tube_deleted', payload);
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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tubes_bulk_updated', payload);
    } catch (error) {
      logger.error('Failed to emit tubes_bulk_updated event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length
      });
    }
  }

  private async handleBulkTubesCreated(event: BulkTubesCreatedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        operation: 'bulk_create',
        createdBy: event.createdBy,
        createdAt: new Date().toISOString()
      };

      logger.debug('Emitting tubes_bulk_created socket event', {
        count: event.tubeIds.length,
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tubes_bulk_created', payload);
    } catch (error) {
      logger.error('Failed to emit tubes_bulk_created event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length
      });
    }
  }

  private async handleBulkTubesDeleted(event: BulkTubesDeletedEvent): Promise<void> {
    try {
      const payload = {
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        operation: 'bulk_delete',
        deletedBy: event.deletedBy,
        deletedAt: new Date().toISOString()
      };

      logger.debug('Emitting tubes_bulk_deleted socket event', {
        count: event.tubeIds.length,
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tubes_bulk_deleted', payload);
    } catch (error) {
      logger.error('Failed to emit tubes_bulk_deleted event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length
      });
    }
  }

  // RESEARCHER EVENT HANDLERS

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

      this.emitToLabRooms(event.labId, 'researcher_created', payload);
      this.emitSystemAdminUpdate(event.labId, 'ResearcherCreated');
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

      this.emitToLabRooms(event.labId, socketEvent, payload);
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

      this.emitToLabRooms(event.labId, 'researcher_deleted', payload);
      this.emitSystemAdminUpdate(event.labId, 'ResearcherDeleted');
    } catch (error) {
      logger.error('Failed to emit researcher_deleted event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId
      });
    }
  }

  // USER EVENT HANDLERS


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

      this.emitToLabRooms(event.labId, 'user_deleted', payload);
      this.emitSystemAdminUpdate(event.labId, 'UserDeleted');
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

      this.emitToLabRooms(event.labId, 'user_role_changed', payload);
      this.emitSystemAdminUpdate(event.labId, 'UserRoleChanged');
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

      this.emitToLabRooms(event.labId, 'user_created', payload);
      this.emitSystemAdminUpdate(event.labId, 'UserCreated');
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

      this.emitToLabRooms(event.labId, 'user_linked_to_researcher', payload);
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

      this.emitToLabRooms(event.labId, 'user_unlinked_from_researcher', payload);
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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tubes_locked', payload);
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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tubes_unlocked', payload);
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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tube_access_shared', payload);
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
        labId: event.labId,
        connectedClients: this.io.sockets.sockets.size
      });

      this.emitToLabRooms(event.labId, 'tube_access_revoked', payload);
    } catch (error) {
      logger.error('Failed to emit tube_access_revoked event', {
        error: error instanceof Error ? error.message : String(error),
        tubeIds: event.tubeIds
      });
    }
  }
}
