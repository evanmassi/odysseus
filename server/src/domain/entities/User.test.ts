/**
 * User Entity Tests
 *
 * Validates authentication, roles, permissions, approval workflow, and credential management.
 */

import { User } from './User';
import { UserRole } from '@domain/value-objects/UserRole';
import { createTestUser, createTestAdmin, createTestSystemAdmin, TEST_PASSWORD_HASH } from '@domain/__tests__/helpers';

describe('User', () => {
  describe('factory methods', () => {
    describe('create', () => {
      it('should create user with API key auth', () => {
        const user = User.create('testuser', 'api_' + 'x'.repeat(32));
        expect(user.id).toMatch(/^user_/);
        expect(user.username).toBe('testuser');
        expect(user.role.isUser()).toBe(true);
        expect(user.status).toBe('pending');
        expect(user.isDemo).toBe(false);
      });

      it('should make first user in lab a lab_admin', () => {
        const user = User.create('first', 'api_' + 'x'.repeat(32), true);
        expect(user.role.isLabAdmin()).toBe(true);
      });

      it('should make subsequent users regular users', () => {
        const user = User.create('second', 'api_' + 'x'.repeat(32), false);
        expect(user.role.isUser()).toBe(true);
      });

      it('should accept labId', () => {
        const user = User.create('test', 'api_' + 'x'.repeat(32), false, undefined, undefined, 'lab_123');
        expect(user.labId).toBe('lab_123');
      });
    });

    describe('createWithPassword', () => {
      it('should create user with password hash', () => {
        const user = createTestUser();
        expect(user.hasPassword()).toBe(true);
        expect(user.passwordHash).toBe(TEST_PASSWORD_HASH);
      });

      it('should set the requested role', () => {
        const admin = createTestUser({ role: UserRole.labAdmin() });
        expect(admin.role.isLabAdmin()).toBe(true);
      });

      it('should set the requested status', () => {
        const pending = createTestUser({ status: 'pending' });
        expect(pending.isPending()).toBe(true);
      });
    });

    describe('createSystemAdmin', () => {
      it('should create system admin with approved status', () => {
        const admin = createTestSystemAdmin();
        expect(admin.isSystemAdmin()).toBe(true);
        expect(admin.isApproved()).toBe(true);
      });
    });

    describe('createLabAdmin', () => {
      it('should create lab admin with labId', () => {
        const admin = User.createLabAdmin('labadmin', 'api_' + 'x'.repeat(32), 'lab_1');
        expect(admin.isLabAdmin()).toBe(true);
        expect(admin.labId).toBe('lab_1');
      });
    });
  });

  describe('password management', () => {
    it('should report hasPassword when hash is set', () => {
      const user = createTestUser();
      expect(user.hasPassword()).toBe(true);
    });

    it('should report no password when not set', () => {
      const user = User.create('test', 'api_' + 'x'.repeat(32));
      expect(user.hasPassword()).toBe(false);
    });

    it('should store hash and clear salt via setPasswordHash', () => {
      const user = User.fromData({
        id: 'user_1',
        username: 'test',
        apiKey: 'api_' + 'x'.repeat(32),
        role: 'user',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        passwordHash: 'legacyhash',
        salt: 'legacysalt',
      });
      expect(user.salt).toBe('legacysalt');

      user.setPasswordHash('$2b$12$newbcrypthash');
      expect(user.passwordHash).toBe('$2b$12$newbcrypthash');
      expect(user.salt).toBeUndefined();
    });
  });

  describe('username validation', () => {
    it('should accept valid usernames', () => {
      expect(() => createTestUser({ username: 'john_doe' })).not.toThrow();
      expect(() => createTestUser({ username: 'user@lab.com' })).not.toThrow();
      expect(() => createTestUser({ username: 'test-user.1' })).not.toThrow();
    });

    it('should reject empty username', () => {
      expect(() => createTestUser({ username: '' })).toThrow('Username is required');
    });

    it('should reject username with invalid characters', () => {
      expect(() => createTestUser({ username: 'user name' })).toThrow();
      expect(() => createTestUser({ username: 'user<script>' })).toThrow();
    });
  });

  describe('role management', () => {
    it('should change role when performed by admin', () => {
      const admin = createTestSystemAdmin();
      const user = createTestUser({ labId: 'lab_1' });
      user.changeRole('lab_admin', admin);
      expect(user.role.isLabAdmin()).toBe(true);
    });

    it('should reject role change by non-admin', () => {
      const regular = createTestUser({ username: 'regular' });
      const target = createTestUser({ username: 'target' });
      expect(() => target.changeRole('lab_admin', regular)).toThrow('Cannot manage user');
    });

    it('should reject self role change', () => {
      const admin = createTestSystemAdmin();
      expect(() => admin.changeRole('user', admin)).toThrow('Cannot manage user');
    });

    it('should prevent lab_admin from assigning system_admin role', () => {
      const labAdmin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ labId: 'lab_1' });
      expect(() => user.changeRole('system_admin', labAdmin)).toThrow('Lab administrators cannot assign system admin role');
    });

    it('should prevent lab_admin from changing roles in another lab', () => {
      const labAdmin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ labId: 'lab_2' });
      expect(() => user.changeRole('lab_admin', labAdmin)).toThrow('Cannot manage user');
    });
  });

  describe('permissions', () => {
    it('should delegate hasPermission to role', () => {
      const user = createTestUser();
      expect(user.hasPermission('view_tubes')).toBe(true);
      expect(user.hasPermission('manage_users')).toBe(false);
    });
  });

  describe('canManage', () => {
    it('should allow system admin to manage anyone', () => {
      const sysAdmin = createTestSystemAdmin();
      const user = createTestUser({ labId: 'lab_1' });
      expect(sysAdmin.canManage(user)).toBe(true);
    });

    it('should not allow managing yourself', () => {
      const admin = createTestSystemAdmin();
      expect(admin.canManage(admin)).toBe(false);
    });

    it('should not allow regular user to manage anyone', () => {
      const user1 = createTestUser({ username: 'user1' });
      const user2 = createTestUser({ username: 'user2' });
      expect(user1.canManage(user2)).toBe(false);
    });

    it('should allow lab admin to manage same-lab users', () => {
      const admin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ labId: 'lab_1' });
      expect(admin.canManage(user)).toBe(true);
    });

    it('should not allow lab admin to manage other-lab users', () => {
      const admin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ labId: 'lab_2' });
      expect(admin.canManage(user)).toBe(false);
    });

    it('should not allow lab admin to manage system admins', () => {
      const labAdmin = createTestAdmin({ labId: 'lab_1' });
      const sysAdmin = createTestSystemAdmin();
      expect(labAdmin.canManage(sysAdmin)).toBe(false);
    });
  });

  describe('requireCanManage', () => {
    it('should throw when management not allowed', () => {
      const user = createTestUser();
      const other = createTestUser({ username: 'other' });
      expect(() => user.requireCanManage(other)).toThrow('Cannot manage user');
    });
  });

  describe('reactivation guards', () => {
    it('should not reactivate an already-active user', () => {
      const admin = createTestSystemAdmin();
      const user = createTestUser({ status: 'approved' });
      expect(() => user.reactivate(admin)).toThrow('User is already active');
    });

    it('should not allow a non-admin to reactivate', () => {
      const regular = createTestUser({ username: 'regular' });
      const user = createTestUser({ username: 'target', status: 'deactivated' });
      expect(() => user.reactivate(regular)).toThrow('Cannot manage user');
    });

    it('should not allow a lab admin to reactivate a user in another lab', () => {
      const admin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ status: 'deactivated', labId: 'lab_2' });
      expect(() => user.reactivate(admin)).toThrow('Cannot manage user');
    });
  });

  describe('deactivation workflow', () => {
    it('should deactivate approved user (any admin)', () => {
      const admin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ status: 'approved', labId: 'lab_1' });
      user.deactivate(admin);
      expect(user.isDeactivated()).toBe(true);
    });

    it('should not deactivate non-approved user', () => {
      const admin = createTestSystemAdmin();
      const user = createTestUser({ status: 'pending' });
      expect(() => user.deactivate(admin)).toThrow('Only approved users can be deactivated');
    });

    it('should not allow non-admin to deactivate', () => {
      const regular = createTestUser({ username: 'regular' });
      const user = createTestUser({ username: 'target', status: 'approved' });
      expect(() => user.deactivate(regular)).toThrow('Cannot manage user');
    });

    it('should not allow lab admin to deactivate users in other labs', () => {
      const admin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ status: 'approved', labId: 'lab_2' });
      expect(() => user.deactivate(admin)).toThrow('Cannot manage user');
    });

    it('should reactivate deactivated user (any admin)', () => {
      const admin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ status: 'deactivated', labId: 'lab_1' });
      user.reactivate(admin);
      expect(user.isApproved()).toBe(true);
    });
  });

  describe('suspension workflow', () => {
    it('should suspend approved user (system admin only)', () => {
      const sysAdmin = createTestSystemAdmin();
      const user = createTestUser({ status: 'approved' });
      user.suspend(sysAdmin);
      expect(user.isSuspended()).toBe(true);
    });

    it('should not allow lab admin to suspend', () => {
      const labAdmin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ status: 'approved', labId: 'lab_1' });
      expect(() => user.suspend(labAdmin)).toThrow('Only system administrators can suspend users');
    });

    it('should escalate deactivated to suspended', () => {
      const sysAdmin = createTestSystemAdmin();
      const user = createTestUser({ status: 'deactivated' });
      user.suspend(sysAdmin);
      expect(user.isSuspended()).toBe(true);
    });

    it('should not suspend pending user', () => {
      const sysAdmin = createTestSystemAdmin();
      const user = createTestUser({ status: 'pending' });
      expect(() => user.suspend(sysAdmin)).toThrow('Only approved or deactivated users can be suspended');
    });

    it('should unsuspend user (system admin only)', () => {
      const sysAdmin = createTestSystemAdmin();
      const user = createTestUser({ status: 'suspended' });
      user.reactivate(sysAdmin);
      expect(user.isApproved()).toBe(true);
    });

    it('should not allow lab admin to unsuspend', () => {
      const labAdmin = createTestAdmin({ labId: 'lab_1' });
      const user = createTestUser({ status: 'suspended', labId: 'lab_1' });
      expect(() => user.reactivate(labAdmin)).toThrow('Only system administrators can unsuspend users');
    });
  });

  describe('status queries', () => {
    it('should report correct status', () => {
      const pending = createTestUser({ status: 'pending' });
      expect(pending.isPending()).toBe(true);
      expect(pending.isApproved()).toBe(false);
      expect(pending.isRejected()).toBe(false);
      expect(pending.isDeactivated()).toBe(false);
      expect(pending.isSuspended()).toBe(false);

      const approved = createTestUser({ status: 'approved' });
      expect(approved.isApproved()).toBe(true);

      const deactivated = createTestUser({ status: 'deactivated' });
      expect(deactivated.isDeactivated()).toBe(true);
      expect(deactivated.isApproved()).toBe(false);

      const suspended = createTestUser({ status: 'suspended' });
      expect(suspended.isSuspended()).toBe(true);
      expect(suspended.isApproved()).toBe(false);
    });
  });

  describe('role queries', () => {
    it('should delegate role checks', () => {
      const sysAdmin = createTestSystemAdmin();
      expect(sysAdmin.isSystemAdmin()).toBe(true);
      expect(sysAdmin.isAdmin()).toBe(true);
      expect(sysAdmin.isLabAdmin()).toBe(false);
      expect(sysAdmin.isUser()).toBe(false);

      const labAdmin = createTestAdmin();
      expect(labAdmin.isLabAdmin()).toBe(true);
      expect(labAdmin.isAdmin()).toBe(true);
      expect(labAdmin.isSystemAdmin()).toBe(false);

      const user = createTestUser();
      expect(user.isUser()).toBe(true);
      expect(user.isAdmin()).toBe(false);
    });
  });

  describe('activity tracking', () => {
    it('should update lastActivity on recordActivity', () => {
      const user = createTestUser();
      const before = user.lastActivity;
      user.recordActivity();
      expect(user.lastActivity.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('email verification', () => {
    it('should generate and verify token', () => {
      const user = createTestUser();
      expect(user.isEmailVerified()).toBe(false);

      const token = user.generateVerificationToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);

      user.verifyEmail(token);
      expect(user.isEmailVerified()).toBe(true);
    });

    it('should reject wrong verification token', () => {
      const user = createTestUser();
      user.generateVerificationToken();
      expect(() => user.verifyEmail('wrongtoken')).toThrow();
    });

    it('should reject verification without token', () => {
      const user = createTestUser();
      expect(() => user.verifyEmail('sometoken')).toThrow();
    });

    it('should reject expired verification token', () => {
      const user = createTestUser();
      user.generateVerificationToken();

      // Manually expire the token
      (user as any)._emailVerificationExpiry = new Date(Date.now() - 1000);

      expect(() => user.verifyEmail('anytoken')).toThrow();
    });

    it('should clear token after successful verification', () => {
      const user = createTestUser();
      const token = user.generateVerificationToken();
      user.verifyEmail(token);
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.emailVerificationExpiry).toBeUndefined();
    });

    it('markEmailVerified should skip token check', () => {
      const user = createTestUser();
      user.markEmailVerified();
      expect(user.isEmailVerified()).toBe(true);
    });
  });

  describe('resend verification rate limiting', () => {
    it('should allow first verification email', () => {
      const user = createTestUser();
      expect(user.canResendVerification()).toBe(true);
    });

    it('should block resend within 5 minutes', () => {
      const user = createTestUser();
      user.generateVerificationToken();
      expect(user.canResendVerification()).toBe(false);
    });
  });

  describe('password reset', () => {
    it('should generate and reset with token', () => {
      const user = createTestUser();
      const token = user.generatePasswordResetToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);

      const newHash = '$2b$12$resethash';
      user.resetPasswordWithToken(token, newHash);
      expect(user.passwordHash).toBe(newHash);
      expect(user.salt).toBeUndefined();
    });

    it('should reject wrong reset token', () => {
      const user = createTestUser();
      user.generatePasswordResetToken();
      expect(() => user.resetPasswordWithToken('wrongtoken', '$2b$12$hash')).toThrow();
    });

    it('should reject expired reset token', () => {
      const user = createTestUser();
      user.generatePasswordResetToken();
      (user as any)._passwordResetExpiry = new Date(Date.now() - 1000);
      expect(() => user.resetPasswordWithToken('anytoken', '$2b$12$hash')).toThrow('Password reset token expired');
    });

    it('should clear requirePasswordChange after reset', () => {
      const user = createTestUser();
      user.adminResetPassword('$2b$12$temphash', true);
      expect(user.isPasswordChangeRequired()).toBe(true);

      const token = user.generatePasswordResetToken();
      user.resetPasswordWithToken(token, '$2b$12$userhash');
      expect(user.isPasswordChangeRequired()).toBe(false);
    });

    it('should reject reset without token', () => {
      const user = createTestUser();
      expect(() => user.resetPasswordWithToken('token', '$2b$12$hash')).toThrow('No password reset token found');
    });
  });

  describe('admin password reset', () => {
    it('should set password hash and require change flag', () => {
      const user = createTestUser();
      const hash = '$2b$12$adminresethash';
      user.adminResetPassword(hash, true);
      expect(user.passwordHash).toBe(hash);
      expect(user.salt).toBeUndefined();
      expect(user.isPasswordChangeRequired()).toBe(true);
    });

    it('should clear existing reset tokens', () => {
      const user = createTestUser();
      user.generatePasswordResetToken();
      user.adminResetPassword('$2b$12$adminresethash');
      expect(user.passwordResetToken).toBeUndefined();
    });
  });

  describe('markPasswordChanged', () => {
    it('should clear requirePasswordChange', () => {
      const user = createTestUser();
      user.adminResetPassword('$2b$12$temphash', true);
      expect(user.isPasswordChangeRequired()).toBe(true);
      user.markPasswordChanged();
      expect(user.isPasswordChangeRequired()).toBe(false);
    });
  });

  describe('demo status (lab-derived)', () => {
    it('should derive isDemo from labIsDemo when hydrating', () => {
      const user = User.fromData({
        id: 'user_test1',
        username: 'demouser',
        apiKey: 'api_' + 'x'.repeat(32),
        role: 'user',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        labIsDemo: true,
        labId: 'lab_demo',
      });
      expect(user.isDemo).toBe(true);
    });

    it('should default isDemo to false when labIsDemo not provided', () => {
      const user = createTestUser();
      expect(user.isDemo).toBe(false);
    });

    it('should expose isDemo in public data', () => {
      const user = User.fromData({
        id: 'user_test2',
        username: 'demouser2',
        apiKey: 'api_' + 'y'.repeat(32),
        role: 'user',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        labIsDemo: true,
        labId: 'lab_demo',
      });
      expect(user.toPublicData().isDemo).toBe(true);
    });

    it('should preserve labIsDemo through updateSettings', () => {
      const user = User.fromData({
        id: 'user_test3',
        username: 'demouser3',
        apiKey: 'api_' + 'z'.repeat(32),
        role: 'user',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        labIsDemo: true,
        labId: 'lab_demo',
      });
      const updated = user.updateSettings({ positionDisplayFormat: 'alphanumeric' } as any);
      expect(updated.isDemo).toBe(true);
    });
  });

  describe('researcher link', () => {
    it('should track researcher profile', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      expect(user.hasResearcherProfile()).toBe(true);
      expect(user.researcherId).toBe('res_1');
    });

    it('should unlink researcher', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      user.unlinkResearcher();
      expect(user.hasResearcherProfile()).toBe(false);
      expect(user.researcherId).toBeUndefined();
    });
  });

  describe('fromData', () => {
    it('should reconstitute from data', () => {
      const original = createTestUser({ labId: 'lab_1' });
      const fromDataUser = User.fromData({
        id: original.id,
        username: original.username,
        apiKey: original.apiKey,
        role: 'user',
        createdAt: original.createdAt.toISOString(),
        lastActivity: original.lastActivity.toISOString(),
        status: 'approved',
        labId: 'lab_1',
      });
      expect(fromDataUser.id).toBe(original.id);
      expect(fromDataUser.labId).toBe('lab_1');
    });

    it('should normalize legacy admin role to lab_admin', () => {
      const user = User.fromData({
        id: 'user_1',
        username: 'oldadmin',
        apiKey: 'api_' + 'x'.repeat(32),
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      });
      expect(user.role.isLabAdmin()).toBe(true);
    });

    it('should restore password hash from persistence', () => {
      const user = User.fromData({
        id: 'user_1',
        username: 'test',
        apiKey: 'api_' + 'x'.repeat(32),
        role: 'user',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        passwordHash: 'somehash',
        salt: 'somesalt',
      });
      expect(user.hasPassword()).toBe(true);
    });
  });

  describe('toPublicData', () => {
    it('should exclude sensitive fields', () => {
      const user = createTestUser({ labId: 'lab_1' });
      const pub = user.toPublicData();
      expect(pub.id).toBe(user.id);
      expect(pub.username).toBe(user.username);
      expect(pub.labId).toBe('lab_1');
      expect((pub as any).apiKey).toBeUndefined();
      expect((pub as any).passwordHash).toBeUndefined();
    });
  });

  describe('equality', () => {
    it('should be equal by id', () => {
      const user = createTestUser();
      const data = {
        id: user.id,
        username: user.username,
        apiKey: user.apiKey,
        role: 'user' as const,
        createdAt: user.createdAt.toISOString(),
        lastActivity: user.lastActivity.toISOString(),
      };
      const same = User.fromData(data);
      expect(user.equals(same)).toBe(true);
    });

    it('should not be equal for different users', () => {
      const user1 = createTestUser({ username: 'user1' });
      const user2 = createTestUser({ username: 'user2' });
      expect(user1.equals(user2)).toBe(false);
    });
  });

  describe('date immutability', () => {
    it('should return copies of dates', () => {
      const user = createTestUser();
      const d1 = user.createdAt;
      const d2 = user.createdAt;
      expect(d1).not.toBe(d2);
      expect(d1.getTime()).toBe(d2.getTime());
    });
  });

  describe('updateSettings', () => {
    it('should return new user instance with updated settings', () => {
      const user = createTestUser();
      const newSettings = { ...user.settings, theme: 'dark' as const };
      const updated = user.updateSettings(newSettings);
      expect(updated.settings.theme).toBe('dark');
      expect(updated.id).toBe(user.id);
    });

    it('should preserve password hash through settings update', () => {
      const user = createTestUser();
      const updated = user.updateSettings(user.settings);
      expect(updated.hasPassword()).toBe(true);
      expect(updated.passwordHash).toBe(TEST_PASSWORD_HASH);
    });
  });
});
