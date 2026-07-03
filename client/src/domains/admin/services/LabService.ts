/**
 * Lab Management Service
 *
 * System admin lab management and cross-lab invite code operations.
 */

import {
  labDetailsSchema,
  seedDemoResponseSchema,
  unseedDemoResponseSchema,
  auditSearchResponseSchema,
  systemOverviewSchema,
  labsListSchema,
  labDataResponseSchema,
  inviteCodeDataResponseSchema,
  demoLimitsDataSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import { buildAuditFilterParams } from '../utils/auditLogFilterParams';

import type {
  LabData,
  InviteCodeData,
  CreateInviteCodeRequest,
  LabDetails,
  DemoLimits,
  SeedDemoResponse,
  UnseedDemoResponse,
  AuditSearchResponse,
  AuditLogFilters,
  SystemOverview,
} from '@odysseus/shared-schemas';

export class LabService {
  async getLabs(): Promise<LabData[]> {
    const data = await httpClient.getData('/system/labs', labsListSchema);
    return data.labs;
  }

  async createLab(name: string, isDemo?: boolean): Promise<LabData> {
    const data = await httpClient.postData(
      '/system/labs',
      { name, ...(isDemo && { isDemo }) },
      labDataResponseSchema
    );
    return data.lab;
  }

  async updateLab(id: string, name: string): Promise<LabData> {
    const data = await httpClient.putData(`/system/labs/${id}`, { name }, labDataResponseSchema);
    return data.lab;
  }

  async deactivateLab(id: string): Promise<void> {
    await httpClient.post(`/system/labs/${id}/deactivate`);
  }

  async getLabDetails(labId: string): Promise<LabDetails> {
    return await httpClient.getData(`/system/labs/${labId}/details`, labDetailsSchema);
  }

  async activateLab(id: string): Promise<void> {
    await httpClient.post(`/system/labs/${id}/activate`);
  }

  async createLabInviteCode(labId: string, data: CreateInviteCodeRequest): Promise<InviteCodeData> {
    const result = await httpClient.postData(
      `/system/labs/${labId}/invite-codes`,
      data,
      inviteCodeDataResponseSchema
    );
    return result.inviteCode;
  }

  async resetDemoData(labId: string): Promise<void> {
    await httpClient.post(`/system/labs/${labId}/demo/reset`);
  }

  async seedDemo(labId: string): Promise<SeedDemoResponse> {
    return await httpClient.postData(
      `/system/labs/${labId}/demo/seed`,
      undefined,
      seedDemoResponseSchema
    );
  }

  async unseedDemo(labId: string): Promise<UnseedDemoResponse> {
    return await httpClient.postData(
      `/system/labs/${labId}/demo/unseed`,
      undefined,
      unseedDemoResponseSchema
    );
  }

  async getDemoLimits(labId: string): Promise<DemoLimits> {
    const data = await httpClient.getData(
      `/system/labs/${labId}/demo/limits`,
      demoLimitsDataSchema
    );
    return data.limits;
  }

  async updateDemoLimits(labId: string, limits: Partial<DemoLimits>): Promise<DemoLimits> {
    const data = await httpClient.putData(
      `/system/labs/${labId}/demo/limits`,
      limits,
      demoLimitsDataSchema
    );
    return data.limits;
  }

  async activateUser(labId: string, userId: string): Promise<void> {
    await httpClient.post(`/system/labs/${labId}/users/${userId}/activate`);
  }

  async deactivateUser(labId: string, userId: string): Promise<void> {
    await httpClient.post(`/system/labs/${labId}/users/${userId}/deactivate`);
  }

  async suspendUser(labId: string, userId: string): Promise<void> {
    await httpClient.post(`/system/labs/${labId}/users/${userId}/suspend`);
  }

  async deleteUser(labId: string, userId: string): Promise<void> {
    await httpClient.deleteData(`/system/labs/${labId}/users/${userId}`);
  }

  async getLabAuditLog(
    labId: string,
    filters: AuditLogFilters = {},
    includeArchive: boolean = false
  ): Promise<AuditSearchResponse> {
    const params = buildAuditFilterParams(filters);
    params.append('includeArchive', includeArchive.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return await httpClient.getData(
      `/system/labs/${labId}/audit${query}`,
      auditSearchResponseSchema
    );
  }

  async getSystemOverview(): Promise<SystemOverview> {
    return await httpClient.getData('/system/overview', systemOverviewSchema);
  }
}

export const labService = new LabService();
