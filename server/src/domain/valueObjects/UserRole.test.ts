import { UserRole } from './UserRole';
import { Permission } from './Permission';

describe('UserRole', () => {
  describe('create', () => {
    it('should create from valid role strings', () => {
      expect(UserRole.create('system_admin').value).toBe('system_admin');
      expect(UserRole.create('lab_admin').value).toBe('lab_admin');
      expect(UserRole.create('user').value).toBe('user');
    });

    it('should throw for invalid role', () => {
      expect(() => UserRole.create('admin')).toThrow();
      expect(() => UserRole.create('')).toThrow();
      expect(() => UserRole.create('superuser')).toThrow();
    });
  });

  describe('convenience factories', () => {
    it('should create system admin', () => {
      const role = UserRole.systemAdmin();
      expect(role.value).toBe('system_admin');
      expect(role.isSystemAdmin()).toBe(true);
    });

    it('should create lab admin', () => {
      const role = UserRole.labAdmin();
      expect(role.value).toBe('lab_admin');
      expect(role.isLabAdmin()).toBe(true);
    });

    it('should create user', () => {
      const role = UserRole.user();
      expect(role.value).toBe('user');
      expect(role.isUser()).toBe(true);
    });
  });

  describe('role queries', () => {
    it('isAdmin should return true for both admin types', () => {
      expect(UserRole.systemAdmin().isAdmin()).toBe(true);
      expect(UserRole.labAdmin().isAdmin()).toBe(true);
      expect(UserRole.user().isAdmin()).toBe(false);
    });

    it('isSystemAdmin should only match system_admin', () => {
      expect(UserRole.systemAdmin().isSystemAdmin()).toBe(true);
      expect(UserRole.labAdmin().isSystemAdmin()).toBe(false);
      expect(UserRole.user().isSystemAdmin()).toBe(false);
    });

    it('isLabAdmin should only match lab_admin', () => {
      expect(UserRole.labAdmin().isLabAdmin()).toBe(true);
      expect(UserRole.systemAdmin().isLabAdmin()).toBe(false);
      expect(UserRole.user().isLabAdmin()).toBe(false);
    });

    it('isUser should only match user', () => {
      expect(UserRole.user().isUser()).toBe(true);
      expect(UserRole.labAdmin().isUser()).toBe(false);
      expect(UserRole.systemAdmin().isUser()).toBe(false);
    });
  });

  describe('privilege ordering', () => {
    it('should rank system_admin highest', () => {
      expect(UserRole.systemAdmin().hasHigherPrivilegesThan(UserRole.labAdmin())).toBe(true);
      expect(UserRole.systemAdmin().hasHigherPrivilegesThan(UserRole.user())).toBe(true);
    });

    it('should rank lab_admin above user', () => {
      expect(UserRole.labAdmin().hasHigherPrivilegesThan(UserRole.user())).toBe(true);
    });

    it('should not rank user above anyone', () => {
      expect(UserRole.user().hasHigherPrivilegesThan(UserRole.labAdmin())).toBe(false);
      expect(UserRole.user().hasHigherPrivilegesThan(UserRole.systemAdmin())).toBe(false);
    });

    it('should not rank same privilege as higher', () => {
      expect(UserRole.labAdmin().hasHigherPrivilegesThan(UserRole.labAdmin())).toBe(false);
    });
  });

  describe('equality', () => {
    it('should be equal for same role', () => {
      expect(UserRole.user().equals(UserRole.user())).toBe(true);
      expect(UserRole.labAdmin().equals(UserRole.labAdmin())).toBe(true);
    });

    it('should not be equal for different roles', () => {
      expect(UserRole.user().equals(UserRole.labAdmin())).toBe(false);
    });
  });

  describe('permissions', () => {
    it('user should have basic tube permissions', () => {
      const role = UserRole.user();
      expect(role.hasPermission(Permission.VIEW_TUBES)).toBe(true);
      expect(role.hasPermission(Permission.CREATE_TUBES)).toBe(true);
      expect(role.hasPermission(Permission.EDIT_TUBES)).toBe(true);
      expect(role.hasPermission(Permission.DELETE_TUBES)).toBe(true);
    });

    it('user should not have admin permissions', () => {
      const role = UserRole.user();
      expect(role.hasPermission(Permission.MANAGE_USERS)).toBe(false);
      expect(role.hasPermission(Permission.BULK_EDIT)).toBe(false);
      expect(role.hasPermission(Permission.MANAGE_LABS)).toBe(false);
    });

    it('lab_admin should have management permissions', () => {
      const role = UserRole.labAdmin();
      expect(role.hasPermission(Permission.MANAGE_USERS)).toBe(true);
      expect(role.hasPermission(Permission.MANAGE_RESEARCHERS)).toBe(true);
      expect(role.hasPermission(Permission.MANAGE_CONFIGURATION)).toBe(true);
      expect(role.hasPermission(Permission.MANAGE_INVITE_CODES)).toBe(true);
    });

    it('lab_admin should not have system-level permissions', () => {
      const role = UserRole.labAdmin();
      expect(role.hasPermission(Permission.MANAGE_LABS)).toBe(false);
      expect(role.hasPermission(Permission.VIEW_ALL_LABS)).toBe(false);
      expect(role.hasPermission(Permission.MANAGE_GLOBAL_SETTINGS)).toBe(false);
    });

    it('system_admin should have all permissions', () => {
      const role = UserRole.systemAdmin();
      for (const perm of Permission.ALL_PERMISSIONS) {
        expect(role.hasPermission(perm)).toBe(true);
      }
    });

    it('should support string-based permission checking', () => {
      const role = UserRole.user();
      expect(role.hasPermission('view_tubes')).toBe(true);
      expect(role.hasPermission('manage_users')).toBe(false);
      expect(role.hasPermission('nonexistent_permission')).toBe(false);
    });

    it('getPermissions should return permission objects', () => {
      const perms = UserRole.user().getPermissions();
      expect(perms.length).toBe(4);
    });

    it('getPermissionKeys should return strings', () => {
      const keys = UserRole.labAdmin().getPermissionKeys();
      expect(keys).toContain('manage_users');
      expect(keys).toContain('view_tubes');
    });
  });

  describe('defaultRoleForLab', () => {
    it('should return lab_admin for first user in lab', () => {
      const role = UserRole.defaultRoleForLab(true);
      expect(role.isLabAdmin()).toBe(true);
    });

    it('should return user for subsequent users', () => {
      const role = UserRole.defaultRoleForLab(false);
      expect(role.isUser()).toBe(true);
    });

    it('should default to user when not specified', () => {
      const role = UserRole.defaultRoleForLab();
      expect(role.isUser()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      expect(UserRole.labAdmin().toString()).toBe('lab_admin');
    });

    it('should convert to data', () => {
      expect(UserRole.user().toData()).toEqual({ role: 'user' });
    });

  });

  describe('static utilities', () => {
    it('getValidRoles should return all three roles', () => {
      const roles = UserRole.getValidRoles();
      expect(roles).toContain('system_admin');
      expect(roles).toContain('lab_admin');
      expect(roles).toContain('user');
      expect(roles.length).toBe(3);
    });

    it('isValidRole should validate correctly', () => {
      expect(UserRole.isValidRole('system_admin')).toBe(true);
      expect(UserRole.isValidRole('lab_admin')).toBe(true);
      expect(UserRole.isValidRole('user')).toBe(true);
      expect(UserRole.isValidRole('admin')).toBe(false);
      expect(UserRole.isValidRole('')).toBe(false);
    });
  });
});
