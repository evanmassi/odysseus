import { TubeRepository } from '@domain/repositories/TubeRepository';
import type { TubeSearchCriteria } from '@domain/types/repository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { Tube } from '@domain/entities/Tube';
import { Configuration } from '@domain/entities/Configuration';
import { User } from '@domain/entities/User';
import { TubePositionService } from '@domain/services/TubePositionService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { CreateTubeRequest, UpdateTubeRequest, TubeResponse, BulkUpdateRequest, TubeSearchRequest, TubeSearchResponse, TubeDto } from '@application/dto/TubeDto';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { EventBus } from '@application/contracts/EventBus';
import { logger } from '@utils/logger';
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
  private async getContainerInfo(tankId: string, rackId: string, boxId: string, preloadedConfig?: Configuration | null): Promise<{
    rack: { assignedUserId?: string | null };
    box: { assignedUserId?: string | null };
  } | null> {
    const config = preloadedConfig !== undefined ? preloadedConfig : await this.configurationRepository.getCurrent();
    if (!config) return null;

    const result = config.getBox(tankId, rackId, boxId);
    if (!result) return null;

    return {
      rack: { assignedUserId: result.rack.assignedUserId },
      box: { assignedUserId: result.box.assignedUserId },
    };
  }

  /**
   * Get tank IDs accessible to user based on demo status.
   * Demo users see only demo tanks; real users see only real tanks.
   */
  private async getAllowedTankIds(user: User): Promise<string[]> {
    const config = await this.configurationRepository.getCurrent();
    if (!config) return [];

    return config.getTankIdsForUserDemoStatus(user.isDemo);
  }

  private async getTubeOrThrow(id: string): Promise<Tube> {
    const tube = await this.tubeRepository.findById(id);
    if (!tube) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }
    return tube;
  }

  /**
   * Create a new tube.
   * Trust Zod-validated input, enforce business rules only.
   */
  async createTube(request: CreateTubeRequest, authenticatedUser: User, options?: { config?: Configuration | null; positionValidation?: { isValid: boolean; reason?: string }; researcherNameCache?: Map<string, string> }): Promise<TubeResponse> {
    // 1. Check permissions
    this.accessControlService.requireCanCreateTube(authenticatedUser);

    // 2. Map DTO to domain (thin, no logic)
    const tubeData = TubeDto.fromCreateRequest(request);

    // 2.1 Demo mode isolation: verify tank is accessible to user
    const config = options?.config !== undefined ? options.config : await this.configurationRepository.getCurrent();
    if (config) {
      const tank = config.tanks.find(t => t.id === tubeData.location.tankId);
      if (tank && tank.isDemo !== authenticatedUser.isDemo) {
        throw new PermissionError(
          authenticatedUser.isDemo
            ? 'Demo users can only create tubes in demo tanks'
            : 'Cannot create tubes in demo tanks',
          { tankId: tubeData.location.tankId }
        );
      }
    }

    // 2.5. Check container access (assignment protects the container)
    const containerInfo = await this.getContainerInfo(
      tubeData.location.tankId,
      tubeData.location.rackId,
      tubeData.location.boxId,
      options?.config
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
    if (options?.positionValidation) {
      // Use pre-validated result from batch validation
      if (!options.positionValidation.isValid) {
        throw new ValidationError(`Position conflict: ${options.positionValidation.reason}`, {
          position: `${tubeData.location.tankId}-${tubeData.location.rackId}-${tubeData.location.boxId}-${tubeData.location.position}`,
        });
      }
    } else {
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
    }

    // 4. Snapshot person name for historical tracking
    // If tube has a researcher, capture their name at creation time
    // This preserves historical accuracy if person changes name later
    let createdByName: string | undefined;
    if (tubeData.researcherId) {
      if (options?.researcherNameCache?.has(tubeData.researcherId)) {
        createdByName = options.researcherNameCache.get(tubeData.researcherId);
      } else {
        const researcher = await this.researcherRepository.findById(tubeData.researcherId);
        if (researcher) {
          const person = await this.personRepository.findById(researcher.personId);
          if (person) {
            createdByName = person.fullName;
          }
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
    await this.eventBus.publish(new TubeCreatedEvent(
      tube.id,
      tube.location,
      tube.sampleData,
      authenticatedUser.id
    ));

    return TubeDto.toResponse(tube);
  }

  /**
   * Create multiple tubes with partial failure handling.
   * Returns created tubes and any failures, matching bulkUpdateTubes pattern.
   */
  async createTubes(
    requests: CreateTubeRequest[],
    authenticatedUser: User
  ): Promise<{
    success: boolean;
    created: TubeResponse[];
    failed: Array<{ index: number; request: CreateTubeRequest; error: string }>;
  }> {
    const config = await this.configurationRepository.getCurrent();

    // Pre-fetch researcher names in bulk (2 queries total instead of 2 per tube)
    const researcherNameCache = new Map<string, string>();
    const uniqueResearcherIds = [...new Set(
      requests.map(r => r.researcherId).filter((id): id is string => !!id)
    )];
    if (uniqueResearcherIds.length > 0) {
      const researchers = await this.researcherRepository.findByIds(uniqueResearcherIds);
      const personIds = [...new Set(researchers.map(r => r.personId))];
      if (personIds.length > 0) {
        const persons = await this.personRepository.findByIds(personIds);
        const personMap = new Map(persons.map(p => [p.id, p.fullName]));
        for (const researcher of researchers) {
          const name = personMap.get(researcher.personId);
          if (name) {
            researcherNameCache.set(researcher.id, name);
          }
        }
      }
    }

    // Batch position validation per box group (~2 queries per box instead of per tube)
    const positionValidations = new Map<number, { isValid: boolean; reason?: string }>();
    if (config) {
      // Group requests by box
      const boxGroups = new Map<string, Array<{ index: number; req: CreateTubeRequest }>>();
      for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        const loc = req.location;
        const key = `${loc.tankId}-${loc.rackId}-${loc.boxId}`;
        if (!boxGroups.has(key)) boxGroups.set(key, []);
        boxGroups.get(key)!.push({ index: i, req });
      }

      for (const [, group] of boxGroups) {
        const { tankId, rackId, boxId } = group[0].req.location;
        const [occupiedArr, tubesInBox] = await Promise.all([
          this.tubeRepository.getOccupiedPositions(tankId, rackId, boxId),
          this.tubeRepository.findByCompleteLocation(tankId, rackId, boxId),
        ]);
        const occupiedPositions = new Set(occupiedArr);
        const boxInfo = config.getBox(tankId, rackId, boxId);
        const maxPosition = boxInfo?.box.maxPositions ?? 0;

        const batchResults = this.tubePositionService.validatePositionBatch(
          group.map(g => ({
            tankId,
            rackId,
            boxId,
            position: g.req.location.position,
          })),
          { config, occupiedPositions, maxPosition, tubesInBox }
        );

        for (const { index, req } of group) {
          const result = batchResults.get(req.location.position);
          if (result) {
            positionValidations.set(index, result);
          }
        }
      }
    }

    const { succeeded: created, failed } = await this.executeBatch(
      requests,
      (req, index) => this.createTube(req, authenticatedUser, {
        config,
        positionValidation: positionValidations.get(index),
        researcherNameCache,
      }),
      (req, index, error) => ({ index, request: req, error })
    );

    return { success: failed.length === 0, created, failed };
  }

  /**
   * Get tube by ID
   */
  async getTubeById(id: string, authenticatedUser: User): Promise<TubeResponse> {
    const tube = await this.getTubeOrThrow(id);

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
   * Get all tubes with filtering.
   * Applies demo mode isolation: demo users see only demo tanks, real users see only real tanks.
   */
  async getAllTubes(authenticatedUser: User, searchRequest?: TubeSearchRequest): Promise<TubeResponse[]> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    // Get allowed tank IDs based on user's demo status
    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser);

    let tubes: Tube[];

    if (searchRequest && Object.keys(searchRequest).length > 0) {
      // Merge demo tank filter with search criteria
      // If user specifies tankId, validate it's in allowed list; otherwise use all allowed
      const requestedTankId = searchRequest.tankId;
      const filteredTankIds = requestedTankId && allowedTankIds.includes(requestedTankId)
        ? [requestedTankId]
        : allowedTankIds;

      const filteredCriteria: TubeSearchCriteria = {
        ...searchRequest,
        tankIds: filteredTankIds
      };
      tubes = await this.tubeRepository.search(filteredCriteria);
    } else {
      tubes = await this.tubeRepository.findByTankIds(allowedTankIds);
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
   * Search tubes with advanced criteria.
   * Applies demo mode isolation.
   */
  async searchTubes(
    searchRequest: TubeSearchRequest,
    authenticatedUser: User
  ): Promise<TubeResponse[]> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    // Apply demo tank filter
    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser);
    // If user specifies tankId, validate it's in allowed list; otherwise use all allowed
    const requestedTankId = searchRequest.tankId;
    const filteredTankIds = requestedTankId && allowedTankIds.includes(requestedTankId)
      ? [requestedTankId]
      : allowedTankIds;

    const filteredCriteria: TubeSearchCriteria = {
      ...searchRequest,
      tankIds: filteredTankIds
    };

    const tubes = await this.tubeRepository.search(filteredCriteria);

    return TubeDto.toResponseList(tubes);
  }

  /**
   * Search tubes with highlighting.
   * Applies demo mode isolation.
   */
  async searchTubesWithHighlighting(
    searchRequest: TubeSearchRequest,
    authenticatedUser: User
  ): Promise<TubeSearchResponse> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    // Apply demo tank filter
    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser);
    // If user specifies tankId, validate it's in allowed list; otherwise use all allowed
    const requestedTankId = searchRequest.tankId;
    const filteredTankIds = requestedTankId && allowedTankIds.includes(requestedTankId)
      ? [requestedTankId]
      : allowedTankIds;

    const filteredCriteria: TubeSearchCriteria = {
      ...searchRequest,
      tankIds: filteredTankIds
    };

    const result = await this.tubeRepository.searchWithHighlighting(filteredCriteria);

    return {
      tubes: TubeDto.toResponseList(result.tubes),
      matchedTerms: result.matchedTerms
    };
  }

  /**
   * Update tube
   * Trust Zod-validated input, check business rules only
   */
  async updateTube(id: string, request: UpdateTubeRequest, authenticatedUser: User, options?: { config?: Configuration | null; preloadedTube?: Tube }): Promise<TubeResponse> {
    const existingTube = options?.preloadedTube ?? await this.getTubeOrThrow(id);

    // Check access: container ownership OR shared access to this tube
    const containerInfo = await this.getContainerInfo(
      existingTube.location.tankId,
      existingTube.location.rackId,
      existingTube.location.boxId,
      options?.config
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
        const destContainerInfo = await this.getContainerInfo(newTankId, newRackId, newBoxId, options?.config);
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

    // Save with optimistic locking to prevent concurrent modification overwrites
    await this.tubeRepository.saveWithOptimisticLock(updatedTube, existingTube.version);

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
  async deleteTube(id: string, authenticatedUser: User, options?: { config?: Configuration | null; preloadedTube?: Tube }): Promise<void> {
    const tube = options?.preloadedTube ?? await this.getTubeOrThrow(id);

    // Check access: container ownership OR shared access to this tube
    const containerInfo = await this.getContainerInfo(
      tube.location.tankId,
      tube.location.rackId,
      tube.location.boxId,
      options?.config
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
    await this.eventBus.publish(new TubeDeletedEvent(
      tube.id,
      tube.location,
      authenticatedUser.id,
      tube.sampleData
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
    // No upfront permission check — each tube is authorized individually
    // This allows users to batch edit tubes they have access to (own space or shared access)
    const config = await this.configurationRepository.getCurrent();

    // Pre-fetch all tubes in one query
    const tubeIds = request.updates.map(u => u.id);
    const tubes = await this.tubeRepository.findByIds(tubeIds);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    const { succeeded: updated, failed } = await this.executeBatch(
      request.updates,
      async (item) => {
        const preloadedTube = tubeMap.get(item.id);
        await this.updateTube(item.id, item.updates, authenticatedUser, { config, preloadedTube });
        return item.id;
      },
      (item, _index, error) => ({ id: item.id, error })
    );

    // Publish bulk update event (only if some succeeded)
    if (updated.length > 0) {
      const tankIds = [...new Set(updated.map(id => tubeMap.get(id)!.location.tankId))];
      await this.eventBus.publish(new BulkTubesUpdatedEvent(
        updated,
        tankIds,
        authenticatedUser.id,
        { updated: updated.length, failed: failed.length }
      ));
    }

    return { success: failed.length === 0, updated, failed };
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
    // No upfront permission check — each tube is authorized individually
    // This allows users to delete tubes they have access to (own space or shared access)
    // Consistent with bulkUpdateTubes which uses the same per-tube authorization pattern
    const config = await this.configurationRepository.getCurrent();

    // Pre-fetch all tubes in one query
    const tubes = await this.tubeRepository.findByIds(tubeIds);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    // Validate permissions per tube, collect valid IDs
    const validatedIds: string[] = [];
    const validatedTubes: Tube[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of tubeIds) {
      const tube = tubeMap.get(id);
      if (!tube) {
        failed.push({ id, error: `Tube not found: ${id}` });
        continue;
      }

      try {
        // Check access: container ownership OR shared access
        const containerInfo = await this.getContainerInfo(
          tube.location.tankId,
          tube.location.rackId,
          tube.location.boxId,
          config
        );
        if (containerInfo) {
          const tubeAccess = this.accessControlService.canAccessTubeForModification(
            authenticatedUser,
            tube,
            containerInfo
          );
          if (!tubeAccess.allowed) {
            failed.push({ id, error: tubeAccess.reason });
            continue;
          }
        }

        validatedIds.push(id);
        validatedTubes.push(tube);
      } catch (error) {
        failed.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Bulk delete all validated tubes in one query
    if (validatedIds.length > 0) {
      await this.tubeRepository.deleteMany(validatedIds);

      // Publish per-tube events (same events as individual deleteTube)
      for (const tube of validatedTubes) {
        await this.eventBus.publish(new TubeDeletedEvent(
          tube.id,
          tube.location,
          authenticatedUser.id,
          tube.sampleData
        ));
      }
    }

    return { success: failed.length === 0, deleted: validatedIds, failed };
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

    const config = await this.configurationRepository.getCurrent();
    const tubes = await this.tubeRepository.findByIds(request.tubeIds);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      // Check container access first (assignment protects the container)
      const containerInfo = await this.getContainerInfo(
        tube.location.tankId,
        tube.location.rackId,
        tube.location.boxId,
        config
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

      // Lock the tube with optimistic locking
      const lockedTube = tube.lock(authenticatedUser.id, request.lockNote);
      try {
        await this.tubeRepository.saveWithOptimisticLock(lockedTube, tube.version);
        locked.push(tubeId);
      } catch (error) {
        // Version conflict means someone else modified the tube
        skipped.push({ tubeId, reason: 'Tube was modified by another user' });
      }
    }

    // Publish single batch event after all tubes processed
    if (locked.length > 0) {
      const tankIds = [...new Set(locked.map(id => tubeMap.get(id)!.location.tankId))];
      logger.debug('[TubeService] Publishing TubesLockedEvent', {
        lockedCount: locked.length,
      });
      await this.eventBus.publish(new TubesLockedEvent(
        locked,
        tankIds,
        authenticatedUser.id,
        request.lockNote
      ));
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

    const tubes = await this.tubeRepository.findByIds(request.tubeIds);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

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

      // Unlock the tube with optimistic locking
      const unlockedTube = tube.unlock();
      try {
        await this.tubeRepository.saveWithOptimisticLock(unlockedTube, tube.version);
        unlocked.push(tubeId);
      } catch (error) {
        // Version conflict means someone else modified the tube
        skipped.push({ tubeId, reason: 'Tube was modified by another user' });
      }
    }

    // Publish single batch event after all tubes processed
    if (unlocked.length > 0) {
      const tankIds = [...new Set(unlocked.map(id => tubeMap.get(id)!.location.tankId))];
      logger.debug('[TubeService] Publishing TubesUnlockedEvent', {
        unlockedCount: unlocked.length,
      });
      await this.eventBus.publish(new TubesUnlockedEvent(
        unlocked,
        tankIds,
        authenticatedUser.id
      ));
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
    const tubeSharedUsers: Array<{ tubeId: string; sharedWithUserIds: string[] }> = [];

    // Validate all share targets exist and have same demo status
    const targetUsers = await this.userRepository.findByIds(request.userIds);

    if (targetUsers.length !== request.userIds.length) {
      throw new Error('One or more users not found');
    }

    const invalidUsers = targetUsers.filter(u => u.isDemo !== authenticatedUser.isDemo);
    if (invalidUsers.length > 0) {
      throw new Error('Cannot share tubes with users of different demo status');
    }

    const tubes = await this.tubeRepository.findByIds(request.tubeIds);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

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

      // Share with all validated users
      const updatedTube = tube.shareWith(request.userIds);

      await this.tubeRepository.save(updatedTube);

      shared.push(tubeId);
      tubeSharedUsers.push({ tubeId, sharedWithUserIds: updatedTube.sharedWithUserIds });
    }

    // Publish single batch event after all tubes processed
    if (shared.length > 0) {
      const tankIds = [...new Set(shared.map(id => tubeMap.get(id)!.location.tankId))];
      await this.eventBus.publish(new TubeAccessSharedEvent(
        shared,
        tankIds,
        request.userIds,
        tubeSharedUsers,
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
    const tubeSharedUsers: Array<{ tubeId: string; sharedWithUserIds: string[] }> = [];

    const tubes = await this.tubeRepository.findByIds(request.tubeIds);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

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
      tubeSharedUsers.push({ tubeId, sharedWithUserIds: updatedTube.sharedWithUserIds });
    }

    // Publish single batch event after all tubes processed
    if (revoked.length > 0) {
      const tankIds = [...new Set(revoked.map(id => tubeMap.get(id)!.location.tankId))];
      await this.eventBus.publish(new TubeAccessRevokedEvent(
        revoked,
        tankIds,
        request.userIds,
        tubeSharedUsers,
        authenticatedUser.id
      ));
    }

    return { revoked, skipped };
  }

  /** Server-side aggregation avoids fetching all tubes over the network. */
  async getStats(authenticatedUser: User): Promise<{
    totalTubes: number;
    tubesByTank: Record<string, number>;
    tubesByResearcher: Record<string, number>;
    averageTubesPerBox: number;
    oldestTube?: { id: string; createdAt: string };
    newestTube?: { id: string; createdAt: string };
    completionRate: number;
    expirationRate: number;
  }> {
    this.accessControlService.requireCanViewTubes(authenticatedUser);

    const stats = await this.tubeRepository.getStats();

    // Serialize dates to ISO strings for JSON response
    return {
      totalTubes: stats.totalTubes,
      tubesByTank: stats.tubesByTank,
      tubesByResearcher: stats.tubesByResearcher,
      averageTubesPerBox: stats.averageTubesPerBox,
      oldestTube: stats.oldestTube
        ? { id: stats.oldestTube.id, createdAt: stats.oldestTube.createdAt.toISOString() }
        : undefined,
      newestTube: stats.newestTube
        ? { id: stats.newestTube.id, createdAt: stats.newestTube.createdAt.toISOString() }
        : undefined,
      completionRate: stats.completionRate,
      expirationRate: stats.expirationRate,
    };
  }

  /**
   * Execute an operation on each item, collecting successes and failures.
   * Shared scaffold for createTubes, bulkUpdateTubes, and bulkDeleteTubes.
   */
  private async executeBatch<TItem, TSuccess, TFailure>(
    items: TItem[],
    operation: (item: TItem, index: number) => Promise<TSuccess>,
    onFailure: (item: TItem, index: number, error: string) => TFailure
  ): Promise<{ succeeded: TSuccess[]; failed: TFailure[] }> {
    const succeeded: TSuccess[] = [];
    const failed: TFailure[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        succeeded.push(await operation(items[i], i));
      } catch (error) {
        failed.push(onFailure(items[i], i, error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    return { succeeded, failed };
  }
}
