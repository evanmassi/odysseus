import { Permission } from '@domain/valueObjects/Permission';
import { ValidationError } from '@domain/errors/ValidationError';

/**
 * Role Permission Service
 *
 * Centralized service for managing role-based permissions.
 * Implements RBAC (Role-Based Access Control) for the application.
 *
 * Responsibilities:
 * - Define role-permission mappings
 * - Validate permission assignments
 * - Provide permission checking logic
 * - Support permission auditing and reporting
 */
export class RolePermissionService {
  
  static readonly ROLES = ['system_admin', 'lab_admin', 'user'] as const;

  private static readonly ROLE_PERMISSION_MATRIX: Record<UserRole, readonly Permission[]> = {
    system_admin: Permission.SYSTEM_ADMIN_PERMISSIONS,
    lab_admin: Permission.LAB_ADMIN_PERMISSIONS,
    user: Permission.USER_PERMISSIONS,
  } as const;

  // PERMISSION CHECKING

  /**
   * Check if a role has a specific permission
   * 
   * @param role - User role to check
   * @param permission - Permission to validate
   * @returns true if role has permission, false otherwise
   * 
   * @example
   * const hasPermission = RolePermissionService.hasPermission('admin', Permission.MANAGE_USERS);
   */
  static hasPermission(role: UserRole, permission: Permission): boolean {
    try {
      this.validateRole(role);
      const rolePermissions = this.getPermissionsForRole(role);
      return rolePermissions.some(p => p.equals(permission));
    } catch {
      // Invalid role or permission - deny access
      return false;
    }
  }

  /**
   * Check if a role has permission by key (string-based lookup)
   * 
   * @param role - User role to check
   * @param permissionKey - Permission key string
   * @returns true if role has permission, false otherwise
   */
  static hasPermissionByKey(role: UserRole, permissionKey: string): boolean {
    const permission = Permission.fromKey(permissionKey);
    if (!permission) {
      // Unknown permission key - deny access
      return false;
    }

    return this.hasPermission(role, permission);
  }

  /**
   * Check if role has any of the specified permissions
   * 
   * @param role - User role to check
   * @param permissions - Array of permissions to check
   * @returns true if role has at least one permission
   */
  static hasAnyPermission(role: UserRole, permissions: readonly Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if role has all specified permissions
   * 
   * @param role - User role to check  
   * @param permissions - Array of permissions to check
   * @returns true if role has all permissions
   */
  static hasAllPermissions(role: UserRole, permissions: readonly Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  // ROLE MANAGEMENT

  /**
   * Get all permissions for a specific role
   * 
   * @param role - Role to get permissions for
   * @returns Array of permissions for the role
   */
  static getPermissionsForRole(role: UserRole): readonly Permission[] {
    this.validateRole(role);
    return this.ROLE_PERMISSION_MATRIX[role];
  }

  /**
   * Get all permission keys for a specific role
   * 
   * @param role - Role to get permission keys for
   * @returns Array of permission key strings
   */
  static getPermissionKeysForRole(role: UserRole): readonly string[] {
    return this.getPermissionsForRole(role).map(permission => permission.key);
  }

  /**
   * Check if a role exists in the system
   * 
   * @param role - Role to validate
   * @returns true if role exists
   */
  static isValidRole(role: string): role is UserRole {
    return this.ROLES.includes(role as UserRole);
  }

  /**
   * Get all available roles
   * 
   * @returns Array of all system roles
   */
  static getAllRoles(): readonly UserRole[] {
    return this.ROLES;
  }

  // PERMISSION ANALYSIS

  /**
   * Get roles that have a specific permission
   * 
   * @param permission - Permission to check
   * @returns Array of roles with the permission
   */
  static getRolesWithPermission(permission: Permission): readonly UserRole[] {
    return this.ROLES.filter(role => this.hasPermission(role, permission));
  }

  // VALIDATION

  /**
   * Validate that a role exists
   * 
   * @param role - Role to validate
   * @throws ValidationError if role is invalid
   */
  private static validateRole(role: UserRole): void {
    if (!this.isValidRole(role)) {
      throw new ValidationError(`Invalid role: ${role}. Valid roles: ${this.ROLES.join(', ')}`);
    }
  }

}

export type UserRole = typeof RolePermissionService.ROLES[number];
