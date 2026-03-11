/**
 * User Data Transfer Objects
 *
 * Separates domain User entity from HTTP API shape, stripping sensitive fields.
 */

import { User } from '@domain/entities/User';

export interface CreateUserRequest {
  username: string;
  apiKey: string;
  role?: 'system_admin' | 'lab_admin' | 'user';
}

export interface UpdateUserRoleRequest {
  role: 'system_admin' | 'lab_admin' | 'user';
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: 'system_admin' | 'lab_admin' | 'user';
}

export interface PasswordLoginRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  role: 'system_admin' | 'lab_admin' | 'user';
  createdAt: string;
  lastActivity: string;
}

export interface AuthResponse {
  success: boolean;
  user: UserResponse;
  permissions: string[];
}

export class UserDto {
  /** Strips sensitive fields (password hash, API key, tokens). */
  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      username: user.username,
      role: user.roleString,
      createdAt: user.createdAt.toISOString(),
      lastActivity: user.lastActivity.toISOString()
    };
  }

  static toAuthResponse(user: User): AuthResponse {
    return {
      success: true,
      user: this.toResponse(user),
      permissions: user.getPermissions()
    };
  }
}
