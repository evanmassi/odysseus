/**
 * Lab Location Service
 *
 * HTTP client for the lab-wide location tree.
 */

import {
  labLocationResponseSchema,
  labLocationListResponseSchema,
  type LabLocation,
  type CreateLabLocationRequest,
  type UpdateLabLocationRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class LabLocationService {
  private static readonly BASE_PATH = '/locations';

  static async list(): Promise<LabLocation[]> {
    const response = await httpClient.getData(this.BASE_PATH, labLocationListResponseSchema);
    return response.locations;
  }

  static async create(data: CreateLabLocationRequest): Promise<LabLocation> {
    const response = await httpClient.postData(this.BASE_PATH, data, labLocationResponseSchema);
    return response.location;
  }

  static async update(id: string, data: UpdateLabLocationRequest): Promise<LabLocation> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      labLocationResponseSchema
    );
    return response.location;
  }

  static async remove(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }
}
