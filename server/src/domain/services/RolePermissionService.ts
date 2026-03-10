/**
 * Role-Based Permission Checking
 *
 * Maps roles to permissions and provides lookup/validation.
 */

import { Permission } from '@domain/valueObjects/Permission';
import { ValidationError } from '@domain/errors/ValidationError';
export class RolePermissionService {
  
  static readonly ROLES = ['system_admin', 'lab_admin', 'user'] as const;

  private static readonly ROLE_PERMISSION_MATRIX: Record<UserRole, readonly Permission[]> = {
    system_admin: Permission.SYSTEM_ADMIN_PERMISSIONS,
    lab_admin: Permission.LAB_ADMIN_PERMISSIONS,
    user: Permission.USER_PERMISSIONS,
  } as const;

  // PERMISSION CHECKING

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

  static hasPermissionByKey(role: UserRole, permissionKey: string): boolean {
    const permission = Permission.fromKey(permissionKey);
    if (!permission) {
      // Unknown permission key - deny access
      return false;
    }

    return this.hasPermission(role, permission);
  }

  static hasAnyPermission(role: UserRole, permissions: readonly Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  static hasAllPermissions(role: UserRole, permissions: readonly Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  // ROLE MANAGEMENT

  static getPermissionsForRole(role: UserRole): readonly Permission[] {
    this.validateRole(role);
    return this.ROLE_PERMISSION_MATRIX[role];
  }

  static getPermissionKeysForRole(role: UserRole): readonly string[] {
    return this.getPermissionsForRole(role).map(permission => permission.key);
  }

  static isValidRole(role: string): role is UserRole {
    return this.ROLES.includes(role as UserRole);
  }

  static getAllRoles(): readonly UserRole[] {
    return this.ROLES;
  }

  // PERMISSION ANALYSIS

  static getRolesWithPermission(permission: Permission): readonly UserRole[] {
    return this.ROLES.filter(role => this.hasPermission(role, permission));
  }

  // VALIDATION

  /** @throws ValidationError if role is invalid */
  private static validateRole(role: UserRole): void {
    if (!this.isValidRole(role)) {
      throw new ValidationError(`Invalid role: ${role}. Valid roles: ${this.ROLES.join(', ')}`);
    }
  }

}

export type UserRole = typeof RolePermissionService.ROLES[number];
