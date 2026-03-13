/**
 * Permission Value Object
 *
 * Immutable permission with snake_case key convention.
 */

import { ValidationError } from '@domain/errors/ValidationError';
export class Permission {
  // Permission Registry
  
  // Tube Management
  static readonly VIEW_TUBES = new Permission('view_tubes', 'View tube inventory', 'TUBE_MANAGEMENT');
  static readonly CREATE_TUBES = new Permission('create_tubes', 'Create new tubes', 'TUBE_MANAGEMENT');
  static readonly EDIT_TUBES = new Permission('edit_tubes', 'Edit existing tubes', 'TUBE_MANAGEMENT');
  static readonly DELETE_TUBES = new Permission('delete_tubes', 'Delete tubes', 'TUBE_MANAGEMENT');
  static readonly BULK_EDIT = new Permission('bulk_edit', 'Bulk edit tubes', 'TUBE_MANAGEMENT');
  
  // User Management
  static readonly MANAGE_USERS = new Permission('manage_users', 'Manage system users', 'USER_MANAGEMENT');
  
  // Researcher Management
  static readonly MANAGE_RESEARCHERS = new Permission('manage_researchers', 'Manage researchers', 'RESEARCHER_MANAGEMENT');
  
  // System Administration
  static readonly ADMIN_SETTINGS = new Permission('admin_settings', 'Access admin settings', 'SYSTEM_ADMIN');
  static readonly MANAGE_CONFIGURATION = new Permission('manage_configuration', 'Manage system configuration', 'SYSTEM_ADMIN');

  // Multi-Tenancy
  static readonly MANAGE_LABS = new Permission('manage_labs', 'Create and manage labs', 'MULTI_TENANCY');
  static readonly VIEW_ALL_LABS = new Permission('view_all_labs', 'View all labs and cross-lab data', 'MULTI_TENANCY');
  static readonly MANAGE_INVITE_CODES = new Permission('manage_invite_codes', 'Create and manage invite codes', 'MULTI_TENANCY');
  static readonly MANAGE_GLOBAL_SETTINGS = new Permission('manage_global_settings', 'Manage global security and system settings', 'MULTI_TENANCY');

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
    private readonly _key: string,
    private readonly _description: string,
    private readonly _category: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this._key || this._key.trim().length === 0) {
      throw new ValidationError('Permission key is required');
    }

    if (!this._description || this._description.trim().length === 0) {
      throw new ValidationError('Permission description is required');
    }

    if (!this._category || this._category.trim().length === 0) {
      throw new ValidationError('Permission category is required');
    }

    // Validate snake_case format
    if (!/^[a-z][a-z0-9_]*$/.test(this._key)) {
      throw new ValidationError(`Permission key must be snake_case: ${this._key}`);
    }
  }

  // PUBLIC API

  get key(): string {
    return this._key;
  }

  get description(): string {
    return this._description;
  }

  get category(): string {
    return this._category;
  }

  equals(other: Permission): boolean {
    if (!other) return false;
    return this._key === other._key;
  }

  toString(): string {
    return this._key;
  }

  toJSON(): string {
    return this._key;
  }

  // UTILITY METHODS

  static fromKey(key: string): Permission | null {
    return Permission.ALL_PERMISSIONS.find(permission => permission.key === key) ?? null;
  }

  static getAllCategories(): readonly string[] {
    const categories = new Set(Permission.ALL_PERMISSIONS.map(permission => permission.category));
    return Array.from(categories);
  }
}

// Type Definitions

export type PermissionKey = typeof Permission.ALL_PERMISSIONS[number]['key'];
