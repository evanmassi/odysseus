/**
 * Audit Controller
 *
 * HTTP endpoints for audit log access, retention management, and archival.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { AuditService } from '@application/services/AuditService';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import type { AuditLogFilters } from '@odysseus/shared-schemas';
import { logger } from '@infrastructure/logging/logger';

export class AuditController {
  constructor(
    private auditService: AuditService,
    private retentionService: AuditRetentionService
  ) {}

  private parseAuditFilters(query: Request['query']): AuditLogFilters {
    return {
      limit: query.limit ? parseInt(query.limit as string) : 50,
      offset: query.offset ? parseInt(query.offset as string) : 0,
      username: query.username as string | undefined,
      action: query.action as string | undefined,
      entityType: query.entityType as string | undefined,
      dateFrom: query.dateFrom as string | undefined,
      dateTo: query.dateTo as string | undefined,
    };
  }

  /** GET /api/admin/audit */
  async getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const filters = this.parseAuditFilters(req.query);

      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

      const result = isLabScoped
        ? await this.auditService.getAuditLogForLab(filters, user.labId!)
        : await this.auditService.getAuditLog(filters);

      const response = ResponseBuilder.withTiming(startTime, {
        entries: result.items,
        pagination: result.pagination,
      });

      res.status(200).json(response);

      logger.debug('Audit log retrieved', {
        requestedBy: user?.username,
        filters,
        labScoped: !!isLabScoped,
        resultCount: result.items.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/audit/entity/:entityType/:entityId */
  async getEntityHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { entityType, entityId } = req.params;

      if (!entityType || !entityId) {
        res.status(400).json(ResponseBuilder.error('INVALID_REQUEST', 'entityType and entityId are required'));
        return;
      }

      const entries = await this.auditService.getEntityHistory(entityId, entityType);

      const response = ResponseBuilder.withTiming(startTime, {
        entries,
        entityType,
        entityId,
      });

      res.status(200).json(response);

      logger.debug('Entity history retrieved', {
        requestedBy: req.user?.username,
        entityType,
        entityId,
        entryCount: entries.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/audit/statistics */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      const stats = await this.auditService.getStatistics();

      const response = ResponseBuilder.withTiming(startTime, {
        statistics: stats,
      });

      res.status(200).json(response);

      logger.debug('Audit statistics retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/audit/retention/metrics */
  async getRetentionMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error('FORBIDDEN', 'Retention metrics require system admin access'));
        return;
      }

      const startTime = Date.now();

      const metrics = await this.retentionService.getRetentionMetrics();

      const response = ResponseBuilder.withTiming(startTime, {
        metrics,
      });

      res.status(200).json(response);

      logger.debug('Retention metrics retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/audit/retention/policy */
  async getRetentionPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error('FORBIDDEN', 'Retention policy requires system admin access'));
        return;
      }

      const startTime = Date.now();

      const policy = this.retentionService.getRetentionPolicy();

      const response = ResponseBuilder.withTiming(startTime, {
        policy,
      });

      res.status(200).json(response);

      logger.debug('Retention policy retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/admin/audit/retention/archive */
  async runManualArchival(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error('FORBIDDEN', 'Manual archival requires system admin access'));
        return;
      }

      const startTime = Date.now();

      logger.info('Manual archival triggered', {
        requestedBy: req.user?.username,
      });

      const result = await this.retentionService.runManualArchival();

      const response = ResponseBuilder.withTiming(startTime, {
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
      logger.error('Manual archival failed', {
        error: error instanceof Error ? error.message : String(error),
        requestedBy: req.user?.username,
      });
      next(error);
    }
  }

  /** GET /api/admin/audit/retention/export */
  async exportArchivedLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error('FORBIDDEN', 'Export requires system admin access'));
        return;
      }

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const jsonExport = await this.retentionService.exportArchivedLogs(dateFrom, dateTo);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-archive-export.json');
      res.status(200).send(jsonExport);

      logger.info('Archived logs exported', {
        requestedBy: req.user?.username,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
      });
    } catch (error) {
      logger.error('Archive export failed', {
        error: error instanceof Error ? error.message : String(error),
        requestedBy: req.user?.username,
      });
      next(error);
    }
  }

  async getLabAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const { labId } = req.params;
      const filters = this.parseAuditFilters(req.query);
      const includeArchive = req.query.includeArchive === 'true';

      const result = includeArchive
        ? await this.retentionService.queryAllLogsForLab(filters, labId, true)
        : await this.auditService.getAuditLogForLab(filters, labId);

      const response = ResponseBuilder.withTiming(startTime, {
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
      next(error);
    }
  }

  /** GET /api/admin/audit/search */
  async searchAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const filters = this.parseAuditFilters(req.query);
      const includeArchive = req.query.includeArchive === 'true';

      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

      const result = isLabScoped
        ? await this.retentionService.queryAllLogsForLab(filters, user.labId!, includeArchive)
        : await this.retentionService.queryAllLogs(filters, includeArchive);

      const response = ResponseBuilder.withTiming(startTime, {
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
      next(error);
    }
  }
}
