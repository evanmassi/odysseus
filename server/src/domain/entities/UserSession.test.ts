/**
 * User Session Entity Tests
 *
 * Validates creation, validation invariants, expiry, and fromData reconstruction.
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

  describe('isExpired', () => {
    it('should not be expired when before expiresAt', () => {
      const session = createTestSession();
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
    });
  });

  describe('fromData roundtrip', () => {
    it('should preserve all fields', () => {
      const original = createTestSession({
        deviceInfo: 'Chrome',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      const restored = UserSession.fromData({
        id: original.id,
        userId: original.userId,
        refreshToken: original.refreshToken,
        createdAt: original.createdAt,
        lastUsedAt: original.lastUsedAt,
        expiresAt: original.expiresAt,
        isActive: original.isActive,
        deviceInfo: original.deviceInfo,
        ipAddress: original.ipAddress,
        userAgent: original.userAgent,
      });

      expect(restored.id).toBe(original.id);
      expect(restored.userId).toBe(original.userId);
      expect(restored.deviceInfo).toBe('Chrome');
      expect(restored.ipAddress).toBe('10.0.0.1');
      expect(restored.isActive).toBe(true);
    });

    it('should preserve inactive state', () => {
      const session = createTestSession();
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
