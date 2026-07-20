/**
 * User Session Service Tests
 *
 * Session listing (current-session flag) and revocation guards
 * (own-session ownership, current-session block).
 */

import type { User } from '@domain/entities/User';
import type { UserSession } from '@domain/entities/UserSession';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import { UserSessionApplicationService } from './UserSessionApplicationService';

const user = { id: 'u1' } as unknown as User;

function makeSession(id: string, userId: string): UserSession {
  return {
    id,
    userId,
    deviceInfo: 'device',
    ipAddress: '1.2.3.4',
    userAgent: 'UA',
    createdAt: new Date('2020-01-01T00:00:00Z'),
    lastUsedAt: new Date('2020-01-02T00:00:00Z'),
    expiresAt: new Date('2020-01-03T00:00:00Z'),
  } as unknown as UserSession;
}

describe('UserSessionApplicationService.getActiveSessions', () => {
  it('maps sessions to ISO strings and flags the current session', async () => {
    const sessions = [makeSession('s1', 'u1'), makeSession('s2', 'u1')];
    const findActiveSessionsByUserId = jest.fn().mockResolvedValue(sessions);
    const service = new UserSessionApplicationService({
      userSessionRepository: { findActiveSessionsByUserId } as unknown as UserSessionRepository,
    });

    const result = await service.getActiveSessions(user, 's2');

    expect(findActiveSessionsByUserId).toHaveBeenCalledWith('u1');
    expect(result[0]).toMatchObject({
      id: 's1',
      createdAt: '2020-01-01T00:00:00.000Z',
      isCurrentSession: false,
    });
    expect(result[1].isCurrentSession).toBe(true);
  });
});

describe('UserSessionApplicationService.revokeSession', () => {
  function makeService(opts: { session?: unknown; revoked?: boolean } = {}) {
    const findById = jest.fn().mockResolvedValue(opts.session ?? null);
    const revokeSession = jest.fn().mockResolvedValue(opts.revoked ?? true);
    const userSessionRepository = { findById, revokeSession } as unknown as UserSessionRepository;
    return {
      service: new UserSessionApplicationService({ userSessionRepository }),
      findById,
      revokeSession,
    };
  }

  it('rejects revoking the current session without a lookup', async () => {
    const { service, findById } = makeService();
    await expect(service.revokeSession(user, 's1', 's1')).rejects.toBeInstanceOf(PermissionError);
    expect(findById).not.toHaveBeenCalled();
  });

  it('throws when the session does not exist', async () => {
    const { service } = makeService({ session: null });
    await expect(service.revokeSession(user, 's1', 'current')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('throws (masking existence) when the session belongs to another user', async () => {
    const { service, revokeSession } = makeService({ session: { id: 's1', userId: 'other' } });
    await expect(service.revokeSession(user, 's1', 'current')).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(revokeSession).not.toHaveBeenCalled();
  });

  it('throws when the session was already revoked', async () => {
    const { service } = makeService({ session: { id: 's1', userId: 'u1' }, revoked: false });
    await expect(service.revokeSession(user, 's1', 'current')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('revokes an own, active session', async () => {
    const { service, revokeSession } = makeService({
      session: { id: 's1', userId: 'u1' },
      revoked: true,
    });
    await service.revokeSession(user, 's1', 'current');
    expect(revokeSession).toHaveBeenCalledWith('s1');
  });
});

describe('UserSessionApplicationService.bulkRevokeSessions', () => {
  function makeService(activeSessions: UserSession[], revokedCount = activeSessions.length) {
    const findActiveSessionsByUserId = jest.fn().mockResolvedValue(activeSessions);
    const bulkRevoke = jest.fn().mockResolvedValue(revokedCount);
    const userSessionRepository = {
      findActiveSessionsByUserId,
      bulkRevoke,
    } as unknown as UserSessionRepository;
    return { service: new UserSessionApplicationService({ userSessionRepository }), bulkRevoke };
  }

  it("revokes only the user's own sessions and skips the current one", async () => {
    const active = [makeSession('s1', 'u1'), makeSession('s2', 'u1'), makeSession('s3', 'u1')];
    const { service, bulkRevoke } = makeService(active, 2);

    // Request mixes two own sessions, the current session ('s3'), and a foreign id ('other').
    const result = await service.bulkRevokeSessions(user, ['s1', 's2', 's3', 'other'], 's3');

    expect(bulkRevoke).toHaveBeenCalledWith(['s1', 's2']);
    expect(result).toEqual({ revokedCount: 2 });
  });

  it('returns zero and skips the repository when nothing is revocable', async () => {
    const { service, bulkRevoke } = makeService([makeSession('s1', 'u1')]);

    const result = await service.bulkRevokeSessions(user, ['s1', 'foreign'], 's1');

    expect(bulkRevoke).not.toHaveBeenCalled();
    expect(result).toEqual({ revokedCount: 0 });
  });
});
