/**
 * Admin Service
 *
 * System configuration, metrics, lookup values, and invite code management.
 */

import {
  systemMetricsSchema,
  lookupValueWithCountSchema,
  lookupValueSchema,
  securityConfigDataSchema,
  inviteCodesListSchema,
  inviteCodeDataResponseSchema,
  versionInfoSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import type {
  SecurityConfig,
  UpdateSecurityConfig,
  SystemMetrics,
  LookupCategory,
  LookupValueWithCount,
  LookupValue,
  InviteCodeData,
  CreateInviteCodeRequest,
  VersionInfo,
} from '@odysseus/shared-schemas';

export class AdminService {
  async getMetrics(): Promise<SystemMetrics> {
    return await httpClient.getData('/admin/metrics', systemMetricsSchema);
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    const data = await httpClient.getData('/admin/security-config', securityConfigDataSchema);
    return data.config;
  }

  async updateSecurityConfig(config: UpdateSecurityConfig): Promise<void> {
    await httpClient.putData('/admin/security-config', config, securityConfigDataSchema);
  }

  async getVersionInfo(): Promise<VersionInfo> {
    return await httpClient.getData('/public/version', versionInfoSchema);
  }

  async getLookupValues(category: LookupCategory): Promise<LookupValueWithCount[]> {
    return await httpClient.getArray(`/admin/lookups/${category}`, lookupValueWithCountSchema);
  }

  async createLookupValue(category: LookupCategory, value: string): Promise<LookupValue> {
    return await httpClient.postData('/admin/lookups', { category, value }, lookupValueSchema);
  }

  async renameLookupValue(id: string, newValue: string): Promise<LookupValue> {
    return await httpClient.putData(`/admin/lookups/${id}/rename`, { newValue }, lookupValueSchema);
  }

  async deleteLookupValue(id: string): Promise<void> {
    await httpClient.deleteData(`/admin/lookups/${id}`);
  }

  async getInviteCodes(): Promise<InviteCodeData[]> {
    const data = await httpClient.getData('/admin/invite-codes', inviteCodesListSchema);
    return data.inviteCodes;
  }

  async createInviteCode(data: CreateInviteCodeRequest): Promise<InviteCodeData> {
    const result = await httpClient.postData(
      '/admin/invite-codes',
      data,
      inviteCodeDataResponseSchema
    );
    return result.inviteCode;
  }

  async deactivateInviteCode(id: string): Promise<void> {
    await httpClient.deleteData(`/admin/invite-codes/${id}`);
  }

  async updateSecurityConfigAsSystemAdmin(config: UpdateSecurityConfig): Promise<void> {
    await httpClient.putData('/system/security-config', config, securityConfigDataSchema);
  }
}

export const adminService = new AdminService();
