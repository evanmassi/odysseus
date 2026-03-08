/**
 * Admin Service
 *
 * System configuration, metrics, lookup values, and invite code management.
 */

import { httpClient } from '@infra/api/HttpClient';
import { logger } from '@shared/infrastructure/logger';

import type {
  SecurityConfig,
  UpdateSecurityConfig,
  SystemMetrics,
  SyncStatus,
  LookupCategory,
  LookupValueWithCount,
  LookupValue,
  InviteCodeData,
  CreateInviteCodeRequest,
} from '@odysseus/shared-schemas';

export class AdminService {
  async getMetrics(): Promise<{
    success: boolean;
    data: SystemMetrics;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: SystemMetrics;
        meta?: { timing: number };
      }>('/admin/metrics');

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      logger.error('Failed to get admin metrics', { error });
      throw error;
    }
  }

  async getSecurityConfig(): Promise<{
    success: boolean;
    config: SecurityConfig;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          config: SecurityConfig;
        };
        meta?: { timing: number };
      }>('/admin/security-config');

      return {
        success: response.data.success,
        config: response.data.data.config,
      };
    } catch (error) {
      logger.error('Failed to get security config', { error });
      throw error;
    }
  }

  async updateSecurityConfig(config: UpdateSecurityConfig): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{
        success: boolean;
        data: { config: SecurityConfig };
        meta?: { timing: number };
      }>('/admin/security-config', config);

      return {
        success: response.data.success,
      };
    } catch (error) {
      logger.error('Failed to update security config', { error });
      throw error;
    }
  }

  async getSyncStatus(): Promise<{
    success: boolean;
    sync: SyncStatus;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          sync: SyncStatus;
        };
        meta?: { timing: number };
      }>('/admin/sync-status');

      return {
        success: response.data.success,
        sync: response.data.data.sync,
      };
    } catch (error) {
      logger.error('Failed to get sync status', { error });
      throw error;
    }
  }

  async getVersionInfo(): Promise<{
    success: boolean;
    data: {
      version: string;
      environment: string;
      nodeVersion: string;
      platform: string;
    };
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          version: string;
          environment: string;
          nodeVersion: string;
          platform: string;
        };
      }>('/public/version');

      return response.data;
    } catch (error) {
      logger.error('Failed to get version info', { error });
      throw error;
    }
  }

  async getLookupValues(category: LookupCategory): Promise<LookupValueWithCount[]> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: LookupValueWithCount[];
      }>(`/admin/lookups/${category}`);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get lookup values', { category, error });
      throw error;
    }
  }

  async createLookupValue(category: LookupCategory, value: string): Promise<LookupValue> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: LookupValue;
      }>('/admin/lookups', { category, value });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create lookup value', { category, value, error });
      throw error;
    }
  }

  async renameLookupValue(id: string, newValue: string): Promise<LookupValue> {
    try {
      const response = await httpClient.put<{
        success: boolean;
        data: LookupValue;
      }>(`/admin/lookups/${id}/rename`, { newValue });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to rename lookup value', { id, newValue, error });
      throw error;
    }
  }

  async deleteLookupValue(id: string): Promise<void> {
    try {
      await httpClient.delete(`/admin/lookups/${id}`);
    } catch (error) {
      logger.error('Failed to delete lookup value', { id, error });
      throw error;
    }
  }

  async getInviteCodes(): Promise<InviteCodeData[]> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { inviteCodes: InviteCodeData[] };
      }>('/admin/invite-codes');
      return response.data.data.inviteCodes;
    } catch (error) {
      logger.error('Failed to get invite codes', { error });
      throw error;
    }
  }

  async createInviteCode(data: CreateInviteCodeRequest): Promise<InviteCodeData> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: { inviteCode: InviteCodeData };
      }>('/admin/invite-codes', data);
      return response.data.data.inviteCode;
    } catch (error) {
      logger.error('Failed to create invite code', { error });
      throw error;
    }
  }

  async deactivateInviteCode(id: string): Promise<void> {
    try {
      await httpClient.delete(`/admin/invite-codes/${id}`);
    } catch (error) {
      logger.error('Failed to deactivate invite code', { id, error });
      throw error;
    }
  }

  /**
   * Update security config — routes to system admin endpoint for system admins
   */
  async updateSecurityConfigAsSystemAdmin(
    config: UpdateSecurityConfig
  ): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{
        success: boolean;
        data: { config: SecurityConfig };
      }>('/system/security-config', config);
      return { success: response.data.success };
    } catch (error) {
      logger.error('Failed to update security config (system)', { error });
      throw error;
    }
  }
}

export const adminService = new AdminService();
