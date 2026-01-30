/**
 * UserApplicationService Tests
 *
 * Tests user registration, authentication, approval workflow, and profile management.
 */

import { UserApplicationService } from './UserApplicationService';
import { User } from '@domain/entities/User';
import { UserRole } from '@domain/valueObjects/UserRole';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { EventBus } from '@application/contracts/EventBus';

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid'),
}));

describe('UserApplicationService', () => {
  let service: UserApplicationService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAccessControl: jest.Mocked<AccessControlService>;
  let mockPersonRepository: jest.Mocked<PersonRepository>;
  let mockResearcherRepository: jest.Mocked<ResearcherRepository>;
  let mockConfigurationRepository: jest.Mocked<ConfigurationRepository>;
  let mockEventBus: jest.Mocked<EventBus>;

  const createMockUser = (overrides?: Partial<{
    id: string;
    username: string;
    passwordHash: string;
    apiKey: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    lastActivity: string;
    researcherId?: string;
  }>): User => {
    const now = new Date().toISOString();
    return User.fromData({
      id: 'user-123',
      username: 'testuser',
      passwordHash: '$2b$10$validhash',
      apiKey: 'api-key-123',
      role: 'user',
      status: 'approved',
      createdAt: now,
      lastActivity: now,
      ...overrides,
    });
  };

  const createMockAdmin = (): User => {
    return createMockUser({
      id: 'admin-123',
      username: 'admin',
      role: 'admin',
    });
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findByApiKey: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findByStatus: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      isEmpty: jest.fn().mockResolvedValue(false),
      usernameExists: jest.fn().mockResolvedValue(false),
      apiKeyExists: jest.fn().mockResolvedValue(false),
      emailExists: jest.fn().mockResolvedValue(false),
      countByRole: jest.fn().mockResolvedValue(2),
    } as unknown as jest.Mocked<UserRepository>;

    mockAccessControl = {
      requireCanManageUsers: jest.fn(),
    } as unknown as jest.Mocked<AccessControlService>;

    mockPersonRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PersonRepository>;

    mockResearcherRepository = {
      findById: jest.fn(),
      findByPersonId: jest.fn(),
      nameExists: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ResearcherRepository>;

    mockConfigurationRepository = {
      getCurrent: jest.fn().mockResolvedValue(null),
      getSecurityConfig: jest.fn().mockResolvedValue({
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
      }),
    } as unknown as jest.Mocked<ConfigurationRepository>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    service = new UserApplicationService(
      mockUserRepository,
      mockAccessControl,
      mockPersonRepository,
      mockResearcherRepository,
      mockConfigurationRepository,
      mockEventBus
    );
  });

  describe('verifySession()', () => {
    it('should return auth response for valid session', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findByApiKey.mockResolvedValue(mockUser);

      const result = await service.verifySession('api-key-123');

      expect(result.success).toBe(true);
      expect(result.user.id).toBe('user-123');
    });

    it('should throw PermissionError for invalid API key', async () => {
      mockUserRepository.findByApiKey.mockResolvedValue(null);

      await expect(service.verifySession('invalid-key')).rejects.toThrow(PermissionError);
    });

    it('should throw PermissionError for expired session', async () => {
      // Create user with old createdAt and lastActivity to simulate expired session
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 2);
      const expiredUser = createMockUser({
        createdAt: oldDate.toISOString(),
        lastActivity: oldDate.toISOString(),
      });
      mockUserRepository.findByApiKey.mockResolvedValue(expiredUser);

      await expect(service.verifySession('api-key-123')).rejects.toThrow(PermissionError);
    });
  });

  describe('registerWithPassword()', () => {
    it('should create first user as approved admin', async () => {
      mockUserRepository.isEmpty.mockResolvedValue(true);

      const result = await service.registerWithPassword({
        username: 'firstuser',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should create subsequent users as pending', async () => {
      mockUserRepository.isEmpty.mockResolvedValue(false);

      const result = await service.registerWithPassword({
        username: 'newuser',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
    });

    it('should throw ValidationError for duplicate username', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(createMockUser());

      await expect(
        service.registerWithPassword({
          username: 'testuser',
          password: 'Password123!',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('login()', () => {
    it('should return auth response for valid credentials', async () => {
      const mockUser = User.createWithPassword('testuser', 'Password123!', UserRole.user());
      mockUser.approve(createMockAdmin());
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await service.login({
        username: 'testuser',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw PermissionError for invalid password', async () => {
      const mockUser = User.createWithPassword('testuser', 'Password123!', UserRole.user());
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.login({
          username: 'testuser',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(PermissionError);
    });

    it('should throw PermissionError for pending user', async () => {
      const pendingUser = createMockUser({ status: 'pending' });
      mockUserRepository.findByUsername.mockResolvedValue(pendingUser);

      await expect(
        service.login({
          username: 'testuser',
          password: 'Password123!',
        })
      ).rejects.toThrow(PermissionError);
    });

    it('should throw PermissionError for rejected user', async () => {
      const rejectedUser = createMockUser({ status: 'rejected' });
      mockUserRepository.findByUsername.mockResolvedValue(rejectedUser);

      await expect(
        service.login({
          username: 'testuser',
          password: 'Password123!',
        })
      ).rejects.toThrow(PermissionError);
    });

    it('should accept email as login identifier', async () => {
      const mockUser = User.createWithPassword('testuser', 'Password123!', UserRole.user());
      mockUser.approve(createMockAdmin());
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        username: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('isFirstTimeSetup()', () => {
    it('should return true when no users exist', async () => {
      mockUserRepository.isEmpty.mockResolvedValue(true);

      const result = await service.isFirstTimeSetup();

      expect(result).toBe(true);
    });

    it('should return false when users exist', async () => {
      mockUserRepository.isEmpty.mockResolvedValue(false);

      const result = await service.isFirstTimeSetup();

      expect(result).toBe(false);
    });
  });

  describe('getAllUsers()', () => {
    it('should return approved users for admin', async () => {
      const admin = createMockAdmin();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findAll.mockResolvedValue([createMockUser()]);

      const result = await service.getAllUsers('admin-api-key');

      expect(mockAccessControl.requireCanManageUsers).toHaveBeenCalledWith(admin);
      expect(result).toHaveLength(1);
    });

    it('should filter out pending users', async () => {
      const admin = createMockAdmin();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findAll.mockResolvedValue([
        createMockUser({ status: 'approved' }),
        createMockUser({ id: 'pending-user', status: 'pending' }),
      ]);

      const result = await service.getAllUsers('admin-api-key');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-123');
    });
  });

  describe('getUserById()', () => {
    it('should return user for admin', async () => {
      const admin = createMockAdmin();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(createMockUser());

      const result = await service.getUserById('user-123', 'admin-api-key');

      expect(result.id).toBe('user-123');
    });

    it('should return user viewing self', async () => {
      const user = createMockUser();
      mockUserRepository.findByApiKey.mockResolvedValue(user);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await service.getUserById('user-123', 'user-api-key');

      expect(result.id).toBe('user-123');
    });

    it('should throw PermissionError for non-admin viewing other user', async () => {
      const user = createMockUser();
      const otherUser = createMockUser({ id: 'other-user' });
      mockUserRepository.findByApiKey.mockResolvedValue(user);
      mockUserRepository.findById.mockResolvedValue(otherUser);

      await expect(service.getUserById('other-user', 'user-api-key')).rejects.toThrow(
        PermissionError
      );
    });

    it('should throw NotFoundError for nonexistent user', async () => {
      const admin = createMockAdmin();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent', 'admin-api-key')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateUserRole()', () => {
    it('should update role for valid request', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);

      await service.updateUserRole('user-123', { role: 'admin' }, 'admin-api-key');

      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should prevent admin from changing own role', async () => {
      const admin = createMockAdmin();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(admin);

      await expect(
        service.updateUserRole('admin-123', { role: 'user' }, 'admin-api-key')
      ).rejects.toThrow(PermissionError);
    });

    it('should prevent removing last admin', async () => {
      const admin = createMockAdmin();
      const otherAdmin = createMockUser({ id: 'other-admin', role: 'admin' });
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(otherAdmin);
      mockUserRepository.countByRole.mockResolvedValue(1);

      await expect(
        service.updateUserRole('other-admin', { role: 'user' }, 'admin-api-key')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteUser()', () => {
    it('should delete user when authorized', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);

      await service.deleteUser('user-123', 'admin-api-key');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-123');
    });

    it('should prevent self-deletion', async () => {
      const admin = createMockAdmin();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(admin);

      await expect(service.deleteUser('admin-123', 'admin-api-key')).rejects.toThrow(
        PermissionError
      );
    });

    it('should prevent deleting last admin', async () => {
      const admin = createMockAdmin();
      const otherAdmin = createMockUser({ id: 'other-admin', role: 'admin' });
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(otherAdmin);
      mockUserRepository.countByRole.mockResolvedValue(1);

      await expect(service.deleteUser('other-admin', 'admin-api-key')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('approveUser()', () => {
    it('should approve pending user', async () => {
      const admin = createMockAdmin();
      const pendingUser = User.createWithPassword('pending', 'Password123!', UserRole.user());
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(pendingUser);

      await service.approveUser('pending-id', 'admin-api-key');

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('rejectUser()', () => {
    it('should reject pending user', async () => {
      const admin = createMockAdmin();
      const pendingUser = User.createWithPassword('pending', 'Password123!', UserRole.user());
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(pendingUser);

      await service.rejectUser('pending-id', 'admin-api-key');

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('getPendingUsers()', () => {
    it('should return pending users for admin', async () => {
      const admin = createMockAdmin();
      const pendingUser = createMockUser({ status: 'pending' });
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findByStatus.mockResolvedValue([pendingUser]);

      const result = await service.getPendingUsers('admin-api-key');

      expect(mockUserRepository.findByStatus).toHaveBeenCalledWith('pending');
      expect(result).toHaveLength(1);
    });
  });

  describe('linkResearcherToUser()', () => {
    it('should link researcher to user', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser({ researcherId: undefined });
      const mockResearcher = { id: 'researcher-1', personId: 'person-1' };
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockResearcherRepository.findById.mockResolvedValue(mockResearcher as never);

      await service.linkResearcherToUser('user-123', 'researcher-1', 'admin-api-key');

      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError for nonexistent researcher', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser();
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockResearcherRepository.findById.mockResolvedValue(null);

      await expect(
        service.linkResearcherToUser('user-123', 'nonexistent', 'admin-api-key')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if user already has researcher', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser({ researcherId: 'existing-researcher' });
      const mockResearcher = { id: 'researcher-1', personId: 'person-1' };
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockResearcherRepository.findById.mockResolvedValue(mockResearcher as never);

      await expect(
        service.linkResearcherToUser('user-123', 'researcher-1', 'admin-api-key')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('unlinkResearcherFromUser()', () => {
    it('should unlink researcher from user', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser({ researcherId: 'researcher-1' });
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);

      await service.unlinkResearcherFromUser('user-123', 'admin-api-key');

      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ValidationError if user has no researcher', async () => {
      const admin = createMockAdmin();
      const targetUser = createMockUser({ researcherId: undefined });
      mockUserRepository.findByApiKey.mockResolvedValue(admin);
      mockUserRepository.findById.mockResolvedValue(targetUser);

      await expect(service.unlinkResearcherFromUser('user-123', 'admin-api-key')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('getCurrentUser()', () => {
    it('should return current user info', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findByApiKey.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser('api-key-123');

      expect(result.id).toBe('user-123');
      expect(result.username).toBe('testuser');
    });
  });
});
