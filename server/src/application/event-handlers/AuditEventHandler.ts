/**
 * Domain Event Audit Logger
 *
 * Subscribes to domain events and persists them as audit log entries.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { AuditService } from '@application/services/AuditService';
import type {
  DonorCreatedEvent,
  DonorUpdatedEvent,
  DonorDeletedEvent,
} from '@domain/events/DonorEvents';
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
  BulkTubesUpdatedEvent,
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
    this.eventBus.subscribe('BulkTubesUpdated', (e) => this.handleBulkTubesUpdated(e));
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

  private async handleBulkTubesUpdated(event: BulkTubesUpdatedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'bulk tubes updated',
      context: { tubeCount: event.tubeIds.length },
      actorId: event.updatedBy,
      action: 'tube_bulk_updated',
      entityType: 'tube',
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: (username) => ({
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        changesSummary: event.changesSummary,
        updatedBy: username,
      }),
    });
  }

  private async handleBulkTubesMoved(event: BulkTubesMovedEvent): Promise<void> {
    await this.logAuditEvent({
      eventName: 'bulk tubes moved',
      context: { tubeCount: event.tubeIds.length },
      actorId: event.movedBy,
      action: 'tube_bulk_moved',
      entityType: 'tube',
      occurredOn: event.occurredOn,
      labId: event.labId,
      buildDetails: (username) => ({
        tubeIds: event.tubeIds,
        count: event.tubeIds.length,
        movedBy: username,
      }),
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

}
