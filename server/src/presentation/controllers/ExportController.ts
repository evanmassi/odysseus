/**
 * Export Controller
 *
 * Handles HTTP requests for data export operations.
 */


import type { ExportService } from '@application/services/ExportService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';

import type { Request, Response } from 'express';

export interface ExportControllerDeps {
  exportService: ExportService;
}

export class ExportController extends BaseController {
  constructor(private deps: ExportControllerDeps) {
    super();
  }

  async exportTubes(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'tubes', {
      csv: (labId) => this.deps.exportService.exportTubes(labId, 'csv'),
      json: (labId) => this.deps.exportService.exportTubes(labId, 'json'),
    });
  }

  async exportUsers(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'users', {
      csv: (labId) => this.deps.exportService.exportUsers(labId, 'csv'),
      json: (labId) => this.deps.exportService.exportUsers(labId, 'json'),
    });
  }

  async exportResearchers(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'researchers', {
      csv: (labId) => this.deps.exportService.exportResearchers(labId, 'csv'),
      json: (labId) => this.deps.exportService.exportResearchers(labId, 'json'),
    });
  }

  async exportEquipment(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'equipment', {
      csv: (labId) => this.deps.exportService.exportEquipment(labId, 'csv'),
      json: (labId) => this.deps.exportService.exportEquipment(labId, 'json'),
    });
  }

  async exportSupplyReorderList(req: Request, res: Response): Promise<void> {
    await this.handleExport(req, res, 'supply-reorder-list', {
      csv: (labId) => this.deps.exportService.exportSupplyReorderList(labId, 'csv'),
      json: (labId) => this.deps.exportService.exportSupplyReorderList(labId, 'json'),
    });
  }

  async exportSystemBackup(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const data = await this.deps.exportService.exportSystemBackup(labId);
      this.sendJsonExport(res, data, 'system-backup');
    } catch (error) {
      handleControllerError(error, res, 'Failed to export system backup');
    }
  }

  private async handleExport(
    req: Request,
    res: Response,
    type: string,
    fetchers: { csv: (labId: string) => Promise<string>; json: (labId: string) => Promise<object[]> }
  ): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const format = this.parseFormat(req.query.format);

      if (format === 'json') {
        this.sendJsonExport(res, await fetchers.json(labId), type);
      } else {
        this.sendCsvExport(res, await fetchers.csv(labId), type);
      }
    } catch (error) {
      handleControllerError(error, res, `Failed to export ${type}`);
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

}
