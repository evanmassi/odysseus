/**
 * Password Guards
 *
 * Shared password policy validation for command handlers.
 */

import { PasswordValidator } from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
import type { StorageRepository } from '@domain/repositories/StorageRepository';

export async function validatePasswordPolicy(
  storageRepository: StorageRepository,
  password: string
): Promise<void> {
  const securityConfig = await storageRepository.getSecurityConfig();
  try {
    PasswordValidator.enforce(password, securityConfig);
  } catch (error) {
    throw new ValidationError((error as Error).message);
  }
}
