/**
 * Password Credential Helper Tests
 *
 * Verification rejects bad/absent credentials; the lazy upgrade re-hashes only when needed.
 */

import type { PasswordService } from '@application/contracts/PasswordService';
import type { User } from '@domain/entities/User';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { verifyCurrentPassword, upgradePasswordHashIfNeeded } from './passwordCredentials';

function makeUser(
  overrides: Partial<Record<'hasPassword' | 'setPasswordHash', unknown>> = {}
): User {
  return {
    hasPassword: () => true,
    passwordHash: 'HASH',
    salt: 'SALT',
    setPasswordHash: jest.fn(),
    ...overrides,
  } as unknown as User;
}

describe('verifyCurrentPassword', () => {
  it('throws when the user has no password set, without calling verify', async () => {
    const user = makeUser({ hasPassword: () => false });
    const passwordService = { verify: jest.fn() } as unknown as PasswordService;

    await expect(verifyCurrentPassword(user, 'pw', passwordService)).rejects.toBeInstanceOf(
      InvalidCredentialsError
    );
    expect(passwordService.verify).not.toHaveBeenCalled();
  });

  it('throws when the password does not match', async () => {
    const user = makeUser();
    const passwordService = {
      verify: jest.fn().mockResolvedValue(false),
    } as unknown as PasswordService;

    await expect(verifyCurrentPassword(user, 'pw', passwordService)).rejects.toBeInstanceOf(
      InvalidCredentialsError
    );
  });

  it('resolves and passes the stored hash + salt when the password matches', async () => {
    const user = makeUser();
    const verify = jest.fn().mockResolvedValue(true);
    const passwordService = { verify } as unknown as PasswordService;

    await expect(verifyCurrentPassword(user, 'pw', passwordService)).resolves.toBeUndefined();
    expect(verify).toHaveBeenCalledWith('pw', 'HASH', 'SALT');
  });
});

describe('upgradePasswordHashIfNeeded', () => {
  it('re-hashes and persists when an upgrade is needed', async () => {
    const setPasswordHash = jest.fn();
    const user = makeUser({ setPasswordHash });
    const passwordService = {
      needsUpgrade: jest.fn().mockReturnValue(true),
      hash: jest.fn().mockResolvedValue('NEWHASH'),
    } as unknown as PasswordService;
    const save = jest.fn();
    const userRepository = { save } as unknown as UserRepository;

    await upgradePasswordHashIfNeeded(user, 'pw', passwordService, userRepository);

    expect(passwordService.hash).toHaveBeenCalledWith('pw');
    expect(setPasswordHash).toHaveBeenCalledWith('NEWHASH');
    expect(save).toHaveBeenCalledWith(user);
  });

  it('does nothing when no upgrade is needed', async () => {
    const user = makeUser();
    const passwordService = {
      needsUpgrade: jest.fn().mockReturnValue(false),
      hash: jest.fn(),
    } as unknown as PasswordService;
    const save = jest.fn();
    const userRepository = { save } as unknown as UserRepository;

    await upgradePasswordHashIfNeeded(user, 'pw', passwordService, userRepository);

    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
