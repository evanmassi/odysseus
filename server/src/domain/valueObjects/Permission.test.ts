import { Permission } from './Permission';

describe('Permission', () => {
  describe('static permission definitions', () => {
    it('should define all expected tube management permissions', () => {
      expect(Permission.VIEW_TUBES.key).toBe('view_tubes');
      expect(Permission.CREATE_TUBES.key).toBe('create_tubes');
      expect(Permission.EDIT_TUBES.key).toBe('edit_tubes');
      expect(Permission.DELETE_TUBES.key).toBe('delete_tubes');
      expect(Permission.BULK_EDIT.key).toBe('bulk_edit');
    });

    it('should define all expected management permissions', () => {
      expect(Permission.MANAGE_USERS.key).toBe('manage_users');
      expect(Permission.MANAGE_RESEARCHERS.key).toBe('manage_researchers');
      expect(Permission.ADMIN_SETTINGS.key).toBe('admin_settings');
      expect(Permission.MANAGE_CONFIGURATION.key).toBe('manage_configuration');
    });

    it('should define all expected multi-tenancy permissions', () => {
      expect(Permission.MANAGE_LABS.key).toBe('manage_labs');
      expect(Permission.VIEW_ALL_LABS.key).toBe('view_all_labs');
      expect(Permission.MANAGE_INVITE_CODES.key).toBe('manage_invite_codes');
      expect(Permission.MANAGE_GLOBAL_SETTINGS.key).toBe('manage_global_settings');
    });

    it('should have unique keys across all permissions', () => {
      const keys = Permission.ALL_PERMISSIONS.map(p => p.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('should have 13 total permissions', () => {
      expect(Permission.ALL_PERMISSIONS.length).toBe(13);
    });
  });

  describe('permission collections', () => {
    it('should give users basic tube permissions', () => {
      const userKeys = Permission.USER_PERMISSIONS.map(p => p.key);
      expect(userKeys).toContain('view_tubes');
      expect(userKeys).toContain('create_tubes');
      expect(userKeys).toContain('edit_tubes');
      expect(userKeys).toContain('delete_tubes');
      expect(userKeys).not.toContain('bulk_edit');
      expect(userKeys).not.toContain('manage_users');
    });

    it('should give lab admins user permissions plus management', () => {
      const labAdminKeys = Permission.LAB_ADMIN_PERMISSIONS.map(p => p.key);
      const userKeys = Permission.USER_PERMISSIONS.map(p => p.key);

      for (const key of userKeys) {
        expect(labAdminKeys).toContain(key);
      }

      expect(labAdminKeys).toContain('bulk_edit');
      expect(labAdminKeys).toContain('manage_users');
      expect(labAdminKeys).toContain('manage_researchers');
      expect(labAdminKeys).toContain('admin_settings');
      expect(labAdminKeys).toContain('manage_configuration');
      expect(labAdminKeys).toContain('manage_invite_codes');
    });

    it('should not give lab admins system-level permissions', () => {
      const labAdminKeys = Permission.LAB_ADMIN_PERMISSIONS.map(p => p.key);
      expect(labAdminKeys).not.toContain('manage_labs');
      expect(labAdminKeys).not.toContain('view_all_labs');
      expect(labAdminKeys).not.toContain('manage_global_settings');
    });

    it('should give system admins all permissions', () => {
      expect(Permission.SYSTEM_ADMIN_PERMISSIONS).toBe(Permission.ALL_PERMISSIONS);
    });

    it('should have lab_admin as superset of user', () => {
      const userKeys = new Set(Permission.USER_PERMISSIONS.map(p => p.key));
      const labAdminKeys = new Set(Permission.LAB_ADMIN_PERMISSIONS.map(p => p.key));

      for (const key of userKeys) {
        expect(labAdminKeys.has(key)).toBe(true);
      }
      expect(labAdminKeys.size).toBeGreaterThan(userKeys.size);
    });

    it('should have system_admin as superset of lab_admin', () => {
      const labAdminKeys = new Set(Permission.LAB_ADMIN_PERMISSIONS.map(p => p.key));
      const systemAdminKeys = new Set(Permission.SYSTEM_ADMIN_PERMISSIONS.map(p => p.key));

      for (const key of labAdminKeys) {
        expect(systemAdminKeys.has(key)).toBe(true);
      }
      expect(systemAdminKeys.size).toBeGreaterThan(labAdminKeys.size);
    });
  });

  describe('fromKey', () => {
    it('should return permission for valid key', () => {
      const permission = Permission.fromKey('view_tubes');
      expect(permission).toBe(Permission.VIEW_TUBES);
    });

    it('should return null for invalid key', () => {
      expect(Permission.fromKey('nonexistent')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(Permission.fromKey('')).toBeNull();
    });
  });

  describe('isValidKey', () => {
    it('should return true for valid keys', () => {
      expect(Permission.isValidKey('view_tubes')).toBe(true);
      expect(Permission.isValidKey('manage_labs')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(Permission.isValidKey('nonexistent')).toBe(false);
      expect(Permission.isValidKey('')).toBe(false);
    });
  });

  describe('getAllKeys', () => {
    it('should return all permission keys', () => {
      const keys = Permission.getAllKeys();
      expect(keys.length).toBe(13);
      expect(keys).toContain('view_tubes');
      expect(keys).toContain('manage_global_settings');
    });
  });

  describe('getByCategory', () => {
    it('should return tube management permissions', () => {
      const tubePerms = Permission.getByCategory('TUBE_MANAGEMENT');
      expect(tubePerms.length).toBe(5);
    });

    it('should return multi-tenancy permissions', () => {
      const mtPerms = Permission.getByCategory('MULTI_TENANCY');
      expect(mtPerms.length).toBe(4);
    });

    it('should return empty for unknown category', () => {
      expect(Permission.getByCategory('UNKNOWN').length).toBe(0);
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', () => {
      const categories = Permission.getAllCategories();
      expect(categories).toContain('TUBE_MANAGEMENT');
      expect(categories).toContain('USER_MANAGEMENT');
      expect(categories).toContain('RESEARCHER_MANAGEMENT');
      expect(categories).toContain('SYSTEM_ADMIN');
      expect(categories).toContain('MULTI_TENANCY');
      expect(categories.length).toBe(5);
    });
  });

  describe('equals', () => {
    it('should return true for same permission', () => {
      expect(Permission.VIEW_TUBES.equals(Permission.VIEW_TUBES)).toBe(true);
    });

    it('should return false for different permissions', () => {
      expect(Permission.VIEW_TUBES.equals(Permission.EDIT_TUBES)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to key via toString', () => {
      expect(Permission.VIEW_TUBES.toString()).toBe('view_tubes');
    });

    it('should serialize to key via toJSON', () => {
      expect(Permission.VIEW_TUBES.toJSON()).toBe('view_tubes');
    });
  });

  describe('properties', () => {
    it('should expose key, description, and category', () => {
      const perm = Permission.MANAGE_LABS;
      expect(perm.key).toBe('manage_labs');
      expect(perm.description).toBe('Create and manage labs');
      expect(perm.category).toBe('MULTI_TENANCY');
    });
  });
});
