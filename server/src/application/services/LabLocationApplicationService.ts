/**
 * Lab Location Management Service
 *
 * CRUD for the lab-wide location tree shared by every catalog.
 */

import { LAB_LOCATION_MAX_DEPTH } from '@odysseus/shared-schemas';

import { LabLocationDto, type LabLocationResponse } from '@application/dto/LabLocationDto';
import { rejectIfTaxonomyLocked } from '@application/guards/DemoGuards';
import { validateHierarchyDepth } from '@application/guards/HierarchyGuards';
import { LabLocation } from '@domain/entities/LabLocation';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { LabLocationRepository } from '@domain/repositories/LabLocationRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';

import type { CreateLabLocationRequest, UpdateLabLocationRequest } from '@odysseus/shared-schemas';

export class LabLocationApplicationService {
  constructor(
    private locationRepository: LabLocationRepository,
    private accessControlService: AccessControlService,
    private storageRepository: StorageRepository
  ) {}

  async list(labId: string): Promise<LabLocationResponse[]> {
    const locations = await this.locationRepository.findByLabId(labId);
    return locations.map(LabLocationDto.toResponse);
  }

  async create(labId: string, data: CreateLabLocationRequest, user: User): Promise<LabLocationResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Locations');
    await validateHierarchyDepth(this.locationRepository, {
      labId,
      parentId: data.parentId,
      maxDepth: LAB_LOCATION_MAX_DEPTH,
      label: 'location',
    });

    const location = LabLocation.create({
      labId,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });
    await this.locationRepository.save(location);
    return LabLocationDto.toResponse(location);
  }

  async update(
    labId: string,
    id: string,
    data: UpdateLabLocationRequest,
    user: User
  ): Promise<LabLocationResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Locations');
    const location = await this.getOrThrow(id, labId);

    if (data.parentId !== undefined && data.parentId !== location.parentId) {
      await validateHierarchyDepth(this.locationRepository, {
        labId,
        parentId: data.parentId,
        movingNodeId: id,
        maxDepth: LAB_LOCATION_MAX_DEPTH,
        label: 'location',
      });
    }

    location.update({
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });
    await this.locationRepository.save(location);
    return LabLocationDto.toResponse(location);
  }

  async delete(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Locations');
    await this.getOrThrow(id, labId);

    if (await this.locationRepository.isInUseIncludingChildren(id, labId)) {
      throw new ValidationError(
        'Cannot delete this location — stock is still stored in it or in a location beneath it'
      );
    }
    if (await this.locationRepository.hasChildren(id, labId)) {
      throw new ValidationError(
        'Cannot delete this location — remove or move the locations beneath it first'
      );
    }

    await this.locationRepository.delete(id, labId);
  }

  private async getOrThrow(id: string, labId: string): Promise<LabLocation> {
    const location = await this.locationRepository.findById(id, labId);
    if (!location) throw new NotFoundError('This location could not be found.', { locationId: id });
    return location;
  }
}
