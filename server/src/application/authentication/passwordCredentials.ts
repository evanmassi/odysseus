/**
 * Password Credential Helpers
 *
 * Shared current-password verification and lazy hash migration used by the
 * login, change-password, and profile-update flows.
 */

import type { PasswordService } from '@application/contracts/PasswordService';
import type { User } from '@domain/entities/User';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import type { UserRepository } from '@domain/repositories/UserRepository';

/** Verifies a plaintext password against the user's stored credential. @throws InvalidCredentialsError */
export async function verifyCurrentPassword(
  user: User,
  plainPassword: string,
  passwordService: PasswordService
): Promise<void> {
  if (!user.hasPassword()) {
    throw new InvalidCredentialsError('Current password is incorrect');
  }
  const isValid = await passwordService.verify(plainPassword, user.passwordHash!, user.salt);
  if (!isValid) {
    throw new InvalidCredentialsError('Current password is incorrect');
  }
}

/**
 * Lazily re-hashes a legacy (PBKDF2) credential to the current algorithm and persists it.
 * Call only after the plaintext has been verified.
 */
export async function upgradePasswordHashIfNeeded(
  user: User,
  plainPassword: string,
  passwordService: PasswordService,
  userRepository: UserRepository
): Promise<void> {
  if (passwordService.needsUpgrade(user.passwordHash!, user.salt)) {
    const newHash = await passwordService.hash(plainPassword);
    user.setPasswordHash(newHash);
    await userRepository.save(user);
  }
}
