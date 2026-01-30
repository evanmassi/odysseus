/**
 * TubeApplicationService Tests
 *
 * Tests tube CRUD operations, locking, sharing, and bulk operations.
 */

import { TubeApplicationService } from './TubeApplicationService';
import { Tube } from '@domain/entities/Tube';
import { User } from '@domain/entities/User';
import { Configuration } from '@domain/entities/Configuration';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import type { TubePositionService } from '@domain/services/TubePositionService';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { EventBus } from '@application/contracts/EventBus';
import type { CreateTubeRequest, UpdateTubeRequest } from '@application/dto/TubeDto';

jest.mock('@utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TubeApplicationService', () => {
  let service: TubeApplicationService;
  let mockTubeRepository: jest.Mocked<TubeRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockResearcherRepository: jest.Mocked<ResearcherRepository>;
  let mockPersonRepository: jest.Mocked<PersonRepository>;
  let mockConfigurationRepository: jest.Mocked<ConfigurationRepository>;
  let mockPositionService: jest.Mocked<TubePositionService>;
  let mockAccessControl: jest.Mocked<AccessControlService>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockUser: User;
  let mockTube: Tube;

  const createMockTube = (overrides?: Partial<{
    id: string;
    location: { tankId: string; rackId: string; boxId: string; position: number };
    sample: { cellType?: string };
    researcherId?: string;
    isLocked: boolean;
    lockedBy?: string;
    lockedAt?: string;
    lockNote?: string;
    sharedWithUserIds: string[];
    timestamps: { createdAt: string; updatedAt: string };
    version: number;
  }>): Tube => {
    const now = new Date().toISOString();
    const data = {
      id: 'tube-123',
      location: { tankId: 'tank-1', rackId: 'rack-1', boxId: 'box-1', position: 1 },
      sample: { cellType: 'iPSC' },
      researcherId: 'researcher-1',
      isLocked: false,
      lockedBy: undefined,
      lockedAt: undefined,
      lockNote: undefined,
      sharedWithUserIds: [],
      timestamps: { createdAt: now, updatedAt: now },
      version: 1,
      ...overrides,
    };
    return Tube.fromData(data);
  };

  const createMockUser = (role: 'admin' | 'user' = 'user'): User => {
    const now = new Date().toISOString();
    return User.fromData({
      id: 'user-123',
      username: 'testuser',
      passwordHash: 'hash',
      apiKey: 'api-key-12345678901234',
      role: role,
      status: 'approved',
      createdAt: now,
      lastActivity: now,
    });
  };

  beforeEach(() => {
    mockTubeRepository = {
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findByCompleteLocation: jest.fn().mockResolvedValue([]),
      findByRackAndBox: jest.fn().mockResolvedValue([]),
      findByIds: jest.fn().mockResolvedValue([]),
      search: jest.fn().mockResolvedValue([]),
      searchWithHighlighting: jest.fn().mockResolvedValue({ tubes: [], matchedTerms: [] }),
      save: jest.fn().mockResolvedValue(undefined),
      saveWithOptimisticLock: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      getOccupiedPositions: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({
        totalTubes: 0,
        tubesByTank: {},
        tubesByResearcher: {},
        averageTubesPerBox: 0,
        completionRate: 0,
        expirationRate: 0,
      }),
    } as unknown as jest.Mocked<TubeRepository>;

    mockUserRepository = {
      findById: jest.fn(),
      findByApiKey: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockResearcherRepository = {
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ResearcherRepository>;

    mockPersonRepository = {
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PersonRepository>;

    mockConfigurationRepository = {
      getCurrent: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ConfigurationRepository>;

    mockPositionService = {
      validatePosition: jest.fn().mockResolvedValue({ isValid: true }),
      validatePositionBatch: jest.fn().mockReturnValue(new Map()),
    } as unknown as jest.Mocked<TubePositionService>;

    mockAccessControl = {
      requireCanCreateTube: jest.fn(),
      requireCanViewTubes: jest.fn(),
      canAccessContainer: jest.fn().mockReturnValue({ allowed: true }),
      canAccessTubeForModification: jest.fn().mockReturnValue({ allowed: true }),
      canLockTube: jest.fn().mockReturnValue({ allowed: true }),
      canUnlockTube: jest.fn().mockReturnValue({ allowed: true }),
      canShareTubeAccess: jest.fn().mockReturnValue({ allowed: true }),
    } as unknown as jest.Mocked<AccessControlService>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    mockUser = createMockUser();
    mockTube = createMockTube();

    service = new TubeApplicationService(
      mockTubeRepository,
      mockUserRepository,
      mockResearcherRepository,
      mockPersonRepository,
      mockConfigurationRepository,
      mockPositionService,
      mockAccessControl,
      mockEventBus
    );
  });

  describe('createTube()', () => {
    const validRequest: CreateTubeRequest = {
      location: { tankId: 'tank-1', rackId: 'rack-1', boxId: 'box-1', position: 1 },
      sample: { cellType: 'iPSC' },
    };

    it('should create tube with valid request', async () => {
      const result = await service.createTube(validRequest, mockUser);

      expect(mockAccessControl.requireCanCreateTube).toHaveBeenCalledWith(mockUser);
      expect(mockTubeRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      // Location values are normalized by domain
      expect(result.location.tankId).toBe(validRequest.location.tankId);
      expect(result.location.rackId).toBe(validRequest.location.rackId);
      expect(result.location.position).toBe(validRequest.location.position);
    });

    it('should validate position availability', async () => {
      await service.createTube(validRequest, mockUser);

      expect(mockPositionService.validatePosition).toHaveBeenCalledWith(
        'tank-1',
        'rack-1',
        'box-1',
        1,
        mockTubeRepository
      );
    });

    it('should throw ValidationError on position conflict', async () => {
      mockPositionService.validatePosition.mockResolvedValue({
        isValid: false,
        reason: 'Position already occupied',
      });

      await expect(service.createTube(validRequest, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should check container access when config exists', async () => {
      const mockConfig = {
        getBox: jest.fn().mockReturnValue({
          rack: { assignedUserId: null },
          box: { assignedUserId: null },
        }),
      } as unknown as Configuration;
      mockConfigurationRepository.getCurrent.mockResolvedValue(mockConfig);

      await service.createTube(validRequest, mockUser);

      expect(mockAccessControl.canAccessContainer).toHaveBeenCalled();
    });

    it('should throw PermissionError when container access denied', async () => {
      const mockConfig = {
        getBox: jest.fn().mockReturnValue({
          rack: { assignedUserId: 'other-user' },
          box: { assignedUserId: null },
        }),
      } as unknown as Configuration;
      mockConfigurationRepository.getCurrent.mockResolvedValue(mockConfig);
      mockAccessControl.canAccessContainer.mockReturnValue({
        allowed: false,
        reason: 'Rack assigned to another user',
      });

      await expect(service.createTube(validRequest, mockUser)).rejects.toThrow(PermissionError);
    });

    it('should publish TubeCreatedEvent on success', async () => {
      await service.createTube(validRequest, mockUser);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          tubeId: expect.any(String),
          createdBy: mockUser.id,
        })
      );
    });

    it('should capture researcher name when researcherId provided', async () => {
      const mockResearcher = { id: 'researcher-1', personId: 'person-1' };
      const mockPerson = { id: 'person-1', fullName: 'John Doe' };
      mockResearcherRepository.findById.mockResolvedValue(mockResearcher as never);
      mockPersonRepository.findById.mockResolvedValue(mockPerson as never);

      const requestWithResearcher = { ...validRequest, researcherId: 'researcher-1' };
      await service.createTube(requestWithResearcher, mockUser);

      expect(mockResearcherRepository.findById).toHaveBeenCalledWith('researcher-1');
    });
  });

  describe('createTubes()', () => {
    it('should create multiple tubes with partial failure', async () => {
      const requests: CreateTubeRequest[] = [
        { location: { tankId: 't1', rackId: 'r1', boxId: 'b1', position: 1 }, sample: { cellType: 'iPSC' } },
        { location: { tankId: 't1', rackId: 'r1', boxId: 'b1', position: 2 }, sample: { cellType: 'MSC' } },
      ];

      const result = await service.createTubes(requests, mockUser);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle individual tube failures gracefully', async () => {
      mockPositionService.validatePosition.mockResolvedValueOnce({ isValid: true });
      mockPositionService.validatePosition.mockResolvedValueOnce({
        isValid: false,
        reason: 'Position occupied',
      });

      const requests: CreateTubeRequest[] = [
        { location: { tankId: 't1', rackId: 'r1', boxId: 'b1', position: 1 }, sample: { cellType: 'iPSC' } },
        { location: { tankId: 't1', rackId: 'r1', boxId: 'b1', position: 2 }, sample: { cellType: 'MSC' } },
      ];

      const result = await service.createTubes(requests, mockUser);

      expect(result.success).toBe(false);
      expect(result.created.length + result.failed.length).toBe(2);
    });
  });

  describe('getTubeById()', () => {
    it('should return tube when found and accessible', async () => {
      mockTubeRepository.findById.mockResolvedValue(mockTube);

      const result = await service.getTubeById('tube-123', mockUser);

      expect(result.id).toBe('tube-123');
    });

    it('should throw NotFoundError when tube not found', async () => {
      mockTubeRepository.findById.mockResolvedValue(null);

      await expect(service.getTubeById('nonexistent', mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should check access permissions', async () => {
      mockTubeRepository.findById.mockResolvedValue(mockTube);
      const mockConfig = {
        getBox: jest.fn().mockReturnValue({
          rack: { assignedUserId: null },
          box: { assignedUserId: null },
        }),
      } as unknown as Configuration;
      mockConfigurationRepository.getCurrent.mockResolvedValue(mockConfig);

      await service.getTubeById('tube-123', mockUser);

      expect(mockAccessControl.canAccessTubeForModification).toHaveBeenCalled();
    });

    it('should throw PermissionError when access denied', async () => {
      mockTubeRepository.findById.mockResolvedValue(mockTube);
      const mockConfig = {
        getBox: jest.fn().mockReturnValue({
          rack: { assignedUserId: 'other-user' },
          box: { assignedUserId: null },
        }),
      } as unknown as Configuration;
      mockConfigurationRepository.getCurrent.mockResolvedValue(mockConfig);
      mockAccessControl.canAccessTubeForModification.mockReturnValue({
        allowed: false,
        reason: 'Access denied',
      });

      await expect(service.getTubeById('tube-123', mockUser)).rejects.toThrow(PermissionError);
    });
  });

  describe('updateTube()', () => {
    const updateRequest: UpdateTubeRequest = {
      sample: { cellType: 'MSC' },
    };

    beforeEach(() => {
      mockTubeRepository.findById.mockResolvedValue(mockTube);
    });

    it('should update tube with valid request', async () => {
      const result = await service.updateTube('tube-123', updateRequest, mockUser);

      expect(mockTubeRepository.saveWithOptimisticLock).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should validate new position when location changes', async () => {
      const locationUpdate: UpdateTubeRequest = {
        location: { position: 5 },
      };

      await service.updateTube('tube-123', locationUpdate, mockUser);

      expect(mockPositionService.validatePosition).toHaveBeenCalled();
    });

    it('should skip position validation when position unchanged', async () => {
      const samePositionUpdate: UpdateTubeRequest = {
        location: { position: 1 },
      };

      await service.updateTube('tube-123', samePositionUpdate, mockUser);

      expect(mockPositionService.validatePosition).not.toHaveBeenCalled();
    });

    it('should throw PermissionError when updating lock note on unlocked tube', async () => {
      const lockNoteUpdate: UpdateTubeRequest = {
        lockNote: 'new note',
      };

      await expect(service.updateTube('tube-123', lockNoteUpdate, mockUser)).rejects.toThrow(
        PermissionError
      );
    });

    it('should throw PermissionError when non-owner updates lock note', async () => {
      const lockedTube = createMockTube({
        isLocked: true,
        lockedBy: 'other-user-id',
      });
      mockTubeRepository.findById.mockResolvedValue(lockedTube);

      const lockNoteUpdate: UpdateTubeRequest = {
        lockNote: 'new note',
      };

      await expect(service.updateTube('tube-123', lockNoteUpdate, mockUser)).rejects.toThrow(
        PermissionError
      );
    });

    it('should publish TubeUpdatedEvent on success', async () => {
      await service.updateTube('tube-123', updateRequest, mockUser);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          tubeId: 'tube-123',
          updatedBy: mockUser.id,
        })
      );
    });
  });

  describe('deleteTube()', () => {
    beforeEach(() => {
      mockTubeRepository.findById.mockResolvedValue(mockTube);
    });

    it('should delete tube when authorized', async () => {
      await service.deleteTube('tube-123', mockUser);

      expect(mockTubeRepository.delete).toHaveBeenCalledWith('tube-123');
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundError when tube not found', async () => {
      mockTubeRepository.findById.mockResolvedValue(null);

      await expect(service.deleteTube('nonexistent', mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should check access before deleting', async () => {
      const mockConfig = {
        getBox: jest.fn().mockReturnValue({
          rack: { assignedUserId: null },
          box: { assignedUserId: null },
        }),
      } as unknown as Configuration;
      mockConfigurationRepository.getCurrent.mockResolvedValue(mockConfig);

      await service.deleteTube('tube-123', mockUser);

      expect(mockAccessControl.canAccessTubeForModification).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateTubes()', () => {
    it('should update multiple tubes', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);
      mockTubeRepository.findById.mockResolvedValue(mockTube);

      const result = await service.bulkUpdateTubes(
        {
          updates: [{ id: 'tube-123', updates: { sample: { cellType: 'MSC' } } }],
        },
        mockUser
      );

      expect(result.updated).toContain('tube-123');
    });

    it('should handle partial failures', async () => {
      const tube1 = createMockTube({ id: 'tube-1' });
      mockTubeRepository.findByIds.mockResolvedValue([tube1]); // Only tube-1 exists
      mockTubeRepository.findById.mockResolvedValue(tube1);

      const result = await service.bulkUpdateTubes(
        {
          updates: [
            { id: 'tube-1', updates: { sample: { cellType: 'A' } } },
            { id: 'tube-not-found', updates: { sample: { cellType: 'B' } } },
          ],
        },
        mockUser
      );

      // tube-1 succeeds, tube-not-found fails because it's not in the preloaded map
      expect(result.updated.length + result.failed.length).toBe(2);
    });

    it('should publish BulkTubesUpdatedEvent on success', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);
      mockTubeRepository.findById.mockResolvedValue(mockTube);

      await service.bulkUpdateTubes(
        {
          updates: [{ id: 'tube-123', updates: { sample: { cellType: 'MSC' } } }],
        },
        mockUser
      );

      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('bulkDeleteTubes()', () => {
    it('should delete multiple tubes', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);

      const result = await service.bulkDeleteTubes(['tube-123'], mockUser);

      expect(result.deleted).toContain('tube-123');
      expect(mockTubeRepository.deleteMany).toHaveBeenCalled();
    });

    it('should report not found tubes as failures', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([]);

      const result = await service.bulkDeleteTubes(['nonexistent'], mockUser);

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('not found');
    });
  });

  describe('lockTubes()', () => {
    it('should lock unlocked tubes', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);

      const result = await service.lockTubes(
        { tubeIds: ['tube-123'], lockNote: 'Testing' },
        mockUser
      );

      expect(result.locked).toContain('tube-123');
      expect(mockTubeRepository.saveWithOptimisticLock).toHaveBeenCalled();
    });

    it('should skip already locked tubes', async () => {
      const lockedTube = createMockTube({ isLocked: true, lockedBy: 'user-123' });
      mockTubeRepository.findByIds.mockResolvedValue([lockedTube]);

      const result = await service.lockTubes({ tubeIds: ['tube-123'] }, mockUser);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('already locked');
    });

    it('should skip tubes when lock permission denied', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);
      mockAccessControl.canLockTube.mockReturnValue({
        allowed: false,
        reason: 'Permission denied',
      });

      const result = await service.lockTubes({ tubeIds: ['tube-123'] }, mockUser);

      expect(result.skipped).toHaveLength(1);
    });

    it('should publish TubesLockedEvent when tubes locked', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);

      await service.lockTubes({ tubeIds: ['tube-123'], lockNote: 'Test' }, mockUser);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          tubeIds: ['tube-123'],
          lockedBy: mockUser.id,
        })
      );
    });
  });

  describe('unlockTubes()', () => {
    it('should unlock locked tubes when authorized', async () => {
      const lockedTube = createMockTube({ isLocked: true, lockedBy: mockUser.id });
      mockTubeRepository.findByIds.mockResolvedValue([lockedTube]);

      const result = await service.unlockTubes({ tubeIds: ['tube-123'] }, mockUser);

      expect(result.unlocked).toContain('tube-123');
    });

    it('should skip not locked tubes', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);

      const result = await service.unlockTubes({ tubeIds: ['tube-123'] }, mockUser);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('not locked');
    });

    it('should skip when unlock permission denied', async () => {
      const lockedTube = createMockTube({ isLocked: true, lockedBy: 'other-user' });
      mockTubeRepository.findByIds.mockResolvedValue([lockedTube]);
      mockAccessControl.canUnlockTube.mockReturnValue({
        allowed: false,
        reason: 'Only lock owner can unlock',
      });

      const result = await service.unlockTubes({ tubeIds: ['tube-123'] }, mockUser);

      expect(result.skipped).toHaveLength(1);
    });
  });

  describe('shareTubeAccess()', () => {
    it('should share access to locked tubes', async () => {
      const lockedTube = createMockTube({ isLocked: true, lockedBy: mockUser.id });
      mockTubeRepository.findByIds.mockResolvedValue([lockedTube]);

      const result = await service.shareTubeAccess(
        { tubeIds: ['tube-123'], userIds: ['user-456'] },
        mockUser
      );

      expect(result.shared).toContain('tube-123');
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should skip unlocked tubes', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);

      const result = await service.shareTubeAccess(
        { tubeIds: ['tube-123'], userIds: ['user-456'] },
        mockUser
      );

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('must be locked');
    });

    it('should skip when share permission denied', async () => {
      const lockedTube = createMockTube({ isLocked: true, lockedBy: 'other-user' });
      mockTubeRepository.findByIds.mockResolvedValue([lockedTube]);
      mockAccessControl.canShareTubeAccess.mockReturnValue({
        allowed: false,
        reason: 'Only lock owner can share',
      });

      const result = await service.shareTubeAccess(
        { tubeIds: ['tube-123'], userIds: ['user-456'] },
        mockUser
      );

      expect(result.skipped).toHaveLength(1);
    });
  });

  describe('revokeTubeAccess()', () => {
    it('should revoke access from locked tubes', async () => {
      const lockedTube = createMockTube({
        isLocked: true,
        lockedBy: mockUser.id,
        sharedWithUserIds: ['user-456'],
      });
      mockTubeRepository.findByIds.mockResolvedValue([lockedTube]);

      const result = await service.revokeTubeAccess(
        { tubeIds: ['tube-123'], userIds: ['user-456'] },
        mockUser
      );

      expect(result.revoked).toContain('tube-123');
    });

    it('should skip unlocked tubes', async () => {
      mockTubeRepository.findByIds.mockResolvedValue([mockTube]);

      const result = await service.revokeTubeAccess(
        { tubeIds: ['tube-123'], userIds: ['user-456'] },
        mockUser
      );

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('must be locked');
    });
  });

  describe('getStats()', () => {
    it('should return tube statistics', async () => {
      mockTubeRepository.getStats.mockResolvedValue({
        totalTubes: 100,
        tubesByTank: { 'tank-1': 50 },
        tubesByResearcher: { 'researcher-1': 30 },
        averageTubesPerBox: 10,
        completionRate: 0.85,
        expirationRate: 0.05,
      });

      const result = await service.getStats(mockUser);

      expect(mockAccessControl.requireCanViewTubes).toHaveBeenCalledWith(mockUser);
      expect(result.totalTubes).toBe(100);
      expect(result.completionRate).toBe(0.85);
    });
  });
});
