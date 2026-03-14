/**
 * Admin Configuration Controller
 *
 * Security settings, system metrics, and user statistics for lab and system admins.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';


import type { GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import { GetUserStatisticsQuery } from '@application/queries/UserQueries';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import { logger } from '@infrastructure/logging/logger';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { SecurityConfig } from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';

export interface AdminConfigControllerDeps {
  getUserStatsHandler: GetUserStatisticsQueryHandler;
  configRepository: StorageRepository;
}

export class AdminConfigController {
  constructor(private deps: AdminConfigControllerDeps) {}

  async getSecurityConfig(req: Request, res: Response): Promise<void> {
    try {

      const securityConfig = await this.deps.configRepository.getSecurityConfig();

      const response = ResponseBuilder.success({
        config: securityConfig
      });
      res.status(200).json(response);

      logger.debug('Security configuration retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get security config');
    }
  }

  async updateSecurityConfig(req: Request, res: Response): Promise<void> {
    try {

      const adminUser = req.user;

      if (!adminUser) {
        handleControllerError(new Error('Admin user not found in request context'), res, 'Failed to update security config');
        return;
      }

      if (adminUser.isDemo) {
        res.status(403).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Security configuration changes are restricted in the demo environment'));
        return;
      }

      const updates: Partial<SecurityConfig> = req.body;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.INVALID_INPUT, 'Request body must be an object'));
        return;
      }

      const updatedConfig = await this.deps.configRepository.updateSecurityConfig(updates);

      logger.info('Security configuration updated', {
        updatedBy: adminUser.username,
        changes: Object.keys(updates)
      });

      const response = ResponseBuilder.success({
        config: updatedConfig
      });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to update security config');
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {

      const labId = req.user?.labId;
      if (!labId) {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Lab context required for metrics'));
        return;
      }
      const metrics = await this.deps.configRepository.getSystemMetrics(labId);

      const response = ResponseBuilder.success(metrics);
      res.status(200).json(response);

      logger.debug('System metrics retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get metrics');
    }
  }

  async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const isLabScoped = user && !user.isSystemAdmin() && user.labId;

      const query = new GetUserStatisticsQuery(isLabScoped ? user.labId! : undefined);
      const stats = await this.deps.getUserStatsHandler.handle(query);

      const response = ResponseBuilder.success({ statistics: stats });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user statistics');
    }
  }
}
