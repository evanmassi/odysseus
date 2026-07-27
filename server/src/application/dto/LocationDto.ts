/**
 * Location DTO
 *
 * Maps Location entities to API response shapes.
 */

import type { Location } from '@domain/entities/Location';

export interface LocationResponse {
  id: string;
  labId: string;
  name: string;
  description?: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class LocationDto {
  static toResponse(location: Location): LocationResponse {
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
