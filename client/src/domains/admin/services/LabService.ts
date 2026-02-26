/**
 * Lab Management Service
 *
 * API calls for system admin lab CRUD and cross-lab invite code management.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import type { LabData, InviteCodeData, CreateInviteCodeRequest } from '@odysseus/shared-schemas';

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

  async getSystemOverview(): Promise<{
    totalLabs: number;
    totalUsers: number;
    totalTubes: number;
    labStats: Array<{ labId: string; labName: string; userCount: number; tubeCount: number }>;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          totalLabs: number;
          totalUsers: number;
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
