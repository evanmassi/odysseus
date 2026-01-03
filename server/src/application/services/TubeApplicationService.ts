import { TubeRepository } from '@domain/repositories/TubeRepository';
import type { TubeSearchCriteria } from '@domain/types/repository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { Tube } from '@domain/entities/Tube';
import { User } from '@domain/entities/User';
import { TubePositionService } from '@domain/services/TubePositionService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { CreateTubeRequest, UpdateTubeRequest, TubeResponse, BulkUpdateRequest, TubeSearchRequest, TubeDto } from '@application/dto/TubeDto';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { EventBus } from '@application/contracts/EventBus';
import { logger } from '@utils/logger';
import type { TubeMedia } from '@odysseus/shared-schemas';
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
import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest,
  BatchLockResult,
  BatchUnlockResult,
  ShareAccessResult,
  RevokeAccessResult,
  SkippedTube
} from '@application/dto/TubeLockDto';

/**
 * TubeApplicationService
 *
 * Thin orchestration layer:
 * - No input validation (Zod middleware already validated)
 * - Business rule validation only (domain services)
 * - Access control enforcement
 */
export class TubeApplicationService {
  constructor(
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private personRepository: PersonRepository,
    private configurationRepository: ConfigurationRepository,
    private tubePositionService: TubePositionService,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  /**
   * Helper: Get container info (rack + box) for a tube location
   * Used for container assignment permission checks
   */
  private async getContainerInfo(tankId: string, rackId: string, boxId: string): Promise<{
    rack: { assignedUserId?: string | null };
    box: { assignedUserId?: string | null };
  } | null> {
    const config = await this.configurationRepository.getCurrent();
    if (!config) return null;

    const result = config.getBox(tankId, rackId, boxId);
    if (!result) return null;

    return {
      rack: { assignedUserId: result.rack.assignedUserId },
      box: { assignedUserId: result.box.assignedUserId },
    };
  }

  /**
   * Create a new tube
   *Trust Zod-validated input, enforce business rules only
   */
  async createTube(request: CreateTubeRequest, authenticatedUser: User): Promise<TubeResponse> {
    // 1. Check permissions
    this.accessControlService.requireCanCreateTube(authenticatedUser);

    // 2. Map DTO to domain (thin, no logic)
    const tubeData = TubeDto.fromCreateRequest(request);

    // 2.5. Check container access (assignment protects the container)
    const containerInfo = await this.getContainerInfo(
      tubeData.location.tankId,
      tubeData.location.rackId,
      tubeData.location.boxId
    );
    if (containerInfo) {
      const containerAccess = this.accessControlService.canAccessContainer(
        authenticatedUser,
        containerInfo
      );
      if (!containerAccess.allowed) {
        throw new PermissionError(containerAccess.reason, {
          tankId: tubeData.location.tankId,
          rackId: tubeData.location.rackId,
          boxId: tubeData.location.boxId,
        });
      }
    }

    // 3. Check position availability (business rule)
    const positionResult = await this.tubePositionService.validatePosition(
      tubeData.location.tankId,
      tubeData.location.rackId,
      tubeData.location.boxId,
      tubeData.location.position,
      this.tubeRepository
    );

    if (!positionResult.isValid) {
      throw new ValidationError(`Position conflict: ${positionResult.reason}`, {
        position: `${tubeData.location.tankId}-${tubeData.location.rackId}-${tubeData.location.boxId}-${tubeData.location.position}`,
        conflicts: positionResult.conflicts
      });
    }

    // 4. Snapshot person name for historical tracking
    // If tube has a researcher, capture their name at creation time
    // This preserves historical accuracy if person changes name later
    let createdByName: string | undefined;
    if (tubeData.researcherId) {
      const researcher = await this.researcherRepository.findById(tubeData.researcherId);
      if (researcher) {
        const person = await this.personRepository.findById(researcher.personId);
        if (person) {
          createdByName = person.fullName;
        }
      }
    }

    // 5. Create entity (domain applies defaults & validation)
    const tube = Tube.create({
      ...tubeData,
      createdByName
    });

    // 6. Save
    await this.tubeRepository.save(tube);

    // 7. Publish domain event
    this.eventBus.publish(new TubeCreatedEvent(
      tube.id,
      tube.location,
      tube.sampleData,
      authenticatedUser.id
    ));

    return TubeDto.toResponse(tube);
  }

  /**
   * Create multiple tubes
   * Reuses existing createTube logic, zero duplication
   * Bulk operations are loops over single operations
   */
  async createTubes(requests: CreateTubeRequest[], authenticatedUser: User): Promise<TubeResponse[]> {
    const tubes: TubeResponse[] = [];

    // Process sequentially to maintain transaction safety
    for (const request of requests) {
      const tube = await this.createTube(request, authenticatedUser);
      tubes.push(tube);
    }

    return tubes;
  }

  /**
   * Get tube by ID
   */
  async getTubeById(id: string, authenticatedUser: User): Promise<TubeResponse> {
    const tube = await this.tubeRepository.findById(id);

    if (!tube) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }

    // Check view access: container ownership OR shared access
    const containerInfo = await this.getContainerInfo(
      tube.location.tankId,
      tube.location.rackId,
      tube.location.boxId
    );
    if (containerInfo) {
      const tubeAccess = this.accessControlService.canAccessTubeForModification(
        authenticatedUser,
        tube,
        containerInfo
      );
      if (!tubeAccess.allowed) {
        throw new PermissionError(tubeAccess.reason, {
          tubeId: id,
          tankId: tube.location.tankId,
          rackId: tube.location.rackId,
          boxId: tube.location.boxId,
        });
      }
    }

    return TubeDto.toResponse(tube);
  }

  /**
   * Get all tubes with filtering
   */
  async getAllTubes(authenticatedUser: User, searchRequest?: TubeSearchRequest): Promise<TubeResponse[]> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    let tubes: Tube[];

    if (searchRequest && Object.keys(searchRequest).length > 0) {
      tubes = await this.tubeRepository.search(searchRequest as TubeSearchCriteria);
    } else {
      tubes = await this.tubeRepository.findAll();
    }

    return TubeDto.toResponseList(tubes);
  }

  /**
   * Get tubes by location
   */
  async getTubesByLocation(
    tankId: string,
    rackId: string,
    boxId: string,
    authenticatedUser: User
  ): Promise<TubeResponse[]> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    const tubes = await this.tubeRepository.findByCompleteLocation(tankId, rackId, boxId);

    return TubeDto.toResponseList(tubes);
  }

  /**
   * Get tubes by rack and box (alias for backward compatibility)
   */
  async getTubesByRackAndBox(
    rackId: string,
    boxId: string,
    authenticatedUser: User
  ): Promise<TubeResponse[]> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    const tubes = await this.tubeRepository.findByRackAndBox(rackId, boxId);

    return TubeDto.toResponseList(tubes);
  }

  /**
   * Search tubes with advanced criteria
   */
  async searchTubes(
    searchRequest: TubeSearchRequest,
    authenticatedUser: User
  ): Promise<TubeResponse[]> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    const tubes = await this.tubeRepository.search(searchRequest as TubeSearchCriteria);

    return TubeDto.toResponseList(tubes);
  }

  /**
   * Update tube
   * Trust Zod-validated input, check business rules only
   */
  async updateTube(id: string, request: UpdateTubeRequest, authenticatedUser: User): Promise<TubeResponse> {
    const existingTube = await this.tubeRepository.findById(id);

    if (!existingTube) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }

    // Check access: container ownership OR shared access to this tube
    const containerInfo = await this.getContainerInfo(
      existingTube.location.tankId,
      existingTube.location.rackId,
      existingTube.location.boxId
    );
    if (containerInfo) {
      const tubeAccess = this.accessControlService.canAccessTubeForModification(
        authenticatedUser,
        existingTube,
        containerInfo
      );
      if (!tubeAccess.allowed) {
        throw new PermissionError(tubeAccess.reason, {
          tubeId: id,
          tankId: existingTube.location.tankId,
          rackId: existingTube.location.rackId,
          boxId: existingTube.location.boxId,
        });
      }
    }

    // Note: Authorization is handled by canAccessTubeForModification above
    // which checks container access OR shared access to the tube

    // If position is changing, validate new position (business rule)
    const hasLocationUpdate = request.location && (
      request.location.tankId || request.location.rackId || 
      request.location.boxId || request.location.position !== undefined
    );
    
    if (hasLocationUpdate && request.location) {
      const newTankId = request.location.tankId || existingTube.tankId;
      const newRackId = request.location.rackId || existingTube.rackId;
      const newBoxId = request.location.boxId || existingTube.boxId;
      const newPosition = request.location.position !== undefined ? request.location.position : existingTube.position;

      // Skip position check if position hasn't actually changed
      const positionChanged = (
        newTankId !== existingTube.tankId ||
        newRackId !== existingTube.rackId ||
        newBoxId !== existingTube.boxId ||
        newPosition !== existingTube.position
      );

      if (positionChanged) {
        // Also check destination container access for moves
        const destContainerInfo = await this.getContainerInfo(newTankId, newRackId, newBoxId);
        if (destContainerInfo) {
          const destAccess = this.accessControlService.canAccessContainer(
            authenticatedUser,
            destContainerInfo
          );
          if (!destAccess.allowed) {
            throw new PermissionError(`Cannot move tube: ${destAccess.reason}`, {
              tubeId: id,
              destinationTankId: newTankId,
              destinationRackId: newRackId,
              destinationBoxId: newBoxId,
            });
          }
        }

        const positionResult = await this.tubePositionService.validatePosition(
          newTankId,
          newRackId,
          newBoxId,
          newPosition,
          this.tubeRepository,
          id // Exclude current tube from conflict check
        );

        if (!positionResult.isValid) {
          throw new ValidationError(`Position conflict: ${positionResult.reason}`, {
            position: `${newTankId}-${newRackId}-${newBoxId}-${newPosition}`,
            conflicts: positionResult.conflicts
          });
        }
      }
    }

    // Check lock note update permission - only lock owner can modify
    if (request.lockNote !== undefined) {
      if (!existingTube.isLocked) {
        throw new PermissionError('Cannot update lock note on unlocked tube', { tubeId: id });
      }
      if (existingTube.lockedBy !== authenticatedUser.id) {
        throw new PermissionError('Only the lock owner can update the lock note', { tubeId: id });
      }
    }

    // Capture old state for event publishing
    const oldLocation = existingTube.location;
    const oldSampleData = existingTube.sampleData;

    // Map DTO to domain (thin, no logic)
    const updateData = TubeDto.fromUpdateRequest(request);

    // Update entity (domain handles validation)
    let updatedTube = existingTube.update(updateData);

    // Apply lock note update if provided (separate from regular update)
    if (request.lockNote !== undefined) {
      updatedTube = updatedTube.updateLockNote(request.lockNote || undefined);
    }

    // Save
    await this.tubeRepository.save(updatedTube);

    // Publish domain events
    const locationChanged = !oldLocation.equals(updatedTube.location);

    if (locationChanged) {
      // Publish location change event
      await this.eventBus.publish(new TubeLocationChangedEvent(
        updatedTube.id,
        oldLocation,
        updatedTube.location,
        authenticatedUser.id
      ));
    }

    // Always publish general update event
    await this.eventBus.publish(new TubeUpdatedEvent(
      updatedTube.id,
      oldLocation,
      updatedTube.location,
      oldSampleData,
      updatedTube.sampleData,
      authenticatedUser.id
    ));

    return TubeDto.toResponse(updatedTube);
  }

  /**
   * Delete tube
   */
  async deleteTube(id: string, authenticatedUser: User): Promise<void> {
    const tube = await this.tubeRepository.findById(id);

    if (!tube) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }

    // Check access: container ownership OR shared access to this tube
    const containerInfo = await this.getContainerInfo(
      tube.location.tankId,
      tube.location.rackId,
      tube.location.boxId
    );
    if (containerInfo) {
      const tubeAccess = this.accessControlService.canAccessTubeForModification(
        authenticatedUser,
        tube,
        containerInfo
      );
      if (!tubeAccess.allowed) {
        throw new PermissionError(tubeAccess.reason, {
          tubeId: id,
          tankId: tube.location.tankId,
          rackId: tube.location.rackId,
          boxId: tube.location.boxId,
        });
      }
    }

    // Note: Authorization is handled by canAccessTubeForModification above
    // which checks container access OR shared access to the tube

    await this.tubeRepository.delete(id);

    // Publish domain event
    this.eventBus.publish(new TubeDeletedEvent(
      tube.id,
      tube.location,
      authenticatedUser.id
    ));
  }

  /**
   * Bulk update tubes
   * Each tube is authorized individually via updateTube's canAccessTubeForModification check
   */
  async bulkUpdateTubes(
    request: BulkUpdateRequest,
    authenticatedUser: User
  ): Promise<{
    success: boolean;
    updated: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    // No upfront permission check - each tube is authorized individually
    // This allows users to batch edit tubes they have access to (own space or shared access)

    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of request.updates) {
      try {
        await this.updateTube(item.id, item.updates, authenticatedUser);
        updated.push(item.id);
      } catch (error) {
        failed.push({
          id: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Publish bulk update event (only if some succeeded)
    if (updated.length > 0) {
      await this.eventBus.publish(new BulkTubesUpdatedEvent(
        updated,
        authenticatedUser.id,
        { updated: updated.length, failed: failed.length }
      ));
    }

    return {
      success: failed.length === 0,
      updated,
      failed
    };
  }

  /**
   * Bulk delete tubes
   */
  async bulkDeleteTubes(
    tubeIds: string[],
    authenticatedUser: User
  ): Promise<{
    success: boolean;
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    // Check general tube edit permission (bulk delete uses same permission as bulk edit)
    this.accessControlService.requireCanBulkEditTubes(authenticatedUser);

    const deleted: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of tubeIds) {
      try {
        await this.deleteTube(id, authenticatedUser);
        deleted.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: failed.length === 0,
      deleted,
      failed
    };
  }

  /**
   * Lock tubes
   * Batch lock with partial success pattern
   */
  async lockTubes(
    request: LockTubesRequest,
    authenticatedUser: User
  ): Promise<BatchLockResult> {
    const locked: string[] = [];
    const skipped: SkippedTube[] = [];

    for (const tubeId of request.tubeIds) {
      const tube = await this.tubeRepository.findById(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      // Check container access first (assignment protects the container)
      const containerInfo = await this.getContainerInfo(
        tube.location.tankId,
        tube.location.rackId,
        tube.location.boxId
      );
      if (containerInfo) {
        const containerAccess = this.accessControlService.canAccessContainer(
          authenticatedUser,
          containerInfo
        );
        if (!containerAccess.allowed) {
          skipped.push({ tubeId, reason: containerAccess.reason });
          continue;
        }
      }

      // Check lock permission (with container info for lock-specific rules)
      const accessResult = this.accessControlService.canLockTube(
        authenticatedUser,
        tube,
        containerInfo ?? undefined
      );
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      // Skip if already locked
      if (tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube is already locked' });
        continue;
      }

      // Lock the tube
      const lockedTube = tube.lock(authenticatedUser.id, request.lockNote);
      await this.tubeRepository.save(lockedTube);

      locked.push(tubeId);
    }

    // Publish single batch event after all tubes processed
    if (locked.length > 0) {
      logger.info('🔒 [TubeService] Publishing TubesLockedEvent', {
        lockedCount: locked.length,
        userId: authenticatedUser.id
      });
      await this.eventBus.publish(new TubesLockedEvent(
        locked,
        authenticatedUser.id,
        request.lockNote
      ));
      logger.info('🔒 [TubeService] TubesLockedEvent published');
    }

    return { locked, skipped };
  }

  /**
   * Unlock tubes
   * Batch unlock with partial success pattern
   */
  async unlockTubes(
    request: UnlockTubesRequest,
    authenticatedUser: User
  ): Promise<BatchUnlockResult> {
    const unlocked: string[] = [];
    const skipped: SkippedTube[] = [];

    for (const tubeId of request.tubeIds) {
      const tube = await this.tubeRepository.findById(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      // Check unlock permission
      const accessResult = this.accessControlService.canUnlockTube(authenticatedUser, tube);
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      // Skip if not locked
      if (!tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube is not locked' });
        continue;
      }

      // Unlock the tube
      const unlockedTube = tube.unlock();
      await this.tubeRepository.save(unlockedTube);

      unlocked.push(tubeId);
    }

    // Publish single batch event after all tubes processed
    if (unlocked.length > 0) {
      logger.info('🔓 [TubeService] Publishing TubesUnlockedEvent', {
        unlockedCount: unlocked.length,
        userId: authenticatedUser.id
      });
      await this.eventBus.publish(new TubesUnlockedEvent(
        unlocked,
        authenticatedUser.id
      ));
      logger.info('🔓 [TubeService] TubesUnlockedEvent published');
    }

    return { unlocked, skipped };
  }

  /**
   * Share tube access with other users
   * Batch share with partial success pattern
   */
  async shareTubeAccess(
    request: ShareTubeAccessRequest,
    authenticatedUser: User
  ): Promise<ShareAccessResult> {
    const shared: string[] = [];
    const skipped: SkippedTube[] = [];

    for (const tubeId of request.tubeIds) {
      const tube = await this.tubeRepository.findById(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      // Check share permission
      const accessResult = this.accessControlService.canShareTubeAccess(authenticatedUser, tube);
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      // Must be locked to share access
      if (!tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube must be locked to share access' });
        continue;
      }

      // Share with all users
      const updatedTube = tube.shareWith(request.userIds);

      await this.tubeRepository.save(updatedTube);

      shared.push(tubeId);
    }

    // Publish single batch event after all tubes processed
    if (shared.length > 0) {
      await this.eventBus.publish(new TubeAccessSharedEvent(
        shared,
        request.userIds,
        authenticatedUser.id
      ));
    }

    return { shared, skipped };
  }

  /**
   * Revoke tube access from users
   * Batch revoke with partial success pattern
   */
  async revokeTubeAccess(
    request: RevokeTubeAccessRequest,
    authenticatedUser: User
  ): Promise<RevokeAccessResult> {
    const revoked: string[] = [];
    const skipped: SkippedTube[] = [];

    for (const tubeId of request.tubeIds) {
      const tube = await this.tubeRepository.findById(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      // Check share permission (same as share access)
      const accessResult = this.accessControlService.canShareTubeAccess(authenticatedUser, tube);
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      // Must be locked to revoke access
      if (!tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube must be locked to revoke access' });
        continue;
      }

      // Revoke from all users
      const updatedTube = tube.revokeAccess(request.userIds);

      await this.tubeRepository.save(updatedTube);

      revoked.push(tubeId);
    }

    // Publish single batch event after all tubes processed
    if (revoked.length > 0) {
      await this.eventBus.publish(new TubeAccessRevokedEvent(
        revoked,
        request.userIds,
        authenticatedUser.id
      ));
    }

    return { revoked, skipped };
  }
}

// Type definitions for internal use
interface TubeCreationData {
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  sample: {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;
    media?: TubeMedia;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcher?: string;
}
