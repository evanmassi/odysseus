/**
 * User Entity Tests
 *
 * Tests authentication, authorization, email verification, and password management.
 */

import { User } from './User';
import { UserRole } from '@domain/valueObjects/UserRole';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EmailVerificationError } from '@domain/errors/EmailVerificationError';

describe('User Entity', () => {
  describe('create()', () => {
    it('should create a user with valid parameters', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.id).toMatch(/^user_/);
      expect(user.username).toBe('testuser');
      expect(user.apiKey).toBe('api_key_12345678901234567890');
      expect(user.role.isUser()).toBe(true);
      expect(user.status).toBe('pending');
    });

    it('should make first user an admin', () => {
      const user = User.create('firstuser', 'api_key_12345678901234567890', true);

      expect(user.role.isAdmin()).toBe(true);
    });

    it('should make non-first user a regular user', () => {
      const user = User.create('regularuser', 'api_key_12345678901234567890', false);

      expect(user.role.isUser()).toBe(true);
    });

    it('should generate unique IDs for each user', () => {
      const user1 = User.create('user1', 'api_key_12345678901234567890', false);
      const user2 = User.create('user2', 'api_key_12345678901234567890', false);

      expect(user1.id).not.toBe(user2.id);
    });

    it('should throw ValidationError for empty username', () => {
      expect(() => User.create('', 'api_key_12345678901234567890', false)).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for username with invalid characters', () => {
      expect(() => User.create('user name!', 'api_key_12345678901234567890', false)).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for API key that is too short', () => {
      expect(() => User.create('testuser', 'short', false)).toThrow(ValidationError);
    });

    it('should allow email-style usernames', () => {
      const user = User.create('user@example.com', 'api_key_12345678901234567890', false);
      expect(user.username).toBe('user@example.com');
    });
  });

  describe('createAdmin()', () => {
    it('should create an admin user explicitly', () => {
      const admin = User.createAdmin('adminuser', 'api_key_12345678901234567890');

      expect(admin.role.isAdmin()).toBe(true);
      expect(admin.username).toBe('adminuser');
    });

    it('should link researcher if provided', () => {
      const admin = User.createAdmin(
        'adminuser',
        'api_key_12345678901234567890',
        'researcher_123'
      );

      expect(admin.researcherId).toBe('researcher_123');
    });
  });

  describe('createWithPassword()', () => {
    it('should create a user with password set', () => {
      const user = User.createWithPassword(
        'passuser',
        'securePass123',
        UserRole.user()
      );

      expect(user.hasPassword()).toBe(true);
      expect(user.validatePassword('securePass123')).toBe(true);
    });

    it('should set initial status as pending by default', () => {
      const user = User.createWithPassword('passuser', 'securePass123', UserRole.user());

      expect(user.status).toBe('pending');
    });

    it('should allow approved status on creation', () => {
      const user = User.createWithPassword(
        'passuser',
        'securePass123',
        UserRole.user(),
        undefined,
        undefined,
        'approved'
      );

      expect(user.status).toBe('approved');
    });
  });

  describe('fromData()', () => {
    it('should reconstitute a user from persistence data', () => {
      const now = new Date();
      const data = {
        id: 'user_123',
        username: 'testuser',
        apiKey: 'api_key_12345678901234567890',
        role: 'admin' as const,
        createdAt: now.toISOString(),
        lastActivity: now.toISOString(),
        passwordHash: 'somehash',
        salt: 'somesalt',
        status: 'approved' as const,
        emailVerified: 1,
        requirePasswordChange: 0,
      };

      const user = User.fromData(data);

      expect(user.id).toBe('user_123');
      expect(user.username).toBe('testuser');
      expect(user.role.isAdmin()).toBe(true);
      expect(user.status).toBe('approved');
      expect(user.emailVerified).toBe(true);
    });

    it('should parse settings from JSON string', () => {
      const settings = { positionDisplayFormat: 'numeric', compactMode: false };
      const data = {
        id: 'user_123',
        username: 'testuser',
        apiKey: 'api_key_12345678901234567890',
        role: 'user' as const,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        settings: JSON.stringify(settings),
      };

      const user = User.fromData(data);

      expect(user.settings).toBeDefined();
    });

    it('should handle malformed settings JSON gracefully', () => {
      const data = {
        id: 'user_123',
        username: 'testuser',
        apiKey: 'api_key_12345678901234567890',
        role: 'user' as const,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        settings: 'not valid json {{{',
      };

      const user = User.fromData(data);
      expect(user.settings).toBeDefined();
    });
  });

  describe('setPassword() / validatePassword()', () => {
    it('should set and validate password correctly', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      user.setPassword('mySecurePassword');

      expect(user.hasPassword()).toBe(true);
      expect(user.validatePassword('mySecurePassword')).toBe(true);
    });

    it('should reject wrong password', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      user.setPassword('mySecurePassword');

      expect(user.validatePassword('wrongPassword')).toBe(false);
    });

    it('should throw ValidationError for password too short', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(() => user.setPassword('abc')).toThrow(ValidationError);
    });

    it('should throw ValidationError for password too long', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      const longPassword = 'a'.repeat(129);

      expect(() => user.setPassword(longPassword)).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty password', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(() => user.setPassword('')).toThrow(ValidationError);
    });

    it('should return false for validatePassword when no password set', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.validatePassword('anyPassword')).toBe(false);
    });

    it('should return false for validatePassword with empty input', () => {
      const user = User.createWithPassword('testuser', 'securePass', UserRole.user());

      expect(user.validatePassword('')).toBe(false);
    });
  });

  describe('hasValidSession()', () => {
    it('should return true for recent activity', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.hasValidSession(30)).toBe(true);
    });

    it('should return false for old activity', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const data = {
        id: 'user_123',
        username: 'testuser',
        apiKey: 'api_key_12345678901234567890',
        role: 'user' as const,
        createdAt: oneHourAgo.toISOString(),
        lastActivity: oneHourAgo.toISOString(),
      };

      const user = User.fromData(data);

      expect(user.hasValidSession(30)).toBe(false);
    });

    it('should use default 30 minute timeout', () => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const data = {
        id: 'user_123',
        username: 'testuser',
        apiKey: 'api_key_12345678901234567890',
        role: 'user' as const,
        createdAt: fifteenMinutesAgo.toISOString(),
        lastActivity: fifteenMinutesAgo.toISOString(),
      };

      const user = User.fromData(data);

      expect(user.hasValidSession()).toBe(true);
    });

    it('should return false when activity exceeds custom timeout', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const data = {
        id: 'user_123',
        username: 'testuser',
        apiKey: 'api_key_12345678901234567890',
        role: 'user' as const,
        createdAt: tenMinutesAgo.toISOString(),
        lastActivity: tenMinutesAgo.toISOString(),
      };

      const user = User.fromData(data);

      expect(user.hasValidSession(5)).toBe(false);
    });
  });

  describe('generateVerificationToken() / verifyEmail()', () => {
    it('should generate a verification token', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      const token = user.generateVerificationToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('should set verification expiry to 48 hours in future', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      user.generateVerificationToken();

      const expiry = user.emailVerificationExpiry!;
      const expectedMin = Date.now() + 47 * 60 * 60 * 1000;
      const expectedMax = Date.now() + 49 * 60 * 60 * 1000;

      expect(expiry.getTime()).toBeGreaterThan(expectedMin);
      expect(expiry.getTime()).toBeLessThan(expectedMax);
    });

    it('should verify email with correct token', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      const token = user.generateVerificationToken();

      expect(user.emailVerified).toBe(false);

      user.verifyEmail(token);

      expect(user.emailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeUndefined();
    });

    it('should throw EmailVerificationError for wrong token', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      user.generateVerificationToken();

      expect(() => user.verifyEmail('wrongtoken')).toThrow(EmailVerificationError);
    });

    it('should throw EmailVerificationError when no token exists', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(() => user.verifyEmail('anytoken')).toThrow(EmailVerificationError);
    });

    it('should throw EmailVerificationError for expired token', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      const token = user.generateVerificationToken();

      // Manually set expiry to past
      const pastDate = new Date(Date.now() - 1000);
      const data = {
        id: user.id,
        username: user.username,
        apiKey: user.apiKey,
        role: user.role.role,
        createdAt: user.createdAt.toISOString(),
        lastActivity: user.lastActivity.toISOString(),
        emailVerificationToken: user.emailVerificationToken,
        emailVerificationExpiry: pastDate.toISOString(),
      };
      const expiredUser = User.fromData(data);

      expect(() => expiredUser.verifyEmail(token)).toThrow(EmailVerificationError);
    });
  });

  describe('generatePasswordResetToken() / resetPasswordWithToken()', () => {
    it('should generate a password reset token', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());
      const token = user.generatePasswordResetToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
    });

    it('should set 15-minute expiry for reset token', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());
      user.generatePasswordResetToken();

      const expiry = user.passwordResetExpiry!;
      const expectedMin = Date.now() + 14 * 60 * 1000;
      const expectedMax = Date.now() + 16 * 60 * 1000;

      expect(expiry.getTime()).toBeGreaterThan(expectedMin);
      expect(expiry.getTime()).toBeLessThan(expectedMax);
    });

    it('should reset password with valid token', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());
      const token = user.generatePasswordResetToken();

      user.resetPasswordWithToken(token, 'newSecurePassword');

      expect(user.validatePassword('newSecurePassword')).toBe(true);
      expect(user.validatePassword('oldPassword')).toBe(false);
      expect(user.passwordResetToken).toBeUndefined();
    });

    it('should throw ValidationError for invalid token', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());
      user.generatePasswordResetToken();

      expect(() => user.resetPasswordWithToken('wrongtoken', 'newPassword')).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when no token exists', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());

      expect(() => user.resetPasswordWithToken('anytoken', 'newPassword')).toThrow(
        ValidationError
      );
    });

    it('should clear requirePasswordChange flag after reset', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());
      user.adminResetPassword('tempPassword', true);
      expect(user.requirePasswordChange).toBe(true);

      const token = user.generatePasswordResetToken();
      user.resetPasswordWithToken(token, 'newUserChosenPassword');

      expect(user.requirePasswordChange).toBe(false);
    });
  });

  describe('changeRole()', () => {
    it('should allow admin to change another user role', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.create('user', 'api_key_09876543210987654321', false);

      user.changeRole('admin', admin);

      expect(user.role.isAdmin()).toBe(true);
    });

    it('should throw PermissionError when non-admin tries to change role', () => {
      const regularUser = User.create('regular', 'api_key_12345678901234567890', false);
      const targetUser = User.create('target', 'api_key_09876543210987654321', false);

      expect(() => targetUser.changeRole('admin', regularUser)).toThrow(PermissionError);
    });

    it('should throw PermissionError when admin tries to change own role', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');

      expect(() => admin.changeRole('user', admin)).toThrow(PermissionError);
    });

    it('should not update if role is unchanged', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.create('user', 'api_key_09876543210987654321', false);
      const originalActivity = user.lastActivity;

      // Wait a tiny bit to ensure timestamp would differ if updated
      user.changeRole('user', admin);

      expect(user.role.isUser()).toBe(true);
    });
  });

  describe('approve() / reject()', () => {
    it('should approve a pending user', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.create('pendinguser', 'api_key_09876543210987654321', false);

      expect(user.isPending()).toBe(true);

      user.approve(admin);

      expect(user.isApproved()).toBe(true);
    });

    it('should reject a pending user', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.create('pendinguser', 'api_key_09876543210987654321', false);

      user.reject(admin);

      expect(user.isRejected()).toBe(true);
    });

    it('should throw PermissionError when non-admin tries to approve', () => {
      const regularUser = User.create('regular', 'api_key_12345678901234567890', false);
      const pendingUser = User.create('pending', 'api_key_09876543210987654321', false);

      expect(() => pendingUser.approve(regularUser)).toThrow(PermissionError);
    });

    it('should throw ValidationError when approving non-pending user', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.createWithPassword(
        'approveduser',
        'password',
        UserRole.user(),
        undefined,
        undefined,
        'approved'
      );

      expect(() => user.approve(admin)).toThrow(ValidationError);
    });

    it('should throw ValidationError when rejecting non-pending user', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.createWithPassword(
        'approveduser',
        'password',
        UserRole.user(),
        undefined,
        undefined,
        'approved'
      );

      expect(() => user.reject(admin)).toThrow(ValidationError);
    });
  });

  describe('hasPermission() / canManage()', () => {
    it('should check permission correctly for admin', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');

      expect(admin.hasPermission('manage_users')).toBe(true);
      expect(admin.hasPermission('admin_settings')).toBe(true);
    });

    it('should check permission correctly for regular user', () => {
      const user = User.create('user', 'api_key_12345678901234567890', false);

      expect(user.hasPermission('create_tubes')).toBe(true);
      expect(user.hasPermission('manage_users')).toBe(false);
    });

    it('should allow admin to manage other users', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const user = User.create('user', 'api_key_09876543210987654321', false);

      expect(admin.canManage(user)).toBe(true);
    });

    it('should not allow admin to manage themselves', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');

      expect(admin.canManage(admin)).toBe(false);
    });

    it('should not allow regular user to manage anyone', () => {
      const user1 = User.create('user1', 'api_key_12345678901234567890', false);
      const user2 = User.create('user2', 'api_key_09876543210987654321', false);

      expect(user1.canManage(user2)).toBe(false);
    });
  });

  describe('getPermissions()', () => {
    it('should return all permissions for role', () => {
      const admin = User.createAdmin('admin', 'api_key_12345678901234567890');
      const permissions = admin.getPermissions();

      expect(permissions).toContain('manage_users');
      expect(permissions).toContain('create_tubes');
    });

    it('should return limited permissions for regular user', () => {
      const user = User.create('user', 'api_key_12345678901234567890', false);
      const permissions = user.getPermissions();

      expect(permissions).toContain('create_tubes');
      expect(permissions).not.toContain('manage_users');
    });
  });

  describe('Edge Cases', () => {
    it('should handle username at max length (100 chars)', () => {
      const longUsername = 'a'.repeat(100);
      const user = User.create(longUsername, 'api_key_12345678901234567890', false);

      expect(user.username).toBe(longUsername);
    });

    it('should throw ValidationError for username exceeding max length', () => {
      const tooLongUsername = 'a'.repeat(101);

      expect(() =>
        User.create(tooLongUsername, 'api_key_12345678901234567890', false)
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for API key exceeding max length', () => {
      const tooLongApiKey = 'a'.repeat(501);

      expect(() => User.create('testuser', tooLongApiKey, false)).toThrow(ValidationError);
    });

    it('should return immutable date copies', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      const createdAt1 = user.createdAt;
      const createdAt2 = user.createdAt;

      expect(createdAt1).not.toBe(createdAt2);
      expect(createdAt1.getTime()).toBe(createdAt2.getTime());
    });

    it('should check equality by ID', () => {
      const user1 = User.create('user1', 'api_key_12345678901234567890', false);
      const user2 = User.create('user2', 'api_key_09876543210987654321', false);

      const user1Reconstituted = User.fromData({
        id: user1.id,
        username: 'differentname',
        apiKey: 'different_api_key_12345678901234567890',
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      });

      expect(user1.equals(user1Reconstituted)).toBe(true);
      expect(user1.equals(user2)).toBe(false);
    });

    it('should return false for equals with null/undefined', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.equals(null as unknown as User)).toBe(false);
      expect(user.equals(undefined as unknown as User)).toBe(false);
    });

    it('should have consistent toString representation', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.toString()).toBe('User(testuser) - user');
    });
  });

  describe('updateSettings()', () => {
    it('should return new User instance with updated settings', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      const newSettings = {
        defaultPositionDisplay: { format: 'alphanumeric' as const },
        theme: 'dark' as const,
      };

      const updatedUser = user.updateSettings(newSettings);

      expect(updatedUser).not.toBe(user);
      expect(updatedUser.settings).toEqual(newSettings);
      expect(updatedUser.id).toBe(user.id);
    });

    it('should preserve password data after settings update', () => {
      const user = User.createWithPassword('testuser', 'myPassword', UserRole.user());
      const updatedUser = user.updateSettings({ theme: 'light' });

      expect(updatedUser.validatePassword('myPassword')).toBe(true);
    });
  });

  describe('adminResetPassword()', () => {
    it('should set new password and mark for change by default', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());

      user.adminResetPassword('newTempPassword');

      expect(user.validatePassword('newTempPassword')).toBe(true);
      expect(user.requirePasswordChange).toBe(true);
    });

    it('should allow skipping password change requirement', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());

      user.adminResetPassword('newPassword', false);

      expect(user.validatePassword('newPassword')).toBe(true);
      expect(user.requirePasswordChange).toBe(false);
    });

    it('should clear existing reset token', () => {
      const user = User.createWithPassword('testuser', 'oldPassword', UserRole.user());
      user.generatePasswordResetToken();
      expect(user.passwordResetToken).toBeDefined();

      user.adminResetPassword('newPassword');

      expect(user.passwordResetToken).toBeUndefined();
    });
  });

  describe('canResendVerification()', () => {
    it('should allow resend when no previous email sent', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.canResendVerification()).toBe(true);
    });

    it('should block resend within 5 minutes of last email', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);
      user.generateVerificationToken();

      expect(user.canResendVerification()).toBe(false);
    });
  });

  describe('hasResearcherProfile()', () => {
    it('should return true when researcher linked', () => {
      const user = User.createAdmin('admin', 'api_key_12345678901234567890', 'researcher_123');

      expect(user.hasResearcherProfile()).toBe(true);
    });

    it('should return false when no researcher linked', () => {
      const user = User.create('testuser', 'api_key_12345678901234567890', false);

      expect(user.hasResearcherProfile()).toBe(false);
    });
  });

  describe('unlinkResearcher()', () => {
    it('should remove researcher link', () => {
      const user = User.createAdmin('admin', 'api_key_12345678901234567890', 'researcher_123');
      expect(user.hasResearcherProfile()).toBe(true);

      user.unlinkResearcher();

      expect(user.hasResearcherProfile()).toBe(false);
      expect(user.researcherId).toBeUndefined();
    });
  });
});
