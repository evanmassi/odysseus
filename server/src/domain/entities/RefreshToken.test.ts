/**
 * Refresh Token Entity Tests
 */

import { RefreshToken } from './RefreshToken';

describe('RefreshToken', () => {
  describe('create', () => {
    it('should create with generated id and secure token', () => {
      const token = RefreshToken.create('user_123');
      expect(token.id).toMatch(/^refresh_/);
      expect(token.userId).toBe('user_123');
      expect(token.token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token.isRevoked).toBe(false);
      expect(token.lastUsedAt).toBeNull();
    });

    it('should default to 7-day expiration', () => {
      const token = RefreshToken.create('user_123');
      const expectedMs = 7 * 24 * 60 * 60 * 1000;
      const actualMs = token.expiresAt.getTime() - token.createdAt.getTime();
      expect(actualMs).toBeCloseTo(expectedMs, -2);
    });

    it('should accept custom expiration days', () => {
      const token = RefreshToken.create('user_123', 30);
      const expectedMs = 30 * 24 * 60 * 60 * 1000;
      const actualMs = token.expiresAt.getTime() - token.createdAt.getTime();
      expect(actualMs).toBeCloseTo(expectedMs, -2);
    });

    it('should accept optional userAgent and ipAddress', () => {
      const token = RefreshToken.create('user_123', 7, 'Mozilla/5.0', '192.168.1.1');
      expect(token.userAgent).toBe('Mozilla/5.0');
      expect(token.ipAddress).toBe('192.168.1.1');
    });

    it('should generate unique tokens', () => {
      const a = RefreshToken.create('user_123');
      const b = RefreshToken.create('user_123');
      expect(a.token).not.toBe(b.token);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('validation', () => {
    it('should throw for empty id', () => {
      expect(() => RefreshToken.fromData({
        id: '',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      })).toThrow('RefreshToken ID cannot be empty');
    });

    it('should throw for empty userId', () => {
      expect(() => RefreshToken.fromData({
        id: 'refresh_test',
        userId: '',
        token: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      })).toThrow('RefreshToken must belong to a user');
    });

    it('should throw for token shorter than 32 characters', () => {
      expect(() => RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'short',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      })).toThrow('RefreshToken must be a secure token (minimum 32 characters)');
    });

    it('should throw when expiresAt is before createdAt', () => {
      const now = new Date();
      expect(() => RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() - 1000),
        createdAt: now,
      })).toThrow('RefreshToken expiry must be after creation time');
    });

    it('should throw when lastUsedAt is before createdAt', () => {
      const now = new Date();
      expect(() => RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() + 86400000),
        createdAt: now,
        lastUsedAt: new Date(now.getTime() - 1000),
      })).toThrow('RefreshToken last used cannot be before creation time');
    });
  });

  describe('isValid', () => {
    it('should return true for fresh token', () => {
      const token = RefreshToken.create('user_123');
      expect(token.isValid()).toBe(true);
    });

    it('should return false when revoked', () => {
      const token = RefreshToken.create('user_123');
      token.revoke();
      expect(token.isValid()).toBe(false);
    });

    it('should return false when expired', () => {
      const now = new Date();
      const token = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() - 1000),
        createdAt: new Date(now.getTime() - 86400000),
      });
      expect(token.isValid()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false for future expiry', () => {
      const token = RefreshToken.create('user_123');
      expect(token.isExpired()).toBe(false);
    });

    it('should return true for past expiry', () => {
      const now = new Date();
      const token = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() - 1),
        createdAt: new Date(now.getTime() - 86400000),
      });
      expect(token.isExpired()).toBe(true);
    });
  });

  describe('isRecentlyUsed', () => {
    it('should return false when never used', () => {
      const token = RefreshToken.create('user_123');
      expect(token.isRecentlyUsed()).toBe(false);
    });

    it('should return true immediately after usage', () => {
      const token = RefreshToken.create('user_123');
      token.recordUsage();
      expect(token.isRecentlyUsed()).toBe(true);
    });

    it('should return false when lastUsedAt is older than 5 minutes', () => {
      const now = new Date();
      const token = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() + 86400000),
        createdAt: new Date(now.getTime() - 86400000),
        lastUsedAt: new Date(now.getTime() - 6 * 60 * 1000),
      });
      expect(token.isRecentlyUsed()).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('should update lastUsedAt', () => {
      const token = RefreshToken.create('user_123');
      expect(token.lastUsedAt).toBeNull();
      token.recordUsage();
      expect(token.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should throw on revoked token', () => {
      const token = RefreshToken.create('user_123');
      token.revoke();
      expect(() => token.recordUsage()).toThrow('Cannot record usage on invalid refresh token');
    });

    it('should throw on expired token', () => {
      const now = new Date();
      const token = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() - 1),
        createdAt: new Date(now.getTime() - 86400000),
      });
      expect(() => token.recordUsage()).toThrow('Cannot record usage on invalid refresh token');
    });
  });

  describe('revoke', () => {
    it('should set isRevoked to true', () => {
      const token = RefreshToken.create('user_123');
      expect(token.isRevoked).toBe(false);
      token.revoke();
      expect(token.isRevoked).toBe(true);
    });
  });

  describe('isNearingExpiry', () => {
    it('should return false for token with many days left', () => {
      const token = RefreshToken.create('user_123', 30);
      expect(token.isNearingExpiry()).toBe(false);
    });

    it('should return true for token expiring within 24 hours', () => {
      const now = new Date();
      const token = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours
        createdAt: new Date(now.getTime() - 86400000),
      });
      expect(token.isNearingExpiry()).toBe(true);
    });
  });

  describe('timeUntilExpiry / daysUntilExpiry', () => {
    it('should return positive values for valid token', () => {
      const token = RefreshToken.create('user_123', 7);
      expect(token.timeUntilExpiry).toBeGreaterThan(0);
      expect(token.daysUntilExpiry).toBeGreaterThanOrEqual(6);
    });

    it('should return 0 for expired token', () => {
      const now = new Date();
      const token = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(now.getTime() - 1000),
        createdAt: new Date(now.getTime() - 86400000),
      });
      expect(token.timeUntilExpiry).toBe(0);
      expect(token.daysUntilExpiry).toBe(0);
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should preserve all fields through roundtrip', () => {
      const original = RefreshToken.create('user_123', 7, 'Mozilla/5.0', '10.0.0.1');
      original.recordUsage();
      const data = original.toData();
      const restored = RefreshToken.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.userId).toBe('user_123');
      expect(restored.token).toBe(original.token);
      expect(restored.expiresAt.getTime()).toBe(original.expiresAt.getTime());
      expect(restored.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(restored.lastUsedAt!.getTime()).toBe(original.lastUsedAt!.getTime());
      expect(restored.isRevoked).toBe(false);
      expect(restored.userAgent).toBe('Mozilla/5.0');
      expect(restored.ipAddress).toBe('10.0.0.1');
    });

    it('should default lastUsedAt to null via ?? operator', () => {
      const restored = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });
      expect(restored.lastUsedAt).toBeNull();
    });

    it('should default isRevoked to false', () => {
      const restored = RefreshToken.fromData({
        id: 'refresh_test',
        userId: 'user_123',
        token: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });
      expect(restored.isRevoked).toBe(false);
    });
  });

  describe('toSecureData', () => {
    it('should omit the token value', () => {
      const token = RefreshToken.create('user_123');
      const secure = token.toSecureData();
      expect(secure).not.toHaveProperty('token');
      expect(secure.id).toBe(token.id);
      expect(secure.userId).toBe('user_123');
      expect(secure.isValid).toBe(true);
      expect(secure.daysUntilExpiry).toBeGreaterThanOrEqual(6);
    });
  });

  describe('equals', () => {
    it('should return true for same id and token', () => {
      const token = RefreshToken.create('user_123');
      const data = token.toData();
      const same = RefreshToken.fromData(data);
      expect(token.equals(same)).toBe(true);
    });

    it('should return false for different tokens', () => {
      const a = RefreshToken.create('user_123');
      const b = RefreshToken.create('user_123');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('date immutability', () => {
    it('should return copies of expiresAt', () => {
      const token = RefreshToken.create('user_123');
      const date1 = token.expiresAt;
      const date2 = token.expiresAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should return copies of createdAt', () => {
      const token = RefreshToken.create('user_123');
      const date1 = token.createdAt;
      const date2 = token.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should return copies of lastUsedAt', () => {
      const token = RefreshToken.create('user_123');
      token.recordUsage();
      const date1 = token.lastUsedAt;
      const date2 = token.lastUsedAt;
      expect(date1).not.toBe(date2);
      expect(date1!.getTime()).toBe(date2!.getTime());
    });
  });

  describe('toString', () => {
    it('should include id, userId, validity, and expiry', () => {
      const token = RefreshToken.create('user_123');
      const str = token.toString();
      expect(str).toContain('RefreshToken(');
      expect(str).toContain(token.id);
      expect(str).toContain('user_123');
      expect(str).toContain('valid=true');
    });
  });
});
