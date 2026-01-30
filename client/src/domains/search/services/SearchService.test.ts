/**
 * Search Service Tests
 *
 * Tests search API operations and data normalization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SearchService } from './SearchService';

const mockHttpClient = vi.hoisted(() => ({
  postData: vi.fn(),
}));

vi.mock('@infra/api/httpClient', () => ({
  httpClient: mockHttpClient,
}));

vi.mock('@shared/utils/dateUtils', () => ({
  normalizeDateString: vi.fn((date: string) => date),
}));

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchTubes()', () => {
    it('should perform search with query', async () => {
      const mockResult = {
        data: [
          {
            id: 'tube-1',
            location: { tankId: 't1', rackId: 'r1', boxId: 'b1', position: 1 },
            sample: {},
          },
        ],
        pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
      };

      mockHttpClient.postData.mockResolvedValue(mockResult);

      const result = await SearchService.searchTubes({ query: 'Sample A' });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({
          query: 'Sample A',
          limit: 50,
          offset: 0,
          sortOrder: 'desc',
        }),
        expect.anything()
      );
      expect(result.data).toEqual(mockResult.data);
    });

    it('should pass filters to API', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({
        query: '',
        filters: {
          researcherIds: ['researcher-1'],
          tankIds: ['tank-1'],
        },
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({
          filters: expect.objectContaining({
            researcherIds: ['researcher-1'],
            tankIds: ['tank-1'],
          }),
        }),
        expect.anything()
      );
    });

    it('should use default limit of 50', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({ query: 'test' });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({ limit: 50 }),
        expect.anything()
      );
    });

    it('should pass custom limit', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 100, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({ query: 'test', limit: 100 });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({ limit: 100 }),
        expect.anything()
      );
    });

    it('should pass offset for pagination', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 50, hasMore: false },
      });

      await SearchService.searchTubes({ query: 'test', offset: 50 });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({ offset: 50 }),
        expect.anything()
      );
    });

    it('should pass sortBy and sortOrder', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({
        query: 'test',
        sortBy: 'sampleName',
        sortOrder: 'asc',
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({
          sortBy: 'sampleName',
          sortOrder: 'asc',
        }),
        expect.anything()
      );
    });

    it('should use default sortOrder of desc', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({ query: 'test' });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({ sortOrder: 'desc' }),
        expect.anything()
      );
    });

    it('should throw InfrastructureError on API failure', async () => {
      mockHttpClient.postData.mockRejectedValue(new Error('Network error'));

      await expect(SearchService.searchTubes({ query: 'test' })).rejects.toThrow();
    });

    it('should normalize date filters', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({
        query: '',
        filters: {
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        },
      });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({
          filters: expect.objectContaining({
            dateFrom: '2024-01-01',
            dateTo: '2024-12-31',
          }),
        }),
        expect.anything()
      );
    });

    it('should handle empty filters', async () => {
      mockHttpClient.postData.mockResolvedValue({
        tubes: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });

      await SearchService.searchTubes({ query: 'test', filters: undefined });

      expect(mockHttpClient.postData).toHaveBeenCalledWith(
        '/search/tubes/advanced',
        expect.objectContaining({ filters: undefined }),
        expect.anything()
      );
    });
  });
});
