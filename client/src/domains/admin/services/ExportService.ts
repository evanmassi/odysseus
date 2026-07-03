/**
 * Export Service
 *
 * Data export operations for tubes, users, researchers, and system backups.
 */

import { httpClient } from '@infra/api';

export class ExportService {
  async exportTubes(format: 'csv' | 'json'): Promise<Blob> {
    return await httpClient.getBlob(`/admin/export/tubes?format=${format}`);
  }

  async exportUsers(format: 'csv' | 'json'): Promise<Blob> {
    return await httpClient.getBlob(`/admin/export/users?format=${format}`);
  }

  async exportResearchers(format: 'csv' | 'json'): Promise<Blob> {
    return await httpClient.getBlob(`/admin/export/researchers?format=${format}`);
  }

  async exportEquipment(format: 'csv' | 'json'): Promise<Blob> {
    return await httpClient.getBlob(`/admin/export/equipment?format=${format}`);
  }

  async exportSystemBackup(): Promise<Blob> {
    return await httpClient.getBlob('/admin/export/system-backup');
  }
}

export const exportService = new ExportService();
