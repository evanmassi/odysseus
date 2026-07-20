/**
 * Validation Service Tests
 */

import { ValidationService } from './ValidationService';
import { Storage } from '@domain/entities/Storage';
import { createTestUser, createTestAdmin } from '@domain/__tests__/helpers';

const mockTubeRepository = {
  countByTank: jest.fn(),
  countByRack: jest.fn(),
  countByBox: jest.fn(),
} as any;

const mockAccessControlService = {
  canModifyStorage: jest.fn(),
} as any;

function createService() {
  return new ValidationService(mockTubeRepository, mockAccessControlService);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ValidationService', () => {
  describe('validateStorageUpdate', () => {
    const baseConfig = () =>
      Storage.fromData({
        tanks: [
          { id: 'T1', name: 'Tank 1', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] },
        ],
        systemSettings: {
          labName: 'Lab',
          defaultResearcher: '',
          autoSave: true,
          auditTrailEnabled: true,
          syncEnabled: false,
        },
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
      mockAccessControlService.canModifyStorage.mockResolvedValue({
        allowed: false,
        reason: 'No permission',
      });
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
        systemSettings: {
          labName: 'Lab',
          defaultResearcher: '',
          autoSave: true,
          auditTrailEnabled: true,
          syncEnabled: false,
        },
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
        tanks: [
          {
            id: 'T1',
            name: 'Tank 1',
            racks: [
              { id: '1', name: 'R1', boxes: [{ name: 'A' }] },
              { id: '2', name: 'R2', boxes: [{ name: 'A' }] },
            ],
          },
        ],
        systemSettings: {
          labName: 'Lab',
          defaultResearcher: '',
          autoSave: true,
          auditTrailEnabled: true,
          syncEnabled: false,
        },
      });
      const updated = Storage.fromData({
        tanks: [
          { id: 'T1', name: 'Tank 1', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] },
        ],
        systemSettings: {
          labName: 'Lab',
          defaultResearcher: '',
          autoSave: true,
          auditTrailEnabled: true,
          syncEnabled: false,
        },
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
        tanks: [
          {
            id: 'T1',
            name: 'Tank 1',
            isActive: false,
            racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }],
          },
        ],
        systemSettings: {
          labName: 'Lab',
          defaultResearcher: '',
          autoSave: true,
          auditTrailEnabled: true,
          syncEnabled: false,
        },
      });

      const result = await createService().validateStorageUpdate(current, updated, admin, 'lab_1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('At least one tank must remain active'))).toBe(
        true
      );
    });
  });
});
