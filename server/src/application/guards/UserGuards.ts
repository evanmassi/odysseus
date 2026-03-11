/**
 * User Guards
 *
 * Precondition checks for command handlers that require a valid user or role.
 */

import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';

export async function requireUser(userRepository: UserRepository, userId: string): Promise<User> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ValidationError(`User not found: ${userId}`);
  }
  return user;
}

export async function requireSystemAdmin(userRepository: UserRepository, userId: string): Promise<User> {
  const user = await requireUser(userRepository, userId);
  if (!user.isSystemAdmin()) {
    throw new PermissionError('Only system admins can perform this operation', { userId });
  }
  return user;
}
