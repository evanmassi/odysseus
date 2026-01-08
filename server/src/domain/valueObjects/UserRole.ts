import { ValidationError } from '@domain/errors/ValidationError';
import { Permission } from '@domain/valueObjects/Permission';
import { RolePermissionService, UserRole as UserRoleType } from '@domain/services/RolePermissionService';

/**
 * UserRole Value Object - Centralized role management
 *
 * Represents user roles with permission checking.
 * All permission logic centralized in RolePermissionService.
 *
 * @example
 * const role = UserRole.admin();
 * const canView = role.hasPermission(Permission.VIEW_TUBES);
 */
export class UserRole {
  private static readonly VALID_ROLES = ['admin', 'user'] as const;
  
  private constructor(
    private readonly _role: 'admin' | 'user'
  ) {
    this.validate();
  }

  /**
   * Factory method to create UserRole with validation
   */
  static create(role: string): UserRole {
    return new UserRole(role as 'admin' | 'user');
  }

  /**
   * Factory method for admin role
   */
  static admin(): UserRole {
    return new UserRole('admin');
  }

  /**
   * Factory method for user role
   */
  static user(): UserRole {
    return new UserRole('user');
  }

  /**
   * Factory method for default role (first user becomes admin)
   */
  static defaultRole(isFirstUser: boolean = false): UserRole {
    return isFirstUser ? UserRole.admin() : UserRole.user();
  }

  /**
   * Validates role value
   */
  private validate(): void {
    if (!this._role) {
      throw new ValidationError('User role is required');
    }

    if (!UserRole.VALID_ROLES.includes(this._role)) {
      throw new ValidationError(`Invalid user role. Must be one of: ${UserRole.VALID_ROLES.join(', ')}`);
    }
  }

  // Permission Checking - Centralized & Clean

  /**
   * Check if role has a specific permission
   * Delegates to centralized RolePermissionService
   * 
   * @param permission - Permission object to check
   * @returns true if role has permission
   */
  hasPermission(permission: Permission): boolean;
  /**
   * Check if role has a specific permission by key (legacy compatibility)
   * 
   * @param permissionKey - Permission key string
   * @returns true if role has permission
   */
  hasPermission(permissionKey: string): boolean;
  hasPermission(permissionOrKey: Permission | string): boolean {
    if (typeof permissionOrKey === 'string') {
      return RolePermissionService.hasPermissionByKey(this._role as UserRoleType, permissionOrKey);
    } else {
      return RolePermissionService.hasPermission(this._role as UserRoleType, permissionOrKey);
    }
  }

  /**
   * Get all permissions for this role
   * 
   * @returns Array of all permissions assigned to this role
   */
  getPermissions(): readonly Permission[] {
    return RolePermissionService.getPermissionsForRole(this._role as UserRoleType);
  }

  /**
   * Get all permission keys for this role
   * 
   * @returns Array of permission key strings
   */
  getPermissionKeys(): readonly string[] {
    return RolePermissionService.getPermissionKeysForRole(this._role as UserRoleType);
  }

  /**
   * Check if this role is admin
   */
  isAdmin(): boolean {
    return this._role === 'admin';
  }

  /**
   * Check if this role is user
   */
  isUser(): boolean {
    return this._role === 'user';
  }

  /**
   * Check if this role has higher privileges than another role
   */
  hasHigherPrivilegesThan(other: UserRole): boolean {
    if (this.isAdmin() && other.isUser()) {
      return true;
    }
    return false;
  }

  /**
   * Equality check
   */
  equals(other: UserRole): boolean {
    if (!other) return false;
    return this._role === other._role;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._role;
  }

  /**
   * Convert to data for persistence/serialization
   */
  toData(): { role: 'admin' | 'user' } {
    return {
      role: this._role
    };
  }

  // Getter (immutable access)
  get role(): 'admin' | 'user' {
    return this._role;
  }

  // Alias for compatibility with event serialization
  get value(): 'admin' | 'user' {
    return this._role;
  }

  /**
   * Get all valid roles (for validation/UI purposes)
   */
  static getValidRoles(): readonly string[] {
    return UserRole.VALID_ROLES;
  }

  /**
   * Check if a string is a valid role
   */
  static isValidRole(role: string): role is 'admin' | 'user' {
    return (UserRole.VALID_ROLES as readonly string[]).includes(role);
  }
}
