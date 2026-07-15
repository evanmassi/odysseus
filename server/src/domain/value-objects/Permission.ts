/**
 * Permission Value Object
 *
 * Immutable permission with snake_case key convention.
 */

import { ValidationError } from '@domain/errors/ValidationError';
export class Permission {
  // Permission Registry

  // Tube Management
  static readonly VIEW_TUBES = new Permission('view_tubes');
  static readonly CREATE_TUBES = new Permission('create_tubes');
  static readonly EDIT_TUBES = new Permission('edit_tubes');
  static readonly DELETE_TUBES = new Permission('delete_tubes');
  static readonly BULK_EDIT = new Permission('bulk_edit');

  // User Management
  static readonly MANAGE_USERS = new Permission('manage_users');

  // Researcher Management
  static readonly MANAGE_RESEARCHERS = new Permission('manage_researchers');

  // System Administration
  static readonly ADMIN_SETTINGS = new Permission('admin_settings');
  static readonly MANAGE_CONFIGURATION = new Permission('manage_configuration');

  // Multi-Tenancy
  static readonly MANAGE_LABS = new Permission('manage_labs');
  static readonly VIEW_ALL_LABS = new Permission('view_all_labs');
  static readonly MANAGE_INVITE_CODES = new Permission('manage_invite_codes');
  static readonly MANAGE_GLOBAL_SETTINGS = new Permission('manage_global_settings');

  // Permission Collections

  static readonly ALL_PERMISSIONS = [
    Permission.VIEW_TUBES,
    Permission.CREATE_TUBES,
    Permission.EDIT_TUBES,
    Permission.DELETE_TUBES,
    Permission.BULK_EDIT,
    Permission.MANAGE_USERS,
    Permission.MANAGE_RESEARCHERS,
    Permission.ADMIN_SETTINGS,
    Permission.MANAGE_CONFIGURATION,
    Permission.MANAGE_LABS,
    Permission.VIEW_ALL_LABS,
    Permission.MANAGE_INVITE_CODES,
    Permission.MANAGE_GLOBAL_SETTINGS,
  ] as const;

  static readonly USER_PERMISSIONS = [
    Permission.VIEW_TUBES,
    Permission.CREATE_TUBES,
    Permission.EDIT_TUBES,
    Permission.DELETE_TUBES,
  ] as const;

  static readonly LAB_ADMIN_PERMISSIONS = [
    Permission.VIEW_TUBES,
    Permission.CREATE_TUBES,
    Permission.EDIT_TUBES,
    Permission.DELETE_TUBES,
    Permission.BULK_EDIT,
    Permission.MANAGE_USERS,
    Permission.MANAGE_RESEARCHERS,
    Permission.ADMIN_SETTINGS,
    Permission.MANAGE_CONFIGURATION,
    Permission.MANAGE_INVITE_CODES,
  ] as const;

  static readonly SYSTEM_ADMIN_PERMISSIONS = Permission.ALL_PERMISSIONS;

  // Value Object Implementation

  private constructor(
    private readonly _key: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this._key || this._key.trim().length === 0) {
      throw new ValidationError('A permission is required.');
    }

    // Validate snake_case format
    if (!/^[a-z][a-z0-9_]*$/.test(this._key)) {
      throw new ValidationError('That permission is not valid.');
    }
  }

  get key(): string {
    return this._key;
  }

  equals(other: Permission): boolean {
    if (!other) return false;
    return this._key === other._key;
  }

  static fromKey(key: string): Permission | null {
    return Permission.ALL_PERMISSIONS.find(permission => permission.key === key) ?? null;
  }
}
