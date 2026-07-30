/**
 * Custom Unit Service
 *
 * HTTP client for the lab's supplement to the shared unit registry.
 */

import {
  customUnitListResponseSchema,
  customUnitResponseSchema,
  type CreateCustomUnitRequest,
  type CustomUnit,
  type CustomUnitWithUsage,
  type RenameCustomUnitRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class CustomUnitService {
  private static readonly BASE_PATH = '/custom-units';

  static async list(): Promise<CustomUnitWithUsage[]> {
    const response = await httpClient.getData(this.BASE_PATH, customUnitListResponseSchema);
    return response.customUnits;
  }

  static async create(data: CreateCustomUnitRequest): Promise<CustomUnit> {
    const response = await httpClient.postData(this.BASE_PATH, data, customUnitResponseSchema);
    return response.customUnit;
  }

  static async rename(id: string, data: RenameCustomUnitRequest): Promise<CustomUnit> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      customUnitResponseSchema
    );
    return response.customUnit;
  }

  static async remove(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }
}
