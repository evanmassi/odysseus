/**
 * Security Monitoring Service
 *
 * System-admin session/token telemetry, IP-activity aggregation, and session
 * cleanup/revocation (revoking a session also revokes its refresh token).
 */

import type { UserSession } from '@domain/entities/UserSession';
import { NotFoundError } from '@domain/errors/NotFoundError';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type {
  RefreshTokenRepository,
  IpTokenCount,
} from '@domain/repositories/RefreshTokenRepository';
import type {
  UserSessionRepository,
  IpSessionCount,
} from '@domain/repositories/UserSessionRepository';
import { logger } from '@infrastructure/logging/logger';

export interface SecurityMonitoringApplicationServiceDeps {
  userSessionRepository: UserSessionRepository;
  refreshTokenRepository: RefreshTokenRepository;
  auditRepository: AuditRepository;
}

export class SecurityMonitoringApplicationService {
  constructor(private deps: SecurityMonitoringApplicationServiceDeps) {}

  async getSecurityOverview() {
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

    return {
      sessionOverview: { activeSessions, expiredAwaitingCleanup, avgSessionDurationMinutes },
      tokenHealth: { activeTokens, expiredTokens, revokedTokens, avgLifespanDays },
    };
  }

  async getActiveSessions() {
    const sessions = await this.deps.userSessionRepository.findAllActiveSessionsWithUserInfo();

    const serialized = sessions.map(s => ({
      ...s,
      loginTime: s.loginTime.toISOString(),
      lastActivity: s.lastActivity.toISOString(),
    }));

    return { sessions: serialized, total: serialized.length };
  }

  async getIpActivity(startDate?: Date, endDate?: Date) {
    const [sessionCounts, tokenCounts] = await Promise.all([
      this.deps.userSessionRepository.getSessionCountsByIp(startDate, endDate),
      this.deps.refreshTokenRepository.getTokenCountsByIp(startDate, endDate),
    ]);

    return { entries: this.mergeIpActivity(sessionCounts, tokenCounts) };
  }

  async purgeExpiredSessions() {
    const [purgedSessions, purgedTokens] = await Promise.all([
      this.deps.userSessionRepository.purgeExpiredSessions(),
      this.deps.refreshTokenRepository.cleanupExpiredTokens(0),
    ]);

    logger.info('Purged expired sessions and tokens', { purgedSessions, purgedTokens });

    return { purgedSessions, purgedTokens };
  }

  /** Revoking a session also revokes its associated refresh token. */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.deps.userSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await this.deps.userSessionRepository.revokeSession(sessionId);

    await this.revokeAssociatedToken(session);
  }

  async bulkRevokeSessions(sessionIds: string[]): Promise<{ revokedCount: number }> {
    const sessions = await this.deps.userSessionRepository.findByIds(sessionIds);
    if (sessions.length === 0) {
      return { revokedCount: 0 };
    }

    const revokedCount = await this.deps.userSessionRepository.bulkRevoke(sessions.map(s => s.id));

    for (const session of sessions) {
      await this.revokeAssociatedToken(session);
    }

    return { revokedCount };
  }

  private async revokeAssociatedToken(session: UserSession): Promise<void> {
    if (session.refreshToken) {
      const refreshToken = await this.deps.refreshTokenRepository.findByToken(session.refreshToken);
      if (refreshToken) {
        refreshToken.revoke();
        await this.deps.refreshTokenRepository.save(refreshToken);
      }
    }
  }

  async getFailedLogins(limit: number, startDate?: Date, endDate?: Date) {
    const entries = await this.deps.auditRepository.findByAction('user_login_failed', {
      limit,
      dateFrom: startDate,
      dateTo: endDate,
    });

    const serialized = entries.map(e => {
      const details = typeof e.details === 'string' ? JSON.parse(e.details) : e.details;
      return {
        username: details?.username ?? e.entityId,
        ipAddress: details?.ipAddress ?? null,
        reason: details?.reason ?? 'Unknown',
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
      };
    });

    return { entries: serialized, total: serialized.length };
  }

  async getSessionActivity(hours: number) {
    const activity = await this.deps.userSessionRepository.getSessionActivityByHour(hours);

    return {
      entries: activity.map(a => ({ hour: a.hour.toISOString(), count: a.count })),
    };
  }

  private mergeIpActivity(
    sessionCounts: IpSessionCount[],
    tokenCounts: IpTokenCount[]
  ): Array<{
    ipAddress: string;
    sessionCount: number;
    tokenCount: number;
    uniqueUserCount: number;
    userIds: string[];
  }> {
    const merged = new Map<
      string,
      { sessionCount: number; tokenCount: number; userIds: Set<string> }
    >();

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
      .sort((a, b) => b.sessionCount + b.tokenCount - (a.sessionCount + a.tokenCount));
  }
}
