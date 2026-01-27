import type { EventBus } from '@application/contracts/EventBus';
import { AuditService } from '@application/services/AuditService';
import {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeLocationChangedEvent,
  TubeDeletedEvent,
  BulkTubesUpdatedEvent,
} from '@domain/events/TubeEvents';
import {
  TubesLockedEvent,
  TubesUnlockedEvent,
  TubeAccessSharedEvent,
  TubeAccessRevokedEvent,
} from '@domain/events/TubeLockEvents';
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
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent,
  RackLabelUpdatedEvent,
  BoxLabelUpdatedEvent,
  BulkResourcesUnassignedEvent,
  BulkResourcesReassignedEvent
} from '@domain/events/ConfigurationEvents';
import {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent,
  UserApprovedEvent
} from '@domain/events/UserEvents';
import {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent
} from '@domain/events/ResearcherEvents';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { Location } from '@domain/valueObjects/Location';
import type { FieldChange } from '@domain/types/FieldChange';
import { logger } from '@utils/logger';

/**
 * Audit Event Handler
 *
 * Subscribes to domain events and persists them as audit log entries.
 * Provides complete activity tracking for compliance and debugging.
 *
 * Design principles:
 * - Non-blocking: Audit failures don't break main operations
 * - Detailed: Captures before/after states for updates
 * - Searchable: Structured data for efficient queries
 */
export class AuditEventHandler {
  constructor(
    private auditService: AuditService,
    private eventBus: EventBus,
    private userRepository: UserRepository,
    private configurationRepository: ConfigurationRepository
  ) {
    this.subscribeToEvents();
  }

  /**
   * Subscribe to all domain events for audit logging.
   * Arrow functions preserve type safety with DomainEventMap.
   */
  private subscribeToEvents(): void {
    // Tube events
    this.eventBus.subscribe('TubeCreated', (e) => this.handleTubeCreated(e));
    this.eventBus.subscribe('TubeUpdated', (e) => this.handleTubeUpdated(e));
    this.eventBus.subscribe('TubeLocationChanged', (e) => this.handleTubeLocationChanged(e));
    this.eventBus.subscribe('TubeDeleted', (e) => this.handleTubeDeleted(e));
    this.eventBus.subscribe('BulkTubesUpdated', (e) => this.handleBulkTubesUpdated(e));

    // Tube lock events
    this.eventBus.subscribe('TubesLocked', (e) => this.handleTubesLocked(e));
    this.eventBus.subscribe('TubesUnlocked', (e) => this.handleTubesUnlocked(e));
    this.eventBus.subscribe('TubeAccessShared', (e) => this.handleTubeAccessShared(e));
    this.eventBus.subscribe('TubeAccessRevoked', (e) => this.handleTubeAccessRevoked(e));

    // Configuration events
    this.eventBus.subscribe('TankUpdated', (e) => this.handleTankUpdated(e));
    this.eventBus.subscribe('TankAdded', (e) => this.handleTankAdded(e));
    this.eventBus.subscribe('TankDeleted', (e) => this.handleTankDeleted(e));
    this.eventBus.subscribe('RackAdded', (e) => this.handleRackAdded(e));
    this.eventBus.subscribe('RackDeleted', (e) => this.handleRackDeleted(e));
    this.eventBus.subscribe('RackUpdated', (e) => this.handleRackUpdated(e));
    this.eventBus.subscribe('BoxAdded', (e) => this.handleBoxAdded(e));
    this.eventBus.subscribe('BoxDeleted', (e) => this.handleBoxDeleted(e));
    this.eventBus.subscribe('BoxUpdated', (e) => this.handleBoxUpdated(e));
    this.eventBus.subscribe('LabNameChanged', (e) => this.handleLabNameChanged(e));

    // Assignment events
    this.eventBus.subscribe('RackAssigned', (e) => this.handleRackAssigned(e));
    this.eventBus.subscribe('RackUnassigned', (e) => this.handleRackUnassigned(e));
    this.eventBus.subscribe('RackReassigned', (e) => this.handleRackReassigned(e));
    this.eventBus.subscribe('BoxAssigned', (e) => this.handleBoxAssigned(e));
    this.eventBus.subscribe('BoxUnassigned', (e) => this.handleBoxUnassigned(e));
    this.eventBus.subscribe('BoxReassigned', (e) => this.handleBoxReassigned(e));

    // Label events
    this.eventBus.subscribe('RackLabelUpdated', (e) => this.handleRackLabelUpdated(e));
    this.eventBus.subscribe('BoxLabelUpdated', (e) => this.handleBoxLabelUpdated(e));

    // Bulk assignment events
    this.eventBus.subscribe('BulkResourcesUnassigned', (e) => this.handleBulkResourcesUnassigned(e));
    this.eventBus.subscribe('BulkResourcesReassigned', (e) => this.handleBulkResourcesReassigned(e));

    // User events
    this.eventBus.subscribe('UserCreated', (e) => this.handleUserCreated(e));
    this.eventBus.subscribe('UserPasswordChanged', (e) => this.handleUserPasswordChanged(e));
    this.eventBus.subscribe('UserRoleChanged', (e) => this.handleUserRoleChanged(e));
    this.eventBus.subscribe('UserDeleted', (e) => this.handleUserDeleted(e));
    this.eventBus.subscribe('UserLoggedIn', (e) => this.handleUserLoggedIn(e));
    this.eventBus.subscribe('UserLoggedOut', (e) => this.handleUserLoggedOut(e));
    this.eventBus.subscribe('UserLinkedToResearcher', (e) => this.handleUserLinkedToResearcher(e));
    this.eventBus.subscribe('UserUnlinkedFromResearcher', (e) => this.handleUserUnlinkedFromResearcher(e));
    this.eventBus.subscribe('UserApproved', (e) => this.handleUserApproved(e));

    // Researcher events
    this.eventBus.subscribe('ResearcherCreated', (e) => this.handleResearcherCreated(e));
    this.eventBus.subscribe('ResearcherUpdated', (e) => this.handleResearcherUpdated(e));
    this.eventBus.subscribe('ResearcherDeactivated', (e) => this.handleResearcherDeactivated(e));
    this.eventBus.subscribe('ResearcherReactivated', (e) => this.handleResearcherReactivated(e));
    this.eventBus.subscribe('ResearcherDeleted', (e) => this.handleResearcherDeleted(e));
  }

  // TUBE EVENT HANDLERS

  /**
   * Convert Location to display-friendly string
   * Example: "Main Storage Tank / Top Shelf / Sample Box Alpha / A1"
   */
  private async getDisplayLocation(location: Location): Promise<string> {
    try {
      const config = await this.configurationRepository.getCurrent();
      if (!config) {
        return location.toString();
      }

      // Find tank by ID
      const tank = config.equipment.tanks.find(t => t.id === location.tankId);
      if (!tank) {
        return location.toString();
      }

      // Find rack by ID
      const rack = tank.racks.find(r => r.id === location.rackId);
      if (!rack) {
        return location.toString();
      }

      // Find box by name
      const box = rack.boxes.find(b => b.name.toUpperCase() === location.boxId.toUpperCase());
      if (!box) {
        return location.toString();
      }

      // Get position display based on box configuration
      const positionDisplay = box.formatPosition(location.position);

      return `${tank.name} · ${rack.name} · ${box.name} · ${positionDisplay}`;
    } catch (error) {
      logger.warn('Failed to get display location, using fallback', { error });
      return location.toString();
    }
  }

  /**
   * Handle TubeCreated event
   *
   * Logs tube creation with full sample data and location.
   */
  private async handleTubeCreated(event: TubeCreatedEvent): Promise<void> {
    try {
      // Look up username from user ID
      const user = await this.userRepository.findById(event.createdBy);
      const username = user?.username || event.createdBy;

      // Get display-friendly location
      const displayLocation = await this.getDisplayLocation(event.location);

      await this.auditService.logAction({
        userId: event.createdBy,
        username: username,
        action: 'tube_created',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          location: event.location.toString(),
          displayLocation: displayLocation,
          tankId: event.location.tankId,
          rackId: event.location.rackId,
          boxId: event.location.boxId,
          position: event.location.position,
          cellType: event.sampleData.cellType,
          donorInternalId: event.sampleData.donorInternalId,
          donorSourceId: event.sampleData.donorSourceId,
          concentration: event.sampleData.concentration,
          concentrationUnit: event.sampleData.concentrationUnit,
          media: event.sampleData.media,
          cultureCondition: event.sampleData.cultureCondition,
          lotNumber: event.sampleData.lotNumber,
          notes: event.sampleData.notes,
          createdBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tube created event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId,
      });
    }
  }

  /**
   * Handle TubeUpdated event
   *
   * Logs tube update with field-level changes (before/after values).
   */
  private async handleTubeUpdated(event: TubeUpdatedEvent): Promise<void> {
    try {
      // Look up username from user ID
      const user = await this.userRepository.findById(event.updatedBy);
      const username = user?.username || event.updatedBy;

      // Calculate field-level changes
      const changes: FieldChange[] = [];

      // Location changes
      if (event.oldLocation.toString() !== event.newLocation.toString()) {
        changes.push({
          field: 'location',
          oldValue: event.oldLocation.toString(),
          newValue: event.newLocation.toString(),
        });
      }

      // Sample data changes
      const oldData = event.oldSampleData.toData();
      const newData = event.newSampleData.toData();

      const sampleDataKeys = Object.keys(newData) as Array<keyof typeof newData>;
      sampleDataKeys.forEach(key => {
        const oldValue = oldData[key];
        const newValue = newData[key];
        if (oldValue !== newValue) {
          changes.push({
            field: key,
            oldValue,
            newValue,
          });
        }
      });

      // Get display-friendly location
      const displayLocation = await this.getDisplayLocation(event.newLocation);

      await this.auditService.logAction({
        userId: event.updatedBy,
        username: username,
        action: 'tube_updated',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          changes,
          location: event.newLocation.toString(),
          displayLocation: displayLocation,
          updatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tube updated event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId,
      });
    }
  }

  /**
   * Handle TubeLocationChanged event
   *
   * Logs tube movement between locations.
   */
  private async handleTubeLocationChanged(event: TubeLocationChangedEvent): Promise<void> {
    try {
      // Look up username from user ID
      const user = await this.userRepository.findById(event.movedBy);
      const username = user?.username || event.movedBy;

      // Get display-friendly locations
      const oldDisplayLocation = await this.getDisplayLocation(event.oldLocation);
      const newDisplayLocation = await this.getDisplayLocation(event.newLocation);

      await this.auditService.logAction({
        userId: event.movedBy,
        username: username,
        action: 'tube_moved',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          oldLocation: event.oldLocation.toString(),
          newLocation: event.newLocation.toString(),
          oldDisplayLocation: oldDisplayLocation,
          displayLocation: newDisplayLocation,
          movedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tube location changed event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId,
      });
    }
  }

  /**
   * Handle TubeDeleted event
   *
   * Logs tube deletion with snapshot of data (for potential recovery).
   */
  private async handleTubeDeleted(event: TubeDeletedEvent): Promise<void> {
    try {
      // Look up username from user ID
      const user = await this.userRepository.findById(event.deletedBy);
      const username = user?.username || event.deletedBy;

      // Get display-friendly location
      const displayLocation = await this.getDisplayLocation(event.location);

      await this.auditService.logAction({
        userId: event.deletedBy,
        username: username,
        action: 'tube_deleted',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          location: event.location.toString(),
          displayLocation: displayLocation,
          tankId: event.location.tankId,
          rackId: event.location.rackId,
          boxId: event.location.boxId,
          position: event.location.position,
          cellType: event.sampleSnapshot.cellType,
          donorInternalId: event.sampleSnapshot.donorInternalId,
          donorSourceId: event.sampleSnapshot.donorSourceId,
          deletedBy: username,
          deletedAt: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tube deleted event', {
        error: error instanceof Error ? error.message : String(error),
        tubeId: event.tubeId,
      });
    }
  }

  /**
   * Handle BulkTubesUpdated event
   *
   * Logs bulk tube operations with aggregated summary.
   */
  private async handleBulkTubesUpdated(event: BulkTubesUpdatedEvent): Promise<void> {
    try {
      // Look up username from user ID
      const user = await this.userRepository.findById(event.updatedBy);
      const username = user?.username || event.updatedBy;

      await this.auditService.logAction({
        userId: event.updatedBy,
        username: username,
        action: 'tube_bulk_updated',
        entityType: 'tube',
        // Don't set entityId for bulk operations (affects multiple entities)
        details: {
          tubeIds: event.tubeIds,
          count: event.tubeIds.length,
          changesSummary: event.changesSummary,
          updatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log bulk tubes updated event', {
        error: error instanceof Error ? error.message : String(error),
        tubeCount: event.tubeIds.length,
      });
    }
  }

  // TUBE LOCK EVENT HANDLERS

  /**
   * Resolve usernames for a list of user IDs
   */
  private async resolveUsernames(userIds: string[]): Promise<Array<{ userId: string; username: string }>> {
    const resolved: Array<{ userId: string; username: string }> = [];
    for (const userId of userIds) {
      const user = await this.userRepository.findById(userId);
      resolved.push({
        userId,
        username: user?.username || userId
      });
    }
    return resolved;
  }

  /**
   * Handle TubesLocked event
   *
   * Logs batch tube lock operation with count summary.
   */
  private async handleTubesLocked(event: TubesLockedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.lockedBy);
      const username = user?.username || event.lockedBy;

      await this.auditService.logAction({
        userId: event.lockedBy,
        username: username,
        action: 'tubes_locked',
        entityType: 'tube',
        details: {
          tubeCount: event.tubeIds.length,
          tubeIds: event.tubeIds.slice(0, 10), // First 10 for reference
          hasMore: event.tubeIds.length > 10,
          lockNote: event.lockNote,
          lockedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tubes locked event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length,
      });
    }
  }

  /**
   * Handle TubesUnlocked event
   *
   * Logs batch tube unlock operation with count summary.
   */
  private async handleTubesUnlocked(event: TubesUnlockedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.unlockedBy);
      const username = user?.username || event.unlockedBy;

      await this.auditService.logAction({
        userId: event.unlockedBy,
        username: username,
        action: 'tubes_unlocked',
        entityType: 'tube',
        details: {
          tubeCount: event.tubeIds.length,
          tubeIds: event.tubeIds.slice(0, 10), // First 10 for reference
          hasMore: event.tubeIds.length > 10,
          unlockedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tubes unlocked event', {
        error: error instanceof Error ? error.message : String(error),
        count: event.tubeIds.length,
      });
    }
  }

  /**
   * Handle TubeAccessShared event
   *
   * Logs when tube access is shared with other users.
   * Resolves usernames for better audit readability.
   */
  private async handleTubeAccessShared(event: TubeAccessSharedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.sharedBy);
      const username = user?.username || event.sharedBy;

      // Resolve usernames for shared users
      const sharedWithUsers = await this.resolveUsernames(event.addedUserIds);

      await this.auditService.logAction({
        userId: event.sharedBy,
        username: username,
        action: 'tube_access_shared',
        entityType: 'tube',
        details: {
          tubeCount: event.tubeIds.length,
          tubeIds: event.tubeIds.slice(0, 10), // First 10 for reference
          hasMoreTubes: event.tubeIds.length > 10,
          sharedWithUsers: sharedWithUsers,
          sharedWithCount: event.addedUserIds.length,
          sharedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tube access shared event', {
        error: error instanceof Error ? error.message : String(error),
        tubeIds: event.tubeIds,
      });
    }
  }

  /**
   * Handle TubeAccessRevoked event
   *
   * Logs when tube access is revoked from users.
   * Resolves usernames for better audit readability.
   */
  private async handleTubeAccessRevoked(event: TubeAccessRevokedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.revokedBy);
      const username = user?.username || event.revokedBy;

      // Resolve usernames for revoked users
      const revokedUsers = await this.resolveUsernames(event.revokedUserIds);

      await this.auditService.logAction({
        userId: event.revokedBy,
        username: username,
        action: 'tube_access_revoked',
        entityType: 'tube',
        details: {
          tubeCount: event.tubeIds.length,
          tubeIds: event.tubeIds.slice(0, 10), // First 10 for reference
          hasMoreTubes: event.tubeIds.length > 10,
          revokedUsers: revokedUsers,
          revokedCount: event.revokedUserIds.length,
          revokedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tube access revoked event', {
        error: error instanceof Error ? error.message : String(error),
        tubeIds: event.tubeIds,
      });
    }
  }

  // CONFIGURATION EVENT HANDLERS

  /**
   * Handle TankUpdated event
   *
   * Logs tank property changes (name, isActive).
   */
  private async handleTankUpdated(event: TankUpdatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'tank_updated',
        entityType: 'tank',
        entityId: event.tankId,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          changes: event.changes,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tank updated event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
      });
    }
  }

  /**
   * Handle TankAdded event
   *
   * Logs new tank creation.
   */
  private async handleTankAdded(event: TankAddedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'tank_created',
        entityType: 'tank',
        entityId: event.tankId,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tank added event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
      });
    }
  }

  /**
   * Handle TankDeleted event
   *
   * Logs tank removal.
   */
  private async handleTankDeleted(event: TankDeletedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'tank_deleted',
        entityType: 'tank',
        entityId: event.tankId,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tank deleted event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
      });
    }
  }

  /**
   * Handle RackAdded event
   *
   * Logs when a new rack is added to a tank.
   */
  private async handleRackAdded(event: RackAddedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_created',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack added event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle RackDeleted event
   *
   * Logs when a rack is removed from a tank.
   */
  private async handleRackDeleted(event: RackDeletedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_deleted',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack deleted event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle RackUpdated event
   *
   * Logs rack property changes.
   */
  private async handleRackUpdated(event: RackUpdatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_updated',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          changes: event.changes,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack updated event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle BoxAdded event
   *
   * Logs when a new box is added to a rack.
   */
  private async handleBoxAdded(event: BoxAddedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_created',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box added event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  /**
   * Handle BoxDeleted event
   *
   * Logs when a box is removed from a rack.
   */
  private async handleBoxDeleted(event: BoxDeletedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_deleted',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box deleted event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  /**
   * Handle BoxUpdated event
   *
   * Logs box property changes.
   */
  private async handleBoxUpdated(event: BoxUpdatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_updated',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          changes: event.changes,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box updated event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  /**
   * Handle LabNameChanged event
   *
   * Logs laboratory name changes.
   */
  private async handleLabNameChanged(event: LabNameChangedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'lab_name_changed',
        entityType: 'lab',
        details: {
          oldName: event.oldName,
          newName: event.newName,
          username: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log lab name changed event', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ASSIGNMENT EVENT HANDLERS

  /**
   * Handle RackAssigned event
   *
   * Logs when a rack is assigned to a user (from unassigned state).
   */
  private async handleRackAssigned(event: RackAssignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_assigned',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          previousOwner: null,
          newOwner: {
            userId: event.assignedUserId,
            username: event.assignedUsername,
          },
          assignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack assigned event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle RackUnassigned event
   *
   * Logs when a rack is unassigned (made common).
   */
  private async handleRackUnassigned(event: RackUnassignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_unassigned',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          previousOwner: {
            userId: event.previousUserId,
            username: event.previousUsername,
          },
          newOwner: null,
          unassignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack unassigned event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle RackReassigned event
   *
   * Logs when a rack is reassigned from one user to another.
   */
  private async handleRackReassigned(event: RackReassignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_reassigned',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          previousOwner: {
            userId: event.previousUserId,
            username: event.previousUsername,
          },
          newOwner: {
            userId: event.newUserId,
            username: event.newUsername,
          },
          reassignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack reassigned event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle BoxAssigned event
   *
   * Logs when a box is assigned to a user (from unassigned state).
   */
  private async handleBoxAssigned(event: BoxAssignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_assigned',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          previousOwner: null,
          newOwner: {
            userId: event.assignedUserId,
            username: event.assignedUsername,
          },
          assignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box assigned event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  /**
   * Handle BoxUnassigned event
   *
   * Logs when a box is unassigned (made common).
   */
  private async handleBoxUnassigned(event: BoxUnassignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_unassigned',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          previousOwner: {
            userId: event.previousUserId,
            username: event.previousUsername,
          },
          newOwner: null,
          unassignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box unassigned event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  /**
   * Handle BoxReassigned event
   *
   * Logs when a box is reassigned from one user to another.
   */
  private async handleBoxReassigned(event: BoxReassignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_reassigned',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          previousOwner: {
            userId: event.previousUserId,
            username: event.previousUsername,
          },
          newOwner: {
            userId: event.newUserId,
            username: event.newUsername,
          },
          reassignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box reassigned event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  // LABEL EVENT HANDLERS

  /**
   * Handle RackLabelUpdated event
   *
   * Logs when a rack's custom label is created, updated, or removed.
   */
  private async handleRackLabelUpdated(event: RackLabelUpdatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'rack_label_updated',
        entityType: 'rack',
        entityId: `${event.tankId}-${event.rackId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          oldLabel: event.oldLabel || null,
          newLabel: event.newLabel || null,
          updatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log rack label updated event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
      });
    }
  }

  /**
   * Handle BoxLabelUpdated event
   *
   * Logs when a box's custom label is created, updated, or removed.
   */
  private async handleBoxLabelUpdated(event: BoxLabelUpdatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'box_label_updated',
        entityType: 'box',
        entityId: `${event.tankId}-${event.rackId}-${event.boxId}`,
        details: {
          tankId: event.tankId,
          tankName: event.tankName,
          rackId: event.rackId,
          rackName: event.rackName,
          boxId: event.boxId,
          boxName: event.boxName,
          oldLabel: event.oldLabel || null,
          newLabel: event.newLabel || null,
          updatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log box label updated event', {
        error: error instanceof Error ? error.message : String(error),
        tankId: event.tankId,
        rackId: event.rackId,
        boxId: event.boxId,
      });
    }
  }

  // BULK ASSIGNMENT EVENT HANDLERS

  /**
   * Handle BulkResourcesUnassigned event
   *
   * Logs when multiple resources are unassigned from a user at once.
   */
  private async handleBulkResourcesUnassigned(event: BulkResourcesUnassignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'resources_bulk_unassigned',
        entityType: 'configuration',
        details: {
          fromUser: {
            userId: event.fromUserId,
            username: event.fromUsername,
          },
          racksAffected: event.racksAffected,
          boxesAffected: event.boxesAffected,
          unassignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log bulk resources unassigned event', {
        error: error instanceof Error ? error.message : String(error),
        fromUserId: event.fromUserId,
      });
    }
  }

  /**
   * Handle BulkResourcesReassigned event
   *
   * Logs when multiple resources are reassigned from one user to another.
   */
  private async handleBulkResourcesReassigned(event: BulkResourcesReassignedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      const username = user?.username || event.userId;

      await this.auditService.logAction({
        userId: event.userId,
        username: username,
        action: 'resources_bulk_reassigned',
        entityType: 'configuration',
        details: {
          fromUser: {
            userId: event.fromUserId,
            username: event.fromUsername,
          },
          toUser: {
            userId: event.toUserId,
            username: event.toUsername,
          },
          racksAffected: event.racksAffected,
          boxesAffected: event.boxesAffected,
          reassignedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log bulk resources reassigned event', {
        error: error instanceof Error ? error.message : String(error),
        fromUserId: event.fromUserId,
        toUserId: event.toUserId,
      });
    }
  }

  // RESEARCHER EVENT HANDLERS

  private async handleResearcherCreated(event: ResearcherCreatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.createdBy);
      const username = user?.username || event.createdBy;
      const fullName = `${event.firstName} ${event.lastName}`;

      await this.auditService.logAction({
        userId: event.createdBy,
        username: username,
        action: 'researcher_created',
        entityType: 'researcher',
        entityId: event.researcherId,
        details: {
          researcherId: event.researcherId,
          researcherName: fullName,
          email: event.email,
          position: event.position,
          createdBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log researcher created event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId,
      });
    }
  }

  private async handleResearcherUpdated(event: ResearcherUpdatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.updatedBy);
      const username = user?.username || event.updatedBy;
      const fullName = `${event.firstName} ${event.lastName}`;

      await this.auditService.logAction({
        userId: event.updatedBy,
        username: username,
        action: 'researcher_updated',
        entityType: 'researcher',
        entityId: event.researcherId,
        details: {
          researcherId: event.researcherId,
          researcherName: fullName,
          changes: event.changes,
          updatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log researcher updated event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId,
      });
    }
  }

  private async handleResearcherDeactivated(event: ResearcherDeactivatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.deactivatedBy);
      const username = user?.username || event.deactivatedBy;
      const fullName = `${event.firstName} ${event.lastName}`;

      await this.auditService.logAction({
        userId: event.deactivatedBy,
        username: username,
        action: 'researcher_deactivated',
        entityType: 'researcher',
        entityId: event.researcherId,
        details: {
          researcherId: event.researcherId,
          researcherName: fullName,
          tubesReassignedCount: event.tubesReassignedCount,
          deactivatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log researcher deactivated event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId,
      });
    }
  }

  private async handleResearcherReactivated(event: ResearcherReactivatedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.reactivatedBy);
      const username = user?.username || event.reactivatedBy;
      const fullName = `${event.firstName} ${event.lastName}`;

      await this.auditService.logAction({
        userId: event.reactivatedBy,
        username: username,
        action: 'researcher_reactivated',
        entityType: 'researcher',
        entityId: event.researcherId,
        details: {
          researcherId: event.researcherId,
          researcherName: fullName,
          reactivatedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log researcher reactivated event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId,
      });
    }
  }

  private async handleResearcherDeleted(event: ResearcherDeletedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.deletedBy);
      const username = user?.username || event.deletedBy;
      const fullName = `${event.firstName} ${event.lastName}`;

      await this.auditService.logAction({
        userId: event.deletedBy,
        username: username,
        action: 'researcher_deleted',
        entityType: 'researcher',
        entityId: event.researcherId,
        details: {
          researcherId: event.researcherId,
          researcherName: fullName,
          deletedBy: username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log researcher deleted event', {
        error: error instanceof Error ? error.message : String(error),
        researcherId: event.researcherId,
      });
    }
  }

  // USER EVENT HANDLERS

  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      await this.auditService.logAction({
        userId: event.userId,
        username: event.username,
        action: 'user_created',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          role: event.role.value,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user created event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserPasswordChanged(event: UserPasswordChangedEvent): Promise<void> {
    try {
      const changedByUser = await this.userRepository.findById(event.changedBy);
      const changedByUsername = changedByUser?.username || event.changedBy;

      await this.auditService.logAction({
        userId: event.changedBy,
        username: changedByUsername,
        action: 'user_password_changed',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          changedBy: changedByUsername,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user password changed event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserRoleChanged(event: UserRoleChangedEvent): Promise<void> {
    try {
      const changedByUser = await this.userRepository.findById(event.changedBy);
      const changedByUsername = changedByUser?.username || event.changedBy;

      await this.auditService.logAction({
        userId: event.changedBy,
        username: changedByUsername,
        action: 'user_role_changed',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          oldRole: event.oldRole.value,
          newRole: event.newRole.value,
          changedBy: changedByUsername,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user role changed event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    try {
      const deletedByUser = await this.userRepository.findById(event.deletedBy);
      const deletedByUsername = deletedByUser?.username || event.deletedBy;

      await this.auditService.logAction({
        userId: event.deletedBy,
        username: deletedByUsername,
        action: 'user_deleted',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          deletedBy: deletedByUsername,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user deleted event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    try {
      await this.auditService.logAction({
        userId: event.userId,
        username: event.username,
        action: 'user_logged_in',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user logged in event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserLoggedOut(event: UserLoggedOutEvent): Promise<void> {
    try {
      await this.auditService.logAction({
        userId: event.userId,
        username: event.username,
        action: 'user_logged_out',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user logged out event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserLinkedToResearcher(event: UserLinkedToResearcherEvent): Promise<void> {
    try {
      const linkedByUser = await this.userRepository.findById(event.linkedBy);
      const linkedByUsername = linkedByUser?.username || event.linkedBy;

      await this.auditService.logAction({
        userId: event.linkedBy,
        username: linkedByUsername,
        action: 'user_linked_to_researcher',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          researcherId: event.researcherId,
          researcherName: event.researcherName,
          linkedBy: linkedByUsername,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user linked to researcher event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserUnlinkedFromResearcher(event: UserUnlinkedFromResearcherEvent): Promise<void> {
    try {
      const unlinkedByUser = await this.userRepository.findById(event.unlinkedBy);
      const unlinkedByUsername = unlinkedByUser?.username || event.unlinkedBy;

      await this.auditService.logAction({
        userId: event.unlinkedBy,
        username: unlinkedByUsername,
        action: 'user_unlinked_from_researcher',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          researcherId: event.researcherId,
          researcherName: event.researcherName,
          unlinkedBy: unlinkedByUsername,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user unlinked from researcher event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

  private async handleUserApproved(event: UserApprovedEvent): Promise<void> {
    try {
      const approvedByUser = await this.userRepository.findById(event.approvedBy);
      const approvedByUsername = approvedByUser?.username || event.approvedBy;

      await this.auditService.logAction({
        userId: event.approvedBy,
        username: approvedByUsername,
        action: 'user_approved',
        entityType: 'user',
        entityId: event.userId,
        details: {
          username: event.username,
          approvedBy: approvedByUsername,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to log user approved event', {
        error: error instanceof Error ? error.message : String(error),
        userId: event.userId,
      });
    }
  }

}
