/**
 * User Queries
 *
 * Queries for user-related read operations in the CQRS pattern.
 */

import { UserNotFoundError } from '@domain/errors/UserErrors';
import type { UserRepository } from '@domain/repositories/UserRepository';

import type { UserSettings } from '@odysseus/shared-schemas';

export interface FirstTimeSetupResult {
  isFirstTime: boolean;
  needsSystemAdmin: boolean;
}

export class CheckFirstTimeSetupQueryHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(): Promise<FirstTimeSetupResult> {
    const isEmpty = await this.userRepository.isEmpty();
    const systemAdminCount = await this.userRepository.countByRole('system_admin');
    return { isFirstTime: isEmpty, needsSystemAdmin: systemAdminCount === 0 };
  }
}

export interface GetUserSettingsQuery {
  userId: string;
}

export class GetUserSettingsQueryHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserSettingsQuery): Promise<UserSettings> {
    const user = await this.userRepository.findByIdAnyLab(query.userId);
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    return user.settings;
  }
}
