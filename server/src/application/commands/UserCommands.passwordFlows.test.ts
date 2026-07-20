/**
 * Password-Flow Command Tests
 *
 * Locks the behavior of the shared verify + lazy-upgrade helpers as consumed by
 * the change-password and login handlers.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { Repositories, UnitOfWork } from '@application/contracts/UnitOfWork';
import type { User } from '@domain/entities/User';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

import { ChangeUserPasswordCommandHandler, LoginCommandHandler } from './UserCommands';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

function makeChangeHandler(opts: { verify?: boolean } = {}) {
  const setPasswordHash = jest.fn();
  const user = {
    id: 'u1',
    username: 'bob',
    labId: 'lab1',
    hasPassword: () => true,
    passwordHash: 'H',
    salt: 'S',
    setPasswordHash,
  } as unknown as User;

  const save = jest.fn();
  const userRepository = {
    findByIdAnyLab: jest.fn().mockResolvedValue(user),
    save,
  } as unknown as UserRepository;
  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;
  const storageRepository = {
    getSecurityConfig: jest.fn().mockResolvedValue(DEFAULT_SECURITY_CONFIG),
  } as unknown as StorageRepository;
  const userSessionRepository = {
    findActiveSessionsByUserId: jest.fn().mockResolvedValue([]),
    bulkRevoke: jest.fn().mockResolvedValue(0),
  } as unknown as UserSessionRepository;
  const hash = jest.fn().mockResolvedValue('NEWHASH');
  const passwordService = {
    verify: jest.fn().mockResolvedValue(opts.verify ?? true),
    hash,
  } as unknown as PasswordService;

  const unitOfWork: UnitOfWork = {
    withTransaction: work =>
      work({
        users: userRepository,
        userSessions: userSessionRepository,
      } as Repositories),
  };

  const handler = new ChangeUserPasswordCommandHandler(
    userRepository,
    eventBus,
    storageRepository,
    passwordService,
    unitOfWork
  );
  return { handler, setPasswordHash, save, publish, hash };
}

describe('ChangeUserPasswordCommandHandler', () => {
  const command = {
    userId: 'u1',
    currentPassword: 'pw',
    newPassword: 'longpassword',
    currentSessionId: undefined,
    initiatedBy: 'u1',
  };

  it('rejects an incorrect current password without saving', async () => {
    const { handler, save } = makeChangeHandler({ verify: false });
    await expect(handler.handle(command)).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(save).not.toHaveBeenCalled();
  });

  it('hashes the new password, saves, and publishes on success', async () => {
    const { handler, setPasswordHash, save, publish, hash } = makeChangeHandler({ verify: true });
    await handler.handle(command);
    expect(hash).toHaveBeenCalledWith('longpassword');
    expect(setPasswordHash).toHaveBeenCalledWith('NEWHASH');
    expect(save).toHaveBeenCalled();
    expect(publish).toHaveBeenCalled();
  });
});

function makeLoginHandler(opts: { needsUpgrade?: boolean } = {}) {
  const setPasswordHash = jest.fn();
  const user = {
    id: 'u1',
    username: 'bob',
    labId: undefined,
    hasPassword: () => true,
    passwordHash: 'H',
    salt: 'S',
    setPasswordHash,
    status: 'approved',
    isEmailVerified: () => true,
    isPasswordChangeRequired: () => false,
  } as unknown as User;

  const save = jest.fn();
  const userRepository = {
    findByUsername: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn().mockResolvedValue(null),
    save,
  } as unknown as UserRepository;
  const eventBus = { publish: jest.fn() } as unknown as EventBus;
  const passwordService = {
    verify: jest.fn().mockResolvedValue(true),
    needsUpgrade: jest.fn().mockReturnValue(opts.needsUpgrade ?? false),
    hash: jest.fn().mockResolvedValue('NEWHASH'),
  } as unknown as PasswordService;

  const handler = new LoginCommandHandler(userRepository, eventBus, passwordService);
  return { handler, user, setPasswordHash, save, hash: passwordService.hash };
}

describe('LoginCommandHandler', () => {
  const command = { username: 'bob', password: 'pw' };

  it('lazily re-hashes and saves when an upgrade is needed', async () => {
    const { handler, user, setPasswordHash, save, hash } = makeLoginHandler({ needsUpgrade: true });
    const result = await handler.handle(command);
    expect(hash).toHaveBeenCalledWith('pw');
    expect(setPasswordHash).toHaveBeenCalledWith('NEWHASH');
    expect(save).toHaveBeenCalled();
    expect(result.user).toBe(user);
  });

  it('does not save when no upgrade is needed', async () => {
    const { handler, save } = makeLoginHandler({ needsUpgrade: false });
    await handler.handle(command);
    expect(save).not.toHaveBeenCalled();
  });
});
