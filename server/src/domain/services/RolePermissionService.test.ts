/**
 * Role Permission Service Tests
 */

import { RolePermissionService } from './RolePermissionService';
import { Permission } from '@domain/value-objects/Permission';

describe('RolePermissionService', () => {
  describe('hasPermission', () => {
    it('should grant users basic tube permissions', () => {
      expect(RolePermissionService.hasPermission('user', Permission.VIEW_TUBES)).toBe(true);
      expect(RolePermissionService.hasPermission('user', Permission.CREATE_TUBES)).toBe(true);
      expect(RolePermissionService.hasPermission('user', Permission.EDIT_TUBES)).toBe(true);
      expect(RolePermissionService.hasPermission('user', Permission.DELETE_TUBES)).toBe(true);
    });

    it('should deny users admin-level permissions', () => {
      expect(RolePermissionService.hasPermission('user', Permission.BULK_EDIT)).toBe(false);
      expect(RolePermissionService.hasPermission('user', Permission.MANAGE_USERS)).toBe(false);
      expect(RolePermissionService.hasPermission('user', Permission.MANAGE_RESEARCHERS)).toBe(false);
      expect(RolePermissionService.hasPermission('user', Permission.ADMIN_SETTINGS)).toBe(false);
      expect(RolePermissionService.hasPermission('user', Permission.MANAGE_CONFIGURATION)).toBe(false);
    });

    it('should grant lab_admin all lab-scoped permissions', () => {
      expect(RolePermissionService.hasPermission('lab_admin', Permission.BULK_EDIT)).toBe(true);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.MANAGE_USERS)).toBe(true);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.MANAGE_RESEARCHERS)).toBe(true);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.ADMIN_SETTINGS)).toBe(true);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.MANAGE_CONFIGURATION)).toBe(true);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.MANAGE_INVITE_CODES)).toBe(true);
    });

    it('should deny lab_admin system-level permissions', () => {
      expect(RolePermissionService.hasPermission('lab_admin', Permission.MANAGE_LABS)).toBe(false);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.VIEW_ALL_LABS)).toBe(false);
      expect(RolePermissionService.hasPermission('lab_admin', Permission.MANAGE_GLOBAL_SETTINGS)).toBe(false);
    });

    it('should grant system_admin all permissions', () => {
      for (const perm of Permission.ALL_PERMISSIONS) {
        expect(RolePermissionService.hasPermission('system_admin', perm)).toBe(true);
      }
    });

    it('should return false for invalid roles', () => {
      expect(RolePermissionService.hasPermission('invalid' as any, Permission.VIEW_TUBES)).toBe(false);
    });
  });

  describe('hasPermissionByKey', () => {
    it('should work with valid string keys', () => {
      expect(RolePermissionService.hasPermissionByKey('user', 'view_tubes')).toBe(true);
      expect(RolePermissionService.hasPermissionByKey('user', 'manage_users')).toBe(false);
    });

    it('should return false for unknown permission keys', () => {
      expect(RolePermissionService.hasPermissionByKey('system_admin', 'nonexistent')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if role has at least one permission', () => {
      expect(RolePermissionService.hasAnyPermission('user', [
        Permission.MANAGE_USERS,
        Permission.VIEW_TUBES,
      ])).toBe(true);
    });

    it('should return false if role has none of the permissions', () => {
      expect(RolePermissionService.hasAnyPermission('user', [
        Permission.MANAGE_USERS,
        Permission.MANAGE_LABS,
      ])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if role has all permissions', () => {
      expect(RolePermissionService.hasAllPermissions('user', [
        Permission.VIEW_TUBES,
        Permission.CREATE_TUBES,
      ])).toBe(true);
    });

    it('should return false if role is missing any permission', () => {
      expect(RolePermissionService.hasAllPermissions('user', [
        Permission.VIEW_TUBES,
        Permission.MANAGE_USERS,
      ])).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return 4 permissions for user', () => {
      expect(RolePermissionService.getPermissionsForRole('user').length).toBe(4);
    });

    it('should return 10 permissions for lab_admin', () => {
      expect(RolePermissionService.getPermissionsForRole('lab_admin').length).toBe(10);
    });

    it('should return 13 permissions for system_admin', () => {
      expect(RolePermissionService.getPermissionsForRole('system_admin').length).toBe(13);
    });

    it('should throw for invalid role', () => {
      expect(() => RolePermissionService.getPermissionsForRole('invalid' as any)).toThrow();
    });
  });

  describe('getPermissionKeysForRole', () => {
    it('should return string keys', () => {
      const keys = RolePermissionService.getPermissionKeysForRole('user');
      expect(keys.every(k => typeof k === 'string')).toBe(true);
      expect(keys).toContain('view_tubes');
    });
  });

  describe('isValidRole', () => {
    it('should validate known roles', () => {
      expect(RolePermissionService.isValidRole('system_admin')).toBe(true);
      expect(RolePermissionService.isValidRole('lab_admin')).toBe(true);
      expect(RolePermissionService.isValidRole('user')).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(RolePermissionService.isValidRole('admin')).toBe(false);
      expect(RolePermissionService.isValidRole('')).toBe(false);
    });
  });

  describe('getAllRoles', () => {
    it('should return all three roles', () => {
      const roles = RolePermissionService.getAllRoles();
      expect(roles).toEqual(['system_admin', 'lab_admin', 'user']);
    });
  });

  describe('getRolesWithPermission', () => {
    it('should return all roles for view_tubes', () => {
      const roles = RolePermissionService.getRolesWithPermission(Permission.VIEW_TUBES);
      expect(roles).toContain('system_admin');
      expect(roles).toContain('lab_admin');
      expect(roles).toContain('user');
    });

    it('should return only admins for manage_users', () => {
      const roles = RolePermissionService.getRolesWithPermission(Permission.MANAGE_USERS);
      expect(roles).toContain('system_admin');
      expect(roles).toContain('lab_admin');
      expect(roles).not.toContain('user');
    });

    it('should return only system_admin for manage_labs', () => {
      const roles = RolePermissionService.getRolesWithPermission(Permission.MANAGE_LABS);
      expect(roles).toEqual(['system_admin']);
    });
  });

});
