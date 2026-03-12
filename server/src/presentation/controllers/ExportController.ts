/**
 * Export Controller
 *
 * Handles HTTP requests for data export operations.
 */

import { Request, Response } from 'express';
import { ExportService } from '@application/services/ExportService';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { BaseController } from '@presentation/controllers/BaseController';
import { logger } from '@infrastructure/logging/logger';

export class ExportController extends BaseController {
  constructor(private exportService: ExportService) {
    super();
  }

  /** GET /api/admin/export/tubes */
  async exportTubes(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'tubes', (labId, format) =>
      this.exportService.exportTubes(labId, format)
    );
  }

  /** GET /api/admin/export/users */
  async exportUsers(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'users', (labId, format) =>
      this.exportService.exportUsers(labId, format)
    );
  }

  /** GET /api/admin/export/researchers */
  async exportResearchers(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'researchers', (labId, format) =>
      this.exportService.exportResearchers(labId, format)
    );
  }

  /** GET /api/admin/export/system-backup */
  async exportSystemBackup(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const data = await this.exportService.exportSystemBackup(labId);
      this.sendJsonExport(res, data, 'system-backup');
    } catch (error) {
      this.handleError(res, error, 'Failed to export system backup');
    }
  }

  private async handleExport(
    req: Request,
    res: Response,
    type: string,
    fetchData: (labId: string, format: 'csv' | 'json') => Promise<string | object[]>
  ): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const format = this.parseFormat(req.query.format);
      const data = await fetchData(labId, format);

      if (format === 'json') {
        this.sendJsonExport(res, data as object[], type);
      } else {
        this.sendCsvExport(res, data as string, type);
      }
    } catch (error) {
      this.handleError(res, error, `Failed to export ${type}`);
    }
  }

  private parseFormat(format: unknown): 'csv' | 'json' {
    if (format === 'json') return 'json';
    return 'csv';
  }

  private generateFilename(type: string, extension: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `odysseus-${type}-${date}.${extension}`;
  }

  private sendCsvExport(res: Response, data: string, type: string): void {
    const filename = this.generateFilename(type, 'csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  private sendJsonExport(res: Response, data: object | object[], type: string): void {
    const filename = this.generateFilename(type, 'json');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  }

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    logger.error('Export error:', { error, message: fallbackMessage });
    res.status(500).json(ResponseBuilder.error('EXPORT_ERROR', fallbackMessage));
  }
}
