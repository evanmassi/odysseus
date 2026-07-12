/**
 * Admin Configuration Controller
 *
 * Security settings, system metrics, and user statistics for lab and system admins.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type { GetSystemMetricsQueryHandler } from '@application/queries/StorageQueries';
import type { GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import type { SecurityConfigApplicationService } from '@application/services/SecurityConfigApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { SecurityConfig } from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';

export interface AdminConfigControllerDeps {
  securityConfigService: SecurityConfigApplicationService;
  getSystemMetricsHandler: GetSystemMetricsQueryHandler;
  getUserStatsHandler: GetUserStatisticsQueryHandler;
}

export class AdminConfigController extends BaseController {
  constructor(private deps: AdminConfigControllerDeps) {
    super();
  }

  async getSecurityConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.deps.securityConfigService.getSecurityConfig();

      res.status(200).json(ResponseBuilder.success({ config }));

      logger.debug('Security configuration retrieved', { requestedBy: req.user?.username });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get security config');
    }
  }

  async updateSecurityConfig(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const updates: Partial<SecurityConfig> = req.body;

      const config = await this.deps.securityConfigService.updateSecurityConfig(updates, user);

      logger.info('Security configuration updated', {
        updatedBy: user.username,
        changes: Object.keys(updates),
      });

      res.status(200).json(ResponseBuilder.success({ config }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update security config');
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.getAuthenticatedUser(req).labId;
      if (!labId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Lab context required for metrics'));
        return;
      }

      const metrics = await this.deps.getSystemMetricsHandler.handle({ labId });

      res.status(200).json(ResponseBuilder.success(metrics));

      logger.debug('System metrics retrieved', { requestedBy: req.user?.username });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get metrics');
    }
  }

  async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const labId = user.isSystemAdmin() ? undefined : user.labId;

      const stats = await this.deps.getUserStatsHandler.handle({ labId });

      res.status(200).json(ResponseBuilder.success({ statistics: stats }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user statistics');
    }
  }
}
