/**
 * User Session Entity Tests
 *
 * Validates creation, validation invariants, expiry, revocation, and serialization.
 */

import { UserSession } from './UserSession';

function createTestSession(overrides: {
  userId?: string;
  refreshToken?: string;
  expiresAt?: Date;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
} = {}): UserSession {
  return UserSession.create(
    overrides.userId ?? 'user_1',
    overrides.refreshToken ?? 'token_abc123',
    overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
    overrides.deviceInfo,
    overrides.ipAddress,
    overrides.userAgent
  );
}

describe('UserSession', () => {
  describe('create', () => {
    it('should create a session with default values', () => {
      const session = createTestSession();
      expect(session.id).toMatch(/^session_/);
      expect(session.userId).toBe('user_1');
      expect(session.refreshToken).toBe('token_abc123');
      expect(session.isActive).toBe(true);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should accept optional device metadata', () => {
      const session = createTestSession({
        deviceInfo: 'Chrome on Windows',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(session.deviceInfo).toBe('Chrome on Windows');
      expect(session.ipAddress).toBe('192.168.1.1');
      expect(session.userAgent).toBe('Mozilla/5.0');
    });

    it('should leave device metadata undefined when not provided', () => {
      const session = createTestSession();
      expect(session.deviceInfo).toBeUndefined();
      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should throw for empty userId', () => {
      expect(() => createTestSession({ userId: '' })).toThrow('Session must belong to a user');
    });

    it('should throw for empty refreshToken', () => {
      expect(() => createTestSession({ refreshToken: '' })).toThrow('Session must have a refresh token');
    });

    it('should throw when expiresAt is before creation time', () => {
      expect(() => createTestSession({
        expiresAt: new Date(Date.now() - 60 * 1000),
      })).toThrow('Session expiry must be after creation time');
    });

    it('should throw when lastUsedAt is before createdAt via fromData', () => {
      const now = new Date();
      expect(() => UserSession.fromData({
        id: 'session_1',
        userId: 'user_1',
        refreshToken: 'token_abc',
        createdAt: now,
        lastUsedAt: new Date(now.getTime() - 60 * 1000),
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        isActive: true,
      })).toThrow('Session last used cannot be before creation time');
    });
  });

  describe('isValid / isExpired', () => {
    it('should be valid when active and not expired', () => {
      const session = createTestSession();
      expect(session.isValid()).toBe(true);
      expect(session.isExpired()).toBe(false);
    });

    it('should be invalid when revoked', () => {
      const session = createTestSession();
      session.revoke();
      expect(session.isValid()).toBe(false);
      expect(session.isExpired()).toBe(false);
    });

    it('should be expired when past expiresAt', () => {
      const session = UserSession.fromData({
        id: 'session_1',
        userId: 'user_1',
        refreshToken: 'token_abc',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastUsedAt: new Date(Date.now() - 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1000),
        isActive: true,
      });
      expect(session.isExpired()).toBe(true);
      expect(session.isValid()).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should mark session as inactive', () => {
      const session = createTestSession();
      expect(session.isActive).toBe(true);
      session.revoke();
      expect(session.isActive).toBe(false);
    });
  });

  describe('recordActivity', () => {
    it('should update lastUsedAt', () => {
      const session = createTestSession();
      const before = session.lastUsedAt;
      session.recordActivity();
      expect(session.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('time calculations', () => {
    it('should calculate age in minutes', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const session = UserSession.fromData({
        id: 'session_1',
        userId: 'user_1',
        refreshToken: 'token_abc',
        createdAt: tenMinutesAgo,
        lastUsedAt: tenMinutesAgo,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      });
      expect(session.getAgeInMinutes()).toBeGreaterThanOrEqual(10);
      expect(session.getAgeInMinutes()).toBeLessThanOrEqual(11);
    });

    it('should calculate inactive minutes', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const session = UserSession.fromData({
        id: 'session_1',
        userId: 'user_1',
        refreshToken: 'token_abc',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
        lastUsedAt: fiveMinutesAgo,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      });
      expect(session.getInactiveMinutes()).toBeGreaterThanOrEqual(5);
      expect(session.getInactiveMinutes()).toBeLessThanOrEqual(6);
    });

    it('should calculate minutes until expiration', () => {
      const session = createTestSession({
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      expect(session.getMinutesUntilExpiration()).toBeGreaterThanOrEqual(29);
      expect(session.getMinutesUntilExpiration()).toBeLessThanOrEqual(30);
    });

    it('should return negative minutes when already expired', () => {
      const session = UserSession.fromData({
        id: 'session_1',
        userId: 'user_1',
        refreshToken: 'token_abc',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastUsedAt: new Date(Date.now() - 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
        isActive: true,
      });
      expect(session.getMinutesUntilExpiration()).toBeLessThan(0);
    });
  });

  describe('fromData roundtrip', () => {
    it('should preserve all fields', () => {
      const original = createTestSession({
        deviceInfo: 'Chrome',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      const json = original.toJSON();
      const restored = UserSession.fromData({
        id: json.id,
        userId: json.userId,
        refreshToken: original.refreshToken,
        createdAt: new Date(json.createdAt),
        lastUsedAt: new Date(json.lastUsedAt),
        expiresAt: new Date(json.expiresAt),
        isActive: json.isActive,
        deviceInfo: json.deviceInfo,
        ipAddress: json.ipAddress,
        userAgent: json.userAgent,
      });

      expect(restored.id).toBe(original.id);
      expect(restored.userId).toBe(original.userId);
      expect(restored.deviceInfo).toBe('Chrome');
      expect(restored.ipAddress).toBe('10.0.0.1');
      expect(restored.isActive).toBe(true);
    });

    it('should preserve revoked state', () => {
      const session = createTestSession();
      session.revoke();
      const restored = UserSession.fromData({
        id: session.id,
        userId: session.userId,
        refreshToken: session.refreshToken,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        isActive: false,
      });
      expect(restored.isActive).toBe(false);
      expect(restored.isValid()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should not expose refreshToken', () => {
      const session = createTestSession();
      const json = session.toJSON();
      expect((json as any).refreshToken).toBeUndefined();
    });

    it('should include all expected fields', () => {
      const session = createTestSession({
        deviceInfo: 'Firefox',
        ipAddress: '127.0.0.1',
        userAgent: 'Gecko/20100101',
      });
      const json = session.toJSON();
      expect(json.id).toBe(session.id);
      expect(json.userId).toBe('user_1');
      expect(json.isActive).toBe(true);
      expect(json.isExpired).toBe(false);
      expect(json.deviceInfo).toBe('Firefox');
      expect(json.ipAddress).toBe('127.0.0.1');
      expect(json.userAgent).toBe('Gecko/20100101');
      expect(typeof json.createdAt).toBe('string');
      expect(typeof json.lastUsedAt).toBe('string');
      expect(typeof json.expiresAt).toBe('string');
    });
  });

  describe('date immutability', () => {
    it('should return copies of dates', () => {
      const session = createTestSession();
      const d1 = session.createdAt;
      const d2 = session.createdAt;
      expect(d1).not.toBe(d2);
      expect(d1.getTime()).toBe(d2.getTime());
    });
  });
});
