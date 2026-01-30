/**
 * Storage Service Tests
 *
 * Tests storage configuration API operations for tanks, racks, and boxes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StorageService } from './StorageService';

const mockHttpClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getData: vi.fn(),
  postData: vi.fn(),
}));

vi.mock('@infra/api/httpClient', () => ({
  httpClient: mockHttpClient,
}));

vi.mock('@shared/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadConfiguration()', () => {
    it('should load configuration from server', async () => {
      const mockConfig = {
        equipment: { tanks: [] },
        systemSettings: { labName: 'Test Lab' },
        metadata: { version: 1 },
      };

      mockHttpClient.getData.mockResolvedValue(mockConfig);

      const result = await StorageService.loadConfiguration();

      expect(mockHttpClient.getData).toHaveBeenCalledWith('/configuration', expect.anything());
      expect(result).toEqual(mockConfig);
    });

    it('should throw InfrastructureError on failure', async () => {
      mockHttpClient.getData.mockRejectedValue(new Error('Network error'));

      await expect(StorageService.loadConfiguration()).rejects.toThrow();
    });
  });

  describe('checkConfigurationExists()', () => {
    it('should return true when configuration exists', async () => {
      mockHttpClient.getData.mockResolvedValue({ exists: true });

      const result = await StorageService.checkConfigurationExists();

      expect(result).toBe(true);
    });

    it('should return false when configuration does not exist', async () => {
      mockHttpClient.getData.mockResolvedValue({ exists: false });

      const result = await StorageService.checkConfigurationExists();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockHttpClient.getData.mockRejectedValue(new Error('Error'));

      const result = await StorageService.checkConfigurationExists();

      expect(result).toBe(false);
    });
  });

  describe('addTank()', () => {
    it('should add new tank', async () => {
      mockHttpClient.postData.mockResolvedValue({ success: true, tankId: 'tank-1' });

      const result = await StorageService.addTank('Tank 1', 'Building A');

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/configuration/tanks',
        { name: 'Tank 1', location: 'Building A' },
        expect.anything()
      );
      expect(result.tankId).toBe('tank-1');
    });
  });

  describe('updateTank()', () => {
    it('should update tank properties', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.updateTank('tank-1', { name: 'Updated Tank', isActive: false });

      expect(mockHttpClient.put).toHaveBeenCalledWith('/configuration/tanks/tank-1', {
        name: 'Updated Tank',
        isActive: false,
      });
    });
  });

  describe('deleteTank()', () => {
    it('should delete tank', async () => {
      mockHttpClient.delete.mockResolvedValue({ data: { success: true } });

      await StorageService.deleteTank('tank-1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/configuration/tanks/tank-1');
    });
  });

  describe('addRacks()', () => {
    it('should add racks to tank', async () => {
      mockHttpClient.postData.mockResolvedValue({ success: true, rackIds: ['1', '2', '3'] });

      const result = await StorageService.addRacks('tank-1', 3);

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks',
        { count: 3 },
        expect.anything()
      );
      expect(result.rackIds).toHaveLength(3);
    });
  });

  describe('updateRack()', () => {
    it('should update rack properties', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.updateRack('tank-1', 'rack-1', { name: 'Rack A', capacity: 10 });

      expect(mockHttpClient.put).toHaveBeenCalledWith('/configuration/tanks/tank-1/racks/rack-1', {
        name: 'Rack A',
        capacity: 10,
      });
    });
  });

  describe('deleteRack()', () => {
    it('should delete rack', async () => {
      mockHttpClient.delete.mockResolvedValue({ data: { success: true } });

      await StorageService.deleteRack('tank-1', 'rack-1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks/rack-1'
      );
    });
  });

  describe('assignRack()', () => {
    it('should assign rack to user', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.assignRack('tank-1', 'rack-1', 'user-1');

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks/rack-1/assign',
        { assignedUserId: 'user-1' }
      );
    });

    it('should unassign rack when null passed', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.assignRack('tank-1', 'rack-1', null);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks/rack-1/assign',
        { assignedUserId: null }
      );
    });
  });

  describe('addBoxes()', () => {
    it('should add boxes to rack', async () => {
      mockHttpClient.postData.mockResolvedValue({ success: true, boxIds: ['A', 'B'] });

      const result = await StorageService.addBoxes('tank-1', 'rack-1', 2);

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks/rack-1/boxes',
        { count: 2 },
        expect.anything()
      );
      expect(result.boxIds).toHaveLength(2);
    });
  });

  describe('updateBox()', () => {
    it('should update box properties', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.updateBox('tank-1', 'rack-1', 'A', {
        gridConfig: { rows: 10, cols: 10 },
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks/rack-1/boxes/A',
        { gridConfig: { rows: 10, cols: 10 } }
      );
    });
  });

  describe('deleteBox()', () => {
    it('should delete box', async () => {
      mockHttpClient.delete.mockResolvedValue({ data: { success: true } });

      await StorageService.deleteBox('tank-1', 'rack-1', 'A');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        '/configuration/tanks/tank-1/racks/rack-1/boxes/A'
      );
    });
  });

  describe('bulkUnassignResources()', () => {
    it('should unassign all resources from user', async () => {
      mockHttpClient.postData.mockResolvedValue({ racksAffected: 2, boxesAffected: 5 });

      const result = await StorageService.bulkUnassignResources('user-1');

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/configuration/bulk-unassign',
        { fromUserId: 'user-1' },
        expect.anything()
      );
      expect(result.racksAffected).toBe(2);
      expect(result.boxesAffected).toBe(5);
    });
  });

  describe('bulkReassignResources()', () => {
    it('should reassign all resources from one user to another', async () => {
      mockHttpClient.postData.mockResolvedValue({ racksAffected: 3, boxesAffected: 10 });

      const result = await StorageService.bulkReassignResources('user-1', 'user-2');

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/configuration/bulk-reassign',
        { fromUserId: 'user-1', toUserId: 'user-2' },
        expect.anything()
      );
      expect(result.racksAffected).toBe(3);
    });
  });

  describe('initializeConfiguration()', () => {
    it('should initialize configuration for fresh install', async () => {
      mockHttpClient.postData.mockResolvedValue({ success: true });

      await StorageService.initializeConfiguration('Test Lab', 2, 5);

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/configuration/initialize',
        { labName: 'Test Lab', tankCount: 2, racksPerTank: 5 },
        expect.anything()
      );
    });
  });

  describe('updateBoxPositionDisplay()', () => {
    it('should update box position display config', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.updateBoxPositionDisplay('tank-1', 'rack-1', 'A', {
        format: 'numeric',
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith('/configuration/box-position-display', {
        tankId: 'tank-1',
        rackId: 'rack-1',
        boxId: 'A',
        positionDisplay: { format: 'numeric' },
      });
    });

    it('should reset to default when null passed', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      await StorageService.updateBoxPositionDisplay('tank-1', 'rack-1', 'A', null);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/configuration/box-position-display', {
        tankId: 'tank-1',
        rackId: 'rack-1',
        boxId: 'A',
        positionDisplay: null,
      });
    });
  });
});
