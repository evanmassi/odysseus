/**
 * Security Monitoring Service Tests
 *
 * Overview reshaping, IP-activity merge/sort, the session→refresh-token revoke
 * cascade, and failed-login audit decoding.
 */

import { NotFoundError } from '@domain/errors/NotFoundError';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import { SecurityMonitoringApplicationService } from './SecurityMonitoringApplicationService';

function makeService(deps: {
  userSessionRepository?: Partial<UserSessionRepository>;
  refreshTokenRepository?: Partial<RefreshTokenRepository>;
  auditRepository?: Partial<AuditRepository>;
}) {
  return new SecurityMonitoringApplicationService({
    userSessionRepository: (deps.userSessionRepository ?? {}) as unknown as UserSessionRepository,
    refreshTokenRepository: (deps.refreshTokenRepository ?? {}) as unknown as RefreshTokenRepository,
    auditRepository: (deps.auditRepository ?? {}) as unknown as AuditRepository,
  });
}

describe('SecurityMonitoringApplicationService.getSecurityOverview', () => {
  it('reshapes the counts into session/token groups', async () => {
    const service = makeService({
      userSessionRepository: {
        countAllActiveSessions: jest.fn().mockResolvedValue(5),
        countExpiredSessions: jest.fn().mockResolvedValue(2),
        getAverageSessionDurationMinutes: jest.fn().mockResolvedValue(30),
      },
      refreshTokenRepository: {
        countAllActiveTokens: jest.fn().mockResolvedValue(10),
        countExpiredTokens: jest.fn().mockResolvedValue(3),
        countRevokedTokens: jest.fn().mockResolvedValue(1),
        getAverageTokenLifespanDays: jest.fn().mockResolvedValue(7),
      },
    });

    expect(await service.getSecurityOverview()).toEqual({
      sessionOverview: { activeSessions: 5, expiredAwaitingCleanup: 2, avgSessionDurationMinutes: 30 },
      tokenHealth: { activeTokens: 10, expiredTokens: 3, revokedTokens: 1, avgLifespanDays: 7 },
    });
  });
});

describe('SecurityMonitoringApplicationService.getIpActivity', () => {
  it('merges session + token counts, unioning users and sorting by volume', async () => {
    const service = makeService({
      userSessionRepository: {
        getSessionCountsByIp: jest.fn().mockResolvedValue([
          { ipAddress: '1.1.1.1', sessionCount: 2, userIds: ['u1'] },
          { ipAddress: '2.2.2.2', sessionCount: 1, userIds: ['u2'] },
        ]),
      },
      refreshTokenRepository: {
        getTokenCountsByIp: jest.fn().mockResolvedValue([
          { ipAddress: '1.1.1.1', tokenCount: 3, userIds: ['u1', 'u3'] },
        ]),
      },
    });

    const { entries } = await service.getIpActivity();

    expect(entries[0]).toMatchObject({ ipAddress: '1.1.1.1', sessionCount: 2, tokenCount: 3, uniqueUserCount: 2 });
    expect(entries[1]).toMatchObject({ ipAddress: '2.2.2.2', sessionCount: 1, tokenCount: 0, uniqueUserCount: 1 });
  });
});

describe('SecurityMonitoringApplicationService.revokeSession', () => {
  it('throws when the session does not exist', async () => {
    const service = makeService({ userSessionRepository: { findById: jest.fn().mockResolvedValue(null) } });
    await expect(service.revokeSession('s1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('revokes the session and its associated refresh token', async () => {
    const revokeSession = jest.fn();
    const revoke = jest.fn();
    const save = jest.fn();
    const service = makeService({
      userSessionRepository: { findById: jest.fn().mockResolvedValue({ id: 's1', refreshToken: 'rt' }), revokeSession },
      refreshTokenRepository: { findByToken: jest.fn().mockResolvedValue({ revoke }), save },
    });

    await service.revokeSession('s1');

    expect(revokeSession).toHaveBeenCalledWith('s1');
    expect(revoke).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });
});

describe('SecurityMonitoringApplicationService.bulkRevokeSessions', () => {
  it('returns zero without touching repos when nothing matches', async () => {
    const bulkRevoke = jest.fn();
    const service = makeService({ userSessionRepository: { findByIds: jest.fn().mockResolvedValue([]), bulkRevoke } });

    expect(await service.bulkRevokeSessions(['s1'])).toEqual({ revokedCount: 0 });
    expect(bulkRevoke).not.toHaveBeenCalled();
  });

  it('bulk revokes and cascades only the sessions that have refresh tokens', async () => {
    const bulkRevoke = jest.fn().mockResolvedValue(2);
    const save = jest.fn();
    const service = makeService({
      userSessionRepository: {
        findByIds: jest.fn().mockResolvedValue([{ id: 's1', refreshToken: 'rt1' }, { id: 's2', refreshToken: undefined }]),
        bulkRevoke,
      },
      refreshTokenRepository: { findByToken: jest.fn().mockResolvedValue({ revoke: jest.fn() }), save },
    });

    const result = await service.bulkRevokeSessions(['s1', 's2']);

    expect(bulkRevoke).toHaveBeenCalledWith(['s1', 's2']);
    expect(result).toEqual({ revokedCount: 2 });
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('SecurityMonitoringApplicationService.getFailedLogins', () => {
  it('decodes audit detail payloads (string or object) with fallbacks', async () => {
    const service = makeService({
      auditRepository: {
        findByAction: jest.fn().mockResolvedValue([
          { details: JSON.stringify({ username: 'bob', ipAddress: '1.1.1.1', reason: 'bad password' }), timestamp: new Date('2020-01-01T00:00:00Z'), entityId: 'e1' },
          { details: { username: 'alice' }, timestamp: new Date('2020-01-02T00:00:00Z'), entityId: 'e2' },
        ]),
      },
    });

    const { entries, total } = await service.getFailedLogins(50);

    expect(total).toBe(2);
    expect(entries[0]).toEqual({ username: 'bob', ipAddress: '1.1.1.1', reason: 'bad password', timestamp: '2020-01-01T00:00:00.000Z' });
    expect(entries[1]).toEqual({ username: 'alice', ipAddress: null, reason: 'Unknown', timestamp: '2020-01-02T00:00:00.000Z' });
  });
});
