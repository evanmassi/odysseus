/**
 * UserRepository Tests
 *
 * Tests data access layer for user persistence operations.
 */

import { UserRepository } from './UserRepository';
import { User } from '@domain/entities/User';
import { EmailAlreadyExistsError } from '@domain/errors/UserErrors';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import type { UserRow } from '@infrastructure/database/mappers/UserMapper';
import type { QueryResult } from 'pg';

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock database errors
jest.mock('@infrastructure/database/DatabaseErrors', () => ({
  isEmailConstraintError: jest.fn(() => false),
}));

// Mock crypto for token verification
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  pbkdf2Sync: jest.fn(() => Buffer.from('mockhash')),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockContext: jest.Mocked<PostgresContext>;

  const createMockUserRow = (overrides: Partial<UserRow> = {}): UserRow => ({
    id: 'user-123',
    username: 'testuser',
    api_key: 'api_key_12345678901234567890',
    role: 'user',
    password_hash: 'hashedpassword',
    salt: 'randomsalt',
    created_at: new Date(),
    researcher_id: undefined,
    person_id: 'person-123',
    status: 'approved',
    email_verified: true,
    email_verification_token: undefined,
    email_verification_expiry: undefined,
    last_verification_email_sent: undefined,
    password_reset_token: undefined,
    password_reset_expiry: undefined,
    require_password_change: false,
    last_password_change: undefined,
    settings: '{}',
    ...overrides,
  });

  const createMockQueryResult = (rowCount: number): QueryResult => ({
    rows: [],
    command: 'UPDATE',
    oid: 0,
    fields: [],
    rowCount,
  });

  beforeEach(() => {
    mockContext = {
      queryOne: jest.fn(),
      queryMany: jest.fn(),
      queryByIds: jest.fn(),
      execute: jest.fn(),
      isHealthy: jest.fn(),
    } as unknown as jest.Mocked<PostgresContext>;

    userRepository = new UserRepository(mockContext);
    jest.clearAllMocks();
  });

  describe('findById()', () => {
    it('should return user when found', async () => {
      mockContext.queryOne.mockResolvedValue(createMockUserRow());

      const result = await userRepository.findById('user-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
    });

    it('should return null when not found', async () => {
      mockContext.queryOne.mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername()', () => {
    it('should find user by username', async () => {
      mockContext.queryOne.mockResolvedValue(createMockUserRow({ username: 'john' }));

      const result = await userRepository.findByUsername('john');

      expect(result?.username).toBe('john');
    });
  });

  describe('findByApiKey()', () => {
    it('should find user by API key', async () => {
      const mockRow = createMockUserRow();
      mockContext.queryOne.mockResolvedValue(mockRow);

      const result = await userRepository.findByApiKey('api_key_12345678901234567890');

      expect(result).not.toBeNull();
    });
  });

  describe('findByEmail()', () => {
    it('should find user by email (case-insensitive)', async () => {
      mockContext.queryOne.mockResolvedValue(createMockUserRow());

      await userRepository.findByEmail('Test@Example.com');

      expect(mockContext.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(p.email)'),
        ['test@example.com']
      );
    });

    it('should trim email whitespace', async () => {
      mockContext.queryOne.mockResolvedValue(createMockUserRow());

      await userRepository.findByEmail('  test@example.com  ');

      expect(mockContext.queryOne).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });
  });

  describe('findByResearcherId()', () => {
    it('should find user linked to researcher', async () => {
      const mockRow = createMockUserRow({ researcher_id: 'researcher-1' });
      mockContext.queryOne.mockResolvedValue(mockRow);

      const result = await userRepository.findByResearcherId('researcher-1');

      expect(result).not.toBeNull();
    });
  });

  describe('findAll()', () => {
    it('should return all users ordered by creation date', async () => {
      const mockRows = [createMockUserRow()];
      mockContext.queryMany.mockResolvedValue(mockRows);

      const result = await userRepository.findAll();

      expect(result).toHaveLength(1);
      expect(mockContext.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at')
      );
    });
  });

  describe('findByIds()', () => {
    it('should return users for given IDs', async () => {
      const mockRows = [
        createMockUserRow({ id: 'user-1' }),
        createMockUserRow({ id: 'user-2' }),
      ];
      mockContext.queryByIds.mockResolvedValue(mockRows);

      const result = await userRepository.findByIds(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
    });
  });

  describe('save()', () => {
    it('should insert or update user', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(1));

      const user = User.create('newuser', 'api_key_12345678901234567890', false);
      await userRepository.save(user);

      expect(mockContext.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
    });

    it('should throw EmailAlreadyExistsError on email constraint violation', async () => {
      const { isEmailConstraintError } = require('@infrastructure/database/DatabaseErrors');
      isEmailConstraintError.mockReturnValue(true);
      mockContext.execute.mockRejectedValue(new Error('unique constraint'));

      const user = User.create('newuser', 'api_key_12345678901234567890', false);

      await expect(userRepository.save(user)).rejects.toThrow(EmailAlreadyExistsError);
    });
  });

  describe('delete()', () => {
    it('should return true when user deleted', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(1));

      const result = await userRepository.delete('user-123');

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(0));

      const result = await userRepository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('usernameExists()', () => {
    it('should return true when username exists', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '1' });

      const result = await userRepository.usernameExists('testuser');

      expect(result).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '0' });

      const result = await userRepository.usernameExists('newuser');

      expect(result).toBe(false);
    });
  });

  describe('emailExists()', () => {
    it('should return true when email exists', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '1' });

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should normalize email before checking', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '0' });

      await userRepository.emailExists('  Test@Example.COM  ');

      expect(mockContext.queryOne).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });
  });

  describe('findByRole()', () => {
    it('should find users by role', async () => {
      const mockRows = [createMockUserRow({ role: 'admin' })];
      mockContext.queryMany.mockResolvedValue(mockRows);

      const result = await userRepository.findByRole('admin');

      expect(result).toHaveLength(1);
      expect(mockContext.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('WHERE role = $1'),
        ['admin']
      );
    });
  });

  describe('findByStatus()', () => {
    it('should find users by status', async () => {
      const mockRows = [createMockUserRow({ status: 'pending' })];
      mockContext.queryMany.mockResolvedValue(mockRows);

      const result = await userRepository.findByStatus('pending');

      expect(result).toHaveLength(1);
    });
  });

  describe('countByRole()', () => {
    it('should return count of users by role', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '5' });

      const result = await userRepository.countByRole('admin');

      expect(result).toBe(5);
    });
  });

  describe('isEmpty()', () => {
    it('should return true when no users exist', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '0' });

      const result = await userRepository.isEmpty();

      expect(result).toBe(true);
    });

    it('should return false when users exist', async () => {
      mockContext.queryOne.mockResolvedValue({ count: '5' });

      const result = await userRepository.isEmpty();

      expect(result).toBe(false);
    });
  });

  describe('updateRole()', () => {
    it('should update user role', async () => {
      mockContext.execute.mockResolvedValue(createMockQueryResult(1));

      const result = await userRepository.updateRole('user-123', 'admin');

      expect(result).toBe(true);
      expect(mockContext.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET role'),
        ['admin', 'user-123']
      );
    });
  });

  describe('isHealthy()', () => {
    it('should delegate to context health check', async () => {
      mockContext.isHealthy.mockResolvedValue(true);

      const result = await userRepository.isHealthy();

      expect(result).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return user statistics', async () => {
      mockContext.queryOne
        .mockResolvedValueOnce({ count: '10' }) // total
        .mockResolvedValueOnce({ count: '2' }) // admin count
        .mockResolvedValueOnce({ count: '8' }) // user count
        .mockResolvedValueOnce({ id: 'oldest', username: 'first', created_at: new Date() })
        .mockResolvedValueOnce({ id: 'newest', username: 'last', created_at: new Date() });

      const stats = await userRepository.getStats();

      expect(stats.totalUsers).toBe(10);
      expect(stats.adminCount).toBe(2);
      expect(stats.regularUserCount).toBe(8);
    });
  });

  describe('search()', () => {
    it('should search users with username filter', async () => {
      mockContext.queryMany.mockResolvedValue([createMockUserRow()]);

      const result = await userRepository.search({ username: 'test' });

      expect(mockContext.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('username ILIKE'),
        expect.arrayContaining(['%test%'])
      );
      expect(result).toHaveLength(1);
    });

    it('should search users with role filter', async () => {
      mockContext.queryMany.mockResolvedValue([createMockUserRow({ role: 'admin' })]);

      await userRepository.search({ role: 'admin' });

      expect(mockContext.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('role ='),
        expect.arrayContaining(['admin'])
      );
    });

    it('should support pagination', async () => {
      mockContext.queryMany.mockResolvedValue([]);

      await userRepository.search({ limit: 10, offset: 20 });

      expect(mockContext.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 20])
      );
    });
  });
});
