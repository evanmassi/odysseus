/**
 * Lab Management Service
 *
 * API calls for system admin lab CRUD and cross-lab invite code management.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import type {
  LabData,
  InviteCodeData,
  CreateInviteCodeRequest,
  LabDetails,
} from '@odysseus/shared-schemas';

export class LabService {
  async getLabs(): Promise<LabData[]> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { labs: LabData[] };
      }>('/system/labs');
      return response.data.data.labs;
    } catch (error) {
      logger.error('Failed to get labs', { error });
      throw error;
    }
  }

  async createLab(name: string): Promise<LabData> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: { lab: LabData };
      }>('/system/labs', { name });
      return response.data.data.lab;
    } catch (error) {
      logger.error('Failed to create lab', { error });
      throw error;
    }
  }

  async updateLab(id: string, name: string): Promise<LabData> {
    try {
      const response = await httpClient.put<{
        success: boolean;
        data: { lab: LabData };
      }>(`/system/labs/${id}`, { name });
      return response.data.data.lab;
    } catch (error) {
      logger.error('Failed to update lab', { id, error });
      throw error;
    }
  }

  async deactivateLab(id: string): Promise<void> {
    try {
      await httpClient.post(`/system/labs/${id}/deactivate`);
    } catch (error) {
      logger.error('Failed to deactivate lab', { id, error });
      throw error;
    }
  }

  async getLabDetails(labId: string): Promise<LabDetails> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: LabDetails;
      }>(`/system/labs/${labId}/details`);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get lab details', { labId, error });
      throw error;
    }
  }

  async activateLab(id: string): Promise<void> {
    try {
      await httpClient.post(`/system/labs/${id}/activate`);
    } catch (error) {
      logger.error('Failed to activate lab', { id, error });
      throw error;
    }
  }

  async getLabInviteCodes(labId: string): Promise<InviteCodeData[]> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { inviteCodes: InviteCodeData[] };
      }>(`/system/labs/${labId}/invite-codes`);
      return response.data.data.inviteCodes;
    } catch (error) {
      logger.error('Failed to get lab invite codes', { labId, error });
      throw error;
    }
  }

  async createLabInviteCode(labId: string, data: CreateInviteCodeRequest): Promise<InviteCodeData> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: { inviteCode: InviteCodeData };
      }>(`/system/labs/${labId}/invite-codes`, data);
      return response.data.data.inviteCode;
    } catch (error) {
      logger.error('Failed to create lab invite code', { labId, error });
      throw error;
    }
  }

  async setTankDemoStatus(labId: string, tankId: string, isDemo: boolean): Promise<void> {
    try {
      await httpClient.put(`/system/labs/${labId}/tanks/${tankId}/demo-status`, { isDemo });
    } catch (error) {
      logger.error('Failed to set tank demo status', { labId, tankId, error });
      throw error;
    }
  }

  async resetDemoData(labId: string): Promise<void> {
    try {
      await httpClient.post(`/system/labs/${labId}/demo/reset`);
    } catch (error) {
      logger.error('Failed to reset demo data', { labId, error });
      throw error;
    }
  }

  async setUserDemoStatus(labId: string, userId: string, isDemo: boolean): Promise<void> {
    try {
      await httpClient.put(`/system/labs/${labId}/users/${userId}/demo-status`, { isDemo });
    } catch (error) {
      logger.error('Failed to set user demo status', { labId, userId, error });
      throw error;
    }
  }

  async activateUser(labId: string, userId: string): Promise<void> {
    try {
      await httpClient.post(`/system/labs/${labId}/users/${userId}/activate`);
    } catch (error) {
      logger.error('Failed to activate user', { labId, userId, error });
      throw error;
    }
  }

  async deactivateUser(labId: string, userId: string): Promise<void> {
    try {
      await httpClient.post(`/system/labs/${labId}/users/${userId}/deactivate`);
    } catch (error) {
      logger.error('Failed to deactivate user', { labId, userId, error });
      throw error;
    }
  }

  async getSystemOverview(): Promise<{
    totalLabs: number;
    activeLabs: number;
    inactiveLabs: number;
    totalUsers: number;
    pendingApprovals: number;
    activeUsersLast24h: number;
    totalTubes: number;
    labStats: Array<{ labId: string; labName: string; userCount: number; tubeCount: number }>;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          totalLabs: number;
          activeLabs: number;
          inactiveLabs: number;
          totalUsers: number;
          pendingApprovals: number;
          activeUsersLast24h: number;
          totalTubes: number;
          labStats: Array<{ labId: string; labName: string; userCount: number; tubeCount: number }>;
        };
      }>('/system/overview');
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get system overview', { error });
      throw error;
    }
  }
}

export const labService = new LabService();
