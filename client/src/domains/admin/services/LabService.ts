/**
 * Lab Management Service
 *
 * System admin lab management and cross-lab invite code operations.
 */

import {
  labDataSchema,
  labDetailsSchema,
  inviteCodeDataSchema,
  demoLimitsSchema,
  seedDemoResponseSchema,
  unseedDemoResponseSchema,
  auditSearchResponseSchema,
  systemOverviewSchema,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

import { buildAuditFilterParams } from '../utils/auditLogFilterParams';

import type {
  LabData,
  InviteCodeData,
  CreateInviteCodeRequest,
  LabDetails,
  DemoLimits,
  SeedDemoResponse,
  UnseedDemoResponse,
  AuditLogEntry,
  AuditLogFilters,
  SystemOverview,
} from '@odysseus/shared-schemas';

export class LabService {
  async getLabs(): Promise<LabData[]> {
    try {
      const data = await httpClient.getData(
        '/system/labs',
        z.object({ labs: z.array(labDataSchema) })
      );
      return data.labs;
    } catch (error) {
      logger.error('Failed to get labs', { error });
      throw error;
    }
  }

  async createLab(name: string, isDemo?: boolean): Promise<LabData> {
    try {
      const data = await httpClient.postData(
        '/system/labs',
        { name, ...(isDemo && { isDemo }) },
        z.object({ lab: labDataSchema })
      );
      return data.lab;
    } catch (error) {
      logger.error('Failed to create lab', { error });
      throw error;
    }
  }

  async updateLab(id: string, name: string): Promise<LabData> {
    try {
      const data = await httpClient.putData(
        `/system/labs/${id}`,
        { name },
        z.object({ lab: labDataSchema })
      );
      return data.lab;
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
      return await httpClient.getData(`/system/labs/${labId}/details`, labDetailsSchema);
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
      const data = await httpClient.getData(
        `/system/labs/${labId}/invite-codes`,
        z.object({ inviteCodes: z.array(inviteCodeDataSchema) })
      );
      return data.inviteCodes;
    } catch (error) {
      logger.error('Failed to get lab invite codes', { labId, error });
      throw error;
    }
  }

  async createLabInviteCode(labId: string, data: CreateInviteCodeRequest): Promise<InviteCodeData> {
    try {
      const result = await httpClient.postData(
        `/system/labs/${labId}/invite-codes`,
        data,
        z.object({ inviteCode: inviteCodeDataSchema })
      );
      return result.inviteCode;
    } catch (error) {
      logger.error('Failed to create lab invite code', { labId, error });
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

  async seedDemo(labId: string): Promise<SeedDemoResponse> {
    try {
      return await httpClient.postData(
        `/system/labs/${labId}/demo/seed`,
        undefined,
        seedDemoResponseSchema
      );
    } catch (error) {
      logger.error('Failed to seed demo lab', { labId, error });
      throw error;
    }
  }

  async unseedDemo(labId: string): Promise<UnseedDemoResponse> {
    try {
      return await httpClient.postData(
        `/system/labs/${labId}/demo/unseed`,
        undefined,
        unseedDemoResponseSchema
      );
    } catch (error) {
      logger.error('Failed to unseed demo lab', { labId, error });
      throw error;
    }
  }

  async getDemoLimits(labId: string): Promise<DemoLimits> {
    try {
      const data = await httpClient.getData(
        `/system/labs/${labId}/demo/limits`,
        z.object({ limits: demoLimitsSchema })
      );
      return data.limits;
    } catch (error) {
      logger.error('Failed to get demo limits', { labId, error });
      throw error;
    }
  }

  async updateDemoLimits(labId: string, limits: Partial<DemoLimits>): Promise<DemoLimits> {
    try {
      const data = await httpClient.putData(
        `/system/labs/${labId}/demo/limits`,
        limits,
        z.object({ limits: demoLimitsSchema })
      );
      return data.limits;
    } catch (error) {
      logger.error('Failed to update demo limits', { labId, error });
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

  async suspendUser(labId: string, userId: string): Promise<void> {
    try {
      await httpClient.post(`/system/labs/${labId}/users/${userId}/suspend`);
    } catch (error) {
      logger.error('Failed to suspend user', { labId, userId, error });
      throw error;
    }
  }

  async deleteUser(labId: string, userId: string): Promise<void> {
    try {
      await httpClient.deleteData(`/system/labs/${labId}/users/${userId}`);
    } catch (error) {
      logger.error('Failed to delete user', { labId, userId, error });
      throw error;
    }
  }

  async getLabAuditLog(
    labId: string,
    filters: AuditLogFilters = {},
    includeArchive: boolean = false
  ): Promise<{
    entries: AuditLogEntry[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  }> {
    try {
      const params = buildAuditFilterParams(filters);
      params.append('includeArchive', includeArchive.toString());

      const query = params.toString() ? `?${params.toString()}` : '';
      return await httpClient.getData(
        `/system/labs/${labId}/audit${query}`,
        auditSearchResponseSchema
      );
    } catch (error) {
      logger.error('Failed to get lab audit log', { labId, error });
      throw error;
    }
  }

  async getSystemOverview(): Promise<SystemOverview> {
    try {
      return await httpClient.getData('/system/overview', systemOverviewSchema);
    } catch (error) {
      logger.error('Failed to get system overview', { error });
      throw error;
    }
  }
}

export const labService = new LabService();
