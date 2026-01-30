/**
 * Admin Service Tests
 *
 * Tests admin API operations for user management and system administration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminService } from './AdminService';

const mockHttpClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getBlob: vi.fn(),
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

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService();
  });

  describe('getUsers()', () => {
    it('should return list of users', async () => {
      const mockUsers = [
        { id: 'user-1', username: 'admin', role: 'admin' },
        { id: 'user-2', username: 'user', role: 'user' },
      ];

      mockHttpClient.get.mockResolvedValue({
        data: { success: true, data: { users: mockUsers } },
      });

      const result = await service.getUsers();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/admin/users');
      expect(result.success).toBe(true);
      expect(result.users).toEqual(mockUsers);
    });

    it('should throw on API error', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('API error'));

      await expect(service.getUsers()).rejects.toThrow('API error');
    });
  });

  describe('updateUserRole()', () => {
    it('should update user role', async () => {
      mockHttpClient.put.mockResolvedValue({ data: { success: true } });

      const result = await service.updateUserRole('user-1', 'admin');

      expect(mockHttpClient.put).toHaveBeenCalledWith('/admin/users/user-1/role', {
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteUser()', () => {
    it('should delete user', async () => {
      mockHttpClient.delete.mockResolvedValue({ data: { success: true } });

      const result = await service.deleteUser('user-1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/admin/users/user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('getPendingUsers()', () => {
    it('should return pending users', async () => {
      const mockPending = [{ id: 'pending-1', username: 'newuser', status: 'pending' }];

      mockHttpClient.get.mockResolvedValue({
        data: { success: true, data: { users: mockPending } },
      });

      const result = await service.getPendingUsers();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/admin/users/pending');
      expect(result.users).toEqual(mockPending);
    });
  });

  describe('approveUser()', () => {
    it('should approve pending user', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      const result = await service.approveUser('user-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/admin/users/user-1/approve');
      expect(result.success).toBe(true);
    });
  });

  describe('rejectUser()', () => {
    it('should reject pending user', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      const result = await service.rejectUser('user-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/admin/users/user-1/reject');
      expect(result.success).toBe(true);
    });
  });

  describe('linkResearcherToUser()', () => {
    it('should link researcher to user', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      const result = await service.linkResearcherToUser('user-1', 'researcher-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/admin/users/user-1/link-researcher', {
        researcherId: 'researcher-1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('unlinkResearcherFromUser()', () => {
    it('should unlink researcher from user', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { success: true } });

      const result = await service.unlinkResearcherFromUser('user-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/admin/users/user-1/unlink-researcher');
      expect(result.success).toBe(true);
    });
  });

  describe('resetUserPassword()', () => {
    it('should reset user password', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { success: true, message: 'Password reset' },
      });

      const result = await service.resetUserPassword('user-1', 'newpassword', true);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/admin/users/user-1/reset-password', {
        newPassword: 'newpassword',
        requirePasswordChange: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('generatePasswordResetToken()', () => {
    it('should generate password reset token', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            resetUrl: 'http://example.com/reset?token=abc123',
            expiresAt: '2024-01-01T00:15:00Z',
            message: 'Token generated',
          },
        },
      });

      const result = await service.generatePasswordResetToken('user-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/admin/users/user-1/generate-reset-token');
      expect(result.resetUrl).toContain('token=');
    });
  });

  describe('getResearchers()', () => {
    it('should return researchers', async () => {
      const mockResearchers = [{ id: 'r-1', firstName: 'John', lastName: 'Doe' }];

      mockHttpClient.get.mockResolvedValue({
        data: { success: true, data: { researchers: mockResearchers } },
      });

      const result = await service.getResearchers();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/admin/researchers');
      expect(result.researchers).toEqual(mockResearchers);
    });
  });

  describe('deleteResearcher()', () => {
    it('should delete researcher', async () => {
      mockHttpClient.delete.mockResolvedValue({ data: { success: true } });

      const result = await service.deleteResearcher('researcher-1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/admin/researchers/researcher-1');
      expect(result.success).toBe(true);
    });
  });

  describe('getMetrics()', () => {
    it('should return system metrics', async () => {
      const mockMetrics = { totalTubes: 100, totalUsers: 10, totalResearchers: 5 };

      mockHttpClient.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await service.getMetrics();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/admin/metrics');
      expect(result.data).toEqual(mockMetrics);
    });
  });

  describe('getSecurityConfig()', () => {
    it('should return security configuration', async () => {
      const mockConfig = { enableRateLimiting: true, sessionTimeoutMinutes: 30 };

      mockHttpClient.get.mockResolvedValue({
        data: { success: true, data: { config: mockConfig } },
      });

      const result = await service.getSecurityConfig();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/admin/security-config');
      expect(result.config).toEqual(mockConfig);
    });
  });

  describe('updateSecurityConfig()', () => {
    it('should update security configuration', async () => {
      mockHttpClient.put.mockResolvedValue({
        data: { success: true, data: { config: {} } },
      });

      const result = await service.updateSecurityConfig({ enableRateLimiting: false });

      expect(mockHttpClient.put).toHaveBeenCalledWith('/admin/security-config', {
        enableRateLimiting: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getAuditLog()', () => {
    it('should return audit log entries', async () => {
      const mockEntries = [{ id: '1', action: 'login', username: 'admin' }];

      mockHttpClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            entries: mockEntries,
            pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
          },
        },
      });

      const result = await service.getAuditLog({ limit: 50 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/admin/audit?limit=50');
      expect(result.entries).toEqual(mockEntries);
    });

    it('should build query params correctly', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            entries: [],
            pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
          },
        },
      });

      await service.getAuditLog({
        limit: 10,
        offset: 5,
        username: 'admin',
        action: 'login',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/admin/audit?limit=10&offset=5&username=admin&action=login'
      );
    });
  });

  describe('exportTubes()', () => {
    it('should export tubes as CSV blob', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      mockHttpClient.getBlob.mockResolvedValue(mockBlob);

      const result = await service.exportTubes('csv');

      expect(mockHttpClient.getBlob).toHaveBeenCalledWith('/admin/export/tubes?format=csv');
      expect(result).toBe(mockBlob);
    });

    it('should export tubes as JSON blob', async () => {
      const mockBlob = new Blob(['[]'], { type: 'application/json' });
      mockHttpClient.getBlob.mockResolvedValue(mockBlob);

      const result = await service.exportTubes('json');

      expect(mockHttpClient.getBlob).toHaveBeenCalledWith('/admin/export/tubes?format=json');
      expect(result).toBe(mockBlob);
    });
  });
});
