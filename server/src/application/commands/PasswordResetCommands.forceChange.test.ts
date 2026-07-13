/**
 * Force-Change-Password Command Tests
 *
 * Confirms the password write plus the reset-style revoke-all (the security fix:
 * every prior session/token is invalidated before a fresh one is issued).
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { Repositories, UnitOfWork } from '@application/contracts/UnitOfWork';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import { ForceChangePasswordCommandHandler } from './PasswordResetCommands';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

function makeHandler(opts: { found?: boolean } = {}) {
  const setPasswordHash = jest.fn();
  const markPasswordChanged = jest.fn();
  const user = { id: 'u1', username: 'bob', labId: 'lab1', setPasswordHash, markPasswordChanged } as unknown as User;
  const found = opts.found ?? true;

  const save = jest.fn();
  const userRepository = { findByIdAnyLab: jest.fn().mockResolvedValue(found ? user : null), save } as unknown as UserRepository;
  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;
  const revokeAllForUser = jest.fn().mockResolvedValue(2);
  const refreshTokenRepository = { revokeAllForUser } as unknown as RefreshTokenRepository;
  const revokeAllSessions = jest.fn().mockResolvedValue(3);
  const userSessionRepository = { revokeAllSessions } as unknown as UserSessionRepository;
  const hash = jest.fn().mockResolvedValue('NEWHASH');
  const passwordService = { hash } as unknown as PasswordService;
  const storageRepository = { getSecurityConfig: jest.fn().mockResolvedValue(DEFAULT_SECURITY_CONFIG) } as unknown as StorageRepository;

  const unitOfWork: UnitOfWork = {
    withTransaction: work => work({
      users: userRepository,
      refreshTokens: refreshTokenRepository,
      userSessions: userSessionRepository,
    } as Repositories),
  };

  const handler = new ForceChangePasswordCommandHandler(userRepository, eventBus, passwordService, storageRepository, unitOfWork);
  return { handler, user, setPasswordHash, markPasswordChanged, save, publish, revokeAllForUser, revokeAllSessions, hash };
}

describe('ForceChangePasswordCommandHandler', () => {
  it('throws when the user is not found, without saving', async () => {
    const { handler, save } = makeHandler({ found: false });
    await expect(handler.handle({ userId: 'u1', newPassword: 'longpassword' })).rejects.toBeInstanceOf(NotFoundError);
    expect(save).not.toHaveBeenCalled();
  });

  it('changes the password, revokes all sessions + tokens, and returns the user', async () => {
    const { handler, user, setPasswordHash, markPasswordChanged, save, publish, revokeAllForUser, revokeAllSessions, hash } = makeHandler();

    const result = await handler.handle({ userId: 'u1', newPassword: 'longpassword' });

    expect(hash).toHaveBeenCalledWith('longpassword');
    expect(setPasswordHash).toHaveBeenCalledWith('NEWHASH');
    expect(markPasswordChanged).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(revokeAllForUser).toHaveBeenCalledWith('u1');
    expect(revokeAllSessions).toHaveBeenCalledWith('u1');
    expect(publish).toHaveBeenCalled();
    expect(result).toBe(user);
  });
});
