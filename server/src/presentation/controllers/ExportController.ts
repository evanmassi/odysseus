/**
 * Export Controller
 *
 * Handles HTTP requests for data export operations.
 * Admin-only endpoints for exporting tubes, users, researchers, and system backup.
 */

import { Request, Response } from 'express';
import { ExportService } from '@application/services/ExportService';
import { logger } from '@utils/logger';

export class ExportController {
  constructor(private exportService: ExportService) {}

  /**
   * GET /api/admin/export/tubes
   * Export all tubes in CSV or JSON format
   */
  async exportTubes(req: Request, res: Response): Promise<void> {
    try {
      const format = this.parseFormat(req.query.format);
      const data = await this.exportService.exportTubes(format);

      if (format === 'json') {
        this.sendJsonExport(res, data as object[], 'tubes');
      } else {
        this.sendCsvExport(res, data as string, 'tubes');
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to export tubes');
    }
  }

  /**
   * GET /api/admin/export/users
   * Export all users in CSV or JSON format (excludes sensitive data)
   */
  async exportUsers(req: Request, res: Response): Promise<void> {
    try {
      const format = this.parseFormat(req.query.format);
      const data = await this.exportService.exportUsers(format);

      if (format === 'json') {
        this.sendJsonExport(res, data as object[], 'users');
      } else {
        this.sendCsvExport(res, data as string, 'users');
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to export users');
    }
  }

  /**
   * GET /api/admin/export/researchers
   * Export all researchers in CSV or JSON format
   */
  async exportResearchers(req: Request, res: Response): Promise<void> {
    try {
      const format = this.parseFormat(req.query.format);
      const data = await this.exportService.exportResearchers(format);

      if (format === 'json') {
        this.sendJsonExport(res, data as object[], 'researchers');
      } else {
        this.sendCsvExport(res, data as string, 'researchers');
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to export researchers');
    }
  }

  /**
   * GET /api/admin/export/system-backup
   * Export system configuration and settings (JSON only)
   */
  async exportSystemBackup(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.exportService.exportSystemBackup();
      this.sendJsonExport(res, data, 'system-backup');
    } catch (error) {
      this.handleError(res, error, 'Failed to export system backup');
    }
  }

  /**
   * Parse format query parameter, default to CSV
   */
  private parseFormat(format: unknown): 'csv' | 'json' {
    if (format === 'json') return 'json';
    return 'csv';
  }

  /**
   * Generate filename with timestamp
   */
  private generateFilename(type: string, extension: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `odysseus-${type}-${date}.${extension}`;
  }

  /**
   * Send CSV response with appropriate headers
   */
  private sendCsvExport(res: Response, data: string, type: string): void {
    const filename = this.generateFilename(type, 'csv');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  /**
   * Send JSON response with appropriate headers for download
   */
  private sendJsonExport(res: Response, data: object | object[], type: string): void {
    const filename = this.generateFilename(type, 'json');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  }

  /**
   * Handle errors consistently
   */
  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    logger.error('Export error:', { error, message: fallbackMessage });

    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: fallbackMessage
      }
    });
  }
}
