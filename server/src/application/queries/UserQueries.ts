/**
 * User Queries
 * 
 * Queries for user-related read operations in the CQRS pattern.
 */

import { BaseQuery, Query, QueryHandler, PaginatedResult, SearchParams } from '@application/queries/Query';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { UserNotFoundError } from '@domain/errors/UserErrors';

// GET USER BY ID QUERY

export class GetUserByIdQuery extends BaseQuery {
  constructor(
    public readonly userId: string,
    requestedBy?: string
  ) {
    super(requestedBy);
  }
}

export class GetUserByIdQueryHandler implements QueryHandler<GetUserByIdQuery, User> {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserByIdQuery): Promise<User> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }
    return user;
  }
}

// GET USER BY USERNAME QUERY

export class GetUserByUsernameQuery extends BaseQuery {
  constructor(
    public readonly username: string,
    requestedBy?: string
  ) {
    super(requestedBy);
  }
}

export class GetUserByUsernameQueryHandler implements QueryHandler<GetUserByUsernameQuery, User | null> {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserByUsernameQuery): Promise<User | null> {
    return this.userRepository.findByUsername(query.username);
  }
}

// GET ALL USERS QUERY

export class GetAllUsersQuery extends BaseQuery {
  constructor(
    public readonly includeInactive: boolean = false,
    requestedBy?: string
  ) {
    super(requestedBy);
  }
}

export class GetAllUsersQueryHandler implements QueryHandler<GetAllUsersQuery, User[]> {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetAllUsersQuery): Promise<User[]> {
    const allUsers = await this.userRepository.findAll();
    
    if (query.includeInactive) {
      return allUsers;
    }
    
    // OAuth 2.0 Note: All users are considered "active" with token-based authentication
    // Remove activity filtering since tokens provide implicit activity validation
    return allUsers;
  }
}

// SEARCH USERS QUERY

export class SearchUsersQuery extends BaseQuery {
  constructor(
    public readonly searchParams: SearchParams,
    requestedBy?: string
  ) {
    super(requestedBy);
  }
}

export class SearchUsersQueryHandler implements QueryHandler<SearchUsersQuery, PaginatedResult<User>> {
  constructor(private userRepository: UserRepository) {}

  async handle(query: SearchUsersQuery): Promise<PaginatedResult<User>> {
    // This would typically delegate to a specialized search repository
    // For now, we'll implement basic search logic
    const allUsers = await this.userRepository.findAll();
    
    // Apply text search if provided
    let filteredUsers = allUsers;
    if (query.searchParams.query) {
      const searchTerm = query.searchParams.query.toLowerCase();
      filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm)
      );
    }

    // Apply filters if provided
    if (query.searchParams.filters) {
      const filters = query.searchParams.filters;
      
      if (filters.role) {
        filteredUsers = filteredUsers.filter(user => 
          user.role.value === filters.role
        );
      }
      
      if (filters.active !== undefined) {
        // OAuth 2.0 Note: All authenticated users are considered "active"
        // Token-based authentication removes need for activity filtering
        if (filters.active === false) {
          filteredUsers = []; // No "inactive" users in OAuth 2.0 system
        }
        // If filters.active === true, keep all users (they're all active)
      }
    }

    // Apply sorting
    const pagination = query.searchParams.pagination;
    if (pagination?.sortBy) {
      filteredUsers.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (pagination.sortBy) {
          case 'username':
            aValue = a.username;
            bValue = b.username;
            break;
          case 'role':
            aValue = a.role.value;
            bValue = b.role.value;
            break;
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          default:
            aValue = a.username;
            bValue = b.username;
        }

        if (pagination.sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });
    }

    // Apply pagination
    const totalCount = filteredUsers.length;
    let paginatedUsers = filteredUsers;
    
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    }

    return {
      items: paginatedUsers,
      totalCount,
      page: pagination?.page || 1,
      limit: pagination?.limit || totalCount,
      totalPages: pagination ? Math.ceil(totalCount / pagination.limit) : 1,
      hasNextPage: pagination ? (pagination.page * pagination.limit) < totalCount : false,
      hasPreviousPage: pagination ? pagination.page > 1 : false
    };
  }
}

// CHECK FIRST TIME SETUP QUERY

export class CheckFirstTimeSetupQuery extends BaseQuery {
  constructor(requestedBy?: string) {
    super(requestedBy);
  }
}

export class CheckFirstTimeSetupQueryHandler implements QueryHandler<CheckFirstTimeSetupQuery, boolean> {
  constructor(private userRepository: UserRepository) {}

  async handle(query: CheckFirstTimeSetupQuery): Promise<boolean> {
    return this.userRepository.isEmpty();
  }
}

// GET USER STATISTICS QUERY

export class GetUserStatisticsQuery extends BaseQuery {
  constructor(requestedBy?: string) {
    super(requestedBy);
  }
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
  recentlyCreated: number; // Created in last 30 days
}

export class GetUserStatisticsQueryHandler implements QueryHandler<GetUserStatisticsQuery, UserStatistics> {
  constructor(private userRepository: UserRepository) {}

  async handle(query: GetUserStatisticsQuery): Promise<UserStatistics> {
    const allUsers = await this.userRepository.findAll();
    
    const totalUsers = allUsers.length;
    // OAuth 2.0 Note: All users are considered "active" with token-based authentication
    const activeUsers = totalUsers; // All users are active in OAuth 2.0 system
    const inactiveUsers = 0; // No inactive users in OAuth 2.0 system
    const adminUsers = allUsers.filter(user => user.isAdmin()).length;
    const regularUsers = totalUsers - adminUsers;
    
    // Users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyCreated = allUsers.filter(user => 
      user.createdAt > thirtyDaysAgo
    ).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      regularUsers,
      recentlyCreated
    };
  }
}
