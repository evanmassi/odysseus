import { User } from '@domain/entities/User';

/**
 * User DTOs - API data transfer objects
 * Clean separation between domain entities and HTTP API
 */

export interface LoginRequest {
  username: string;
  apiKey: string;
}

export interface CreateUserRequest {
  username: string;
  apiKey: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRoleRequest {
  role: 'admin' | 'user';
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface PasswordLoginRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastActivity: string;
}

export interface AuthResponse {
  success: boolean;
  user: UserResponse;
  permissions: string[];
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
}

/**
 * DTO Conversion Utilities
 */
export class UserDto {
  /**
   * Convert domain entity to API response (without sensitive data)
   */
  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      username: user.username,
      role: user.roleString,
      createdAt: user.createdAt.toISOString(),
      lastActivity: user.lastActivity.toISOString()
    };
  }

  /**
   * Convert domain entity to auth response
   */
  static toAuthResponse(user: User): AuthResponse {
    return {
      success: true,
      user: this.toResponse(user),
      permissions: user.getPermissions()
    };
  }

  /**
   * Convert multiple users to list response
   */
  static toListResponse(users: User[]): UserListResponse {
    return {
      users: users.map(user => this.toResponse(user)),
      total: users.length
    };
  }

  /**
   * Convert create request to domain data
   */
  static fromCreateRequest(request: CreateUserRequest): {
    username: string;
    apiKey: string;
    role: 'admin' | 'user';
  } {
    return {
      username: request.username,
      apiKey: request.apiKey,
      role: request.role || 'user'
    };
  }
}
