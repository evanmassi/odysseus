import type { EventBus } from '@application/contracts/EventBus';
import { AuditService } from '@application/services/AuditService';
import {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeLocationChangedEvent,
  TubeDeletedEvent,
  BulkTubesUpdatedEvent,
} from '@domain/events/TubeEvents';
import { UserRepository } from '@domain/repositories/UserRepository';
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
    private userRepository: UserRepository
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

    logger.info('AuditEventHandler subscribed to domain events');
  }

  // TUBE EVENT HANDLERS

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

      await this.auditService.logAction({
        userId: event.createdBy,
        username: username,
        action: 'tube_created',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          location: event.location.toString(),
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

      await this.auditService.logAction({
        userId: event.updatedBy,
        username: username,
        action: 'tube_updated',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          changes,
          location: event.newLocation.toString(),
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

      await this.auditService.logAction({
        userId: event.movedBy,
        username: username,
        action: 'tube_moved',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          oldLocation: event.oldLocation.toString(),
          newLocation: event.newLocation.toString(),
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

      await this.auditService.logAction({
        userId: event.deletedBy,
        username: username,
        action: 'tube_deleted',
        entityType: 'tube',
        entityId: event.tubeId,
        details: {
          location: event.location.toString(),
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

    logger.info('AuditEventHandler unsubscribed from events');
  }
}
