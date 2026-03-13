/**
 * User Guards
 *
 * Precondition checks for command handlers that require a valid user or role.
 */

import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { UserRepository } from '@domain/repositories/UserRepository';

export async function requireUser(userRepository: UserRepository, userId: string): Promise<User> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw NotFoundError.forEntity('User', userId);
  }
  return user;
}

export async function requireAdmin(userRepository: UserRepository, userId: string): Promise<User> {
  const user = await requireUser(userRepository, userId);
  if (!user.isAdmin()) {
    throw new PermissionError('Only administrators can perform this operation', { userId });
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
