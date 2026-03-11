/**
 * User Guard
 *
 * Precondition check for command handlers that require a valid user.
 */

import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ValidationError } from '@domain/errors/ValidationError';

export async function requireUser(userRepository: UserRepository, userId: string): Promise<User> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ValidationError(`User not found: ${userId}`);
  }
  return user;
}
