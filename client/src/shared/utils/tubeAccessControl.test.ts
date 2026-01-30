/**
 * Tube Access Control Tests
 *
 * Tests client-side access control checks for tube modification operations.
 */

import { describe, it, expect } from 'vitest';

import {
  canModifyTube,
  canModifyAllTubes,
  getBlockedModificationMessage,
} from './tubeAccessControl';

import type { TubeData } from '@odysseus/shared-schemas';

describe('tubeAccessControl', () => {
  const createMockTube = (overrides: Partial<TubeData> = {}): TubeData => ({
    id: 'tube_123',
    location: {
      tankId: 'tank-1',
      rackId: '1',
      boxId: 'A',
      position: 1,
    },
    sample: {
      cellType: 'HeLa',
    },
    timestamps: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    version: 1,
    ...overrides,
  });

  describe('canModifyTube()', () => {
    describe('Unlocked Tubes', () => {
      it('should allow modification when unlocked and user has container access', () => {
        const tube = createMockTube({ isLocked: false });

        const result = canModifyTube(tube, 'user_123', false);

        expect(result).toBe(true);
      });

      it('should deny modification when unlocked but view-only space', () => {
        const tube = createMockTube({ isLocked: false });

        const result = canModifyTube(tube, 'user_123', true);

        expect(result).toBe(false);
      });

      it('should allow modification in view-only space if user has shared access', () => {
        const tube = createMockTube({
          isLocked: false,
          sharedWithUserIds: ['user_123'],
        });

        const result = canModifyTube(tube, 'user_123', true);

        expect(result).toBe(true);
      });
    });

    describe('Locked Tubes - Lock Owner', () => {
      it('should allow modification by lock owner', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
        });

        const result = canModifyTube(tube, 'user_owner', false);

        expect(result).toBe(true);
      });

      it('should allow lock owner even in view-only space if shared', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
          sharedWithUserIds: ['user_owner'],
        });

        const result = canModifyTube(tube, 'user_owner', true);

        expect(result).toBe(true);
      });
    });

    describe('Locked Tubes - Shared Access', () => {
      it('should allow modification by shared user', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
          sharedWithUserIds: ['user_shared', 'user_other'],
        });

        const result = canModifyTube(tube, 'user_shared', false);

        expect(result).toBe(true);
      });

      it('should deny modification to non-shared user when locked', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
          sharedWithUserIds: ['user_shared'],
        });

        const result = canModifyTube(tube, 'user_different', false);

        expect(result).toBe(false);
      });
    });

    describe('Locked Tubes - Non-Owner/Non-Shared', () => {
      it('should deny modification to other users', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
        });

        const result = canModifyTube(tube, 'user_other', false);

        expect(result).toBe(false);
      });

      it('should deny modification when locked and no user ID provided', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
        });

        const result = canModifyTube(tube, undefined, false);

        expect(result).toBe(false);
      });
    });

    describe('View-Only Space Scenarios', () => {
      it('should deny modification when view-only and no shared access', () => {
        const tube = createMockTube({ isLocked: false });

        const result = canModifyTube(tube, 'user_123', true);

        expect(result).toBe(false);
      });

      it('should allow modification when view-only but has shared access', () => {
        const tube = createMockTube({
          isLocked: false,
          sharedWithUserIds: ['user_123'],
        });

        const result = canModifyTube(tube, 'user_123', true);

        expect(result).toBe(true);
      });

      it('should deny when view-only, locked, and user is not shared', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
          sharedWithUserIds: ['user_other'],
        });

        const result = canModifyTube(tube, 'user_excluded', true);

        expect(result).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty sharedWithUserIds array', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
          sharedWithUserIds: [],
        });

        const result = canModifyTube(tube, 'user_other', false);

        expect(result).toBe(false);
      });

      it('should handle undefined sharedWithUserIds', () => {
        const tube = createMockTube({
          isLocked: true,
          lockedBy: 'user_owner',
          sharedWithUserIds: undefined,
        });

        const result = canModifyTube(tube, 'user_other', false);

        expect(result).toBe(false);
      });

      it('should handle undefined currentUserId with shared access check', () => {
        const tube = createMockTube({
          isLocked: false,
          sharedWithUserIds: ['user_123'],
        });

        const result = canModifyTube(tube, undefined, true);

        expect(result).toBe(false);
      });
    });
  });

  describe('canModifyAllTubes()', () => {
    it('should return canModifyAll=true when all tubes modifiable', () => {
      const tubes = [
        createMockTube({ id: 'tube_1' }),
        createMockTube({ id: 'tube_2' }),
        createMockTube({ id: 'tube_3' }),
      ];

      const result = canModifyAllTubes(tubes, 'user_123', false);

      expect(result.canModifyAll).toBe(true);
      expect(result.blockedCount).toBe(0);
      expect(result.lockedCount).toBe(0);
      expect(result.modifiable).toHaveLength(3);
      expect(result.blocked).toHaveLength(0);
    });

    it('should return canModifyAll=false when some tubes blocked', () => {
      const tubes = [
        createMockTube({ id: 'tube_1' }),
        createMockTube({ id: 'tube_2', isLocked: true, lockedBy: 'user_other' }),
        createMockTube({ id: 'tube_3' }),
      ];

      const result = canModifyAllTubes(tubes, 'user_123', false);

      expect(result.canModifyAll).toBe(false);
      expect(result.blockedCount).toBe(1);
      expect(result.modifiable).toHaveLength(2);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].id).toBe('tube_2');
    });

    it('should track locked count separately from blocked count', () => {
      const tubes = [
        createMockTube({ id: 'tube_1' }),
        createMockTube({ id: 'tube_2', isLocked: true, lockedBy: 'user_other' }),
        createMockTube({ id: 'tube_3', isLocked: true, lockedBy: 'user_other' }),
      ];

      const result = canModifyAllTubes(tubes, 'user_123', false);

      expect(result.blockedCount).toBe(2);
      expect(result.lockedCount).toBe(2);
    });

    it('should differentiate container blocks from lock blocks', () => {
      const tubes = [
        createMockTube({ id: 'tube_1' }), // Blocked by container (view-only, no shared)
        createMockTube({ id: 'tube_2', isLocked: true, lockedBy: 'user_other' }), // Also blocked by container
      ];

      // View-only space - both tubes lack base access (container or shared)
      // So both are blocked by container, not lock
      const result = canModifyAllTubes(tubes, 'user_123', true);

      expect(result.blockedCount).toBe(2);
      // Both blocked by container (no base access), so lockedCount is 0
      expect(result.lockedCount).toBe(0);
    });

    it('should count lock blocks when user has container access', () => {
      const tubes = [
        createMockTube({ id: 'tube_1' }), // Modifiable (has container access)
        createMockTube({ id: 'tube_2', isLocked: true, lockedBy: 'user_other' }), // Locked
      ];

      // User has container access (not view-only)
      const result = canModifyAllTubes(tubes, 'user_123', false);

      // tube_1 is modifiable, tube_2 is blocked by lock
      expect(result.blockedCount).toBe(1);
      expect(result.lockedCount).toBe(1);
      expect(result.modifiable).toHaveLength(1);
    });

    it('should handle empty tubes array', () => {
      const result = canModifyAllTubes([], 'user_123', false);

      expect(result.canModifyAll).toBe(true);
      expect(result.blockedCount).toBe(0);
      expect(result.modifiable).toHaveLength(0);
      expect(result.blocked).toHaveLength(0);
    });

    it('should return correct modifiable/blocked tube lists', () => {
      const tube1 = createMockTube({ id: 'tube_1' });
      const tube2 = createMockTube({ id: 'tube_2', isLocked: true, lockedBy: 'user_other' });
      const tube3 = createMockTube({ id: 'tube_3' });

      const result = canModifyAllTubes([tube1, tube2, tube3], 'user_123', false);

      expect(result.modifiable).toContain(tube1);
      expect(result.modifiable).toContain(tube3);
      expect(result.modifiable).not.toContain(tube2);
      expect(result.blocked).toContain(tube2);
    });
  });

  describe('getBlockedModificationMessage()', () => {
    it('should return empty string when no tubes blocked', () => {
      const result = {
        canModifyAll: true,
        blockedCount: 0,
        lockedCount: 0,
        modifiable: [],
        blocked: [],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toBe('');
    });

    it('should generate message for single locked tube', () => {
      const result = {
        canModifyAll: false,
        blockedCount: 1,
        lockedCount: 1,
        modifiable: [],
        blocked: [createMockTube()],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toContain('Cannot modify selection');
      expect(message).toContain('1 tube is locked by another user');
    });

    it('should generate message for multiple locked tubes', () => {
      const result = {
        canModifyAll: false,
        blockedCount: 3,
        lockedCount: 3,
        modifiable: [],
        blocked: [createMockTube(), createMockTube(), createMockTube()],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toContain('3 tubes are locked by another user');
    });

    it('should generate message for single container block', () => {
      const result = {
        canModifyAll: false,
        blockedCount: 1,
        lockedCount: 0, // Not locked, blocked by container
        modifiable: [],
        blocked: [createMockTube()],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toContain('1 tube is in a space without access');
    });

    it('should generate message for multiple container blocks', () => {
      const result = {
        canModifyAll: false,
        blockedCount: 5,
        lockedCount: 0,
        modifiable: [],
        blocked: [],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toContain('5 tubes are in a space without access');
    });

    it('should combine lock and container messages', () => {
      const result = {
        canModifyAll: false,
        blockedCount: 5,
        lockedCount: 2, // 2 locked, 3 container blocked
        modifiable: [],
        blocked: [],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toContain('Cannot modify selection');
      expect(message).toContain('2 tubes are locked by another user');
      expect(message).toContain('3 tubes are in a space without access');
      expect(message).toContain(' and ');
    });

    it('should handle single lock + single container block', () => {
      const result = {
        canModifyAll: false,
        blockedCount: 2,
        lockedCount: 1,
        modifiable: [],
        blocked: [],
      };

      const message = getBlockedModificationMessage(result);

      expect(message).toContain('1 tube is locked by another user');
      expect(message).toContain('1 tube is in a space without access');
    });
  });
});
