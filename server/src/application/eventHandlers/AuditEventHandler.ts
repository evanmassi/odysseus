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
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent
} from '@domain/events/UserEvents';
import {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent
} from '@domain/events/ResearcherEvents';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { Location } from '@domain/valueObjects/Location';
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
   * Subscribe to all relevant domain events
   *
   * Called during application startup to register event handlers.
   */
  private subscribeToEvents(): void {
    // Tube events
    this.eventBus.subscribe('TubeCreated', this.handleTubeCreated.bind(this) as any);
    this.eventBus.subscribe('TubeUpdated', this.handleTubeUpdated.bind(this) as any);
    this.eventBus.subscribe('TubeLocationChanged', this.handleTubeLocationChanged.bind(this) as any);
    this.eventBus.subscribe('TubeDeleted', this.handleTubeDeleted.bind(this) as any);
    this.eventBus.subscribe('BulkTubesUpdated', this.handleBulkTubesUpdated.bind(this) as any);

    // Configuration events
    this.eventBus.subscribe('TankUpdated', this.handleTankUpdated.bind(this) as any);
    this.eventBus.subscribe('TankAdded', this.handleTankAdded.bind(this) as any);
    this.eventBus.subscribe('TankDeleted', this.handleTankDeleted.bind(this) as any);
    this.eventBus.subscribe('RackAdded', this.handleRackAdded.bind(this) as any);
    this.eventBus.subscribe('RackDeleted', this.handleRackDeleted.bind(this) as any);
    this.eventBus.subscribe('RackUpdated', this.handleRackUpdated.bind(this) as any);
    this.eventBus.subscribe('BoxAdded', this.handleBoxAdded.bind(this) as any);
    this.eventBus.subscribe('BoxDeleted', this.handleBoxDeleted.bind(this) as any);
    this.eventBus.subscribe('BoxUpdated', this.handleBoxUpdated.bind(this) as any);
    this.eventBus.subscribe('LabNameChanged', this.handleLabNameChanged.bind(this) as any);

    // User events
    this.eventBus.subscribe('UserCreated', this.handleUserCreated.bind(this) as any);
    this.eventBus.subscribe('UserPasswordChanged', this.handleUserPasswordChanged.bind(this) as any);
    this.eventBus.subscribe('UserRoleChanged', this.handleUserRoleChanged.bind(this) as any);
    this.eventBus.subscribe('UserDeleted', this.handleUserDeleted.bind(this) as any);
    this.eventBus.subscribe('UserLoggedIn', this.handleUserLoggedIn.bind(this) as any);
    this.eventBus.subscribe('UserLoggedOut', this.handleUserLoggedOut.bind(this) as any);
    this.eventBus.subscribe('UserLinkedToResearcher', this.handleUserLinkedToResearcher.bind(this) as any);
    this.eventBus.subscribe('UserUnlinkedFromResearcher', this.handleUserUnlinkedFromResearcher.bind(this) as any);

    // Researcher events
    this.eventBus.subscribe('ResearcherCreated', this.handleResearcherCreated.bind(this) as any);
    this.eventBus.subscribe('ResearcherUpdated', this.handleResearcherUpdated.bind(this) as any);
    this.eventBus.subscribe('ResearcherDeactivated', this.handleResearcherDeactivated.bind(this) as any);
    this.eventBus.subscribe('ResearcherReactivated', this.handleResearcherReactivated.bind(this) as any);

    logger.info('AuditEventHandler subscribed to domain events');
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

      return `${tank.name} / ${rack.name} / ${box.name} / ${positionDisplay}`;
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
      const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

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

      Object.keys(newData).forEach(key => {
        const oldValue = (oldData as any)[key];
        const newValue = (newData as any)[key];
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

  /**
   * Unsubscribe from all events (cleanup)
   *
   * Called during application shutdown.
   */
  public cleanup(): void {
    this.eventBus.unsubscribe('TubeCreated', this.handleTubeCreated.bind(this) as any);
    this.eventBus.unsubscribe('TubeUpdated', this.handleTubeUpdated.bind(this) as any);
    this.eventBus.unsubscribe('TubeLocationChanged', this.handleTubeLocationChanged.bind(this) as any);
    this.eventBus.unsubscribe('TubeDeleted', this.handleTubeDeleted.bind(this) as any);
    this.eventBus.unsubscribe('BulkTubesUpdated', this.handleBulkTubesUpdated.bind(this) as any);

    this.eventBus.unsubscribe('TankUpdated', this.handleTankUpdated.bind(this) as any);
    this.eventBus.unsubscribe('TankAdded', this.handleTankAdded.bind(this) as any);
    this.eventBus.unsubscribe('TankDeleted', this.handleTankDeleted.bind(this) as any);
    this.eventBus.unsubscribe('RackAdded', this.handleRackAdded.bind(this) as any);
    this.eventBus.unsubscribe('RackDeleted', this.handleRackDeleted.bind(this) as any);
    this.eventBus.unsubscribe('RackUpdated', this.handleRackUpdated.bind(this) as any);
    this.eventBus.unsubscribe('BoxAdded', this.handleBoxAdded.bind(this) as any);
    this.eventBus.unsubscribe('BoxDeleted', this.handleBoxDeleted.bind(this) as any);
    this.eventBus.unsubscribe('BoxUpdated', this.handleBoxUpdated.bind(this) as any);
    this.eventBus.unsubscribe('LabNameChanged', this.handleLabNameChanged.bind(this) as any);

    this.eventBus.unsubscribe('UserCreated', this.handleUserCreated.bind(this) as any);
    this.eventBus.unsubscribe('UserPasswordChanged', this.handleUserPasswordChanged.bind(this) as any);
    this.eventBus.unsubscribe('UserRoleChanged', this.handleUserRoleChanged.bind(this) as any);
    this.eventBus.unsubscribe('UserDeleted', this.handleUserDeleted.bind(this) as any);
    this.eventBus.unsubscribe('UserLoggedIn', this.handleUserLoggedIn.bind(this) as any);
    this.eventBus.unsubscribe('UserLoggedOut', this.handleUserLoggedOut.bind(this) as any);
    this.eventBus.unsubscribe('UserLinkedToResearcher', this.handleUserLinkedToResearcher.bind(this) as any);
    this.eventBus.unsubscribe('UserUnlinkedFromResearcher', this.handleUserUnlinkedFromResearcher.bind(this) as any);

    this.eventBus.unsubscribe('ResearcherCreated', this.handleResearcherCreated.bind(this) as any);
    this.eventBus.unsubscribe('ResearcherUpdated', this.handleResearcherUpdated.bind(this) as any);
    this.eventBus.unsubscribe('ResearcherDeactivated', this.handleResearcherDeactivated.bind(this) as any);
    this.eventBus.unsubscribe('ResearcherReactivated', this.handleResearcherReactivated.bind(this) as any);

    logger.info('AuditEventHandler unsubscribed from events');
  }
}
