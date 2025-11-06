/**
 * Audit Controller
 *
 * Provides HTTP endpoints for audit log access.
 * Admin-only access to full audit log.
 * Users can access their own activity.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '@presentation/responses/ApiResponse';
import { AuditService } from '@application/services/AuditService';
import type { AuditLogFilters } from '@odysseus/shared-schemas';
import { logger } from '@utils/logger';

export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * Get full audit log with advanced filtering (admin only)
   * GET /api/admin/audit
   *
   * Query parameters:
   * - limit: Number of entries per page (default: 50)
   * - offset: Pagination offset (default: 0)
   * - userId: Filter by user ID
   * - action: Filter by action type
   * - entityType: Filter by entity type
   * - dateFrom: Filter by start date
   * - dateTo: Filter by end date
   */
  async getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      // Parse query parameters
      const filters: AuditLogFilters = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        username: req.query.username as string | undefined,
        action: req.query.action as string | undefined,
        entityType: req.query.entityType as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      // Get paginated results
      const result = await this.auditService.getAuditLog(filters);

      const response = ResponseBuilder.withTiming(startTime, {
        entries: result.items,
        pagination: result.pagination,
      });

      res.status(200).json(response);

      logger.debug('Audit log retrieved', {
        requestedBy: req.user?.username,
        filters,
        resultCount: result.items.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit history for a specific entity (admin only)
   * GET /api/admin/audit/entity/:entityType/:entityId
   *
   * Returns complete history for a tube, user, or other entity.
   */
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

  /**
   * Get current user's activity log
   * GET /api/users/me/activity
   *
   * Users can view their own actions.
   */
  async getMyActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const user = req.user;

      if (!user) {
        res.status(401).json(ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      // Parse query parameters for pagination
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const entries = await this.auditService.getUserActivity(user.id, {
        limit,
        offset,
      });

      const response = ResponseBuilder.withTiming(startTime, {
        entries,
      });

      res.status(200).json(response);

      logger.debug('User activity retrieved', {
        userId: user.id,
        username: user.username,
        entryCount: entries.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit statistics (admin only)
   * GET /api/admin/audit/statistics
   *
   * Returns counts and metrics for dashboard.
   */
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
}
