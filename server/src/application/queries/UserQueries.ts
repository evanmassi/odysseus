/**
 * User Queries
 *
 * Queries for user-related read operations in the CQRS pattern.
 */

import { findByIdForRequester } from '@application/authorization/findByIdForRequester';
import type { QueryHandler } from '@application/queries/Query';
import { BaseQuery } from '@application/queries/Query';
import type { User } from '@domain/entities/User';
import { UserNotFoundError } from '@domain/errors/UserErrors';
import type { UserRepository } from '@domain/repositories/UserRepository';

import type { UserSettings } from '@odysseus/shared-schemas';

export class GetUserByIdQuery extends BaseQuery {
  constructor(
    public readonly userId: string,
    public readonly requesterLabId: string | undefined,
    public readonly requesterIsSystemAdmin: boolean,
    requestedBy?: string
  ) {
    super(requestedBy);
  }
}

export class GetUserByIdQueryHandler implements QueryHandler<GetUserByIdQuery, User> {
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

export class CheckFirstTimeSetupQuery extends BaseQuery {
  constructor(requestedBy?: string) {
    super(requestedBy);
  }
}

export interface FirstTimeSetupResult {
  isFirstTime: boolean;
  needsSystemAdmin: boolean;
}

export class CheckFirstTimeSetupQueryHandler implements QueryHandler<CheckFirstTimeSetupQuery, FirstTimeSetupResult> {
  constructor(private userRepository: UserRepository) {}

  async handle(_query: CheckFirstTimeSetupQuery): Promise<FirstTimeSetupResult> {
    const isEmpty = await this.userRepository.isEmpty();
    const systemAdminCount = await this.userRepository.countByRole('system_admin');
    return { isFirstTime: isEmpty, needsSystemAdmin: systemAdminCount === 0 };
  }
}

export class GetUserStatisticsQuery extends BaseQuery {
  constructor(
    public readonly labId?: string,
    requestedBy?: string
  ) {
    super(requestedBy);
  }
}

export interface UserStatistics {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  recentlyCreated: number;
}

export class GetUserStatisticsQueryHandler implements QueryHandler<GetUserStatisticsQuery, UserStatistics> {
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
