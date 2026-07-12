/**
 * User Queries
 *
 * Queries for user-related read operations in the CQRS pattern.
 */

import { findByIdForRequester } from '@application/authorization/findByIdForRequester';
import type { User } from '@domain/entities/User';
import { UserNotFoundError } from '@domain/errors/UserErrors';
import type { UserRepository } from '@domain/repositories/UserRepository';

import type { UserSettings } from '@odysseus/shared-schemas';

export interface GetUserByIdQuery {
  userId: string;
  requesterLabId: string | undefined;
  requesterIsSystemAdmin: boolean;
}

export class GetUserByIdQueryHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserByIdQuery): Promise<User> {
    const user = await findByIdForRequester(this.userRepository, query.userId, {
      labId: query.requesterLabId,
      isSystemAdmin: query.requesterIsSystemAdmin,
    });
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }
    return user;
  }
}

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

export interface GetUserStatisticsQuery {
  labId?: string;
}

export interface UserStatistics {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  recentlyCreated: number;
}

export class GetUserStatisticsQueryHandler {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserStatisticsQuery): Promise<UserStatistics> {
    const allUsers = query.labId
      ? await this.userRepository.findByLabId(query.labId)
      : await this.userRepository.findAll();

    const totalUsers = allUsers.length;
    const adminUsers = allUsers.filter(user => user.isAdmin()).length;
    const regularUsers = totalUsers - adminUsers;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyCreated = allUsers.filter(user =>
      user.createdAt > thirtyDaysAgo
    ).length;

    return {
      totalUsers,
      adminUsers,
      regularUsers,
      recentlyCreated
    };
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
