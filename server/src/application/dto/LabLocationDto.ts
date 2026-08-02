/**
 * Lab Location DTO
 *
 * Maps location entities to API response shapes.
 */

import type { LabLocation } from '@domain/entities/LabLocation';

import type { LabLocation as LabLocationData } from '@odysseus/shared-schemas';

export type LabLocationResponse = LabLocationData;

export class LabLocationDto {
  static toResponse(location: LabLocation): LabLocationResponse {
    return {
      id: location.id,
      labId: location.labId,
      name: location.name,
      description: location.description,
      parentId: location.parentId ?? null,
      sortOrder: location.sortOrder,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
