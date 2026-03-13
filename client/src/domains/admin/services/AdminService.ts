/**
 * Admin Service
 *
 * System configuration, metrics, lookup values, and invite code management.
 */

import {
  securityConfigSchema,
  systemMetricsSchema,
  lookupValueWithCountSchema,
  lookupValueSchema,
  inviteCodeDataSchema,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

import type {
  SecurityConfig,
  UpdateSecurityConfig,
  SystemMetrics,
  LookupCategory,
  LookupValueWithCount,
  LookupValue,
  InviteCodeData,
  CreateInviteCodeRequest,
} from '@odysseus/shared-schemas';

export class AdminService {
  async getMetrics(): Promise<SystemMetrics> {
    try {
      return await httpClient.getData('/admin/metrics', systemMetricsSchema);
    } catch (error) {
      logger.error('Failed to get admin metrics', { error });
      throw error;
    }
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    try {
      const data = await httpClient.getData(
        '/admin/security-config',
        z.object({ config: securityConfigSchema })
      );
      return data.config;
    } catch (error) {
      logger.error('Failed to get security config', { error });
      throw error;
    }
  }

  async updateSecurityConfig(config: UpdateSecurityConfig): Promise<void> {
    try {
      await httpClient.putData(
        '/admin/security-config',
        config,
        z.object({ config: securityConfigSchema })
      );
    } catch (error) {
      logger.error('Failed to update security config', { error });
      throw error;
    }
  }

  async getVersionInfo(): Promise<{
    version: string;
    environment: string;
    nodeVersion: string;
    platform: string;
  }> {
    try {
      return await httpClient.getData(
        '/public/version',
        z.object({
          version: z.string(),
          environment: z.string(),
          nodeVersion: z.string(),
          platform: z.string(),
        })
      );
    } catch (error) {
      logger.error('Failed to get version info', { error });
      throw error;
    }
  }

  async getLookupValues(category: LookupCategory): Promise<LookupValueWithCount[]> {
    try {
      return await httpClient.getArray(`/admin/lookups/${category}`, lookupValueWithCountSchema);
    } catch (error) {
      logger.error('Failed to get lookup values', { category, error });
      throw error;
    }
  }

  async createLookupValue(category: LookupCategory, value: string): Promise<LookupValue> {
    try {
      return await httpClient.postData('/admin/lookups', { category, value }, lookupValueSchema);
    } catch (error) {
      logger.error('Failed to create lookup value', { category, value, error });
      throw error;
    }
  }

  async renameLookupValue(id: string, newValue: string): Promise<LookupValue> {
    try {
      return await httpClient.putData(
        `/admin/lookups/${id}/rename`,
        { newValue },
        lookupValueSchema
      );
    } catch (error) {
      logger.error('Failed to rename lookup value', { id, newValue, error });
      throw error;
    }
  }

  async deleteLookupValue(id: string): Promise<void> {
    try {
      await httpClient.deleteData(`/admin/lookups/${id}`);
    } catch (error) {
      logger.error('Failed to delete lookup value', { id, error });
      throw error;
    }
  }

  async getInviteCodes(): Promise<InviteCodeData[]> {
    try {
      const data = await httpClient.getData(
        '/admin/invite-codes',
        z.object({ inviteCodes: z.array(inviteCodeDataSchema) })
      );
      return data.inviteCodes;
    } catch (error) {
      logger.error('Failed to get invite codes', { error });
      throw error;
    }
  }

  async createInviteCode(data: CreateInviteCodeRequest): Promise<InviteCodeData> {
    try {
      const result = await httpClient.postData(
        '/admin/invite-codes',
        data,
        z.object({ inviteCode: inviteCodeDataSchema })
      );
      return result.inviteCode;
    } catch (error) {
      logger.error('Failed to create invite code', { error });
      throw error;
    }
  }

  async deactivateInviteCode(id: string): Promise<void> {
    try {
      await httpClient.deleteData(`/admin/invite-codes/${id}`);
    } catch (error) {
      logger.error('Failed to deactivate invite code', { id, error });
      throw error;
    }
  }

  /**
   * Update security config — routes to system admin endpoint for system admins
   */
  async updateSecurityConfigAsSystemAdmin(config: UpdateSecurityConfig): Promise<void> {
    try {
      await httpClient.putData(
        '/system/security-config',
        config,
        z.object({ config: securityConfigSchema })
      );
    } catch (error) {
      logger.error('Failed to update security config (system)', { error });
      throw error;
    }
  }
}

export const adminService = new AdminService();
