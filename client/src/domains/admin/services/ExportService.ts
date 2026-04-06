/**
 * Export Service
 *
 * Data export operations for tubes, users, researchers, and system backups.
 */

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

export class ExportService {
  async exportTubes(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/tubes?format=${format}`);
    } catch (error) {
      logger.error('Failed to export tubes', { error });
      throw error;
    }
  }

  async exportUsers(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/users?format=${format}`);
    } catch (error) {
      logger.error('Failed to export users', { error });
      throw error;
    }
  }

  async exportResearchers(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/researchers?format=${format}`);
    } catch (error) {
      logger.error('Failed to export researchers', { error });
      throw error;
    }
  }

  async exportEquipment(format: 'csv' | 'json'): Promise<Blob> {
    try {
      return await httpClient.getBlob(`/admin/export/equipment?format=${format}`);
    } catch (error) {
      logger.error('Failed to export equipment', { error });
      throw error;
    }
  }

  async exportSystemBackup(): Promise<Blob> {
    try {
      return await httpClient.getBlob('/admin/export/system-backup');
    } catch (error) {
      logger.error('Failed to export system backup', { error });
      throw error;
    }
  }
}

export const exportService = new ExportService();
