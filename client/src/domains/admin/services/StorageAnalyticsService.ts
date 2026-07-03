/**
 * Storage Analytics Service
 *
 * API client for storage capacity and utilization data.
 */

import {
  labStorageAnalyticsResponseSchema,
  crossLabStorageAnalyticsResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import type {
  LabStorageAnalyticsResponse,
  CrossLabStorageAnalyticsResponse,
} from '@odysseus/shared-schemas';

export class StorageAnalyticsService {
  async getLabAnalytics(): Promise<LabStorageAnalyticsResponse> {
    return await httpClient.getData('/admin/storage/analytics', labStorageAnalyticsResponseSchema);
  }

  async getLabAnalyticsAsSystemAdmin(labId: string): Promise<LabStorageAnalyticsResponse> {
    return await httpClient.getData(
      `/system/labs/${labId}/storage/analytics`,
      labStorageAnalyticsResponseSchema
    );
  }

  async getCrossLabAnalytics(): Promise<CrossLabStorageAnalyticsResponse> {
    return await httpClient.getData(
      '/system/storage/analytics',
      crossLabStorageAnalyticsResponseSchema
    );
  }
}

export const storageAnalyticsService = new StorageAnalyticsService();
