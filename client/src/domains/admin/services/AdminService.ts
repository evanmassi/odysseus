/**
 * Admin Service
 *
 * Manages admin operations including user management and role updates.
 * Uses httpClient for proper authentication and error handling.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import type { RetentionMetrics, RetentionPolicy } from '../types/metrics';
import type {
  AdminUser,
  AdminResearcher,
  SecurityConfig,
  UpdateSecurityConfig,
  SystemMetrics,
  SyncStatus,
  AuditLogEntry,
  AuditLogFilters,
  GeneratePasswordResetTokenResponse,
  TankConfiguration,
} from '@odysseus/shared-schemas';

export class AdminService {
  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<{ success: boolean; users: AdminUser[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { users: AdminUser[] };
        meta?: { timing: number };
      }>('/admin/users');

      return {
        success: response.data.success,
        users: response.data.data.users,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get users', { error });
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: 'admin' | 'user'): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{ success: boolean }>(`/admin/users/${userId}/role`, {
        role: newRole,
      });
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to update user role', { userId, error });
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.delete<{ success: boolean }>(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to delete user', { userId, error });
      throw error;
    }
  }

  /**
   * Get pending users awaiting approval (admin only)
   */
  async getPendingUsers(): Promise<{ success: boolean; users: AdminUser[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { users: AdminUser[] };
        meta?: { timing: number };
      }>('/admin/users/pending');

      return {
        success: response.data.success,
        users: response.data.data.users,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get pending users', { error });
      throw error;
    }
  }

  /**
   * Approve pending user (admin only)
   */
  async approveUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/approve`
      );
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to approve user', { userId, error });
      throw error;
    }
  }

  /**
   * Reject pending user (admin only)
   */
  async rejectUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(`/admin/users/${userId}/reject`);
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to reject user', { userId, error });
      throw error;
    }
  }

  /**
   * Link researcher profile to user (admin only)
   */
  async linkResearcherToUser(userId: string, researcherId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/link-researcher`,
        { researcherId }
      );
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to link researcher to user', { userId, error });
      throw error;
    }
  }

  /**
   * Unlink researcher profile from user (admin only)
   */
  async unlinkResearcherFromUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/unlink-researcher`
      );
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to unlink researcher from user', { userId, error });
      throw error;
    }
  }

  /**
   * Admin resets user password directly
   */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    requirePasswordChange: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        message: string;
      }>(`/admin/users/${userId}/reset-password`, {
        newPassword,
        requirePasswordChange,
      });
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to reset password for user', { userId, error });
      throw error;
    }
  }

  /**
   * Admin generates password reset token
   * Returns URL with embedded token for user to set own password (15-minute expiry)
   */
  async generatePasswordResetToken(
    userId: string
  ): Promise<{ success: boolean; message: string } & GeneratePasswordResetTokenResponse> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: GeneratePasswordResetTokenResponse & { message: string };
        meta?: { timing: number };
      }>(`/admin/users/${userId}/generate-reset-token`);

      return {
        success: response.data.success,
        resetUrl: response.data.data.resetUrl,
        expiresAt: response.data.data.expiresAt,
        message: response.data.data.message,
      };
    } catch (error) {
      logger.error('Failed to generate password reset token for user', { userId, error });
      throw error;
    }
  }

  /**
   * Get all researchers with admin metadata (admin only)
   */
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get researchers', { error });
      throw error;
    }
  }

  /**
   * Delete researcher (admin only)
   * Safe deletion only - requires zero tubes AND no linked user
   */
  async deleteResearcher(researcherId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.delete<{ success: boolean }>(
        `/admin/researchers/${researcherId}`
      );
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to delete researcher', { researcherId, error });
      throw error;
    }
  }

  /**
   * Get unlinked researchers (not associated with any user)
   */
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get unlinked researchers', { error });
      throw error;
    }
  }

  /**
   * Create researcher and link to user in one operation
   */
  async createAndLinkResearcher(
    userId: string,
    researcherData: {
      firstName: string;
      lastName: string;
      email: string;
      position?: string;
      department?: string;
    }
  ): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/link-researcher`,
        { newResearcher: researcherData }
      );
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to create and link researcher', { error });
      throw error;
    }
  }

  /**
   * Create standalone researcher (no user link)
   */
  async createResearcher(data: {
    firstName: string;
    lastName: string;
    email: string;
    position?: string;
    department?: string;
  }): Promise<{ success: boolean; researcher: AdminResearcher }> {
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to create researcher', { error });
      throw error;
    }
  }

  /**
   * Get admin metrics/statistics
   */
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get admin metrics', { error });
      throw error;
    }
  }

  /**
   * Get security configuration
   */
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get security config', { error });
      throw error;
    }
  }

  /**
   * Update security configuration
   */
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to update security config', { error });
      throw error;
    }
  }

  /**
   * Get synchronization status
   */
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
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get sync status', { error });
      throw error;
    }
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(options: AuditLogFilters = {}): Promise<{
    success: boolean;
    entries: AuditLogEntry[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.username) params.append('username', options.username);
      if (options.action) params.append('action', options.action);
      if (options.entityType) params.append('entityType', options.entityType);
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);

      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await httpClient.get<{
        success: boolean;
        data: {
          entries: AuditLogEntry[];
          pagination: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
          };
        };
        meta?: { timing: number };
      }>(`/admin/audit${query}`);

      return {
        success: response.data.success,
        entries: response.data.data.entries,
        pagination: response.data.data.pagination,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get audit log', { error });
      throw error;
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(): Promise<{
    success: boolean;
    data: {
      totalEntries: number;
      entriesLast24h: number;
      entriesLast7d: number;
      topActions: Array<{ action: string; count: number }>;
      topUsers: Array<{ username: string; count: number }>;
      recentActivity: AuditLogEntry[];
    };
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          totalEntries: number;
          entriesLast24h: number;
          entriesLast7d: number;
          topActions: Array<{ action: string; count: number }>;
          topUsers: Array<{ username: string; count: number }>;
          recentActivity: AuditLogEntry[];
        };
      }>('/admin/audit/statistics');

      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get audit statistics', { error });
      throw error;
    }
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string
  ): Promise<{
    success: boolean;
    entries: AuditLogEntry[];
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        entries: AuditLogEntry[];
      }>(`/admin/audit/entity/${entityType}/${entityId}`);

      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get entity history', { entityType, entityId, error });
      throw error;
    }
  }

  /**
   * Search audit logs with optional archive inclusion
   */
  async searchAuditLogs(
    options: AuditLogFilters = {},
    includeArchive: boolean = false
  ): Promise<{
    success: boolean;
    entries: AuditLogEntry[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.username) params.append('username', options.username);
      if (options.action) params.append('action', options.action);
      if (options.entityType) params.append('entityType', options.entityType);
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);
      params.append('includeArchive', includeArchive.toString());

      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await httpClient.get<{
        success: boolean;
        data: {
          entries: AuditLogEntry[];
          pagination: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
          };
          includeArchive: boolean;
        };
        meta?: { timing: number };
      }>(`/admin/audit/search${query}`);

      return {
        success: response.data.success,
        entries: response.data.data.entries,
        pagination: response.data.data.pagination,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to search audit logs', { error });
      throw error;
    }
  }

  /**
   * Get retention metrics
   */
  async getRetentionMetrics(): Promise<{
    success: boolean;
    data: {
      activeTable: {
        count: number;
        oldestEntry: Date | null;
        newestEntry: Date | null;
        retentionDays: number;
      };
      archiveTable: {
        count: number;
        oldestEntry: Date | null;
        retentionDays: number;
      };
      nextArchivalDate: Date | null;
      performanceWarning: boolean;
    };
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          metrics: RetentionMetrics;
        };
        meta?: { timing: number };
      }>('/admin/audit/retention/metrics');

      return {
        success: response.data.success,
        data: response.data.data.metrics,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get retention metrics', { error });
      throw error;
    }
  }

  /**
   * Get retention policy
   */
  async getRetentionPolicy(): Promise<{
    success: boolean;
    data: {
      activeRetentionDays: number;
      totalRetentionDays: number;
      archiveRetentionDays: number;
      enableAutoArchival: boolean;
      activeTableWarningThreshold: number;
    };
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          policy: RetentionPolicy;
        };
        meta?: { timing: number };
      }>('/admin/audit/retention/policy');

      return {
        success: response.data.success,
        data: response.data.data.policy,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to get retention policy', { error });
      throw error;
    }
  }

  /**
   * Manually trigger archival process
   */
  async runManualArchival(): Promise<{
    success: boolean;
    data: {
      archived: number;
      deleted: number;
      message: string;
    };
  }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: {
          archived: number;
          deleted: number;
          message: string;
        };
        meta?: { timing: number };
      }>('/admin/audit/retention/archive');

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to run manual archival', { error });
      throw error;
    }
  }

  /**
   * Export archived logs
   */
  async exportArchivedLogs(dateFrom?: Date, dateTo?: Date): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());

      const query = params.toString() ? `?${params.toString()}` : '';

      return await httpClient.getBlob(`/admin/audit/retention/export${query}`);
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to export archived logs', { error });
      throw error;
    }
  }

  /**
   * Get application version info (public endpoint)
   */
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

  /**
   * Export tubes data in CSV or JSON format
   */
  async exportTubes(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/tubes?format=${format}`);
    } catch (error) {
      logger.error('Failed to export tubes', { error });
      throw error;
    }
  }

  /**
   * Export users data in CSV or JSON format (excludes sensitive data)
   */
  async exportUsers(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/users?format=${format}`);
    } catch (error) {
      logger.error('Failed to export users', { error });
      throw error;
    }
  }

  /**
   * Export researchers data in CSV or JSON format
   */
  async exportResearchers(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/researchers?format=${format}`);
    } catch (error) {
      logger.error('Failed to export researchers', { error });
      throw error;
    }
  }

  /**
   * Export system configuration backup (JSON only)
   */
  async exportSystemBackup(): Promise<Blob> {
    try {
      return await httpClient.getBlob('/admin/export/system-backup');
    } catch (error) {
      logger.error('Failed to export system backup', { error });
      throw error;
    }
  }

  // ============================================================================
  // DEMO MANAGEMENT
  // ============================================================================

  /**
   * Get all demo users
   */
  async getDemoUsers(): Promise<{ success: boolean; users: AdminUser[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { users: AdminUser[] };
      }>('/admin/demo/users');

      return {
        success: response.data.success,
        users: response.data.data.users,
      };
    } catch (error) {
      logger.error('Failed to get demo users', { error });
      throw error;
    }
  }

  /**
   * Set user demo status
   */
  async setUserDemoStatus(userId: string, isDemo: boolean): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{ success: boolean }>(
        `/admin/users/${userId}/demo-status`,
        { isDemo }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to set user demo status', { userId, error });
      throw error;
    }
  }

  /**
   * Set tank demo status
   */
  async setTankDemoStatus(tankId: string, isDemo: boolean): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{ success: boolean }>(
        `/admin/tanks/${tankId}/demo-status`,
        { isDemo }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to set tank demo status', { tankId, error });
      throw error;
    }
  }

  /**
   * Get demo tanks from configuration
   */
  async getDemoTanks(): Promise<{ success: boolean; tanks: TankConfiguration[] }> {
    try {
      // Use admin endpoint to get ALL tanks (unfiltered by demo status)
      const response = await httpClient.get<{
        success: boolean;
        data: {
          tanks: TankConfiguration[];
        };
      }>('/admin/tanks');

      const demoTanks = response.data.data.tanks.filter(tank => tank.isDemo);

      return {
        success: response.data.success,
        tanks: demoTanks,
      };
    } catch (error) {
      logger.error('Failed to get demo tanks', { error });
      throw error;
    }
  }

  /**
   * Get all tanks (for selecting which to mark as demo)
   * Uses admin endpoint that returns unfiltered tanks regardless of demo status
   */
  async getAllTanks(): Promise<{ success: boolean; tanks: TankConfiguration[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          tanks: TankConfiguration[];
        };
      }>('/admin/tanks');

      return {
        success: response.data.success,
        tanks: response.data.data.tanks,
      };
    } catch (error) {
      logger.error('Failed to get all tanks', { error });
      throw error;
    }
  }

  /**
   * Reset demo data - deletes all tubes in demo tanks
   */
  async resetDemoData(): Promise<{ success: boolean; message: string; deletedTubes: number }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: { message: string; deletedTubes: number };
      }>('/admin/demo/reset');

      return {
        success: response.data.success,
        message: response.data.data.message,
        deletedTubes: response.data.data.deletedTubes,
      };
    } catch (error) {
      logger.error('Failed to reset demo data', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
