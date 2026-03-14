/**
 * Audit Controller
 *
 * HTTP endpoints for audit log access, retention management, and archival.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';


import type { AuditRetentionService } from '@application/services/AuditRetentionService';
import type { AuditService } from '@application/services/AuditService';
import { logger } from '@infrastructure/logging/logger';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { AuditLogFilters } from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';

export interface AuditControllerDeps {
  auditService: AuditService;
  retentionService: AuditRetentionService;
}

export class AuditController {
  constructor(private deps: AuditControllerDeps) {}

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
  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {

      const filters = this.parseAuditFilters(req.query);

      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

      const result = isLabScoped
        ? await this.deps.auditService.getAuditLogForLab(filters, user.labId!)
        : await this.deps.auditService.getAuditLog(filters);

      const response = ResponseBuilder.success({
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
      handleControllerError(error, res, 'Failed to get audit log');
    }
  }

  /** GET /api/admin/audit/entity/:entityType/:entityId */
  async getEntityHistory(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;

      if (!entityType || !entityId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'entityType and entityId are required'));
        return;
      }

      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

      const entries = isLabScoped
        ? await this.deps.auditService.getEntityHistoryForLab(entityId, entityType, user.labId!)
        : await this.deps.auditService.getEntityHistory(entityId, entityType);

      const response = ResponseBuilder.success({
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
      handleControllerError(error, res, 'Failed to get entity history');
    }
  }

  /** GET /api/admin/audit/statistics */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

      const stats = isLabScoped
        ? await this.deps.auditService.getStatisticsForLab(user.labId!)
        : await this.deps.auditService.getStatistics();

      const response = ResponseBuilder.success({
        statistics: stats,
      });

      res.status(200).json(response);

      logger.debug('Audit statistics retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get audit statistics');
    }
  }

  /** GET /api/admin/audit/retention/metrics */
  async getRetentionMetrics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Retention metrics require system admin access'));
        return;
      }



      const metrics = await this.deps.retentionService.getRetentionMetrics();

      const response = ResponseBuilder.success({
        metrics,
      });

      res.status(200).json(response);

      logger.debug('Retention metrics retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get retention metrics');
    }
  }

  /** GET /api/admin/audit/retention/policy */
  async getRetentionPolicy(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Retention policy requires system admin access'));
        return;
      }



      const policy = this.deps.retentionService.getRetentionPolicy();

      const response = ResponseBuilder.success({
        policy,
      });

      res.status(200).json(response);

      logger.debug('Retention policy retrieved', {
        requestedBy: req.user?.username,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get retention policy');
    }
  }

  /** POST /api/admin/audit/retention/archive */
  async runManualArchival(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Manual archival requires system admin access'));
        return;
      }



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
      handleControllerError(error, res, 'Failed to run manual archival');
    }
  }

  /** GET /api/admin/audit/retention/export */
  async exportArchivedLogs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.isSystemAdmin()) {
        res.status(403).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Export requires system admin access'));
        return;
      }

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
      handleControllerError(error, res, 'Failed to export archived logs');
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
      handleControllerError(error, res, 'Failed to get lab audit log');
    }
  }

  /** GET /api/admin/audit/search */
  async searchAuditLogs(req: Request, res: Response): Promise<void> {
    try {

      const filters = this.parseAuditFilters(req.query);
      const includeArchive = req.query.includeArchive === 'true';

      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

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
      handleControllerError(error, res, 'Failed to search audit logs');
    }
  }
}
