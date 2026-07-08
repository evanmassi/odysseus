/**
 * Security Monitoring Controller
 *
 * System admin endpoints for session/token monitoring, IP activity, and session cleanup.
 */

import type { SecurityMonitoringApplicationService } from '@application/services/SecurityMonitoringApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface SecurityMonitoringControllerDeps {
  securityMonitoringService: SecurityMonitoringApplicationService;
}

export class SecurityMonitoringController extends BaseController {
  constructor(private deps: SecurityMonitoringControllerDeps) {
    super();
  }

  async getSecurityOverview(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.deps.securityMonitoringService.getSecurityOverview();
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get security overview');
    }
  }

  async getActiveSessions(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.deps.securityMonitoringService.getActiveSessions();
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get active sessions');
    }
  }

  async getIpActivity(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await this.deps.securityMonitoringService.getIpActivity(startDate, endDate);
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get IP activity');
    }
  }

  async purgeExpiredSessions(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.deps.securityMonitoringService.purgeExpiredSessions();
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to purge expired sessions');
    }
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.deps.securityMonitoringService.revokeSession(id);

      logger.info('Admin revoked session', { sessionId: id, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success({ message: 'Session revoked successfully' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke session');
    }
  }

  async bulkRevokeSessions(req: Request, res: Response): Promise<void> {
    try {
      const { sessionIds } = req.body as { sessionIds: string[] };
      const result = await this.deps.securityMonitoringService.bulkRevokeSessions(sessionIds);

      logger.info('Admin bulk revoked sessions', { count: result.revokedCount, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk revoke sessions');
    }
  }

  async getFailedLogins(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await this.deps.securityMonitoringService.getFailedLogins(limit, startDate, endDate);
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get failed logins');
    }
  }

  async getSessionActivity(req: Request, res: Response): Promise<void> {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;

      const result = await this.deps.securityMonitoringService.getSessionActivity(hours);
      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get session activity');
    }
  }
}
