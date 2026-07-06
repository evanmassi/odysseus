/**
 * Validation Service Tests
 */

import { ValidationService } from './ValidationService';
import { Storage } from '@domain/entities/Storage';
import { createTestUser, createTestAdmin, createTestTube } from '@domain/__tests__/helpers';

const mockTubeRepository = {
  findById: jest.fn(),
  search: jest.fn(),
  countByTank: jest.fn(),
  countByRack: jest.fn(),
  countByBox: jest.fn(),
} as any;

const mockUserRepository = {} as any;

const mockResearcherRepository = {
  findById: jest.fn(),
} as any;

const mockStorageRepository = {} as any;

const mockPersonRepository = {
  findById: jest.fn(),
} as any;

const mockTubePositionService = {
  canPlaceTubeAt: jest.fn(),
} as any;

const mockAccessControlService = {
  requireCanCreateTube: jest.fn(),
  requireTubeAccess: jest.fn(),
  canModifyStorage: jest.fn(),
  canPerformBulkOperation: jest.fn(),
} as any;

function createService() {
  return new ValidationService(
    mockTubeRepository,
    mockUserRepository,
    mockResearcherRepository,
    mockStorageRepository,
    mockPersonRepository,
    mockTubePositionService,
    mockAccessControlService
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessControlService.requireCanCreateTube.mockResolvedValue(undefined);
  mockAccessControlService.requireTubeAccess.mockResolvedValue(undefined);
  mockTubePositionService.canPlaceTubeAt.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
  mockTubeRepository.search.mockResolvedValue([]);
});

describe('ValidationService', () => {
  describe('validateTubeCreation', () => {
    const validTubeData = {
      location: { tankId: 'T1', rackId: 'R1', boxId: 'A', position: 1 },
      sample: { cellType: 'HeLa' },
    };

    it('should pass for valid tube data with admin', async () => {
      const admin = createTestAdmin();
      const result = await createService().validateTubeCreation(validTubeData, admin);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when user lacks permission', async () => {
      mockAccessControlService.requireCanCreateTube.mockRejectedValue(new Error('Permission denied'));
      const user = createTestUser();
      const result = await createService().validateTubeCreation(validTubeData, user);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Permission denied');
    });

    it('should fail when position is invalid', async () => {
      mockTubePositionService.canPlaceTubeAt.mockResolvedValue({
        isValid: false,
        errors: ['Position conflict'],
        warnings: [],
      });
      const admin = createTestAdmin();
      const result = await createService().validateTubeCreation(validTubeData, admin);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Position conflict');
    });

    it('should warn for inactive researcher', async () => {
      const inactiveResearcher = { id: 'res_1', personId: 'person_1', isActive: () => false };
      mockResearcherRepository.findById.mockResolvedValue(inactiveResearcher);
      mockPersonRepository.findById.mockResolvedValue({ fullName: 'Jane Doe' });

      const admin = createTestAdmin();
      const result = await createService().validateTubeCreation(
        { ...validTubeData, researcherId: 'res_1' },
        admin
      );
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('inactive'))).toBe(true);
    });

    it('should warn for unknown researcher', async () => {
      mockResearcherRepository.findById.mockResolvedValue(null);

      const admin = createTestAdmin();
      const result = await createService().validateTubeCreation(
        { ...validTubeData, researcherId: 'res_nonexistent' },
        admin
      );
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('not found'))).toBe(true);
    });

    it('should warn about concentration without unit', async () => {
      const admin = createTestAdmin();
      const data = {
        ...validTubeData,
        sample: { concentration: 5 },
      };
      const result = await createService().validateTubeCreation(data, admin);
      expect(result.warnings.some(w => w.includes('Concentration and concentration unit'))).toBe(true);
    });
  });

  describe('validateTubeUpdate', () => {
    it('should pass for valid update', async () => {
      const admin = createTestAdmin();
      const tube = createTestTube({ researcherId: 'res_1' });
      const updates = { sample: { cellType: 'Jurkat' } };

      const result = await createService().validateTubeUpdate(tube, updates, admin);
      expect(result.isValid).toBe(true);
    });

    it('should fail when user lacks edit permission', async () => {
      mockAccessControlService.requireTubeAccess.mockRejectedValue(new Error('Not authorized'));
      const user = createTestUser();
      const tube = createTestTube({ researcherId: 'res_other' });
      const updates = { sample: { cellType: 'Jurkat' } };

      const result = await createService().validateTubeUpdate(tube, updates, user);
      expect(result.isValid).toBe(false);
    });

    it('should deep-merge sample data for business rules', async () => {
      const admin = createTestAdmin();
      const tube = createTestTube({ sample: { concentration: 10, concentrationUnit: 'c/mL' } });
      // Partial update: only change concentration, keep unit from existing tube
      const updates = { sample: { concentration: 20 } };

      const result = await createService().validateTubeUpdate(tube, updates, admin);
      // Should NOT warn about missing unit — it's preserved from the existing tube
      expect(result.warnings.some(w => w.includes('Concentration and concentration unit'))).toBe(false);
    });

    it('should warn when unassigning researcher', async () => {
      const admin = createTestAdmin();
      const tube = createTestTube({ researcherId: 'res_1' });
      const updates = { researcherId: '' };

      const result = await createService().validateTubeUpdate(tube, updates, admin);
      expect(result.warnings.some(w => w.includes('unassigned'))).toBe(true);
    });
  });

  describe('validateTubeDeletion', () => {
    it('should pass for admin deleting recent tube', async () => {
      const admin = createTestAdmin();
      const tube = createTestTube();
      const result = await createService().validateTubeDeletion(tube, admin);
      expect(result.isValid).toBe(true);
    });

    it('should fail when user lacks delete permission', async () => {
      mockAccessControlService.requireTubeAccess.mockRejectedValue(new Error('Not authorized'));
      const user = createTestUser();
      const tube = createTestTube();
      const result = await createService().validateTubeDeletion(tube, user);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateResearcherIdReference', () => {
    it('should pass for empty researcher ID', async () => {
      const result = await createService().validateResearcherIdReference('', 'lab_1');
      expect(result.isValid).toBe(true);
    });

    it('should warn for non-existent researcher', async () => {
      mockResearcherRepository.findById.mockResolvedValue(null);
      const result = await createService().validateResearcherIdReference('res_missing', 'lab_1');
      expect(result.warnings.some(w => w.includes('not found'))).toBe(true);
    });

    it('should warn for inactive researcher with person name', async () => {
      mockResearcherRepository.findById.mockResolvedValue({
        id: 'res_1', personId: 'person_1', isActive: () => false,
      });
      mockPersonRepository.findById.mockResolvedValue({ fullName: 'John Smith' });

      const result = await createService().validateResearcherIdReference('res_1', 'lab_1');
      expect(result.warnings.some(w => w.includes('John Smith') && w.includes('inactive'))).toBe(true);
    });

    it('should fall back to researcher ID when person not found', async () => {
      mockResearcherRepository.findById.mockResolvedValue({
        id: 'res_1', personId: 'person_1', isActive: () => false,
      });
      mockPersonRepository.findById.mockResolvedValue(null);

      const result = await createService().validateResearcherIdReference('res_1', 'lab_1');
      expect(result.warnings.some(w => w.includes('res_1') && w.includes('inactive'))).toBe(true);
    });
  });

  describe('validateStorageUpdate', () => {
    const baseConfig = () => Storage.fromData({
      tanks: [{ id: 'T1', name: 'Tank 1', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] }],
      systemSettings: { labName: 'Lab', defaultResearcher: '', autoSave: true, auditTrailEnabled: true, syncEnabled: false },
    });

    it('should pass for valid config update', async () => {
      mockAccessControlService.canModifyStorage.mockResolvedValue({ allowed: true });
      const admin = createTestAdmin();
      const current = baseConfig();
      const updated = baseConfig();

      const result = await createService().validateStorageUpdate(current, updated, admin, 'lab_1');
      expect(result.isValid).toBe(true);
    });

    it('should fail when user lacks config permission', async () => {
      mockAccessControlService.canModifyStorage.mockResolvedValue({ allowed: false, reason: 'No permission' });
      const user = createTestUser();
      const current = baseConfig();
      const updated = baseConfig();

      const result = await createService().validateStorageUpdate(current, updated, user, 'lab_1');
      expect(result.isValid).toBe(false);
    });

    it('should prevent removing tank with tubes', async () => {
      mockAccessControlService.canModifyStorage.mockResolvedValue({ allowed: true });
      mockTubeRepository.countByTank.mockResolvedValue(5);
      const admin = createTestAdmin();
      const current = baseConfig();
      const updated = Storage.fromData({
        tanks: [],
        systemSettings: { labName: 'Lab', defaultResearcher: '', autoSave: true, auditTrailEnabled: true, syncEnabled: false },
      });

      const result = await createService().validateStorageUpdate(current, updated, admin, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Cannot remove tank'))).toBe(true);
    });

    it('should prevent removing rack with tubes', async () => {
      mockAccessControlService.canModifyStorage.mockResolvedValue({ allowed: true });
      mockTubeRepository.countByRack.mockResolvedValue(3);
      const admin = createTestAdmin();
      const current = Storage.fromData({
        tanks: [{ id: 'T1', name: 'Tank 1', racks: [
          { id: '1', name: 'R1', boxes: [{ name: 'A' }] },
          { id: '2', name: 'R2', boxes: [{ name: 'A' }] },
        ]}],
        systemSettings: { labName: 'Lab', defaultResearcher: '', autoSave: true, auditTrailEnabled: true, syncEnabled: false },
      });
      const updated = Storage.fromData({
        tanks: [{ id: 'T1', name: 'Tank 1', racks: [
          { id: '1', name: 'R1', boxes: [{ name: 'A' }] },
        ]}],
        systemSettings: { labName: 'Lab', defaultResearcher: '', autoSave: true, auditTrailEnabled: true, syncEnabled: false },
      });

      const result = await createService().validateStorageUpdate(current, updated, admin, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Cannot remove rack'))).toBe(true);
    });

    it('should prevent deactivating all tanks', async () => {
      mockAccessControlService.canModifyStorage.mockResolvedValue({ allowed: true });
      const admin = createTestAdmin();
      const current = baseConfig();
      const updated = Storage.fromData({
        tanks: [{ id: 'T1', name: 'Tank 1', isActive: false, racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] }],
        systemSettings: { labName: 'Lab', defaultResearcher: '', autoSave: true, auditTrailEnabled: true, syncEnabled: false },
      });

      const result = await createService().validateStorageUpdate(current, updated, admin, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('At least one tank must remain active'))).toBe(true);
    });
  });
});
