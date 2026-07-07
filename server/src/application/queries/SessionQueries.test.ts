/**
 * Session Info Query Tests
 *
 * Token-validation outcomes and the idle-timeout / warning computation.
 */

import type { SessionService } from '@application/contracts/SessionService';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import { GetSessionInfoQueryHandler } from './SessionQueries';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

function makeHandler(opts: { validation: unknown; session?: unknown }) {
  const sessionService = { validateSessionWithActivity: jest.fn().mockResolvedValue(opts.validation) } as unknown as SessionService;
  const userSessionRepository = { findById: jest.fn().mockResolvedValue(opts.session ?? null) } as unknown as UserSessionRepository;
  const storageRepository = { getSecurityConfig: jest.fn().mockResolvedValue(DEFAULT_SECURITY_CONFIG) } as unknown as StorageRepository;
  return new GetSessionInfoQueryHandler(sessionService, userSessionRepository, storageRepository);
}

describe('GetSessionInfoQueryHandler', () => {
  it('reports unauthenticated with the failure code', async () => {
    const handler = makeHandler({ validation: { success: false, code: 'SESSION_EXPIRED' } });
    expect(await handler.handle({ token: 't' })).toEqual({ isAuthenticated: false, reason: 'SESSION_EXPIRED' });
  });

  it('reports SESSION_NOT_FOUND when the session record is gone', async () => {
    const handler = makeHandler({ validation: { success: true, user: {}, sessionId: 's1' }, session: null });
    expect(await handler.handle({ token: 't' })).toEqual({ isAuthenticated: false, reason: 'SESSION_NOT_FOUND' });
  });

  it('reports zero remaining time for an idle-expired session', async () => {
    const handler = makeHandler({
      validation: { success: true, user: {}, sessionId: 's1' },
      session: { lastUsedAt: new Date('2020-01-01T00:00:00Z') },
    });
    expect(await handler.handle({ token: 't' })).toMatchObject({
      isAuthenticated: true,
      timeUntilIdleTimeoutMs: 0,
      showWarning: false,
      idleWarningMinutes: 5,
    });
  });

  it('flags a warning as the idle timeout approaches', async () => {
    const idleTimeoutMs = DEFAULT_SECURITY_CONFIG.sessionTimeoutMinutes * 60 * 1000;
    const handler = makeHandler({
      validation: { success: true, user: {}, sessionId: 's1' },
      session: { lastUsedAt: new Date(Date.now() - idleTimeoutMs + 2 * 60 * 1000) },
    });

    const result = await handler.handle({ token: 't' });

    expect(result.isAuthenticated).toBe(true);
    expect(result.showWarning).toBe(true);
    expect(result.timeUntilIdleTimeoutMs).toBeGreaterThan(0);
  });
});
