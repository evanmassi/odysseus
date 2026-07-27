/**
 * Location Service
 *
 * HTTP client for the lab-wide location tree.
 */

import {
  locationResponseSchema,
  locationListResponseSchema,
  type Location,
  type CreateLocationRequest,
  type UpdateLocationRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class LocationService {
  private static readonly BASE_PATH = '/locations';

  static async list(): Promise<Location[]> {
    const response = await httpClient.getData(this.BASE_PATH, locationListResponseSchema);
    return response.locations;
  }

  static async create(data: CreateLocationRequest): Promise<Location> {
    const response = await httpClient.postData(this.BASE_PATH, data, locationResponseSchema);
    return response.location;
  }

  static async update(id: string, data: UpdateLocationRequest): Promise<Location> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      locationResponseSchema
    );
    return response.location;
  }

  static async remove(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }
}
