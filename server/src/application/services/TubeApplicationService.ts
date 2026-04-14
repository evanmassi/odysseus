/**
 * Tube Management Service
 *
 * Orchestrates tube CRUD, locking, and access sharing with per-tube authorization.
 * Input validation is handled by Zod middleware; this layer enforces business rules only.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { TubeDto } from '@application/dto/TubeDto';
import type { CreateTubeRequest, UpdateTubeRequest, TubeResponse, BulkUpdateRequest, TubeSearchResponse } from '@application/dto/TubeDto';
import type { Storage } from '@domain/entities/Storage';
import { Tube } from '@domain/entities/Tube';
import type { User } from '@domain/entities/User';
import { Location } from '@domain/value-objects/Location';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ConflictError } from '@domain/errors/ConflictError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  TubeCreatedEvent,
  TubeUpdatedEvent,
  TubeLocationChangedEvent,
  TubeDeletedEvent,
  BulkTubesCreatedEvent,
  BulkTubesUpdatedEvent,
  BulkTubesDeletedEvent,
  BulkTubesMovedEvent,
  type BulkTubeCreatedDetail,
  type BulkTubeUpdatedDetail,
  type BulkTubeDeletedDetail,
  type BulkTubeMovedDetail,
} from '@domain/events/TubeEvents';
import {
  TubesLockedEvent,
  TubesUnlockedEvent,
  TubeAccessSharedEvent,
  TubeAccessRevokedEvent
} from '@domain/events/TubeLockEvents';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { TubePositionService } from '@domain/services/TubePositionService';
import type { TubeSearchCriteria } from '@domain/types/repository';
import { logger } from '@infrastructure/logging/logger';

import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest,
  BulkLockResult,
  BulkUnlockResult,
  ShareAccessResult,
  RevokeAccessResult,
  SkippedTube
} from '@odysseus/shared-schemas';

export class TubeApplicationService {
  constructor(
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private personRepository: PersonRepository,
    private storageRepository: StorageRepository,
    private tubePositionService: TubePositionService,
    private accessControlService: AccessControlService,
    private eventBus: EventBus,
    private ensureDonorExists?: (labId: string, sourceId?: string, internalId?: string, species?: string) => Promise<void>
  ) {}

  private async getContainerInfo(labId: string, tankId: string, rackId: string, boxId: string, preloadedConfig?: Storage | null): Promise<{
    rack: { assignedUserId?: string | null };
    box: { assignedUserId?: string | null };
  } | null> {
    const config = preloadedConfig !== undefined ? preloadedConfig : await this.storageRepository.getForLab(labId);
    if (!config) return null;

    const result = config.getBox(tankId, rackId, boxId);
    if (!result) return null;

    return {
      rack: { assignedUserId: result.rack.assignedUserId },
      box: { assignedUserId: result.box.assignedUserId },
    };
  }

  private async getAllowedTankIds(labId: string): Promise<string[]> {
    const config = await this.storageRepository.getForLab(labId);
    if (!config) return [];

    return config.tanks.map(t => t.id);
  }

  private async getTubeOrThrow(id: string, labId: string): Promise<Tube> {
    const tube = await this.tubeRepository.findById(id, labId);
    if (!tube) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }
    return tube;
  }

  async createTube(request: CreateTubeRequest, authenticatedUser: User, options?: { config?: Storage | null; positionValidation?: { isValid: boolean; reason?: string }; researcherNameCache?: Map<string, string>; bulkOperation?: boolean }): Promise<TubeResponse> {
    await this.accessControlService.requireCanCreateTube(authenticatedUser);

    const tubeData = TubeDto.fromCreateRequest(request);

    const containerInfo = await this.getContainerInfo(
      authenticatedUser.labId!,
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

    if (options?.positionValidation) {
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
        undefined,
        authenticatedUser.labId!
      );

      if (!positionResult.isValid) {
        throw new ValidationError(`Position conflict: ${positionResult.reason}`, {
          position: `${tubeData.location.tankId}-${tubeData.location.rackId}-${tubeData.location.boxId}-${tubeData.location.position}`,
          conflicts: positionResult.conflicts
        });
      }
    }

    // Snapshot person name at creation time for historical accuracy
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

    const tube = Tube.create({
      ...tubeData,
      createdByName,
      labId: authenticatedUser.labId
    });

    await this.tubeRepository.save(tube);

    const sample = tube.sample;
    if (this.ensureDonorExists && (sample.donorSourceId ?? sample.donorInternalId)) {
      await this.ensureDonorExists(
        authenticatedUser.labId!, sample.donorSourceId, sample.donorInternalId, sample.species
      );
    }

    const createdEvent = new TubeCreatedEvent(
      tube.id,
      tube.location,
      tube.sample,
      authenticatedUser.id,
      authenticatedUser.labId!
    );
    if (options?.bulkOperation) createdEvent.partOfBulkOperation = true;
    await this.eventBus.publish(createdEvent);

    return TubeDto.toResponse(tube);
  }

  async createTubes(
    requests: CreateTubeRequest[],
    authenticatedUser: User
  ): Promise<{
    created: TubeResponse[];
    failed: Array<{ index: number; request: CreateTubeRequest; error: string }>;
  }> {
    const config = await this.storageRepository.getForLab(authenticatedUser.labId!);

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

    const positionValidations = new Map<number, { isValid: boolean; reason?: string }>();
    if (config) {
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
          this.tubeRepository.getOccupiedPositions(tankId, rackId, boxId, authenticatedUser.labId!),
          this.tubeRepository.findByCompleteLocation(tankId, rackId, boxId, authenticatedUser.labId!),
        ]);
        const occupiedPositions = new Set(occupiedArr);
        const boxInfo = config.getBox(tankId, rackId, boxId);
        const maxPosition = boxInfo?.box.maxPositions ?? 0;

        const bulkResults = this.tubePositionService.validatePositionBulk(
          group.map(g => ({
            tankId,
            rackId,
            boxId,
            position: g.req.location.position,
          })),
          { config, occupiedPositions, maxPosition, tubesInBox }
        );

        for (const { index, req } of group) {
          const result = bulkResults.get(req.location.position);
          if (result) {
            positionValidations.set(index, result);
          }
        }
      }
    }

    const { succeeded: created, failed } = await this.executeBulk(
      requests,
      (req, index) => this.createTube(req, authenticatedUser, {
        config,
        positionValidation: positionValidations.get(index),
        researcherNameCache,
        bulkOperation: true,
      }),
      (req, index, error) => ({ index, request: req, error })
    );

    if (created.length > 0) {
      const tankIds = [...new Set(created.map(t => t.location.tankId))];
      const perItemData: BulkTubeCreatedDetail[] = created.map(t => ({
        tubeId: t.id,
        location: t.location as BulkTubeCreatedDetail['location'],
        sampleData: t.sample as BulkTubeCreatedDetail['sampleData'],
      }));
      const bulkCreatedEvent = new BulkTubesCreatedEvent(
        created.map(t => t.id),
        tankIds,
        authenticatedUser.id,
        authenticatedUser.labId!,
        perItemData
      );
      await this.eventBus.publish(bulkCreatedEvent);
    }

    return { created, failed };
  }

  async getTubeById(id: string, authenticatedUser: User): Promise<TubeResponse> {
    const tube = await this.getTubeOrThrow(id, authenticatedUser.labId!);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    if (!allowedTankIds.includes(tube.location.tankId)) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }

    const containerInfo = await this.getContainerInfo(
      authenticatedUser.labId!,
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

  async getTubesByIds(ids: string[], authenticatedUser: User): Promise<TubeResponse[]> {
    await this.accessControlService.requireCanViewTubes(authenticatedUser);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    const allowedTankSet = new Set(allowedTankIds);

    const tubes = await this.tubeRepository.findByIds(ids, authenticatedUser.labId!);
    const filtered = tubes.filter(t => allowedTankSet.has(t.location.tankId));

    return TubeDto.toResponseList(filtered);
  }

  async getAllTubes(authenticatedUser: User): Promise<TubeResponse[]> {
    await this.accessControlService.requireCanViewTubes(authenticatedUser);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    const tubes = await this.tubeRepository.findByTankIds(allowedTankIds, authenticatedUser.labId!);

    return TubeDto.toResponseList(tubes);
  }

  async getTubesByLocation(
    tankId: string,
    rackId: string,
    boxId: string,
    authenticatedUser: User
  ): Promise<TubeResponse[]> {
    await this.accessControlService.requireCanViewTubes(authenticatedUser);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    if (!allowedTankIds.includes(tankId)) {
      return [];
    }

    const tubes = await this.tubeRepository.findByCompleteLocation(tankId, rackId, boxId, authenticatedUser.labId!);

    return TubeDto.toResponseList(tubes);
  }

  /**
   * Get tubes by rack and box (legacy - prefer getTubesByLocation).
   */
  async getTubesByRackAndBox(
    rackId: string,
    boxId: string,
    authenticatedUser: User
  ): Promise<TubeResponse[]> {
    await this.accessControlService.requireCanViewTubes(authenticatedUser);

    const tubes = await this.tubeRepository.findByRackAndBox(rackId, boxId, authenticatedUser.labId!);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    const filteredTubes = tubes.filter(tube => allowedTankIds.includes(tube.location.tankId));

    return TubeDto.toResponseList(filteredTubes);
  }

  async searchTubesWithHighlighting(
    criteria: TubeSearchCriteria,
    authenticatedUser: User
  ): Promise<TubeSearchResponse> {
    await this.accessControlService.requireCanViewTubes(authenticatedUser);

    const filteredCriteria = await this.restrictCriteriaToAllowedTanks(criteria, authenticatedUser.labId!);
    const result = await this.tubeRepository.searchWithHighlighting(filteredCriteria, authenticatedUser.labId!);

    return {
      tubes: TubeDto.toResponseList(result.tubes),
      matchedTerms: result.matchedTerms
    };
  }

  private async restrictCriteriaToAllowedTanks(criteria: TubeSearchCriteria, labId: string): Promise<TubeSearchCriteria> {
    const allowedTankIds = await this.getAllowedTankIds(labId);
    const requested = criteria.tankIds ?? (criteria.tankId ? [criteria.tankId] : undefined);
    const tankIds = requested
      ? requested.filter(id => allowedTankIds.includes(id))
      : allowedTankIds;

    return { ...criteria, tankIds };
  }

  async updateTube(id: string, request: UpdateTubeRequest, authenticatedUser: User, options?: { config?: Storage | null; preloadedTube?: Tube; bulkOperation?: boolean }): Promise<TubeResponse> {
    const existingTube = options?.preloadedTube ?? await this.getTubeOrThrow(id, authenticatedUser.labId!);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    if (!allowedTankIds.includes(existingTube.location.tankId)) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }

    const containerInfo = await this.getContainerInfo(
      authenticatedUser.labId!,
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

    const hasLocationUpdate = request.location && (
      request.location.tankId ?? request.location.rackId ?? 
      request.location.boxId ?? request.location.position !== undefined
    );
    
    if (hasLocationUpdate && request.location) {
      const newTankId = request.location.tankId ?? existingTube.location.tankId;
      const newRackId = request.location.rackId ?? existingTube.location.rackId;
      const newBoxId = request.location.boxId ?? existingTube.location.boxId;
      const newPosition = request.location.position ?? existingTube.location.position;

      const positionChanged = (
        newTankId !== existingTube.location.tankId ||
        newRackId !== existingTube.location.rackId ||
        newBoxId !== existingTube.location.boxId ||
        newPosition !== existingTube.location.position
      );

      if (positionChanged) {
        if (!allowedTankIds.includes(newTankId)) {
          throw new PermissionError('Cannot move tube to inaccessible tank', { tankId: newTankId });
        }

        const destContainerInfo = await this.getContainerInfo(authenticatedUser.labId!, newTankId, newRackId, newBoxId, options?.config);
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
          id,
          authenticatedUser.labId!
        );

        if (!positionResult.isValid) {
          throw new ValidationError(`Position conflict: ${positionResult.reason}`, {
            position: `${newTankId}-${newRackId}-${newBoxId}-${newPosition}`,
            conflicts: positionResult.conflicts
          });
        }
      }
    }

    if (request.lockNote !== undefined) {
      if (!existingTube.isLocked) {
        throw new PermissionError('Cannot update lock note on unlocked tube', { tubeId: id });
      }
      if (existingTube.lockedBy !== authenticatedUser.id) {
        throw new PermissionError('Only the lock owner can update the lock note', { tubeId: id });
      }
    }

    const oldLocation = existingTube.location;
    const oldSampleData = existingTube.sample;

    const updateData = TubeDto.fromUpdateRequest(request);

    let updatedTube = existingTube.update(updateData);

    if (request.lockNote !== undefined) {
      updatedTube = updatedTube.updateLockNote(request.lockNote || undefined);
    }

    await this.tubeRepository.saveWithOptimisticLock(updatedTube, existingTube.version);

    // Auto-create donor registry stub if donor IDs changed to new values
    const updatedSample = updatedTube.sample;
    const donorIdsChanged = updatedSample.donorSourceId !== oldSampleData.donorSourceId
      || updatedSample.donorInternalId !== oldSampleData.donorInternalId;
    if (this.ensureDonorExists && donorIdsChanged && (updatedSample.donorSourceId ?? updatedSample.donorInternalId)) {
      await this.ensureDonorExists(
        authenticatedUser.labId!, updatedSample.donorSourceId, updatedSample.donorInternalId, updatedSample.species
      );
    }

    const locationChanged = !oldLocation.equals(updatedTube.location);

    if (locationChanged) {
      const locationEvent = new TubeLocationChangedEvent(
        updatedTube.id,
        oldLocation,
        updatedTube.location,
        authenticatedUser.id,
        authenticatedUser.labId!
      );
      if (options?.bulkOperation) locationEvent.partOfBulkOperation = true;
      await this.eventBus.publish(locationEvent);
    }

    const updateEvent = new TubeUpdatedEvent(
      updatedTube.id,
      oldLocation,
      updatedTube.location,
      oldSampleData,
      updatedTube.sample,
      authenticatedUser.id,
      authenticatedUser.labId!
    );
    if (options?.bulkOperation) updateEvent.partOfBulkOperation = true;
    await this.eventBus.publish(updateEvent);

    return TubeDto.toResponse(updatedTube);
  }

  async deleteTube(id: string, authenticatedUser: User, options?: { config?: Storage | null; preloadedTube?: Tube }): Promise<void> {
    const tube = options?.preloadedTube ?? await this.getTubeOrThrow(id, authenticatedUser.labId!);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    if (!allowedTankIds.includes(tube.location.tankId)) {
      throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
    }

    const containerInfo = await this.getContainerInfo(
      authenticatedUser.labId!,
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

    await this.tubeRepository.delete(id, authenticatedUser.labId!);

    const deletedEvent = new TubeDeletedEvent(
      tube.id,
      tube.location,
      authenticatedUser.id,
      tube.sample,
      authenticatedUser.labId!
    );
    await this.eventBus.publish(deletedEvent);
  }

  async bulkUpdateTubes(
    request: BulkUpdateRequest,
    authenticatedUser: User
  ): Promise<{
    updated: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const config = await this.storageRepository.getForLab(authenticatedUser.labId!);

    const tubeIds = request.updates.map(u => u.id);
    const tubes = await this.tubeRepository.findByIds(tubeIds, authenticatedUser.labId!);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    const { succeeded: updated, failed } = await this.executeBulk(
      request.updates,
      async (item) => {
        const preloadedTube = tubeMap.get(item.id);
        await this.updateTube(item.id, item.updates, authenticatedUser, { config, preloadedTube, bulkOperation: true });
        return item.id;
      },
      (item, _index, error) => ({ id: item.id, error })
    );

    if (updated.length > 0) {
      const tankIds = [...new Set(updated.map(id => tubeMap.get(id)!.location.tankId))];
      const updateMap = new Map(request.updates.map(u => [u.id, u.updates]));
      const perItemData: BulkTubeUpdatedDetail[] = updated.map(id => {
        const tube = tubeMap.get(id)!;
        const updates = updateMap.get(id) ?? {};
        const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = Object.entries(updates)
          .filter(([, v]) => v !== undefined)
          .map(([field, newValue]) => ({ field, oldValue: undefined, newValue }));
        return { tubeId: id, changes, location: tube.location.toData() };
      });
      const bulkUpdateEvent = new BulkTubesUpdatedEvent(
        updated,
        tankIds,
        authenticatedUser.id,
        { updated: updated.length, failed: failed.length },
        authenticatedUser.labId!,
        perItemData
      );
      await this.eventBus.publish(bulkUpdateEvent);
    }

    return { updated, failed };
  }

  async bulkDeleteTubes(
    tubeIds: string[],
    authenticatedUser: User
  ): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const config = await this.storageRepository.getForLab(authenticatedUser.labId!);

    const tubes = await this.tubeRepository.findByIds(tubeIds, authenticatedUser.labId!);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    const allowedTankSet = new Set(allowedTankIds);

    const validatedIds: string[] = [];
    const validatedTubes: Tube[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of tubeIds) {
      const tube = tubeMap.get(id);
      if (!tube) {
        failed.push({ id, error: `Tube not found: ${id}` });
        continue;
      }

      if (!allowedTankSet.has(tube.location.tankId)) {
        failed.push({ id, error: `Tube not found: ${id}` });
        continue;
      }

      try {
        const containerInfo = await this.getContainerInfo(
          authenticatedUser.labId!,
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

    if (validatedIds.length > 0) {
      await this.tubeRepository.deleteMany(validatedIds, authenticatedUser.labId!);

      for (const tube of validatedTubes) {
        const deleteEvent = new TubeDeletedEvent(
          tube.id,
          tube.location,
          authenticatedUser.id,
          tube.sample,
          authenticatedUser.labId!
        );
        deleteEvent.partOfBulkOperation = true;
        await this.eventBus.publish(deleteEvent);
      }

      const tankIds = [...new Set(validatedTubes.map(t => t.location.tankId))];
      const perItemData: BulkTubeDeletedDetail[] = validatedTubes.map(tube => ({
        tubeId: tube.id,
        location: tube.location.toData(),
        sampleData: tube.sample.toData(),
      }));
      const bulkDeletedEvent = new BulkTubesDeletedEvent(
        validatedIds,
        tankIds,
        authenticatedUser.id,
        authenticatedUser.labId!,
        perItemData
      );
      await this.eventBus.publish(bulkDeletedEvent);
    }

    return { deleted: validatedIds, failed };
  }

  /** Atomically moves tubes to new locations with position validation. Emits per-tube TubeLocationChangedEvent for audit and one BulkTubesMovedEvent for socket. */
  async moveTubes(
    moves: Array<{ tubeId: string; version: number; destination: { tankId: string; rackId: string; boxId: string; position: number } }>,
    authenticatedUser: User
  ): Promise<{
    moved: TubeResponse[];
    failed: Array<{ tubeId: string; error: string }>;
  }> {
    const labId = authenticatedUser.labId!;
    const config = await this.storageRepository.getForLab(labId);

    const tubeIds = moves.map(m => m.tubeId);
    const tubes = await this.tubeRepository.findByIds(tubeIds, labId);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    const allowedTankIds = await this.getAllowedTankIds(labId);
    const allowedTankSet = new Set(allowedTankIds);

    const moved: TubeResponse[] = [];
    const failed: Array<{ tubeId: string; error: string }> = [];
    const moveDetails: BulkTubeMovedDetail[] = [];
    const sourceTankIds = new Set<string>();
    const destinationTankIds = new Set<string>();

    for (const move of moves) {
      const tube = tubeMap.get(move.tubeId);
      if (!tube) {
        failed.push({ tubeId: move.tubeId, error: 'Tube not found' });
        continue;
      }

      if (!allowedTankSet.has(tube.location.tankId)) {
        failed.push({ tubeId: move.tubeId, error: 'Tube not found' });
        continue;
      }

      if (!allowedTankSet.has(move.destination.tankId)) {
        failed.push({ tubeId: move.tubeId, error: 'Destination not accessible' });
        continue;
      }

      try {
        const sourceContainerInfo = await this.getContainerInfo(
          labId, tube.location.tankId, tube.location.rackId, tube.location.boxId, config
        );
        if (sourceContainerInfo) {
          const sourceAccess = this.accessControlService.canAccessTubeForModification(
            authenticatedUser, tube, sourceContainerInfo
          );
          if (!sourceAccess.allowed) {
            failed.push({ tubeId: move.tubeId, error: sourceAccess.reason });
            continue;
          }
        }

        const destContainerInfo = await this.getContainerInfo(
          labId, move.destination.tankId, move.destination.rackId, move.destination.boxId, config
        );
        if (destContainerInfo) {
          const destAccess = this.accessControlService.canAccessContainer(
            authenticatedUser, destContainerInfo
          );
          if (!destAccess.allowed) {
            failed.push({ tubeId: move.tubeId, error: `Cannot move to destination: ${destAccess.reason}` });
            continue;
          }
        }

        const positionResult = await this.tubePositionService.validatePosition(
          move.destination.tankId, move.destination.rackId, move.destination.boxId,
          move.destination.position, move.tubeId, labId
        );
        if (!positionResult.isValid) {
          failed.push({ tubeId: move.tubeId, error: `Position conflict: ${positionResult.reason}` });
          continue;
        }

        const oldLocation = tube.location;
        const newLocation = Location.create(move.destination);
        tube.moveTo(newLocation);

        await this.tubeRepository.saveWithOptimisticLock(tube, move.version);

        sourceTankIds.add(oldLocation.tankId);
        destinationTankIds.add(newLocation.tankId);

        const locationEvent = new TubeLocationChangedEvent(
          tube.id, oldLocation, newLocation, authenticatedUser.id, labId
        );
        if (moves.length > 1) locationEvent.partOfBulkOperation = true;
        await this.eventBus.publish(locationEvent);

        moveDetails.push({
          tubeId: tube.id,
          oldLocation: oldLocation.toData(),
          newLocation: newLocation.toData(),
        });
        moved.push(TubeDto.toResponse(tube));
      } catch (error) {
        if (error instanceof ConflictError) {
          failed.push({ tubeId: move.tubeId, error: 'Tube was modified by another user' });
        } else {
          failed.push({ tubeId: move.tubeId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    if (moved.length > 1) {
      const bulkMovedEvent = new BulkTubesMovedEvent(
        moved.map(t => t.id),
        [...sourceTankIds],
        [...destinationTankIds],
        authenticatedUser.id,
        labId,
        moveDetails
      );
      await this.eventBus.publish(bulkMovedEvent);
    }

    return { moved, failed };
  }

  async lockTubes(
    request: LockTubesRequest,
    authenticatedUser: User
  ): Promise<BulkLockResult> {
    const locked: string[] = [];
    const skipped: SkippedTube[] = [];

    const config = await this.storageRepository.getForLab(authenticatedUser.labId!);
    const allowedTankIds = new Set(await this.getAllowedTankIds(authenticatedUser.labId!));
    const tubes = await this.tubeRepository.findByIds(request.tubeIds, authenticatedUser.labId!);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      if (!allowedTankIds.has(tube.location.tankId)) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      const containerInfo = await this.getContainerInfo(
        authenticatedUser.labId!,
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

      const accessResult = this.accessControlService.canLockTube(
        authenticatedUser,
        tube,
        containerInfo ?? undefined
      );
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      if (tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube is already locked' });
        continue;
      }

      const lockedTube = tube.lock(authenticatedUser.id, request.lockNote);
      try {
        await this.tubeRepository.saveWithOptimisticLock(lockedTube, tube.version);
        locked.push(tubeId);
      } catch (error) {
        skipped.push({ tubeId, reason: 'Tube was modified by another user' });
      }
    }

    if (locked.length > 0) {
      const tankIds = [...new Set(locked.map(id => tubeMap.get(id)!.location.tankId))];
      logger.debug('[TubeService] Publishing TubesLockedEvent', {
        lockedCount: locked.length,
      });
      const lockedEvent = new TubesLockedEvent(
        locked,
        tankIds,
        authenticatedUser.id,
        request.lockNote,
        authenticatedUser.labId!
      );
      await this.eventBus.publish(lockedEvent);
    }

    return { locked, skipped };
  }

  async unlockTubes(
    request: UnlockTubesRequest,
    authenticatedUser: User
  ): Promise<BulkUnlockResult> {
    const unlocked: string[] = [];
    const skipped: SkippedTube[] = [];

    const allowedTankIds = new Set(await this.getAllowedTankIds(authenticatedUser.labId!));
    const tubes = await this.tubeRepository.findByIds(request.tubeIds, authenticatedUser.labId!);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      if (!allowedTankIds.has(tube.location.tankId)) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      const accessResult = this.accessControlService.canUnlockTube(authenticatedUser, tube);
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      if (!tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube is not locked' });
        continue;
      }

      const unlockedTube = tube.unlock();
      try {
        await this.tubeRepository.saveWithOptimisticLock(unlockedTube, tube.version);
        unlocked.push(tubeId);
      } catch (error) {
        skipped.push({ tubeId, reason: 'Tube was modified by another user' });
      }
    }

    if (unlocked.length > 0) {
      const tankIds = [...new Set(unlocked.map(id => tubeMap.get(id)!.location.tankId))];
      logger.debug('[TubeService] Publishing TubesUnlockedEvent', {
        unlockedCount: unlocked.length,
      });
      const unlockedEvent = new TubesUnlockedEvent(
        unlocked,
        tankIds,
        authenticatedUser.id,
        authenticatedUser.labId!
      );
      await this.eventBus.publish(unlockedEvent);
    }

    return { unlocked, skipped };
  }

  async shareTubeAccess(
    request: ShareTubeAccessRequest,
    authenticatedUser: User
  ): Promise<ShareAccessResult> {
    const shared: string[] = [];
    const skipped: SkippedTube[] = [];
    const tubeSharedUsers: Array<{ tubeId: string; sharedWithUserIds: string[] }> = [];

    const targetUsers = await this.userRepository.findByIds(request.userIds);

    if (targetUsers.length !== request.userIds.length) {
      throw new Error('One or more users not found');
    }

    const allowedTankIds = new Set(await this.getAllowedTankIds(authenticatedUser.labId!));
    const tubes = await this.tubeRepository.findByIds(request.tubeIds, authenticatedUser.labId!);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      if (!allowedTankIds.has(tube.location.tankId)) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      const accessResult = this.accessControlService.canShareTubeAccess(authenticatedUser, tube);
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      if (!tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube must be locked to share access' });
        continue;
      }

      const updatedTube = tube.shareWith(request.userIds);

      await this.tubeRepository.save(updatedTube);

      shared.push(tubeId);
      tubeSharedUsers.push({ tubeId, sharedWithUserIds: updatedTube.sharedWithUserIds });
    }

    if (shared.length > 0) {
      const tankIds = [...new Set(shared.map(id => tubeMap.get(id)!.location.tankId))];
      const sharedEvent = new TubeAccessSharedEvent(
        shared,
        tankIds,
        request.userIds,
        tubeSharedUsers,
        authenticatedUser.id,
        authenticatedUser.labId!
      );
      await this.eventBus.publish(sharedEvent);
    }

    return { shared, skipped };
  }

  async revokeTubeAccess(
    request: RevokeTubeAccessRequest,
    authenticatedUser: User
  ): Promise<RevokeAccessResult> {
    const revoked: string[] = [];
    const skipped: SkippedTube[] = [];
    const tubeSharedUsers: Array<{ tubeId: string; sharedWithUserIds: string[] }> = [];

    const allowedTankIds = new Set(await this.getAllowedTankIds(authenticatedUser.labId!));
    const tubes = await this.tubeRepository.findByIds(request.tubeIds, authenticatedUser.labId!);
    const tubeMap = new Map(tubes.map(t => [t.id, t]));

    for (const tubeId of request.tubeIds) {
      const tube = tubeMap.get(tubeId);

      if (!tube) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      if (!allowedTankIds.has(tube.location.tankId)) {
        skipped.push({ tubeId, reason: 'Tube not found' });
        continue;
      }

      const accessResult = this.accessControlService.canShareTubeAccess(authenticatedUser, tube);
      if (!accessResult.allowed) {
        skipped.push({ tubeId, reason: accessResult.reason });
        continue;
      }

      if (!tube.isLocked) {
        skipped.push({ tubeId, reason: 'Tube must be locked to revoke access' });
        continue;
      }

      const updatedTube = tube.revokeAccess(request.userIds);

      await this.tubeRepository.save(updatedTube);

      revoked.push(tubeId);
      tubeSharedUsers.push({ tubeId, sharedWithUserIds: updatedTube.sharedWithUserIds });
    }

    if (revoked.length > 0) {
      const tankIds = [...new Set(revoked.map(id => tubeMap.get(id)!.location.tankId))];
      const revokedEvent = new TubeAccessRevokedEvent(
        revoked,
        tankIds,
        request.userIds,
        tubeSharedUsers,
        authenticatedUser.id,
        authenticatedUser.labId!
      );
      await this.eventBus.publish(revokedEvent);
    }

    return { revoked, skipped };
  }

  /**
   * Server-side aggregation avoids fetching all tubes over the network.
   */
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
    await this.accessControlService.requireCanViewTubes(authenticatedUser);

    const allowedTankIds = await this.getAllowedTankIds(authenticatedUser.labId!);
    const stats = await this.tubeRepository.getStats(allowedTankIds, authenticatedUser.labId!);

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
  private async executeBulk<TItem, TSuccess, TFailure>(
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
