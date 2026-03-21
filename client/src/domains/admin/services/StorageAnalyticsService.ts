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
import { logger } from '@infra/logger';

import type {
  LabStorageAnalyticsResponse,
  CrossLabStorageAnalyticsResponse,
} from '@odysseus/shared-schemas';

export class StorageAnalyticsService {
  async getLabAnalytics(): Promise<LabStorageAnalyticsResponse> {
    try {
      return await httpClient.getData(
        '/admin/storage/analytics',
        labStorageAnalyticsResponseSchema
      );
    } catch (error) {
      logger.error('Failed to get lab storage analytics', { error });
      throw error;
    }
  }

  async getLabAnalyticsAsSystemAdmin(labId: string): Promise<LabStorageAnalyticsResponse> {
    try {
      return await httpClient.getData(
        `/system/labs/${labId}/storage/analytics`,
        labStorageAnalyticsResponseSchema
      );
    } catch (error) {
      logger.error('Failed to get lab storage analytics', { labId, error });
      throw error;
    }
  }

  async getCrossLabAnalytics(): Promise<CrossLabStorageAnalyticsResponse> {
    try {
      return await httpClient.getData(
        '/system/storage/analytics',
        crossLabStorageAnalyticsResponseSchema
      );
    } catch (error) {
      logger.error('Failed to get cross-lab storage analytics', { error });
      throw error;
    }
  }
}

export const storageAnalyticsService = new StorageAnalyticsService();
