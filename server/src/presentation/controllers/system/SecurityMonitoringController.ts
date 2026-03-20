/**
 * Security Monitoring Controller
 *
 * System admin endpoints for session/token monitoring, IP activity, and session cleanup.
 */

import { NotFoundError } from '@domain/errors/NotFoundError';
import type { RefreshTokenRepository, IpTokenCount } from '@domain/repositories/RefreshTokenRepository';
import type { UserSessionRepository, IpSessionCount } from '@domain/repositories/UserSessionRepository';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface SecurityMonitoringControllerDeps {
  userSessionRepository: UserSessionRepository;
  refreshTokenRepository: RefreshTokenRepository;
}

export class SecurityMonitoringController extends BaseController {
  constructor(private deps: SecurityMonitoringControllerDeps) {
    super();
  }

  async getSecurityOverview(_req: Request, res: Response): Promise<void> {
    try {
      const [
        activeSessions,
        expiredAwaitingCleanup,
        avgSessionDurationMinutes,
        activeTokens,
        expiredTokens,
        revokedTokens,
        avgLifespanDays,
      ] = await Promise.all([
        this.deps.userSessionRepository.countAllActiveSessions(),
        this.deps.userSessionRepository.countExpiredSessions(),
        this.deps.userSessionRepository.getAverageSessionDurationMinutes(),
        this.deps.refreshTokenRepository.countAllActiveTokens(),
        this.deps.refreshTokenRepository.countExpiredTokens(),
        this.deps.refreshTokenRepository.countRevokedTokens(),
        this.deps.refreshTokenRepository.getAverageTokenLifespanDays(),
      ]);

      res.status(200).json(ResponseBuilder.success({
        sessionOverview: { activeSessions, expiredAwaitingCleanup, avgSessionDurationMinutes },
        tokenHealth: { activeTokens, expiredTokens, revokedTokens, avgLifespanDays },
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get security overview');
    }
  }

  async getActiveSessions(_req: Request, res: Response): Promise<void> {
    try {
      const sessions = await this.deps.userSessionRepository.findAllActiveSessionsWithUserInfo();

      const serialized = sessions.map(s => ({
        ...s,
        loginTime: s.loginTime.toISOString(),
        lastActivity: s.lastActivity.toISOString(),
      }));

      res.status(200).json(ResponseBuilder.success({
        sessions: serialized,
        total: serialized.length,
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get active sessions');
    }
  }

  async getIpActivity(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const [sessionCounts, tokenCounts] = await Promise.all([
        this.deps.userSessionRepository.getSessionCountsByIp(startDate, endDate),
        this.deps.refreshTokenRepository.getTokenCountsByIp(startDate, endDate),
      ]);

      const merged = this.mergeIpActivity(sessionCounts, tokenCounts);

      res.status(200).json(ResponseBuilder.success({ entries: merged }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get IP activity');
    }
  }

  async purgeExpiredSessions(_req: Request, res: Response): Promise<void> {
    try {
      const [purgedSessions, purgedTokens] = await Promise.all([
        this.deps.userSessionRepository.purgeExpiredSessions(),
        this.deps.refreshTokenRepository.cleanupExpiredTokens(0),
      ]);

      logger.info('Purged expired sessions and tokens', { purgedSessions, purgedTokens });

      res.status(200).json(ResponseBuilder.success({ purgedSessions, purgedTokens }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to purge expired sessions');
    }
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await this.deps.userSessionRepository.findById(id);
      if (!session) {
        throw new NotFoundError('Session not found');
      }

      await this.deps.userSessionRepository.revokeSession(id);

      // Revoke the associated refresh token
      const refreshTokenValue = session.refreshToken;
      if (refreshTokenValue) {
        const refreshToken = await this.deps.refreshTokenRepository.findByToken(refreshTokenValue);
        if (refreshToken) {
          refreshToken.revoke();
          await this.deps.refreshTokenRepository.save(refreshToken);
        }
      }

      logger.info('Admin revoked session', { sessionId: id, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success({ message: 'Session revoked successfully' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke session');
    }
  }

  async bulkRevokeSessions(req: Request, res: Response): Promise<void> {
    try {
      const { sessionIds } = req.body as { sessionIds: string[] };

      const sessions = await this.deps.userSessionRepository.findByIds(sessionIds);
      if (sessions.length === 0) {
        res.status(200).json(ResponseBuilder.success({ revokedCount: 0 }));
        return;
      }

      const activeIds = sessions.map(s => s.id);
      const revokedCount = await this.deps.userSessionRepository.batchRevoke(activeIds);

      // Revoke associated refresh tokens
      for (const session of sessions) {
        if (session.refreshToken) {
          const refreshToken = await this.deps.refreshTokenRepository.findByToken(session.refreshToken);
          if (refreshToken) {
            refreshToken.revoke();
            await this.deps.refreshTokenRepository.save(refreshToken);
          }
        }
      }

      logger.info('Admin bulk revoked sessions', { count: revokedCount, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success({ revokedCount }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk revoke sessions');
    }
  }

  private mergeIpActivity(
    sessionCounts: IpSessionCount[],
    tokenCounts: IpTokenCount[]
  ): Array<{ ipAddress: string; sessionCount: number; tokenCount: number; uniqueUserCount: number; userIds: string[] }> {
    const merged = new Map<string, { sessionCount: number; tokenCount: number; userIds: Set<string> }>();

    for (const entry of sessionCounts) {
      merged.set(entry.ipAddress, {
        sessionCount: entry.sessionCount,
        tokenCount: 0,
        userIds: new Set(entry.userIds),
      });
    }

    for (const entry of tokenCounts) {
      const existing = merged.get(entry.ipAddress);
      if (existing) {
        existing.tokenCount = entry.tokenCount;
        for (const uid of entry.userIds) existing.userIds.add(uid);
      } else {
        merged.set(entry.ipAddress, {
          sessionCount: 0,
          tokenCount: entry.tokenCount,
          userIds: new Set(entry.userIds),
        });
      }
    }

    return Array.from(merged.entries())
      .map(([ipAddress, data]) => ({
        ipAddress,
        sessionCount: data.sessionCount,
        tokenCount: data.tokenCount,
        uniqueUserCount: data.userIds.size,
        userIds: Array.from(data.userIds),
      }))
      .sort((a, b) => (b.sessionCount + b.tokenCount) - (a.sessionCount + a.tokenCount));
  }
}
