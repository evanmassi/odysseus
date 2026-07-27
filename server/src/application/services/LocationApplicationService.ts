/**
 * Location Management Service
 *
 * CRUD for the lab-wide location tree shared by every catalog.
 */

import { LOCATION_MAX_DEPTH } from '@odysseus/shared-schemas';

import { LocationDto, type LocationResponse } from '@application/dto/LocationDto';
import { validateCategoryDepth } from '@application/guards/CategoryGuards';
import { Location } from '@domain/entities/Location';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { LocationRepository } from '@domain/repositories/LocationRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';

import type { CreateLocationRequest, UpdateLocationRequest } from '@odysseus/shared-schemas';

export class LocationApplicationService {
  constructor(
    private locationRepository: LocationRepository,
    private accessControlService: AccessControlService
  ) {}

  async list(labId: string): Promise<LocationResponse[]> {
    const locations = await this.locationRepository.findByLabId(labId);
    return locations.map(LocationDto.toResponse);
  }

  async create(labId: string, data: CreateLocationRequest, user: User): Promise<LocationResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await validateCategoryDepth(this.locationRepository, {
      labId,
      parentId: data.parentId,
      maxDepth: LOCATION_MAX_DEPTH,
      label: 'location',
    });

    const location = Location.create({
      labId,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });
    await this.locationRepository.save(location);
    return LocationDto.toResponse(location);
  }

  async update(
    labId: string,
    id: string,
    data: UpdateLocationRequest,
    user: User
  ): Promise<LocationResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const location = await this.getOrThrow(id, labId);

    if (data.parentId !== undefined && data.parentId !== location.parentId) {
      await validateCategoryDepth(this.locationRepository, {
        labId,
        parentId: data.parentId,
        movingNodeId: id,
        maxDepth: LOCATION_MAX_DEPTH,
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
    return LocationDto.toResponse(location);
  }

  async delete(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
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

  private async getOrThrow(id: string, labId: string): Promise<Location> {
    const location = await this.locationRepository.findById(id, labId);
    if (!location) throw new NotFoundError('This location could not be found.', { locationId: id });
    return location;
  }
}
