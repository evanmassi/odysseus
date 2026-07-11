/**
 * Invite Code Entity Tests
 */

import { InviteCode } from './InviteCode';

describe('InviteCode', () => {
  describe('create', () => {
    it('should generate a code in ODYSS-XXXX-XXXX format', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      expect(code.code).toMatch(/^ODYSS-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set(
        Array.from({ length: 20 }, () => InviteCode.create('lab_1', 'user_admin').code)
      );
      expect(codes.size).toBe(20);
    });

    it('should set defaults correctly', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      expect(code.id).toMatch(/^invite_/);
      expect(code.labId).toBe('lab_1');
      expect(code.createdBy).toBe('user_admin');
      expect(code.role).toBe('user');
      expect(code.createResearcher).toBe(false);
      expect(code.useCount).toBe(0);
      expect(code.isActive).toBe(true);
      expect(code.maxUses).toBeUndefined();
      expect(code.expiresAt).toBeUndefined();
    });

    it('should accept lab_admin role', () => {
      const code = InviteCode.create('lab_1', 'user_admin', 'lab_admin');
      expect(code.role).toBe('lab_admin');
    });

    it('should accept maxUses', () => {
      const code = InviteCode.create('lab_1', 'user_admin', 'user', false, 5);
      expect(code.maxUses).toBe(5);
    });

    it('should accept expiresAt', () => {
      const future = new Date(Date.now() + 86400000);
      const code = InviteCode.create('lab_1', 'user_admin', 'user', false, undefined, future);
      expect(code.expiresAt!.getTime()).toBe(future.getTime());
    });

    it('should throw for empty labId', () => {
      expect(() => InviteCode.create('', 'user_admin')).toThrow();
    });

    it('should throw for empty createdBy', () => {
      expect(() => InviteCode.create('lab_1', '')).toThrow();
    });

    it('should throw for maxUses less than 1', () => {
      expect(() => InviteCode.create('lab_1', 'user_admin', 'user', false, 0)).toThrow('Max uses must be at least 1');
    });
  });

  describe('isValid', () => {
    it('should return true for fresh code', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      expect(code.isValid()).toBe(true);
    });

    it('should return false when deactivated', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      code.deactivate();
      expect(code.isValid()).toBe(false);
    });

    it('should return false when max uses reached', () => {
      const code = InviteCode.create('lab_1', 'user_admin', 'user', false, 1);
      code.recordUse();
      expect(code.isValid()).toBe(false);
    });

    it('should return false when expired', () => {
      const past = new Date(Date.now() - 1000);
      const code = InviteCode.create('lab_1', 'user_admin', 'user', false, undefined, past);
      expect(code.isValid()).toBe(false);
    });

    it('should return true when within use limit', () => {
      const code = InviteCode.create('lab_1', 'user_admin', 'user', false, 3);
      code.recordUse();
      code.recordUse();
      expect(code.isValid()).toBe(true);
    });
  });

  describe('recordUse', () => {
    it('should increment useCount', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      expect(code.useCount).toBe(0);
      code.recordUse();
      expect(code.useCount).toBe(1);
      code.recordUse();
      expect(code.useCount).toBe(2);
    });

    it('should throw when code is no longer valid', () => {
      const code = InviteCode.create('lab_1', 'user_admin', 'user', false, 1);
      code.recordUse();
      expect(() => code.recordUse()).toThrow('Invite code is no longer valid');
    });

    it('should throw when deactivated', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      code.deactivate();
      expect(() => code.recordUse()).toThrow('Invite code is no longer valid');
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', () => {
      const code = InviteCode.create('lab_1', 'user_admin');
      code.deactivate();
      expect(code.isActive).toBe(false);
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should preserve all fields through roundtrip', () => {
      const original = InviteCode.create('lab_1', 'user_admin', 'lab_admin', false, 10);
      original.recordUse();
      const data = original.toData();
      const restored = InviteCode.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.labId).toBe(original.labId);
      expect(restored.code).toBe(original.code);
      expect(restored.role).toBe(original.role);
      expect(restored.createdBy).toBe(original.createdBy);
      expect(restored.maxUses).toBe(original.maxUses);
      expect(restored.useCount).toBe(1);
      expect(restored.isActive).toBe(true);
    });

    it('should handle expiresAt in roundtrip', () => {
      const future = new Date(Date.now() + 86400000);
      const original = InviteCode.create('lab_1', 'user_admin', 'user', false, undefined, future);
      const data = original.toData();
      const restored = InviteCode.fromData(data);

      expect(restored.expiresAt!.getTime()).toBe(future.getTime());
    });

    it('should handle undefined expiresAt', () => {
      const original = InviteCode.create('lab_1', 'user_admin');
      const data = original.toData();
      expect(data.expiresAt).toBeUndefined();
      const restored = InviteCode.fromData(data);
      expect(restored.expiresAt).toBeUndefined();
    });
  });
});
