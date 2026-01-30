/**
 * TubeService Tests
 *
 * Tests API operations for tube data management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TubeService } from './TubeService';

import type { TubeData, CreateTubeRequest, UpdateTubeRequest } from '@odysseus/shared-schemas';

// Hoisted mocks
const mockHttpClient = vi.hoisted(() => ({
  getArray: vi.fn(),
  getData: vi.fn(),
  postData: vi.fn(),
  putData: vi.fn(),
  deleteData: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@infra/api/httpClient', () => ({
  httpClient: mockHttpClient,
}));

describe('TubeService', () => {
  const mockTubeData: TubeData = {
    id: 'tube_123',
    location: {
      tankId: 'tank-1',
      rackId: '1',
      boxId: 'A',
      position: 1,
    },
    sample: {
      cellType: 'HeLa',
      donorInternalId: 'DONOR001',
      concentration: 1000000,
      concentrationUnit: 'c/mL',
      date: '2024-01-15',
    },
    timestamps: {
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTubes()', () => {
    it('should fetch all tubes without filters', async () => {
      mockHttpClient.getArray.mockResolvedValue([mockTubeData]);

      const result = await TubeService.fetchTubes();

      expect(mockHttpClient.getArray).toHaveBeenCalledWith('/tubes', expect.any(Object));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tube_123');
    });

    it('should apply filter parameters', async () => {
      mockHttpClient.getArray.mockResolvedValue([mockTubeData]);

      await TubeService.fetchTubes({
        tankId: 'tank-2',
        rackId: '3',
        boxId: 'B',
      });

      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('tankId=tank-2'),
        expect.any(Object)
      );
      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('rackId=3'),
        expect.any(Object)
      );
    });

    it('should handle researcher filter', async () => {
      mockHttpClient.getArray.mockResolvedValue([]);

      await TubeService.fetchTubes({ researcherId: 'researcher_456' });

      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('researcherId=researcher_456'),
        expect.any(Object)
      );
    });

    it('should handle date range filters', async () => {
      mockHttpClient.getArray.mockResolvedValue([]);

      await TubeService.fetchTubes({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });

      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('dateFrom=2024-01-01'),
        expect.any(Object)
      );
      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('dateTo=2024-12-31'),
        expect.any(Object)
      );
    });
  });

  describe('fetchTubeById()', () => {
    it('should fetch a single tube by ID', async () => {
      mockHttpClient.getData.mockResolvedValue(mockTubeData);

      const result = await TubeService.fetchTubeById('tube_123');

      expect(mockHttpClient.getData).toHaveBeenCalledWith('/tubes/tube_123', expect.any(Object));
      expect(result.id).toBe('tube_123');
    });
  });

  describe('createTube()', () => {
    it('should create a new tube', async () => {
      const createRequest: CreateTubeRequest = {
        location: {
          tankId: 'tank-1',
          rackId: '1',
          boxId: 'A',
          position: 5,
        },
        sample: {
          cellType: 'iPSC',
        },
      };

      mockHttpClient.postData.mockResolvedValue({ ...mockTubeData, id: 'tube_new' });

      const result = await TubeService.createTube(createRequest);

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes',
        expect.objectContaining({
          location: createRequest.location,
        }),
        expect.any(Object)
      );
      expect(result.id).toBe('tube_new');
    });

    it('should normalize date strings in sample data', async () => {
      const createRequest: CreateTubeRequest = {
        location: {
          tankId: 'tank-1',
          rackId: '1',
          boxId: 'A',
          position: 1,
        },
        sample: {
          cellType: 'HeLa',
          date: '2024-03-15T00:00:00.000Z', // ISO format
        },
      };

      mockHttpClient.postData.mockResolvedValue(mockTubeData);

      await TubeService.createTube(createRequest);

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes',
        expect.objectContaining({
          sample: expect.objectContaining({
            date: '2024-03-15', // Normalized to YYYY-MM-DD
          }),
        }),
        expect.any(Object)
      );
    });

    it('should include researcherId when provided', async () => {
      const createRequest: CreateTubeRequest = {
        location: {
          tankId: 'tank-1',
          rackId: '1',
          boxId: 'A',
          position: 1,
        },
        sample: { cellType: 'HeLa' },
        researcherId: 'researcher_abc',
      };

      mockHttpClient.postData.mockResolvedValue(mockTubeData);

      await TubeService.createTube(createRequest);

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes',
        expect.objectContaining({
          researcherId: 'researcher_abc',
        }),
        expect.any(Object)
      );
    });
  });

  describe('updateTube()', () => {
    it('should update an existing tube', async () => {
      const updates: UpdateTubeRequest = {
        sample: {
          cellType: 'Neuron',
          notes: 'Updated notes',
        },
      };

      mockHttpClient.putData.mockResolvedValue({
        ...mockTubeData,
        sample: { ...mockTubeData.sample, cellType: 'Neuron' },
      });

      const result = await TubeService.updateTube('tube_123', updates);

      expect(mockHttpClient.putData).toHaveBeenCalledWith(
        '/tubes/tube_123',
        expect.objectContaining({
          sample: expect.objectContaining({
            cellType: 'Neuron',
          }),
        }),
        expect.any(Object)
      );
      expect(result.sample.cellType).toBe('Neuron');
    });

    it('should normalize dates in update request', async () => {
      const updates: UpdateTubeRequest = {
        sample: {
          cellType: undefined,
          date: '2024-06-20T12:00:00Z',
        },
      };

      mockHttpClient.putData.mockResolvedValue(mockTubeData);

      await TubeService.updateTube('tube_123', updates);

      expect(mockHttpClient.putData).toHaveBeenCalledWith(
        '/tubes/tube_123',
        expect.objectContaining({
          sample: expect.objectContaining({
            date: '2024-06-20',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should update location', async () => {
      const updates: UpdateTubeRequest = {
        location: {
          position: 50,
        },
      };

      mockHttpClient.putData.mockResolvedValue(mockTubeData);

      await TubeService.updateTube('tube_123', updates);

      expect(mockHttpClient.putData).toHaveBeenCalledWith(
        '/tubes/tube_123',
        expect.objectContaining({
          location: { position: 50 },
        }),
        expect.any(Object)
      );
    });
  });

  describe('deleteTube()', () => {
    it('should delete a tube by ID', async () => {
      mockHttpClient.deleteData.mockResolvedValue(undefined);

      await TubeService.deleteTube('tube_123');

      expect(mockHttpClient.deleteData).toHaveBeenCalledWith('/tubes/tube_123');
    });
  });

  describe('bulkDeleteTubes()', () => {
    it('should delete multiple tubes', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: true,
            deleted: ['tube_1', 'tube_2'],
            failed: [],
          },
        },
      });

      const result = await TubeService.bulkDeleteTubes(['tube_1', 'tube_2']);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/tubes/bulk-delete', {
        tubeIds: ['tube_1', 'tube_2'],
      });
      expect(result.success).toBe(true);
      expect(result.deleted).toHaveLength(2);
    });

    it('should handle partial failures in bulk delete', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: false,
            deleted: ['tube_1'],
            failed: [{ id: 'tube_2', error: 'Tube locked' }],
          },
        },
      });

      const result = await TubeService.bulkDeleteTubes(['tube_1', 'tube_2']);

      expect(result.success).toBe(false);
      expect(result.deleted).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Tube locked');
    });
  });

  describe('lockTubes()', () => {
    it('should lock tubes with note', async () => {
      mockHttpClient.postData.mockResolvedValue({
        locked: ['tube_1', 'tube_2'],
        skipped: [],
      });

      const result = await TubeService.lockTubes({
        tubeIds: ['tube_1', 'tube_2'],
        lockNote: 'Under analysis',
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes/lock',
        {
          tubeIds: ['tube_1', 'tube_2'],
          lockNote: 'Under analysis',
        },
        expect.any(Object)
      );
      expect(result.locked).toHaveLength(2);
    });

    it('should handle lock failures', async () => {
      mockHttpClient.postData.mockResolvedValue({
        locked: ['tube_1'],
        skipped: [{ tubeId: 'tube_2', reason: 'Already locked' }],
      });

      const result = await TubeService.lockTubes({
        tubeIds: ['tube_1', 'tube_2'],
      });

      expect(result.locked).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
    });
  });

  describe('unlockTubes()', () => {
    it('should unlock tubes', async () => {
      mockHttpClient.postData.mockResolvedValue({
        unlocked: ['tube_1', 'tube_2'],
        skipped: [],
      });

      const result = await TubeService.unlockTubes({
        tubeIds: ['tube_1', 'tube_2'],
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes/unlock',
        {
          tubeIds: ['tube_1', 'tube_2'],
        },
        expect.any(Object)
      );
      expect(result.unlocked).toHaveLength(2);
    });
  });

  describe('shareTubeAccess()', () => {
    it('should share access with users', async () => {
      mockHttpClient.postData.mockResolvedValue({
        shared: ['tube_1'],
        skipped: [],
      });

      const result = await TubeService.shareTubeAccess({
        tubeIds: ['tube_1'],
        userIds: ['user_a', 'user_b'],
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes/share-access',
        {
          tubeIds: ['tube_1'],
          userIds: ['user_a', 'user_b'],
        },
        expect.any(Object)
      );
      expect(result.shared).toHaveLength(1);
    });
  });

  describe('revokeTubeAccess()', () => {
    it('should revoke access from users', async () => {
      mockHttpClient.postData.mockResolvedValue({
        revoked: ['tube_1'],
        skipped: [],
      });

      const result = await TubeService.revokeTubeAccess({
        tubeIds: ['tube_1'],
        userIds: ['user_a'],
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/tubes/revoke-access',
        {
          tubeIds: ['tube_1'],
          userIds: ['user_a'],
        },
        expect.any(Object)
      );
      expect(result.revoked).toHaveLength(1);
    });
  });

  describe('pasteTubes()', () => {
    it('should create multiple tubes via bulk paste', async () => {
      const tubeRequests: CreateTubeRequest[] = [
        {
          location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 1 },
          sample: { cellType: 'HeLa' },
        },
        {
          location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 2 },
          sample: { cellType: 'HeLa' },
        },
      ];

      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: true,
            created: [
              { id: 'tube_1', ...tubeRequests[0], timestamps: mockTubeData.timestamps, version: 1 },
              { id: 'tube_2', ...tubeRequests[1], timestamps: mockTubeData.timestamps, version: 1 },
            ],
            failed: [],
          },
        },
      });

      const result = await TubeService.pasteTubes(tubeRequests);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/tubes', expect.any(Array));
      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(2);
    });

    it('should handle partial paste failures', async () => {
      const tubeRequests: CreateTubeRequest[] = [
        {
          location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 1 },
          sample: { cellType: 'iPSC' },
        },
        {
          location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 1 }, // Duplicate position
          sample: { cellType: 'iPSC' },
        },
      ];

      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: false,
            created: [{ id: 'tube_1' }],
            failed: [{ index: 1, request: tubeRequests[1], error: 'Position already occupied' }],
          },
        },
      });

      const result = await TubeService.pasteTubes(tubeRequests);

      expect(result.success).toBe(false);
      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Position already occupied');
    });

    it('should normalize dates for each tube in paste', async () => {
      const tubeRequests: CreateTubeRequest[] = [
        {
          location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 1 },
          sample: { cellType: 'Neuron', date: '2024-01-15T00:00:00Z' },
        },
      ];

      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: true,
            created: [],
            failed: [],
          },
        },
      });

      await TubeService.pasteTubes(tubeRequests);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/tubes',
        expect.arrayContaining([
          expect.objectContaining({
            sample: expect.objectContaining({
              date: '2024-01-15',
            }),
          }),
        ])
      );
    });
  });

  describe('bulkUpdateTubes()', () => {
    it('should update multiple tubes', async () => {
      const updates = [
        { id: 'tube_1', data: { sample: { cellType: undefined, notes: 'Note 1' } } },
        { id: 'tube_2', data: { sample: { cellType: undefined, notes: 'Note 2' } } },
      ];

      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: true,
            updated: ['tube_1', 'tube_2'],
            failed: [],
          },
        },
      });

      const result = await TubeService.bulkUpdateTubes(updates);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/tubes/bulk-update', {
        updates: expect.arrayContaining([
          expect.objectContaining({ id: 'tube_1' }),
          expect.objectContaining({ id: 'tube_2' }),
        ]),
      });
      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(2);
    });

    it('should handle partial update failures', async () => {
      const updates = [
        { id: 'tube_1', data: { sample: { cellType: undefined, notes: 'Note' } } },
        { id: 'tube_locked', data: { sample: { cellType: undefined, notes: 'Note' } } },
      ];

      mockHttpClient.post.mockResolvedValue({
        data: {
          data: {
            success: false,
            updated: ['tube_1'],
            failed: [{ id: 'tube_locked', error: 'Tube is locked' }],
          },
        },
      });

      const result = await TubeService.bulkUpdateTubes(updates);

      expect(result.success).toBe(false);
      expect(result.updated).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('fetchTubesByLocation()', () => {
    it('should fetch tubes by specific location', async () => {
      mockHttpClient.getArray.mockResolvedValue([mockTubeData]);

      const result = await TubeService.fetchTubesByLocation('tank-1', '1', 'A');

      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('/tubes/location'),
        expect.any(Object)
      );
      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('tankId=tank-1'),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('searchTubes()', () => {
    it('should search tubes by query', async () => {
      mockHttpClient.getArray.mockResolvedValue([mockTubeData]);

      const result = await TubeService.searchTubes('HeLa');

      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('/tubes/search'),
        expect.any(Object)
      );
      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('query=HeLa'),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });

    it('should apply pagination options', async () => {
      mockHttpClient.getArray.mockResolvedValue([]);

      await TubeService.searchTubes('test', { limit: 10, offset: 20 });

      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(mockHttpClient.getArray).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });
  });

  describe('fetchStats()', () => {
    it('should fetch tube statistics', async () => {
      const mockStats = {
        totalTubes: 150,
        tubesByTank: { 'tank-1': 50, 'tank-2': 100 },
        tubesByResearcher: { researcher_1: 75 },
        averageTubesPerBox: 25.5,
        completionRate: 0.85,
        expirationRate: 0.05,
      };

      mockHttpClient.getData.mockResolvedValue(mockStats);

      const result = await TubeService.fetchStats();

      expect(mockHttpClient.getData).toHaveBeenCalledWith('/tubes/stats', expect.any(Object));
      expect(result.totalTubes).toBe(150);
      expect(result.completionRate).toBe(0.85);
    });
  });
});
