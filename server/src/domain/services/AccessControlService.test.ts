/**
 * Access Control Service Tests
 */

import { AccessControlService } from './AccessControlService';
import { PermissionError } from '@domain/errors/PermissionError';
import { createTestUser, createTestAdmin, createTestSystemAdmin, createTestTube } from '@domain/__tests__/helpers';

const mockTubeRepository = {
  findById: jest.fn(),
  countByTank: jest.fn(),
} as any;

function createService() {
  return new AccessControlService(mockTubeRepository);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AccessControlService', () => {
  describe('canCreateTube', () => {
    it('should allow admin without researcher profile', async () => {
      const admin = createTestAdmin();
      const result = await createService().canCreateTube(admin);
      expect(result.allowed).toBe(true);
    });

    it('should allow user with researcher profile', async () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const result = await createService().canCreateTube(user);
      expect(result.allowed).toBe(true);
    });

    it('should deny user without researcher profile', async () => {
      const user = createTestUser();
      const result = await createService().canCreateTube(user);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Researcher profile required');
    });
  });

  describe('canEditTube', () => {
    it('should allow admin to edit any tube', async () => {
      const admin = createTestAdmin();
      const tube = createTestTube({ researcherId: 'res_other' });
      const result = await createService().canEditTube(admin, tube);
      expect(result.allowed).toBe(true);
    });

    it('should allow owner to edit their tube', async () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube({ researcherId: 'res_1' });
      const result = await createService().canEditTube(user, tube);
      expect(result.allowed).toBe(true);
    });

    it('should allow editing unassigned tubes', async () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube();
      const result = await createService().canEditTube(user, tube);
      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner from editing assigned tube', async () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube({ researcherId: 'res_other' });
      const result = await createService().canEditTube(user, tube);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canDeleteTube', () => {
    it('should allow admin to delete any tube', async () => {
      const admin = createTestAdmin();
      const tube = createTestTube({ researcherId: 'res_other' });
      const result = await createService().canDeleteTube(admin, tube);
      expect(result.allowed).toBe(true);
    });

    it('should allow owner to delete recent tube', async () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube({ researcherId: 'res_1' });
      const result = await createService().canDeleteTube(user, tube);
      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner from deleting assigned tube', async () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube({ researcherId: 'res_other' });
      const result = await createService().canDeleteTube(user, tube);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canLockTube', () => {
    it('should deny locking already-locked tube', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const locked = createTestTube().lock('user_other');
      const result = createService().canLockTube(user, locked);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already locked');
    });

    it('should allow admin to lock any tube', () => {
      const admin = createTestAdmin();
      const tube = createTestTube();
      const result = createService().canLockTube(admin, tube);
      expect(result.allowed).toBe(true);
    });

    it('should deny user without researcher profile', () => {
      const user = createTestUser();
      const tube = createTestTube();
      const result = createService().canLockTube(user, tube);
      expect(result.allowed).toBe(false);
    });

    it('should allow user in common space', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube();
      const result = createService().canLockTube(user, tube);
      expect(result.allowed).toBe(true);
    });

    it('should allow box owner to lock', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube();
      const result = createService().canLockTube(user, tube, {
        box: { assignedUserId: user.id },
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny locking in another users box', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube();
      const result = createService().canLockTube(user, tube, {
        box: { assignedUserId: 'other_user' },
      });
      expect(result.allowed).toBe(false);
    });

    it('should check rack when box has no assignment', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const tube = createTestTube();
      const result = createService().canLockTube(user, tube, {
        rack: { assignedUserId: user.id },
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('canUnlockTube', () => {
    it('should deny unlocking non-locked tube', () => {
      const user = createTestUser();
      const tube = createTestTube();
      const result = createService().canUnlockTube(user, tube);
      expect(result.allowed).toBe(false);
    });

    it('should allow admin to unlock any tube', () => {
      const admin = createTestAdmin();
      const locked = createTestTube().lock('user_other');
      const result = createService().canUnlockTube(admin, locked);
      expect(result.allowed).toBe(true);
    });

    it('should allow lock owner to unlock', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const locked = createTestTube().lock(user.id);
      const result = createService().canUnlockTube(user, locked);
      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner from unlocking', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const locked = createTestTube().lock('other_user');
      const result = createService().canUnlockTube(user, locked);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canAccessLockedTube', () => {
    it('should allow access to unlocked tube', () => {
      const user = createTestUser();
      const tube = createTestTube();
      const result = createService().canAccessLockedTube(user, tube);
      expect(result.allowed).toBe(true);
    });

    it('should allow admin to access locked tube', () => {
      const admin = createTestAdmin();
      const locked = createTestTube().lock('user_other');
      const result = createService().canAccessLockedTube(admin, locked);
      expect(result.allowed).toBe(true);
    });

    it('should allow lock owner access', () => {
      const user = createTestUser();
      const locked = createTestTube().lock(user.id);
      const result = createService().canAccessLockedTube(user, locked);
      expect(result.allowed).toBe(true);
    });

    it('should allow shared user access', () => {
      const user = createTestUser();
      const locked = createTestTube().lock('other_user');
      const shared = locked.shareWith([user.id]);
      const result = createService().canAccessLockedTube(user, shared);
      expect(result.allowed).toBe(true);
    });

    it('should deny unrelated user', () => {
      const user = createTestUser();
      const locked = createTestTube().lock('other_user');
      const result = createService().canAccessLockedTube(user, locked);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canShareTubeAccess', () => {
    it('should deny sharing unlocked tube', () => {
      const user = createTestUser();
      const tube = createTestTube();
      const result = createService().canShareTubeAccess(user, tube);
      expect(result.allowed).toBe(false);
    });

    it('should allow admin to share any locked tube', () => {
      const admin = createTestAdmin();
      const locked = createTestTube().lock('other_user');
      const result = createService().canShareTubeAccess(admin, locked);
      expect(result.allowed).toBe(true);
    });

    it('should allow lock owner to share', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const locked = createTestTube().lock(user.id);
      const result = createService().canShareTubeAccess(user, locked);
      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner from sharing', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const locked = createTestTube().lock('other_user');
      const result = createService().canShareTubeAccess(user, locked);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canManageResearchers', () => {
    it('should allow admin', async () => {
      const admin = createTestAdmin();
      const result = await createService().canManageResearchers(admin);
      expect(result.allowed).toBe(true);
    });

    it('should deny regular user', async () => {
      const user = createTestUser();
      const result = await createService().canManageResearchers(user);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('should allow admin', async () => {
      const admin = createTestAdmin();
      const result = await createService().canManageUsers(admin);
      expect(result.allowed).toBe(true);
    });

    it('should deny regular user', async () => {
      const user = createTestUser();
      const result = await createService().canManageUsers(user);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canModifyStorage', () => {
    it('should allow admin', async () => {
      const admin = createTestAdmin();
      const result = await createService().canModifyStorage(admin);
      expect(result.allowed).toBe(true);
    });

    it('should deny regular user', async () => {
      const user = createTestUser();
      const result = await createService().canModifyStorage(user);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canAccessContainer', () => {
    it('should allow admin to access any container', () => {
      const admin = createTestAdmin();
      const result = createService().canAccessContainer(admin, {
        box: { assignedUserId: 'other_user' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny user without researcher profile', () => {
      const user = createTestUser();
      const result = createService().canAccessContainer(user, {});
      expect(result.allowed).toBe(false);
    });

    it('should allow box owner', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const result = createService().canAccessContainer(user, {
        box: { assignedUserId: user.id },
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny access to another users box', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const result = createService().canAccessContainer(user, {
        box: { assignedUserId: 'other_user' },
      });
      expect(result.allowed).toBe(false);
    });

    it('should allow common space (null box assignment)', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const result = createService().canAccessContainer(user, {
        box: { assignedUserId: null },
      });
      expect(result.allowed).toBe(true);
    });

    it('should inherit rack assignment when box is undefined', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const result = createService().canAccessContainer(user, {
        rack: { assignedUserId: user.id },
      });
      expect(result.allowed).toBe(true);
    });

    it('should allow common space when no assignments', () => {
      const user = createTestUser({ researcherId: 'res_1' });
      const result = createService().canAccessContainer(user, {});
      expect(result.allowed).toBe(true);
    });
  });

  describe('canEditResource', () => {
    it('should allow admin to edit any resource', () => {
      const admin = createTestAdmin();
      expect(createService().canEditResource(admin, { assignedUserId: 'other' })).toBe(true);
    });

    it('should allow editing null-assigned (common) resource', () => {
      const user = createTestUser();
      expect(createService().canEditResource(user, { assignedUserId: null })).toBe(true);
    });

    it('should allow assigned user to edit', () => {
      const user = createTestUser();
      expect(createService().canEditResource(user, { assignedUserId: user.id })).toBe(true);
    });

    it('should deny non-assigned user', () => {
      const user = createTestUser();
      expect(createService().canEditResource(user, { assignedUserId: 'other' })).toBe(false);
    });

    it('should cascade to rack ownership for boxes with undefined assignment', () => {
      const user = createTestUser();
      const box = { assignedUserId: undefined };
      const rack = { assignedUserId: user.id };
      expect(createService().canEditResource(user, box, rack)).toBe(true);
    });
  });

  describe('require methods', () => {
    describe('requireTubeAccess', () => {
      it('should not throw when allowed', async () => {
        const admin = createTestAdmin();
        const tube = createTestTube();
        await expect(
          createService().requireTubeAccess(admin, tube, 'edit')
        ).resolves.not.toThrow();
      });

      it('should throw PermissionError when denied', async () => {
        const user = createTestUser({ researcherId: 'res_1' });
        const tube = createTestTube({ researcherId: 'res_other' });
        await expect(
          createService().requireTubeAccess(user, tube, 'edit')
        ).rejects.toThrow(PermissionError);
      });
    });

    describe('requireAdminAccess', () => {
      it('should not throw for admin', async () => {
        const admin = createTestAdmin();
        await expect(createService().requireAdminAccess(admin)).resolves.not.toThrow();
      });

      it('should throw for regular user', async () => {
        const user = createTestUser();
        await expect(createService().requireAdminAccess(user)).rejects.toThrow(PermissionError);
      });
    });

    describe('requireCanCreateTube', () => {
      it('should not throw for admin', async () => {
        const admin = createTestAdmin();
        await expect(createService().requireCanCreateTube(admin)).resolves.not.toThrow();
      });

      it('should throw for user without researcher profile', async () => {
        const user = createTestUser();
        await expect(createService().requireCanCreateTube(user)).rejects.toThrow(PermissionError);
      });

      it('should not throw for user with researcher profile', async () => {
        const user = createTestUser({ researcherId: 'res_1' });
        await expect(createService().requireCanCreateTube(user)).resolves.not.toThrow();
      });
    });

    describe('requireCanManageUsers', () => {
      it('should not throw for admin', async () => {
        const admin = createTestAdmin();
        await expect(createService().requireCanManageUsers(admin)).resolves.not.toThrow();
      });

      it('should throw for regular user', async () => {
        const user = createTestUser();
        await expect(createService().requireCanManageUsers(user)).rejects.toThrow(PermissionError);
      });
    });
  });
});
