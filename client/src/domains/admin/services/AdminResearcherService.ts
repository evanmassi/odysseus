/**
 * Admin Researcher Service
 *
 * Researcher lifecycle management for lab administrators.
 */

import {
  adminResearcherSchema,
  adminResearchersListSchema,
  type AdminResearcher,
  type AdminResearchersList,
  type CreateResearcherProfile,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

class AdminResearcherService {
  async getResearchers(): Promise<AdminResearchersList> {
    return await httpClient.getData('/admin/researchers', adminResearchersListSchema);
  }

  /** Safe deactivation only — requires zero tubes AND no linked user. */
  async deactivateResearcher(researcherId: string): Promise<void> {
    await httpClient.put(`/researchers/${researcherId}/deactivate`);
  }

  async activateResearcher(researcherId: string): Promise<void> {
    await httpClient.put(`/researchers/${researcherId}/activate`);
  }

  async deleteResearcher(researcherId: string): Promise<void> {
    await httpClient.deleteData(`/admin/researchers/${researcherId}`);
  }

  async getUnlinkedResearchers(): Promise<AdminResearcher[]> {
    const data = await httpClient.getData(
      '/admin/researchers/unlinked',
      adminResearchersListSchema
    );
    return data.researchers;
  }

  async createAndLinkResearcher(
    userId: string,
    researcherData: CreateResearcherProfile
  ): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/link-researcher`, {
      newResearcher: researcherData,
    });
  }

  async createResearcher(data: CreateResearcherProfile): Promise<AdminResearcher> {
    return await httpClient.postData('/researchers', data, adminResearcherSchema);
  }
}

export const adminResearcherService = new AdminResearcherService();
