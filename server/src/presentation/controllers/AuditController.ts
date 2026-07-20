/**
 * Audit Controller
 *
 * HTTP endpoints for audit log access, retention management, and archival.
 */

import type { AuditRetentionService } from '@application/services/AuditRetentionService';
import type { AuditService } from '@application/services/AuditService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { AuditLogFilters } from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';

export interface AuditControllerDeps {
  auditService: AuditService;
  retentionService: AuditRetentionService;
}

export class AuditController extends BaseController {
  constructor(private deps: AuditControllerDeps) {
    super();
  }

  private parseAuditFilters(query: Request['query']): AuditLogFilters {
    return {
      limit: query.limit ? parseInt(query.limit as string) : 50,
      offset: query.offset ? parseInt(query.offset as string) : 0,
      username: query.username as string | undefined,
      action: this.toStringArray(query.action),
      entityType: this.toStringArray(query.entityType),
      dateFrom: query.dateFrom as string | undefined,
      dateTo: query.dateTo as string | undefined,
    };
  }

  /** Normalizes a repeated/single query param into a non-empty string array (or undefined). */
  private toStringArray(value: unknown): string[] | undefined {
    if (value === undefined) return undefined;
    const values = (Array.isArray(value) ? value : [value]).filter(
      (v): v is string => typeof v === 'string' && v.length > 0
    );
    return values.length > 0 ? values : undefined;
  }

  async getRetentionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.deps.retentionService.getRetentionMetrics();

      const response = ResponseBuilder.success({
        metrics,
      });

      res.status(200).json(response);

      logger.debug('Retention metrics retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get retention metrics', req.requestId);
    }
  }

  async getRetentionPolicy(req: Request, res: Response): Promise<void> {
    try {
      const policy = this.deps.retentionService.getRetentionPolicy();

      const response = ResponseBuilder.success({
        policy,
      });

      res.status(200).json(response);

      logger.debug('Retention policy retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get retention policy', req.requestId);
    }
  }

  async runManualArchival(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual archival triggered', {
        requestedBy: req.user?.username,
      });

      const result = await this.deps.retentionService.runManualArchival();

      const response = ResponseBuilder.success({
        archived: result.archived,
        deleted: result.deleted,
        message: `Successfully archived ${result.archived} entries and deleted ${result.deleted} expired entries`,
      });

      res.status(200).json(response);

      logger.info('Manual archival completed', {
        requestedBy: req.user?.username,
        archived: result.archived,
        deleted: result.deleted,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to run manual archival', req.requestId);
    }
  }

  async exportArchivedLogs(req: Request, res: Response): Promise<void> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const jsonExport = await this.deps.retentionService.exportArchivedLogs(dateFrom, dateTo);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-archive-export.json');
      res.status(200).send(jsonExport);

      logger.info('Archived logs exported', {
        requestedBy: req.user?.username,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to export archived logs', req.requestId);
    }
  }

  async getLabAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { labId } = req.params;
      const filters = this.parseAuditFilters(req.query);
      const includeArchive = req.query.includeArchive === 'true';

      const result = includeArchive
        ? await this.deps.retentionService.queryAllLogsForLab(filters, labId, true)
        : await this.deps.auditService.getAuditLogForLab(filters, labId);

      const response = ResponseBuilder.success({
        entries: result.items,
        pagination: result.pagination,
        includeArchive,
      });

      res.status(200).json(response);

      logger.debug('Lab audit log retrieved', {
        requestedBy: req.user?.username,
        labId,
        resultCount: result.items.length,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get lab audit log', req.requestId);
    }
  }

  async searchAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseAuditFilters(req.query);
      const includeArchive = req.query.includeArchive === 'true';

      const user = this.getAuthenticatedUser(req);
      const isLabScoped = !user.isSystemAdmin() && user.labId;

      const result = isLabScoped
        ? await this.deps.retentionService.queryAllLogsForLab(filters, user.labId!, includeArchive)
        : await this.deps.retentionService.queryAllLogs(filters, includeArchive);

      const response = ResponseBuilder.success({
        entries: result.items,
        pagination: result.pagination,
        includeArchive,
      });

      res.status(200).json(response);

      logger.debug('Audit search completed', {
        requestedBy: user?.username,
        filters,
        includeArchive,
        labScoped: !!isLabScoped,
        resultCount: result.items.length,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to search audit logs', req.requestId);
    }
  }
}
