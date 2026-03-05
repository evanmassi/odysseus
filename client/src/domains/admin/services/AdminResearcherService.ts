/**
 * Admin Researcher Service
 *
 * Researcher lifecycle management for lab administrators.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import type { AdminResearcher, CreateResearcherProfile } from '@odysseus/shared-schemas';

export class AdminResearcherService {
  async getResearchers(): Promise<{ success: boolean; researchers: AdminResearcher[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          researchers: AdminResearcher[];
        };
      }>('/admin/researchers');

      return {
        success: response.data.success,
        researchers: response.data.data.researchers,
      };
    } catch (error) {
      logger.error('Failed to get researchers', { error });
      throw error;
    }
  }

  /** Safe deactivation only — requires zero tubes AND no linked user. */
  async deactivateResearcher(researcherId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{ success: boolean }>(
        `/researchers/${researcherId}/deactivate`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to deactivate researcher', { researcherId, error });
      throw error;
    }
  }

  async activateResearcher(researcherId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{ success: boolean }>(
        `/researchers/${researcherId}/activate`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to activate researcher', { researcherId, error });
      throw error;
    }
  }

  async deleteResearcher(researcherId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.delete<{ success: boolean }>(
        `/admin/researchers/${researcherId}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to delete researcher', { researcherId, error });
      throw error;
    }
  }

  async getUnlinkedResearchers(): Promise<{ success: boolean; researchers: AdminResearcher[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { researchers: AdminResearcher[] };
      }>('/admin/researchers/unlinked');

      return {
        success: response.data.success,
        researchers: response.data.data.researchers,
      };
    } catch (error) {
      logger.error('Failed to get unlinked researchers', { error });
      throw error;
    }
  }

  async createAndLinkResearcher(
    userId: string,
    researcherData: CreateResearcherProfile
  ): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/link-researcher`,
        { newResearcher: researcherData }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to create and link researcher', { error });
      throw error;
    }
  }

  async createResearcher(
    data: CreateResearcherProfile
  ): Promise<{ success: boolean; researcher: AdminResearcher }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: AdminResearcher;
      }>('/researchers', data);

      return {
        success: response.data.success,
        researcher: response.data.data,
      };
    } catch (error) {
      logger.error('Failed to create researcher', { error });
      throw error;
    }
  }
}

export const adminResearcherService = new AdminResearcherService();
