/**
 * HTTP Client Tests
 *
 * Tests API communication, error handling, response transformation, and auth management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

import { HttpClient, OfflineWriteError, isOfflineError } from './httpClient';

// Mock network state module
const mockIsOffline = vi.fn().mockReturnValue(false);
vi.mock('@infra/connection/networkState', () => ({
  isOffline: () => mockIsOffline(),
}));

// Mock response transformers
vi.mock('./responseTransformers', () => ({
  transformApiResponse: vi.fn(data => data),
  ResponseTransformers: {
    LoginResponse: vi.fn(data => data),
    RefreshResponse: vi.fn(data => data),
    Person: vi.fn(data => data),
    ActiveSession: vi.fn(data => data),
    Researcher: vi.fn(data => data),
    AdminUser: vi.fn(data => data),
    SystemMetrics: vi.fn(data => data),
    AuditLogEntry: vi.fn(data => data),
  },
}));

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let originalFetch: typeof global.fetch;

  const mockSuccessResponse = (data: unknown, status = 200) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(data),
    } as Response);
  };

  const mockErrorResponse = (error: unknown, status = 400) => {
    return Promise.resolve({
      ok: false,
      status,
      statusText: 'Bad Request',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(error),
    } as Response);
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockIsOffline.mockReturnValue(false);
    httpClient = new HttpClient({ baseURL: '/api', timeout: 5000 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should use default config when none provided', () => {
      const client = new HttpClient();
      expect(client).toBeDefined();
    });

    it('should use provided config', () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        timeout: 30000,
        headers: { 'X-Custom': 'header' },
      });
      expect(client).toBeDefined();
    });
  });

  describe('GET Requests', () => {
    it('should make GET request and return response', async () => {
      const mockData = { success: true, data: { id: '1', name: 'Test' } };
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse(mockData));

      const result = await httpClient.get('/users/1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/1',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(200);
    });

    it('should handle full URLs without prepending base', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({ data: 'ok' }));

      await httpClient.get('https://external.com/api/data');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://external.com/api/data',
        expect.any(Object)
      );
    });

    it('should include custom headers', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({}));

      await httpClient.get('/test', { 'X-Custom': 'value' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Custom': 'value' }),
        })
      );
    });
  });

  describe('POST Requests', () => {
    it('should make POST request with body', async () => {
      const requestBody = { name: 'Test', value: 123 };
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: { id: '1' } })
      );

      const result = await httpClient.post('/items', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result.status).toBe(200);
    });

    it('should handle POST without body', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({ success: true }));

      await httpClient.post('/action');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/action',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUT Requests', () => {
    it('should make PUT request with body', async () => {
      const requestBody = { name: 'Updated' };
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: requestBody })
      );

      const result = await httpClient.put('/items/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result.status).toBe(200);
    });
  });

  describe('DELETE Requests', () => {
    it('should make DELETE request', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({ success: true }));

      const result = await httpClient.delete('/items/1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items/1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should throw ApiError for HTTP errors with envelope', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        mockErrorResponse({ error: 'Not found', code: 'NOT_FOUND', details: {} }, 404)
      );

      await expect(httpClient.get('/missing')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should throw ApiError for HTTP errors without envelope', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        mockErrorResponse({ message: 'Server error' }, 500)
      );

      await expect(httpClient.get('/error')).rejects.toMatchObject({
        message: 'Server error',
        status: 500,
      });
    });

    it('should handle non-JSON error responses', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
          json: () => Promise.reject(new Error('Not JSON')),
        } as Response)
      );

      await expect(httpClient.get('/error')).rejects.toThrow();
    });

    it('should propagate Error instances', async () => {
      const networkError = new Error('Network failed');
      vi.mocked(global.fetch).mockRejectedValue(networkError);

      await expect(httpClient.get('/test')).rejects.toThrow('Network failed');
    });
  });

  describe('Offline Detection', () => {
    it('should block POST when offline', async () => {
      mockIsOffline.mockReturnValue(true);

      await expect(httpClient.post('/items', { data: 'test' })).rejects.toThrow(OfflineWriteError);
    });

    it('should block PUT when offline', async () => {
      mockIsOffline.mockReturnValue(true);

      await expect(httpClient.put('/items/1', { data: 'test' })).rejects.toThrow(OfflineWriteError);
    });

    it('should block DELETE when offline', async () => {
      mockIsOffline.mockReturnValue(true);

      await expect(httpClient.delete('/items/1')).rejects.toThrow(OfflineWriteError);
    });

    it('should allow GET when offline (cached)', async () => {
      mockIsOffline.mockReturnValue(true);
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({ data: 'cached' }));

      const result = await httpClient.get('/data');

      expect(result.data).toEqual({ data: 'cached' });
    });
  });

  describe('isOfflineError()', () => {
    it('should return true for OfflineWriteError instance', () => {
      const error = new OfflineWriteError();
      expect(isOfflineError(error)).toBe(true);
    });

    it('should return true for object with OFFLINE_WRITE_BLOCKED code', () => {
      const error = { code: 'OFFLINE_WRITE_BLOCKED', message: 'Offline' };
      expect(isOfflineError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isOfflineError(new Error('Regular error'))).toBe(false);
      expect(isOfflineError({ code: 'OTHER_ERROR' })).toBe(false);
      expect(isOfflineError(null)).toBe(false);
    });
  });

  describe('getData()', () => {
    it('should unwrap envelope and validate with schema', async () => {
      const schema = z.object({ id: z.string(), name: z.string() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: { id: '1', name: 'Test' } })
      );

      const result = await httpClient.getData('/items/1', schema);

      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should throw on validation failure', async () => {
      const schema = z.object({ id: z.number() }); // id should be number
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: { id: 'string-id' } })
      );

      await expect(httpClient.getData('/items/1', schema)).rejects.toThrow();
    });
  });

  describe('getArray()', () => {
    it('should unwrap envelope and return array', async () => {
      const schema = z.object({ id: z.string() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: [{ id: '1' }, { id: '2' }] })
      );

      const result = await httpClient.getArray('/items', schema);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
    });
  });

  describe('postData()', () => {
    it('should post and unwrap response', async () => {
      const responseSchema = z.object({ id: z.string(), created: z.boolean() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: { id: '1', created: true } })
      );

      const result = await httpClient.postData('/items', { name: 'New' }, responseSchema);

      expect(result).toEqual({ id: '1', created: true });
    });
  });

  describe('putData()', () => {
    it('should put and unwrap response', async () => {
      const responseSchema = z.object({ id: z.string(), updated: z.boolean() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: { id: '1', updated: true } })
      );

      const result = await httpClient.putData('/items/1', { name: 'Updated' }, responseSchema);

      expect(result).toEqual({ id: '1', updated: true });
    });
  });

  describe('deleteData()', () => {
    it('should delete and return void', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({ success: true }));

      await expect(httpClient.deleteData('/items/1')).resolves.toBeUndefined();
    });
  });

  describe('deleteWithData()', () => {
    it('should delete and return data', async () => {
      const responseSchema = z.object({ deleted: z.boolean() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: { deleted: true } })
      );

      const result = await httpClient.deleteWithData('/items/1', responseSchema);

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('getPaginated()', () => {
    it('should return items with pagination', async () => {
      const schema = z.object({ id: z.string() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({
          success: true,
          data: [{ id: '1' }, { id: '2' }],
          pagination: {
            total: 10,
            page: 1,
            limit: 2,
            totalPages: 5,
            hasNext: true,
            hasPrev: false,
          },
        })
      );

      const result = await httpClient.getPaginated('/items', schema);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should provide default pagination when not in response', async () => {
      const schema = z.object({ id: z.string() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({ success: true, data: [{ id: '1' }] })
      );

      const result = await httpClient.getPaginated('/items', schema);

      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('postBatch()', () => {
    it('should handle batch response', async () => {
      const schema = z.object({ id: z.string() });
      vi.mocked(global.fetch).mockImplementation(() =>
        mockSuccessResponse({
          success: true,
          data: {
            successful: [{ id: '1' }, { id: '2' }],
            failed: [],
            summary: { total: 2, successful: 2, failed: 0 },
          },
        })
      );

      const result = await httpClient.postBatch('/items/batch', [{ name: 'A' }], schema);

      expect(result.successful).toHaveLength(2);
    });
  });

  describe('Auth Token Management', () => {
    it('should set auth token in headers', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({}));

      httpClient.setAuthToken('test-token-123');
      await httpClient.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should remove auth token', async () => {
      vi.mocked(global.fetch).mockImplementation(() => mockSuccessResponse({}));

      httpClient.setAuthToken('token');
      httpClient.removeAuthToken();
      await httpClient.get('/public');

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('Response Transformation', () => {
    it('should apply transformation for tubes endpoint', () => {
      const mockData = { id: '1', createdAt: '2025-01-01T00:00:00Z' };

      const result = httpClient.applyResponseTransformation(mockData, '/tubes/1');

      expect(result).toBeDefined();
    });

    it('should apply transformation for auth login', () => {
      const mockData = { tokens: { accessToken: 'token' } };

      const result = httpClient.applyResponseTransformation(mockData, '/auth/login');

      expect(result).toBeDefined();
    });

    it('should apply transformation for users endpoints', () => {
      const mockData = { id: '1', username: 'test' };

      const result = httpClient.applyResponseTransformation(mockData, '/admin/users');

      expect(result).toBeDefined();
    });

    it('should apply generic transformation for unknown endpoints', () => {
      const mockData = { unknown: 'data' };

      const result = httpClient.applyResponseTransformation(mockData, '/unknown/endpoint');

      expect(result).toBeDefined();
    });

    it('should handle null data', () => {
      const result = httpClient.applyResponseTransformation(null, '/test');

      expect(result).toBeNull();
    });
  });

  describe('getBlob()', () => {
    it('should return blob for file downloads', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/octet-stream' });
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          blob: () => Promise.resolve(mockBlob),
        } as Response)
      );

      const result = await httpClient.getBlob('/files/download');

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle blob download errors', async () => {
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Headers(),
          json: () => Promise.resolve({ error: 'File not found', code: 'NOT_FOUND' }),
        } as Response)
      );

      await expect(httpClient.getBlob('/files/missing')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
