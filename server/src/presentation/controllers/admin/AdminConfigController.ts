/**
 * Admin Configuration Controller
 *
 * Security settings, system metrics, and user statistics for lab and system admins.
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { logger } from '@infrastructure/logging/logger';
import { GetUserStatisticsQuery, GetUserStatisticsQueryHandler } from '@application/queries/UserQueries';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import type { SecurityConfig } from '@odysseus/shared-schemas';

export interface AdminConfigControllerDeps {
  getUserStatsHandler: GetUserStatisticsQueryHandler;
  configRepository: StorageRepository;
}

export class AdminConfigController {
  constructor(private deps: AdminConfigControllerDeps) {}

  async getSecurityConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const securityConfig = await this.deps.configRepository.getSecurityConfig();

      const response = ResponseBuilder.withTiming(startTime, {
        config: securityConfig
      });
      res.status(200).json(response);

      logger.debug('Security configuration retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSecurityConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const adminUser = req.user;

      if (!adminUser) {
        return next(new Error('Admin user not found in request context'));
      }

      if (adminUser.isDemo) {
        res.status(403).json(ResponseBuilder.error('FORBIDDEN', 'Security configuration changes are restricted in the demo environment'));
        return;
      }

      const updates: Partial<SecurityConfig> = req.body;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json(ResponseBuilder.error('INVALID_REQUEST', 'Request body must be an object'));
        return;
      }

      const updatedConfig = await this.deps.configRepository.updateSecurityConfig(updates);

      logger.info('Security configuration updated', {
        updatedBy: adminUser.username,
        changes: Object.keys(updates)
      });

      const response = ResponseBuilder.withTiming(startTime, {
        config: updatedConfig
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const labId = req.user?.labId;
      if (!labId) {
        res.status(400).json(ResponseBuilder.error('LAB_REQUIRED', 'Lab context required for metrics'));
        return;
      }
      const metrics = await this.deps.configRepository.getSystemMetrics(labId);

      const response = ResponseBuilder.withTiming(startTime, metrics);
      res.status(200).json(response);

      logger.debug('System metrics retrieved', {
        requestedBy: req.user?.username
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const query = new GetUserStatisticsQuery();
      const stats = await this.deps.getUserStatsHandler.handle(query);

      const response = ResponseBuilder.withTiming(startTime, { statistics: stats });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
