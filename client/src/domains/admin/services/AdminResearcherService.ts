/**
 * Admin Researcher Service
 *
 * Researcher lifecycle management for lab administrators.
 */

import {
  adminResearcherSchema,
  type AdminResearcher,
  type CreateResearcherProfile,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

export class AdminResearcherService {
  async getResearchers(): Promise<AdminResearcher[]> {
    try {
      const data = await httpClient.getData(
        '/admin/researchers',
        z.object({ researchers: z.array(adminResearcherSchema) })
      );
      return data.researchers;
    } catch (error) {
      logger.error('Failed to get researchers', { error });
      throw error;
    }
  }

  /** Safe deactivation only — requires zero tubes AND no linked user. */
  async deactivateResearcher(researcherId: string): Promise<void> {
    try {
      await httpClient.put(`/researchers/${researcherId}/deactivate`);
    } catch (error) {
      logger.error('Failed to deactivate researcher', { researcherId, error });
      throw error;
    }
  }

  async activateResearcher(researcherId: string): Promise<void> {
    try {
      await httpClient.put(`/researchers/${researcherId}/activate`);
    } catch (error) {
      logger.error('Failed to activate researcher', { researcherId, error });
      throw error;
    }
  }

  async deleteResearcher(researcherId: string): Promise<void> {
    try {
      await httpClient.deleteData(`/admin/researchers/${researcherId}`);
    } catch (error) {
      logger.error('Failed to delete researcher', { researcherId, error });
      throw error;
    }
  }

  async getUnlinkedResearchers(): Promise<AdminResearcher[]> {
    try {
      const data = await httpClient.getData(
        '/admin/researchers/unlinked',
        z.object({ researchers: z.array(adminResearcherSchema) })
      );
      return data.researchers;
    } catch (error) {
      logger.error('Failed to get unlinked researchers', { error });
      throw error;
    }
  }

  async createAndLinkResearcher(
    userId: string,
    researcherData: CreateResearcherProfile
  ): Promise<void> {
    try {
      await httpClient.post(`/admin/users/${userId}/link-researcher`, {
        newResearcher: researcherData,
      });
    } catch (error) {
      logger.error('Failed to create and link researcher', { error });
      throw error;
    }
  }

  async createResearcher(data: CreateResearcherProfile): Promise<AdminResearcher> {
    try {
      return await httpClient.postData('/researchers', data, adminResearcherSchema);
    } catch (error) {
      logger.error('Failed to create researcher', { error });
      throw error;
    }
  }
}

export const adminResearcherService = new AdminResearcherService();
