/**
 * Domain Event Audit Logger
 *
 * Subscribes to domain events and persists them as audit log entries.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { AuditService, LogActionParams } from '@application/services/AuditService';
import type {
  ConsumableProductCreatedEvent,
  ConsumableProductUpdatedEvent,
  ConsumableProductArchivedEvent,
  ConsumableProductDeletedEvent,
  ConsumableCategoryCreatedEvent,
  ConsumableCategoryUpdatedEvent,
  ConsumableCategoryDeletedEvent,
  ConsumableDocumentAddedEvent,
  ConsumableDocumentRemovedEvent,
  ConsumableStockReceivedEvent,
  ConsumableStockConsumedEvent,
  ConsumableStockCountAdjustedEvent,
  ConsumableStockDisposedEvent,
  ConsumableBulkReceivedEvent,
  ConsumableBulkConsumedEvent,
  ConsumableBulkCategoryReassignedEvent,
  ConsumableBulkArchivedEvent,
} from '@domain/events/ConsumableEvents';
import type {
  DonorCreatedEvent,
  DonorUpdatedEvent,
  DonorDeletedEvent,
} from '@domain/events/DonorEvents';
import type {
  EquipmentItemCreatedEvent,
  EquipmentItemUpdatedEvent,
  EquipmentItemDecommissionedEvent,
  EquipmentItemDeletedEvent,
  EquipmentCategoryCreatedEvent,
  EquipmentCategoryUpdatedEvent,
  EquipmentCategoryDeletedEvent,
  EquipmentDocumentAddedEvent,
  EquipmentDocumentRemovedEvent,
  EquipmentMaintenanceLoggedEvent,
  EquipmentMaintenanceUpdatedEvent,
  EquipmentMaintenanceDeletedEvent,
  EquipmentBulkMaintenanceLoggedEvent,
  EquipmentBulkStatusChangedEvent,
  EquipmentBulkRelocatedEvent,
} from '@domain/events/EquipmentEvents';
import type {
  LabCreatedEvent,
  LabRenamedEvent,
  LabActivatedEvent,
  LabDeactivatedEvent,
  InviteCodeCreatedEvent,
  InviteCodeUsedEvent
} from '@domain/events/LabEvents';
import type {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent,
  ResearcherApprovedEvent
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
} from '@domain/events/StorageEvents';
import type {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeLocationChangedEvent,
  TubeDeletedEvent,
  BulkTubesCreatedEvent,
  BulkTubesUpdatedEvent,
  BulkTubesDeletedEvent,
  BulkTubesMovedEvent,
} from '@domain/events/TubeEvents';
import type {
  TubesLockedEvent,
  TubesUnlockedEvent,
  TubeAccessSharedEvent,
  TubeAccessRevokedEvent,
} from '@domain/events/TubeLockEvents';
import type {
  UserCreatedEvent,
  UserPasswordChangedEvent,
  UserRoleChangedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  UserLoginFailedEvent,
  UserLoggedOutEvent,
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent,
  UserDeactivatedEvent,
  UserSuspendedEvent,
  UserReactivatedEvent,
} from '@domain/events/UserEvents';
import type { DonorRepository } from '@domain/repositories/DonorRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import type { Location } from '@domain/value-objects/Location';
import { logger } from '@infrastructure/logging/logger';

export class AuditEventHandler {
  constructor(
    private auditService: AuditService,
    private eventBus: EventBus,
    private userRepository: UserRepository,
    private storageRepository: StorageRepository,
    private labRepository: LabRepository,
    private donorRepository: DonorRepository
  ) {
    this.subscribeToEvents();
  }

  private async resolveDonorLabel(donorId: string): Promise<{ donorSourceId?: string; donorInternalId?: string }> {
    const donor = await this.donorRepository.findById(donorId);
    return {
      donorSourceId: donor?.donorSourceId,
      donorInternalId: donor?.donorInternalId,
    };
  }

  private async resolveLabName(labId: string): Promise<string> {
    const lab = await this.labRepository.findById(labId);
    return lab?.name ?? labId;
  }

  private async resolveUser(userId: string): Promise<{ username: string; isDemo: boolean }> {
    const user = await this.userRepository.findById(userId);
    return {
      username: user?.username ?? userId,
      isDemo: user?.isDemo ?? false
    };
  }

  private async safeLogAudit(
    eventName: string,
    context: Record<string, unknown>,
    fn: () => Promise<void>
  ): Promise<void> {
    try {
      await fn();
    } catch (error) {
      logger.error(`Failed to log ${eventName} event`, {
        error: error instanceof Error ? error.message : String(error),
        ...context,
      });
    }
  }

  /** Skips logging for demo lab users to keep audit logs clean. */
  private async logAuditEvent(params: {
    eventName: string;
    context: Record<string, unknown>;
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string;
    occurredOn: Date;
    labId?: string;
    buildDetails: (username: string) => Record<string, unknown> | Promise<Record<string, unknown>>;
  }): Promise<void> {
    await this.safeLogAudit(params.eventName, params.context, async () => {
      const { username, isDemo } = await this.resolveUser(params.actorId);

      if (isDemo) {
        return;
      }

      const details = await params.buildDetails(username);
      await this.auditService.logAction({
        userId: params.actorId,
        username,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        labId: params.labId,
        details: {
          ...details,
          timestamp: params.occurredOn.toISOString(),
        },
      });
    });
  }

  private subscribeToEvents(): void {
    // Tube events
    this.eventBus.subscribe('TubeCreated', (e) => this.handleTubeCreated(e));
    this.eventBus.subscribe('TubeUpdated', (e) => this.handleTubeUpdated(e));
    this.eventBus.subscribe('TubeLocationChanged', (e) => this.handleTubeLocationChanged(e));
    this.eventBus.subscribe('TubeDeleted', (e) => this.handleTubeDeleted(e));
    this.eventBus.subscribe('BulkTubesCreated', (e) => this.handleBulkTubesCreated(e));
    this.eventBus.subscribe('BulkTubesUpdated', (e) => this.handleBulkTubesUpdated(e));
    this.eventBus.subscribe('BulkTubesDeleted', (e) => this.handleBulkTubesDeleted(e));
    this.eventBus.subscribe('BulkTubesMoved', (e) => this.handleBulkTubesMoved(e));

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
    this.eventBus.subscribe('UserLoginFailed', (e) => this.handleUserLoginFailed(e));
    this.eventBus.subscribe('UserLoggedOut', (e) => this.handleUserLoggedOut(e));
    this.eventBus.subscribe('UserLinkedToResearcher', (e) => this.handleUserLinkedToResearcher(e));
    this.eventBus.subscribe('UserUnlinkedFromResearcher', (e) => this.handleUserUnlinkedFromResearcher(e));
    this.eventBus.subscribe('UserDeactivated', (e) => this.handleUserDeactivated(e));
    this.eventBus.subscribe('UserSuspended', (e) => this.handleUserSuspended(e));
    this.eventBus.subscribe('UserReactivated', (e) => this.handleUserReactivated(e));

    // Researcher events
    this.eventBus.subscribe('ResearcherCreated', (e) => this.handleResearcherCreated(e));
    this.eventBus.subscribe('ResearcherUpdated', (e) => this.handleResearcherUpdated(e));
    this.eventBus.subscribe('ResearcherDeactivated', (e) => this.handleResearcherDeactivated(e));
    this.eventBus.subscribe('ResearcherReactivated', (e) => this.handleResearcherReactivated(e));
    this.eventBus.subscribe('ResearcherDeleted', (e) => this.handleResearcherDeleted(e));
    this.eventBus.subscribe('ResearcherApproved', (e) => this.handleResearcherApproved(e));

    // Donor events
    this.eventBus.subscribe('DonorCreated', (e) => this.handleDonorCreated(e));
    this.eventBus.subscribe('DonorUpdated', (e) => this.handleDonorUpdated(e));
    this.eventBus.subscribe('DonorDeleted', (e) => this.handleDonorDeleted(e));

    // Equipment events
    this.eventBus.subscribe('EquipmentItemCreated', (e) => this.handleEquipmentItemCreated(e));
    this.eventBus.subscribe('EquipmentItemUpdated', (e) => this.handleEquipmentItemUpdated(e));
    this.eventBus.subscribe('EquipmentItemDecommissioned', (e) => this.handleEquipmentItemDecommissioned(e));
    this.eventBus.subscribe('EquipmentItemDeleted', (e) => this.handleEquipmentItemDeleted(e));
    this.eventBus.subscribe('EquipmentMaintenanceLogged', (e) => this.handleEquipmentMaintenanceLogged(e));
    this.eventBus.subscribe('EquipmentMaintenanceUpdated', (e) => this.handleEquipmentMaintenanceUpdated(e));
    this.eventBus.subscribe('EquipmentMaintenanceDeleted', (e) => this.handleEquipmentMaintenanceDeleted(e));
    this.eventBus.subscribe('EquipmentCategoryCreated', (e) => this.handleEquipmentCategoryCreated(e));
    this.eventBus.subscribe('EquipmentCategoryUpdated', (e) => this.handleEquipmentCategoryUpdated(e));
    this.eventBus.subscribe('EquipmentCategoryDeleted', (e) => this.handleEquipmentCategoryDeleted(e));
    this.eventBus.subscribe('EquipmentDocumentAdded', (e) => this.handleEquipmentDocumentAdded(e));
    this.eventBus.subscribe('EquipmentDocumentRemoved', (e) => this.handleEquipmentDocumentRemoved(e));
    this.eventBus.subscribe('EquipmentBulkMaintenanceLogged', (e) => this.handleEquipmentBulkMaintenanceLogged(e));
    this.eventBus.subscribe('EquipmentBulkStatusChanged', (e) => this.handleEquipmentBulkStatusChanged(e));
    this.eventBus.subscribe('EquipmentBulkRelocated', (e) => this.handleEquipmentBulkRelocated(e));

    // Consumable events
    this.eventBus.subscribe('ConsumableProductCreated', (e) => this.handleConsumableProductCreated(e));
    this.eventBus.subscribe('ConsumableProductUpdated', (e) => this.handleConsumableProductUpdated(e));
    this.eventBus.subscribe('ConsumableProductArchived', (e) => this.handleConsumableProductArchived(e));
    this.eventBus.subscribe('ConsumableProductDeleted', (e) => this.handleConsumableProductDeleted(e));
    this.eventBus.subscribe('ConsumableCategoryCreated', (e) => this.handleConsumableCategoryCreated(e));
    this.eventBus.subscribe('ConsumableCategoryUpdated', (e) => this.handleConsumableCategoryUpdated(e));
    this.eventBus.subscribe('ConsumableCategoryDeleted', (e) => this.handleConsumableCategoryDeleted(e));
    this.eventBus.subscribe('ConsumableDocumentAdded', (e) => this.handleConsumableDocumentAdded(e));
    this.eventBus.subscribe('ConsumableDocumentRemoved', (e) => this.handleConsumableDocumentRemoved(e));
    this.eventBus.subscribe('ConsumableStockReceived', (e) => this.handleConsumableStockReceived(e));
    this.eventBus.subscribe('ConsumableStockConsumed', (e) => this.handleConsumableStockConsumed(e));
    this.eventBus.subscribe('ConsumableStockCountAdjusted', (e) => this.handleConsumableStockCountAdjusted(e));
    this.eventBus.subscribe('ConsumableStockDisposed', (e) => this.handleConsumableStockDisposed(e));
    this.eventBus.subscribe('ConsumableBulkReceived', (e) => this.handleConsumableBulkReceived(e));
    this.eventBus.subscribe('ConsumableBulkConsumed', (e) => this.handleConsumableBulkConsumed(e));
    this.eventBus.subscribe('ConsumableBulkCategoryReassigned', (e) => this.handleConsumableBulkCategoryReassigned(e));
    this.eventBus.subscribe('ConsumableBulkArchived', (e) => this.handleConsumableBulkArchived(e));

    // Lab events
    this.eventBus.subscribe('LabCreated', (e) => this.handleLabCreated(e));
    this.eventBus.subscribe('LabRenamed', (e) => this.handleLabRenamed(e));
    this.eventBus.subscribe('LabActivated', (e) => this.handleLabActivated(e));
    this.eventBus.subscribe('LabDeactivated', (e) => this.handleLabDeactivated(e));
    this.eventBus.subscribe('InviteCodeCreated', (e) => this.handleInviteCodeCreated(e));
    this.eventBus.subscribe('InviteCodeUsed', (e) => this.handleInviteCodeUsed(e));
  }

  // TUBE EVENT HANDLERS

  private async getDisplayLocation(location: Location, labId: string): Promise<string> {
    try {
      const config = await this.storageRepository.getForLab(labId);
      if (!config) return location.toString();

      const tank = config.equipment.tanks.find(t => t.id === location.tankId);
      if (!tank) return location.toString();

      const rack = tank.racks.find(r => r.id === location.rackId);
      if (!rack) return location.toString();

      const box = rack.boxes.find(b => b.name.toUpperCase() === location.boxId.toUpperCase());
      if (!box) return location.toString();

      const positionDisplay = box.formatPosition(location.position);
      return `${tank.name} · ${rack.name} · ${box.name} · ${positionDisplay}`;
    } catch (error) {
      logger.warn('Failed to get display location, using fallback', { error });
      return location.toString();
    }
  }

  private async handleTubeCreated(event: TubeCreatedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'tube created',
      context: { tubeId: event.tubeId },
      actorId: event.createdBy,
      action: 'tube_created',
      entityType: 'tube',
      entityId: event.tubeId,
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: async (username) => {
        const displayLocation = await this.getDisplayLocation(event.location, event.labId!);
        return {
          location: event.location.toString(),
          displayLocation,
          tankId: event.location.tankId,
          rackId: event.location.rackId,
          boxId: event.location.boxId,
          position: event.location.position,
          cellType: event.sampleData.cellType,
          donorInternalId: event.sampleData.donorInternalId,
          donorSourceId: event.sampleData.donorSourceId,
          concentration: event.sampleData.concentration,
          concentrationUnit: event.sampleData.concentrationUnit,
          mediaType: event.sampleData.mediaType,
          mediaSupplements: event.sampleData.mediaSupplements,
          mediaSelection: event.sampleData.mediaSelection,
          cultureCondition: event.sampleData.cultureCondition,
          lotNumber: event.sampleData.lotNumber,
          notes: event.sampleData.notes,
          createdBy: username,
        };
      },
    });
  }

  private async handleTubeUpdated(event: TubeUpdatedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'tube updated', context: { tubeId: event.tubeId },
      actorId: event.updatedBy, action: 'tube_updated', entityType: 'tube',
      entityId: event.tubeId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: async (username) => {
        const changes: FieldChange[] = [];

        if (event.oldLocation.toString() !== event.newLocation.toString()) {
          changes.push({
            field: 'location',
            oldValue: event.oldLocation.toString(),
            newValue: event.newLocation.toString(),
          });
        }

        const oldData = event.oldSampleData.toData();
        const newData = event.newSampleData.toData();
        const sampleDataKeys = Object.keys(newData) as Array<keyof typeof newData>;
        sampleDataKeys.forEach(key => {
          const oldValue = oldData[key];
          const newValue = newData[key];
          if (oldValue !== newValue) {
            changes.push({ field: key, oldValue, newValue });
          }
        });

        const displayLocation = await this.getDisplayLocation(event.newLocation, event.labId!);

        return {
          changes,
          location: event.newLocation.toString(),
          displayLocation,
          updatedBy: username,
        };
      },
    });
  }

  private async handleTubeLocationChanged(event: TubeLocationChangedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'tube location changed', context: { tubeId: event.tubeId },
      actorId: event.movedBy, action: 'tube_moved', entityType: 'tube',
      entityId: event.tubeId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: async (username) => {
        const oldDisplayLocation = await this.getDisplayLocation(event.oldLocation, event.labId!);
        const newDisplayLocation = await this.getDisplayLocation(event.newLocation, event.labId!);

        return {
          oldLocation: event.oldLocation.toString(),
          newLocation: event.newLocation.toString(),
          oldDisplayLocation,
          displayLocation: newDisplayLocation,
          movedBy: username,
        };
      },
    });
  }

  private async handleTubeDeleted(event: TubeDeletedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'tube deleted',
      context: { tubeId: event.tubeId },
      actorId: event.deletedBy,
      action: 'tube_deleted',
      entityType: 'tube',
      entityId: event.tubeId,
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: async (username) => {
        const displayLocation = await this.getDisplayLocation(event.location, event.labId!);
        return {
          location: event.location.toString(),
          displayLocation,
          tankId: event.location.tankId,
          rackId: event.location.rackId,
          boxId: event.location.boxId,
          position: event.location.position,
          cellType: event.sampleData.cellType ?? '',
          donorInternalId: event.sampleData.donorInternalId ?? '',
          donorSourceId: event.sampleData.donorSourceId ?? '',
          deletedBy: username,
          deletedAt: event.occurredOn.toISOString(),
        };
      },
    });
  }

  private async handleBulkTubesCreated(event: BulkTubesCreatedEvent): Promise<void> {
    await this.safeLogAudit('bulk tubes created', { count: event.tubeIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.createdBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.perItemData.map(item => ({
        userId: event.createdBy,
        username,
        action: 'tube_created',
        entityType: 'tube',
        entityId: item.tubeId,
        labId: event.labId,
        details: {
          location: `${item.location.tankId}/${item.location.rackId}/${item.location.boxId}/${item.location.position}`,
          cellType: item.sampleData.cellType ?? '',
          donorInternalId: item.sampleData.donorInternalId ?? '',
          donorSourceId: item.sampleData.donorSourceId ?? '',
          createdBy: username,
          timestamp,
        },
      }));

      entries.push({
        userId: event.createdBy,
        username,
        action: 'tube_bulk_created',
        entityType: 'tube',
        labId: event.labId,
        details: { count: event.tubeIds.length, createdBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleBulkTubesUpdated(event: BulkTubesUpdatedEvent): Promise<void> {
    await this.safeLogAudit('bulk tubes updated', { count: event.tubeIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.updatedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.perItemData.map(item => ({
        userId: event.updatedBy,
        username,
        action: 'tube_updated',
        entityType: 'tube',
        entityId: item.tubeId,
        labId: event.labId,
        details: {
          changes: item.changes,
          location: `${item.location.tankId}/${item.location.rackId}/${item.location.boxId}/${item.location.position}`,
          updatedBy: username,
          timestamp,
        },
      }));

      entries.push({
        userId: event.updatedBy,
        username,
        action: 'tube_bulk_updated',
        entityType: 'tube',
        labId: event.labId,
        details: { count: event.tubeIds.length, changesSummary: event.changesSummary, updatedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleBulkTubesDeleted(event: BulkTubesDeletedEvent): Promise<void> {
    await this.safeLogAudit('bulk tubes deleted', { count: event.tubeIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.deletedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.perItemData.map(item => ({
        userId: event.deletedBy,
        username,
        action: 'tube_deleted',
        entityType: 'tube',
        entityId: item.tubeId,
        labId: event.labId,
        details: {
          location: `${item.location.tankId}/${item.location.rackId}/${item.location.boxId}/${item.location.position}`,
          cellType: item.sampleData.cellType ?? '',
          donorInternalId: item.sampleData.donorInternalId ?? '',
          donorSourceId: item.sampleData.donorSourceId ?? '',
          deletedBy: username,
          timestamp,
        },
      }));

      entries.push({
        userId: event.deletedBy,
        username,
        action: 'tube_bulk_deleted',
        entityType: 'tube',
        labId: event.labId,
        details: { count: event.tubeIds.length, deletedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleBulkTubesMoved(event: BulkTubesMovedEvent): Promise<void> {
    await this.safeLogAudit('bulk tubes moved', { count: event.tubeIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.movedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.perItemData.map(item => ({
        userId: event.movedBy,
        username,
        action: 'tube_moved',
        entityType: 'tube',
        entityId: item.tubeId,
        labId: event.labId,
        details: {
          oldLocation: `${item.oldLocation.tankId}/${item.oldLocation.rackId}/${item.oldLocation.boxId}/${item.oldLocation.position}`,
          newLocation: `${item.newLocation.tankId}/${item.newLocation.rackId}/${item.newLocation.boxId}/${item.newLocation.position}`,
          movedBy: username,
          timestamp,
        },
      }));

      entries.push({
        userId: event.movedBy,
        username,
        action: 'tube_bulk_moved',
        entityType: 'tube',
        labId: event.labId,
        details: { count: event.tubeIds.length, movedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  // TUBE LOCK EVENT HANDLERS

  private async resolveUsernames(userIds: string[]): Promise<Array<{ userId: string; username: string }>> {
    if (userIds.length === 0) return [];
    const users = await this.userRepository.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u.username]));
    return userIds.map(id => ({ userId: id, username: userMap.get(id) ?? id }));
  }

  private async handleTubesLocked(event: TubesLockedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tubes locked',
      context: { count: event.tubeIds.length },
      actorId: event.lockedBy,
      action: 'tubes_locked',
      entityType: 'tube',
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: (username) => ({
        tubeCount: event.tubeIds.length,
        tubeIds: event.tubeIds.slice(0, 10),
        hasMore: event.tubeIds.length > 10,
        lockNote: event.lockNote,
        lockedBy: username,
      }),
    });
  }

  private async handleTubesUnlocked(event: TubesUnlockedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tubes unlocked',
      context: { count: event.tubeIds.length },
      actorId: event.unlockedBy,
      action: 'tubes_unlocked',
      entityType: 'tube',
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: (username) => ({
        tubeCount: event.tubeIds.length,
        tubeIds: event.tubeIds.slice(0, 10),
        hasMore: event.tubeIds.length > 10,
        unlockedBy: username,
      }),
    });
  }

  private async handleTubeAccessShared(event: TubeAccessSharedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tube access shared', context: { tubeIds: event.tubeIds },
      actorId: event.sharedBy, action: 'tube_access_shared', entityType: 'tube',
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: async (username) => {
        const sharedWithUsers = await this.resolveUsernames(event.addedUserIds);
        return {
          tubeCount: event.tubeIds.length, tubeIds: event.tubeIds.slice(0, 10),
          hasMoreTubes: event.tubeIds.length > 10,
          sharedWithUsers, sharedWithCount: event.addedUserIds.length, sharedBy: username,
        };
      },
    });
  }

  private async handleTubeAccessRevoked(event: TubeAccessRevokedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tube access revoked', context: { tubeIds: event.tubeIds },
      actorId: event.revokedBy, action: 'tube_access_revoked', entityType: 'tube',
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: async (username) => {
        const revokedUsers = await this.resolveUsernames(event.revokedUserIds);
        return {
          tubeCount: event.tubeIds.length, tubeIds: event.tubeIds.slice(0, 10),
          hasMoreTubes: event.tubeIds.length > 10,
          revokedUsers, revokedCount: event.revokedUserIds.length, revokedBy: username,
        };
      },
    });
  }

  // CONFIGURATION EVENT HANDLERS

  private async handleTankUpdated(event: TankUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tank updated', context: { tankId: event.tankId },
      actorId: event.userId, action: 'tank_updated', entityType: 'tank',
      entityId: event.tankId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, changes: event.changes, username }),
    });
  }

  private async handleTankAdded(event: TankAddedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tank added', context: { tankId: event.tankId },
      actorId: event.userId, action: 'tank_created', entityType: 'tank',
      entityId: event.tankId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, username }),
    });
  }

  private async handleTankDeleted(event: TankDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'tank deleted', context: { tankId: event.tankId },
      actorId: event.userId, action: 'tank_deleted', entityType: 'tank',
      entityId: event.tankId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, username }),
    });
  }

  private async handleRackAdded(event: RackAddedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack added', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_created', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName, username }),
    });
  }

  private async handleRackDeleted(event: RackDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack deleted', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_deleted', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName, username }),
    });
  }

  private async handleRackUpdated(event: RackUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack updated', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_updated', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName, changes: event.changes, username }),
    });
  }

  private async handleBoxAdded(event: BoxAddedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box added', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_created', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName, boxId: event.boxId, boxName: event.boxName, username }),
    });
  }

  private async handleBoxDeleted(event: BoxDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box deleted', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_deleted', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName, boxId: event.boxId, boxName: event.boxName, username }),
    });
  }

  private async handleBoxUpdated(event: BoxUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box updated', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_updated', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName, boxId: event.boxId, boxName: event.boxName, changes: event.changes, username }),
    });
  }

  private async handleLabNameChanged(event: LabNameChangedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'lab name changed', context: {},
      actorId: event.userId, action: 'lab_name_changed', entityType: 'lab',
      occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ oldName: event.oldName, newName: event.newName, username }),
    });
  }

  // ASSIGNMENT EVENT HANDLERS

  private async handleRackAssigned(event: RackAssignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack assigned', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_assigned', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        previousOwner: null, newOwner: { userId: event.assignedUserId, username: event.assignedUsername }, assignedBy: username,
      }),
    });
  }

  private async handleRackUnassigned(event: RackUnassignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack unassigned', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_unassigned', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        previousOwner: { userId: event.previousUserId, username: event.previousUsername }, newOwner: null, unassignedBy: username,
      }),
    });
  }

  private async handleRackReassigned(event: RackReassignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack reassigned', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_reassigned', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        previousOwner: { userId: event.previousUserId, username: event.previousUsername },
        newOwner: { userId: event.newUserId, username: event.newUsername }, reassignedBy: username,
      }),
    });
  }

  private async handleBoxAssigned(event: BoxAssignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box assigned', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_assigned', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        boxId: event.boxId, boxName: event.boxName,
        previousOwner: null, newOwner: { userId: event.assignedUserId, username: event.assignedUsername }, assignedBy: username,
      }),
    });
  }

  private async handleBoxUnassigned(event: BoxUnassignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box unassigned', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_unassigned', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        boxId: event.boxId, boxName: event.boxName,
        previousOwner: { userId: event.previousUserId, username: event.previousUsername }, newOwner: null, unassignedBy: username,
      }),
    });
  }

  private async handleBoxReassigned(event: BoxReassignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box reassigned', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_reassigned', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        boxId: event.boxId, boxName: event.boxName,
        previousOwner: { userId: event.previousUserId, username: event.previousUsername },
        newOwner: { userId: event.newUserId, username: event.newUsername }, reassignedBy: username,
      }),
    });
  }

  // LABEL EVENT HANDLERS

  private async handleRackLabelUpdated(event: RackLabelUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'rack label updated', context: { tankId: event.tankId, rackId: event.rackId },
      actorId: event.userId, action: 'rack_label_updated', entityType: 'rack',
      entityId: `${event.tankId}-${event.rackId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        oldLabel: event.oldLabel ?? null, newLabel: event.newLabel ?? null, updatedBy: username,
      }),
    });
  }

  private async handleBoxLabelUpdated(event: BoxLabelUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'box label updated', context: { tankId: event.tankId, rackId: event.rackId, boxId: event.boxId },
      actorId: event.userId, action: 'box_label_updated', entityType: 'box',
      entityId: `${event.tankId}-${event.rackId}-${event.boxId}`, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        tankId: event.tankId, tankName: event.tankName, rackId: event.rackId, rackName: event.rackName,
        boxId: event.boxId, boxName: event.boxName,
        oldLabel: event.oldLabel ?? null, newLabel: event.newLabel ?? null, updatedBy: username,
      }),
    });
  }

  // BULK ASSIGNMENT EVENT HANDLERS

  private async handleBulkResourcesUnassigned(event: BulkResourcesUnassignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'bulk resources unassigned', context: { fromUserId: event.fromUserId },
      actorId: event.userId, action: 'resources_bulk_unassigned', entityType: 'configuration',
      occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        fromUser: { userId: event.fromUserId, username: event.fromUsername },
        racksAffected: event.racksAffected, boxesAffected: event.boxesAffected, unassignedBy: username,
      }),
    });
  }

  private async handleBulkResourcesReassigned(event: BulkResourcesReassignedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'bulk resources reassigned', context: { fromUserId: event.fromUserId, toUserId: event.toUserId },
      actorId: event.userId, action: 'resources_bulk_reassigned', entityType: 'configuration',
      occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        fromUser: { userId: event.fromUserId, username: event.fromUsername },
        toUser: { userId: event.toUserId, username: event.toUsername },
        racksAffected: event.racksAffected, boxesAffected: event.boxesAffected, reassignedBy: username,
      }),
    });
  }

  // RESEARCHER EVENT HANDLERS

  private async handleResearcherCreated(event: ResearcherCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'researcher created', context: { researcherId: event.researcherId },
      actorId: event.createdBy, action: 'researcher_created', entityType: 'researcher',
      entityId: event.researcherId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        researcherId: event.researcherId, researcherName: `${event.firstName} ${event.lastName}`,
        email: event.email, position: event.position, createdBy: username,
      }),
    });
  }

  private async handleResearcherUpdated(event: ResearcherUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'researcher updated', context: { researcherId: event.researcherId },
      actorId: event.updatedBy, action: 'researcher_updated', entityType: 'researcher',
      entityId: event.researcherId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        researcherId: event.researcherId, researcherName: `${event.firstName} ${event.lastName}`,
        changes: event.changes, updatedBy: username,
      }),
    });
  }

  private async handleResearcherDeactivated(event: ResearcherDeactivatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'researcher deactivated', context: { researcherId: event.researcherId },
      actorId: event.deactivatedBy, action: 'researcher_deactivated', entityType: 'researcher',
      entityId: event.researcherId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        researcherId: event.researcherId, researcherName: `${event.firstName} ${event.lastName}`,
        tubeCount: event.tubeCount, deactivatedBy: username,
      }),
    });
  }

  private async handleResearcherReactivated(event: ResearcherReactivatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'researcher reactivated', context: { researcherId: event.researcherId },
      actorId: event.reactivatedBy, action: 'researcher_reactivated', entityType: 'researcher',
      entityId: event.researcherId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        researcherId: event.researcherId, researcherName: `${event.firstName} ${event.lastName}`,
        reactivatedBy: username,
      }),
    });
  }

  private async handleResearcherDeleted(event: ResearcherDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'researcher deleted', context: { researcherId: event.researcherId },
      actorId: event.deletedBy, action: 'researcher_deleted', entityType: 'researcher',
      entityId: event.researcherId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        researcherId: event.researcherId, researcherName: `${event.firstName} ${event.lastName}`,
        deletedBy: username,
      }),
    });
  }

  // USER EVENT HANDLERS

  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user created', context: { userId: event.userId },
      actorId: event.userId, action: 'user_created', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ username, role: event.role.value }),
    });
  }

  private async handleUserPasswordChanged(event: UserPasswordChangedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user password changed', context: { userId: event.userId },
      actorId: event.changedBy, action: 'user_password_changed', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ username: event.username, changedBy: username }),
    });
  }

  private async handleUserRoleChanged(event: UserRoleChangedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user role changed', context: { userId: event.userId },
      actorId: event.changedBy, action: 'user_role_changed', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        username: event.username, oldRole: event.oldRole.value, newRole: event.newRole.value, changedBy: username,
      }),
    });
  }

  private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user deleted', context: { userId: event.userId },
      actorId: event.deletedBy, action: 'user_deleted', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ username: event.username, deletedBy: username }),
    });
  }

  private async handleUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user logged in', context: { userId: event.userId },
      actorId: event.userId, action: 'user_logged_in', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: () => ({ username: event.username }),
    });
  }

  private async handleUserLoginFailed(event: UserLoginFailedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user login failed', context: { username: event.username },
      actorId: event.username, action: 'user_login_failed', entityType: 'user',
      entityId: event.username, occurredOn: event.occurredOn,
      buildDetails: () => ({ username: event.username, ipAddress: event.ipAddress, reason: event.reason }),
    });
  }

  private async handleUserLoggedOut(event: UserLoggedOutEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user logged out', context: { userId: event.userId },
      actorId: event.userId, action: 'user_logged_out', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: () => ({ username: event.username }),
    });
  }

  private async handleUserLinkedToResearcher(event: UserLinkedToResearcherEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user linked to researcher', context: { userId: event.userId },
      actorId: event.linkedBy, action: 'user_linked_to_researcher', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        username: event.username, researcherId: event.researcherId, researcherName: event.researcherName, linkedBy: username,
      }),
    });
  }

  private async handleUserUnlinkedFromResearcher(event: UserUnlinkedFromResearcherEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user unlinked from researcher', context: { userId: event.userId },
      actorId: event.unlinkedBy, action: 'user_unlinked_from_researcher', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        username: event.username, researcherId: event.researcherId, researcherName: event.researcherName, unlinkedBy: username,
      }),
    });
  }

  private async handleUserDeactivated(event: UserDeactivatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user deactivated', context: { userId: event.userId },
      actorId: event.deactivatedBy, action: 'user_deactivated', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ username: event.username, deactivatedBy: username }),
    });
  }

  private async handleUserSuspended(event: UserSuspendedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user suspended', context: { userId: event.userId },
      actorId: event.suspendedBy, action: 'user_suspended', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ username: event.username, suspendedBy: username }),
    });
  }

  private async handleUserReactivated(event: UserReactivatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'user reactivated', context: { userId: event.userId },
      actorId: event.reactivatedBy, action: 'user_reactivated', entityType: 'user',
      entityId: event.userId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ username: event.username, previousStatus: event.previousStatus, reactivatedBy: username }),
    });
  }


  private async handleResearcherApproved(event: ResearcherApprovedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'researcher approved', context: { researcherId: event.researcherId },
      actorId: event.approvedBy, action: 'researcher_approved', entityType: 'researcher',
      entityId: event.researcherId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ researcherName: `${event.firstName} ${event.lastName}`, linkedUserId: event.linkedUserId, approvedBy: username }),
    });
  }

  private async handleLabCreated(event: LabCreatedEvent): Promise<void> {
    await this.safeLogAudit('lab created', { labId: event.labId }, async () => {
      await this.auditService.logAction({
        userId: 'system',
        username: 'system',
        action: 'lab_created',
        entityType: 'lab',
        entityId: event.labId,
        labId: event.labId,
        details: {
          labName: event.name,
          timestamp: event.occurredOn.toISOString(),
        },
      });
    });
  }

  private async handleLabRenamed(event: LabRenamedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'lab renamed', context: { labId: event.labId },
      actorId: event.renamedBy, action: 'lab_renamed', entityType: 'lab',
      entityId: event.labId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ oldName: event.oldName, newName: event.newName, renamedBy: username }),
    });
  }

  private async handleLabActivated(event: LabActivatedEvent): Promise<void> {
    const labName = await this.resolveLabName(event.labId);
    await this.logAuditEvent({
      eventName: 'lab activated', context: { labId: event.labId },
      actorId: event.activatedBy, action: 'lab_activated', entityType: 'lab',
      entityId: event.labId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ labName, activatedBy: username }),
    });
  }

  private async handleLabDeactivated(event: LabDeactivatedEvent): Promise<void> {
    const labName = await this.resolveLabName(event.labId);
    await this.logAuditEvent({
      eventName: 'lab deactivated', context: { labId: event.labId },
      actorId: event.deactivatedBy, action: 'lab_deactivated', entityType: 'lab',
      entityId: event.labId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ labName, deactivatedBy: username }),
    });
  }

  private async handleInviteCodeCreated(event: InviteCodeCreatedEvent): Promise<void> {
    const labName = await this.resolveLabName(event.labId);
    await this.logAuditEvent({
      eventName: 'invite code created', context: { codeId: event.codeId },
      actorId: event.createdBy, action: 'invite_code_created', entityType: 'lab',
      entityId: event.codeId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ labName, codeId: event.codeId, createdBy: username }),
    });
  }

  private async handleInviteCodeUsed(event: InviteCodeUsedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'invite code used', context: { codeId: event.codeId },
      actorId: event.userId, action: 'invite_code_used', entityType: 'lab',
      entityId: event.codeId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({ codeId: event.codeId, usedBy: username }),
    });
  }

  // DONOR EVENT HANDLERS

  private async handleDonorCreated(event: DonorCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'donor created', context: { donorId: event.donorId },
      actorId: event.createdBy, action: 'donor_created', entityType: 'donor',
      entityId: event.donorId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        donorId: event.donorId, donorSourceId: event.donorSourceId,
        donorInternalId: event.donorInternalId, isCurated: event.isCurated,
        createdBy: username,
      }),
    });
  }

  private async handleDonorUpdated(event: DonorUpdatedEvent): Promise<void> {
    const donorIds = await this.resolveDonorLabel(event.donorId);
    await this.logAuditEvent({
      eventName: 'donor updated', context: { donorId: event.donorId },
      actorId: event.updatedBy, action: 'donor_updated', entityType: 'donor',
      entityId: event.donorId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        donorId: event.donorId, ...donorIds, changes: event.changes, updatedBy: username,
      }),
    });
  }

  private async handleDonorDeleted(event: DonorDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'donor deleted', context: { donorId: event.donorId },
      actorId: event.deletedBy, action: 'donor_deleted', entityType: 'donor',
      entityId: event.donorId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        donorId: event.donorId, donorSourceId: event.donorSourceId,
        donorInternalId: event.donorInternalId, deletedBy: username,
      }),
    });
  }

  // EQUIPMENT EVENT HANDLERS

  private async handleEquipmentItemCreated(event: EquipmentItemCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment item created', context: { itemId: event.itemId },
      actorId: event.createdBy, action: 'equipment_item_created', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, name: event.name, categoryId: event.categoryId, createdBy: username,
      }),
    });
  }

  private async handleEquipmentItemUpdated(event: EquipmentItemUpdatedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'equipment item updated', context: { itemId: event.itemId },
      actorId: event.updatedBy, action: 'equipment_item_updated', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, changes: event.changes, updatedBy: username,
      }),
    });
  }

  private async handleEquipmentItemDecommissioned(event: EquipmentItemDecommissionedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment item decommissioned', context: { itemId: event.itemId },
      actorId: event.decommissionedBy, action: 'equipment_item_decommissioned', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, reason: event.reason, decommissionedBy: username,
      }),
    });
  }

  private async handleEquipmentItemDeleted(event: EquipmentItemDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment item deleted', context: { itemId: event.itemId },
      actorId: event.deletedBy, action: 'equipment_item_deleted', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, name: event.name, deletedBy: username,
      }),
    });
  }

  private async handleEquipmentMaintenanceLogged(event: EquipmentMaintenanceLoggedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'equipment maintenance logged', context: { itemId: event.itemId },
      actorId: event.loggedBy, action: 'equipment_maintenance_logged', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, maintenanceType: event.maintenanceType,
        datePerformed: event.datePerformed, loggedBy: username,
      }),
    });
  }

  private async handleEquipmentMaintenanceUpdated(event: EquipmentMaintenanceUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment maintenance updated', context: { itemId: event.itemId },
      actorId: event.updatedBy, action: 'equipment_maintenance_updated', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, maintenanceType: event.maintenanceType, updatedBy: username,
      }),
    });
  }

  private async handleEquipmentMaintenanceDeleted(event: EquipmentMaintenanceDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment maintenance deleted', context: { itemId: event.itemId },
      actorId: event.deletedBy, action: 'equipment_maintenance_deleted', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, maintenanceType: event.maintenanceType, deletedBy: username,
      }),
    });
  }

  private async handleEquipmentCategoryCreated(event: EquipmentCategoryCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment category created', context: { categoryId: event.categoryId },
      actorId: event.createdBy, action: 'equipment_category_created', entityType: 'equipment_item',
      entityId: event.categoryId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        categoryId: event.categoryId, name: event.name, parentId: event.parentId, createdBy: username,
      }),
    });
  }

  private async handleEquipmentCategoryUpdated(event: EquipmentCategoryUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment category updated', context: { categoryId: event.categoryId },
      actorId: event.updatedBy, action: 'equipment_category_updated', entityType: 'equipment_item',
      entityId: event.categoryId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        categoryId: event.categoryId, name: event.name, updatedBy: username,
      }),
    });
  }

  private async handleEquipmentCategoryDeleted(event: EquipmentCategoryDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment category deleted', context: { categoryId: event.categoryId },
      actorId: event.deletedBy, action: 'equipment_category_deleted', entityType: 'equipment_item',
      entityId: event.categoryId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        categoryId: event.categoryId, name: event.name, deletedBy: username,
      }),
    });
  }

  private async handleEquipmentDocumentAdded(event: EquipmentDocumentAddedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment document added', context: { itemId: event.itemId },
      actorId: event.addedBy, action: 'equipment_document_added', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, label: event.label, addedBy: username,
      }),
    });
  }

  private async handleEquipmentDocumentRemoved(event: EquipmentDocumentRemovedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'equipment document removed', context: { itemId: event.itemId },
      actorId: event.removedBy, action: 'equipment_document_removed', entityType: 'equipment_item',
      entityId: event.itemId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        itemId: event.itemId, removedBy: username,
      }),
    });
  }

  private async handleEquipmentBulkMaintenanceLogged(event: EquipmentBulkMaintenanceLoggedEvent): Promise<void> {
    await this.safeLogAudit('equipment bulk maintenance logged', { count: event.itemIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.loggedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.itemIds.map(itemId => ({
        userId: event.loggedBy,
        username,
        action: 'equipment_maintenance_logged',
        entityType: 'equipment_item',
        entityId: itemId,
        labId: event.labId,
        details: { itemId, maintenanceType: event.maintenanceType, datePerformed: event.datePerformed, loggedBy: username, timestamp },
      }));

      entries.push({
        userId: event.loggedBy,
        username,
        action: 'equipment_bulk_maintenance_logged',
        entityType: 'equipment_item',
        labId: event.labId,
        details: { count: event.itemIds.length, maintenanceType: event.maintenanceType, datePerformed: event.datePerformed, loggedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleEquipmentBulkStatusChanged(event: EquipmentBulkStatusChangedEvent): Promise<void> {
    await this.safeLogAudit('equipment bulk status changed', { count: event.itemIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.changedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.itemIds.map(itemId => ({
        userId: event.changedBy,
        username,
        action: 'equipment_item_updated',
        entityType: 'equipment_item',
        entityId: itemId,
        labId: event.labId,
        details: { itemId, changes: [{ field: 'status', newValue: event.status }], updatedBy: username, timestamp },
      }));

      entries.push({
        userId: event.changedBy,
        username,
        action: 'equipment_bulk_status_changed',
        entityType: 'equipment_item',
        labId: event.labId,
        details: { count: event.itemIds.length, status: event.status, changedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleEquipmentBulkRelocated(event: EquipmentBulkRelocatedEvent): Promise<void> {
    await this.safeLogAudit('equipment bulk relocated', { count: event.itemIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.relocatedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.itemIds.map(itemId => ({
        userId: event.relocatedBy,
        username,
        action: 'equipment_item_updated',
        entityType: 'equipment_item',
        entityId: itemId,
        labId: event.labId,
        details: { itemId, changes: [{ field: 'categoryId', newValue: event.categoryId }], updatedBy: username, timestamp },
      }));

      entries.push({
        userId: event.relocatedBy,
        username,
        action: 'equipment_bulk_relocated',
        entityType: 'equipment_item',
        labId: event.labId,
        details: { count: event.itemIds.length, categoryId: event.categoryId, relocatedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  // CONSUMABLE EVENT HANDLERS

  private async handleConsumableProductCreated(event: ConsumableProductCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable product created', context: { productId: event.productId },
      actorId: event.createdBy, action: 'consumable_product_created', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, name: event.name, categoryId: event.categoryId, createdBy: username,
      }),
    });
  }

  private async handleConsumableProductUpdated(event: ConsumableProductUpdatedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'consumable product updated', context: { productId: event.productId },
      actorId: event.updatedBy, action: 'consumable_product_updated', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, changes: event.changes, updatedBy: username,
      }),
    });
  }

  private async handleConsumableProductArchived(event: ConsumableProductArchivedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'consumable product archived', context: { productId: event.productId },
      actorId: event.archivedBy, action: 'consumable_product_archived', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, name: event.name, archivedBy: username,
      }),
    });
  }

  private async handleConsumableProductDeleted(event: ConsumableProductDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable product deleted', context: { productId: event.productId },
      actorId: event.deletedBy, action: 'consumable_product_deleted', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, name: event.name, deletedBy: username,
      }),
    });
  }

  private async handleConsumableCategoryCreated(event: ConsumableCategoryCreatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable category created', context: { categoryId: event.categoryId },
      actorId: event.createdBy, action: 'consumable_category_created', entityType: 'consumable_product',
      entityId: event.categoryId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        categoryId: event.categoryId, name: event.name, parentId: event.parentId, createdBy: username,
      }),
    });
  }

  private async handleConsumableCategoryUpdated(event: ConsumableCategoryUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable category updated', context: { categoryId: event.categoryId },
      actorId: event.updatedBy, action: 'consumable_category_updated', entityType: 'consumable_product',
      entityId: event.categoryId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        categoryId: event.categoryId, name: event.name, updatedBy: username,
      }),
    });
  }

  private async handleConsumableCategoryDeleted(event: ConsumableCategoryDeletedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable category deleted', context: { categoryId: event.categoryId },
      actorId: event.deletedBy, action: 'consumable_category_deleted', entityType: 'consumable_product',
      entityId: event.categoryId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        categoryId: event.categoryId, name: event.name, deletedBy: username,
      }),
    });
  }

  private async handleConsumableDocumentAdded(event: ConsumableDocumentAddedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable document added', context: { productId: event.productId },
      actorId: event.addedBy, action: 'consumable_document_added', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, label: event.label, addedBy: username,
      }),
    });
  }

  private async handleConsumableDocumentRemoved(event: ConsumableDocumentRemovedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable document removed', context: { productId: event.productId },
      actorId: event.removedBy, action: 'consumable_document_removed', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, removedBy: username,
      }),
    });
  }

  private async handleConsumableStockReceived(event: ConsumableStockReceivedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'consumable stock received', context: { productId: event.productId },
      actorId: event.receivedBy, action: 'consumable_stock_received', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, quantity: event.quantity, locationId: event.locationId, receivedBy: username,
      }),
    });
  }

  private async handleConsumableStockConsumed(event: ConsumableStockConsumedEvent): Promise<void> {
    if (event.partOfBulkOperation) return;
    await this.logAuditEvent({
      eventName: 'consumable stock consumed', context: { productId: event.productId },
      actorId: event.consumedBy, action: 'consumable_stock_consumed', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, quantity: event.quantity, locationId: event.locationId, consumedBy: username,
      }),
    });
  }

  private async handleConsumableStockCountAdjusted(event: ConsumableStockCountAdjustedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable stock count adjusted', context: { productId: event.productId },
      actorId: event.adjustedBy, action: 'consumable_stock_count_adjusted', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, delta: event.delta, locationId: event.locationId, adjustedBy: username,
      }),
    });
  }

  private async handleConsumableStockDisposed(event: ConsumableStockDisposedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'consumable stock disposed', context: { productId: event.productId },
      actorId: event.disposedBy, action: 'consumable_stock_disposed', entityType: 'consumable_product',
      entityId: event.productId, occurredOn: event.occurredOn, labId: event.labId,
      buildDetails: (username) => ({
        productId: event.productId, quantity: event.quantity, locationId: event.locationId, disposedBy: username,
      }),
    });
  }

  // Consumable bulk handlers

  private async handleConsumableBulkReceived(event: ConsumableBulkReceivedEvent): Promise<void> {
    await this.safeLogAudit('consumable bulk received', { count: event.perItemData.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.receivedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.perItemData.map(item => ({
        userId: event.receivedBy,
        username,
        action: 'consumable_stock_received',
        entityType: 'consumable_product',
        entityId: item.productId,
        labId: event.labId,
        details: { productId: item.productId, quantity: item.quantity, locationId: item.locationId, receivedBy: username, timestamp },
      }));

      entries.push({
        userId: event.receivedBy,
        username,
        action: 'consumable_bulk_received',
        entityType: 'consumable_product',
        labId: event.labId,
        details: { count: event.perItemData.length, receivedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleConsumableBulkConsumed(event: ConsumableBulkConsumedEvent): Promise<void> {
    await this.safeLogAudit('consumable bulk consumed', { count: event.perItemData.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.consumedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.perItemData.map(item => ({
        userId: event.consumedBy,
        username,
        action: 'consumable_stock_consumed',
        entityType: 'consumable_product',
        entityId: item.productId,
        labId: event.labId,
        details: { productId: item.productId, quantity: item.quantity, locationId: item.locationId, consumedBy: username, timestamp },
      }));

      entries.push({
        userId: event.consumedBy,
        username,
        action: 'consumable_bulk_consumed',
        entityType: 'consumable_product',
        labId: event.labId,
        details: { count: event.perItemData.length, consumedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleConsumableBulkCategoryReassigned(event: ConsumableBulkCategoryReassignedEvent): Promise<void> {
    await this.safeLogAudit('consumable bulk category reassigned', { count: event.productIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.reassignedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.productIds.map(productId => ({
        userId: event.reassignedBy,
        username,
        action: 'consumable_product_updated',
        entityType: 'consumable_product',
        entityId: productId,
        labId: event.labId,
        details: { productId, changes: [{ field: 'categoryId', newValue: event.categoryId }], updatedBy: username, timestamp },
      }));

      entries.push({
        userId: event.reassignedBy,
        username,
        action: 'consumable_bulk_category_reassigned',
        entityType: 'consumable_product',
        labId: event.labId,
        details: { count: event.productIds.length, categoryId: event.categoryId, reassignedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

  private async handleConsumableBulkArchived(event: ConsumableBulkArchivedEvent): Promise<void> {
    await this.safeLogAudit('consumable bulk archived', { count: event.productIds.length }, async () => {
      const { username, isDemo } = await this.resolveUser(event.archivedBy);
      if (isDemo) return;

      const timestamp = event.occurredOn.toISOString();
      const entries: LogActionParams[] = event.productIds.map(productId => ({
        userId: event.archivedBy,
        username,
        action: 'consumable_product_archived',
        entityType: 'consumable_product',
        entityId: productId,
        labId: event.labId,
        details: { productId, archivedBy: username, timestamp },
      }));

      entries.push({
        userId: event.archivedBy,
        username,
        action: 'consumable_bulk_archived',
        entityType: 'consumable_product',
        labId: event.labId,
        details: { count: event.productIds.length, archivedBy: username, timestamp },
      });

      await this.auditService.logActions(entries);
    });
  }

}
