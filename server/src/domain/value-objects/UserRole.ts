/**
 * User Role
 *
 * Role value object with permission checking via RolePermissionService.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import type { UserRole as UserRoleType } from '@domain/services/RolePermissionService';
import { RolePermissionService } from '@domain/services/RolePermissionService';
import type { Permission } from '@domain/value-objects/Permission';
export class UserRole {
  private static readonly VALID_ROLES = ['system_admin', 'lab_admin', 'user'] as const;

  private static readonly PRIVILEGE_RANK: Record<string, number> = {
    system_admin: 3,
    lab_admin: 2,
    user: 1,
  };

  private constructor(
    private readonly _role: 'system_admin' | 'lab_admin' | 'user'
  ) {
    this.validate();
  }

  static create(role: string): UserRole {
    return new UserRole(role as 'system_admin' | 'lab_admin' | 'user');
  }

  static systemAdmin(): UserRole {
    return new UserRole('system_admin');
  }

  static labAdmin(): UserRole {
    return new UserRole('lab_admin');
  }

  static user(): UserRole {
    return new UserRole('user');
  }

  /** First user in a lab becomes lab_admin */
  static defaultRoleForLab(isFirstInLab: boolean = false): UserRole {
    return isFirstInLab ? UserRole.labAdmin() : UserRole.user();
  }

  private validate(): void {
    if (!this._role) {
      throw new ValidationError('User role is required');
    }

    if (!UserRole.VALID_ROLES.includes(this._role)) {
      throw new ValidationError('That role is not valid. Choose System Admin, Lab Admin, or User.');
    }
  }

  hasPermission(permission: Permission): boolean;
  hasPermission(permissionKey: string): boolean;
  hasPermission(permissionOrKey: Permission | string): boolean {
    if (typeof permissionOrKey === 'string') {
      return RolePermissionService.hasPermissionByKey(this._role as UserRoleType, permissionOrKey);
    } else {
      return RolePermissionService.hasPermission(this._role as UserRoleType, permissionOrKey);
    }
  }

  getPermissions(): readonly Permission[] {
    return RolePermissionService.getPermissionsForRole(this._role as UserRoleType);
  }

  getPermissionKeys(): readonly string[] {
    return RolePermissionService.getPermissionKeysForRole(this._role as UserRoleType);
  }

  isSystemAdmin(): boolean {
    return this._role === 'system_admin';
  }

  isLabAdmin(): boolean {
    return this._role === 'lab_admin';
  }

  /** Returns true for both system_admin and lab_admin */
  isAdmin(): boolean {
    return this._role === 'system_admin' || this._role === 'lab_admin';
  }

  isUser(): boolean {
    return this._role === 'user';
  }

  hasHigherPrivilegesThan(other: UserRole): boolean {
    return (UserRole.PRIVILEGE_RANK[this._role] ?? 0) > (UserRole.PRIVILEGE_RANK[other._role] ?? 0);
  }

  equals(other: UserRole): boolean {
    if (!other) return false;
    return this._role === other._role;
  }

  toString(): string {
    return this._role;
  }

  toData(): { role: 'system_admin' | 'lab_admin' | 'user' } {
    return { role: this._role };
  }

  get value(): 'system_admin' | 'lab_admin' | 'user' {
    return this._role;
  }

  static getValidRoles(): readonly string[] {
    return UserRole.VALID_ROLES;
  }

  static isValidRole(role: string): role is 'system_admin' | 'lab_admin' | 'user' {
    return (UserRole.VALID_ROLES as readonly string[]).includes(role);
  }
}
