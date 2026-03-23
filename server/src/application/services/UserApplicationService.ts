/**
 * User Management Service
 *
 * Orchestrates user CRUD, authentication, registration, and approval workflows.
 */

import { PasswordValidator } from '@odysseus/shared-schemas';
import { nanoid } from 'nanoid';

import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import { UserDto } from '@application/dto/UserDto';
import type { UserResponse, AuthResponse, UpdateUserRoleRequest, RegisterRequest, PasswordLoginRequest } from '@application/dto/UserDto';
import { Person } from '@domain/entities/Person';
import { Researcher } from '@domain/entities/Researcher';
import { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EmailAlreadyExistsError } from '@domain/errors/UserErrors';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent,
  UserDeactivatedEvent,
  UserSuspendedEvent,
  UserReactivatedEvent
} from '@domain/events/UserEvents';
import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import { UserRole } from '@domain/value-objects/UserRole';

import type { RegisterWithProfileRequest } from '@odysseus/shared-schemas';



export type EnrichedPublicUser = ReturnType<User['toPublicData']> & {
  firstName?: string;
  lastName?: string;
};

export class UserApplicationService {
  constructor(
    private userRepository: UserRepository,
    private accessControlService: AccessControlService,
    private personRepository?: PersonRepository,
    private researcherRepository?: ResearcherRepository,
    private storageRepository?: StorageRepository,
    private eventBus?: EventBus,
    private inviteCodeRepository?: InviteCodeRepository,
    private labRepository?: LabRepository,
    private userSessionRepository?: UserSessionRepository,
    private passwordService?: PasswordService
  ) {}

  /**
   * First user: auto-approved as admin.
   * Subsequent users: pending (requires admin approval).
   */
  async registerWithPassword(request: RegisterRequest): Promise<AuthResponse> {
    const isFirstUser = await this.userRepository.isEmpty();
    const targetRole = isFirstUser ? 'admin' : (request.role ?? 'user');
    const status = isFirstUser ? 'approved' : 'pending';

    const existingUser = await this.userRepository.findByUsername(request.username);
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    const user = User.createWithPassword(
      request.username,
      request.password,
      UserRole.create(targetRole),
      undefined, // No researcher link
      status
    );

    await this.userRepository.save(user);

    return UserDto.toAuthResponse(user);
  }

  /** Accepts username or email as the identifier. */
  async login(request: PasswordLoginRequest): Promise<AuthResponse> {
    const input = request.username.trim();
    const isEmail = input.includes('@');

    const user = isEmail
      ? await this.userRepository.findByEmail(input)
      : await this.userRepository.findByUsername(input);

    if (!user) {
      throw new PermissionError('Invalid credentials');
    }

    if (user.isPending()) {
      throw new PermissionError('Account is awaiting administrator approval');
    }

    if (user.isRejected()) {
      throw new PermissionError('Account access has been denied');
    }

    if (user.isDeactivated()) {
      throw new PermissionError('Account has been deactivated. Contact your lab administrator');
    }

    if (user.isSuspended()) {
      throw new PermissionError('Account has been suspended. Contact your system administrator');
    }

    if (!user.isApproved()) {
      throw new PermissionError('Account is not approved for access');
    }

    user.recordActivity();
    await this.userRepository.save(user);

    return UserDto.toAuthResponse(user);
  }

  async isFirstTimeSetup(): Promise<{ isEmpty: boolean; needsSystemAdmin: boolean }> {
    const isEmpty = await this.userRepository.isEmpty();
    const systemAdminCount = await this.userRepository.countByRole('system_admin');
    return { isEmpty, needsSystemAdmin: systemAdminCount === 0 };
  }

  /**
   * Returns non-pending lab users enriched with Person names.
   * Name resolution priority: direct personId link, then linked researcher's person.
   */
  async getEnrichedLabUsers(labId: string): Promise<EnrichedPublicUser[]> {
    const users = await this.userRepository.findByLabId(labId);
    const nonPendingUsers = users.filter(u => !u.isPending());
    const publicDataList = nonPendingUsers.map(u => u.toPublicData());

    if (!this.personRepository || !this.researcherRepository) {
      return publicDataList;
    }

    const directPersonIds = publicDataList
      .map(u => u.personId)
      .filter((id): id is string => id != null);
    const researcherIds = publicDataList
      .map(u => u.researcherId)
      .filter((id): id is string => id != null);

    const [directPersons, researchers] = await Promise.all([
      this.personRepository.findByIds(directPersonIds),
      this.researcherRepository.findByIds(researcherIds)
    ]);

    const researcherPersonIds = researchers
      .map(r => r.personId)
      .filter((id): id is string => id != null);
    const researcherPersons = await this.personRepository.findByIds(researcherPersonIds);

    const directPersonMap = new Map(directPersons.map(p => [p.id, p]));
    const researcherMap = new Map(researchers.map(r => [r.id, r]));
    const researcherPersonMap = new Map(researcherPersons.map(p => [p.id, p]));

    return publicDataList.map(publicData => {
      if (publicData.personId) {
        const person = directPersonMap.get(publicData.personId);
        if (person) {
          return { ...publicData, firstName: person.firstName, lastName: person.lastName };
        }
      }

      if (publicData.researcherId) {
        const researcher = researcherMap.get(publicData.researcherId);
        if (researcher) {
          const person = researcherPersonMap.get(researcher.personId);
          if (person) {
            return { ...publicData, firstName: person.firstName, lastName: person.lastName };
          }
        }
      }

      return publicData;
    });
  }

  async getUserById(id: string, requesterApiKey: string): Promise<UserResponse> {
    const requester = await this.getUserByApiKey(requesterApiKey);
    const user = await this.getUserOrThrow(id);

    // Users can view themselves, admins can view anyone
    if (!requester.isAdmin() && requester.id !== user.id) {
      throw new PermissionError('Cannot view other users', { requesterId: requester.id, targetId: id });
    }

    return UserDto.toResponse(user);
  }

  async updateUserRole(userId: string, request: UpdateUserRoleRequest, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    const targetUser = await this.getUserOrThrow(userId);

    await this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    if (request.role === 'user') {
      await this.ensureNotLastAdmin(targetUser, 'demote');
    }

    targetUser.changeRole(request.role, admin);

    await this.userRepository.save(targetUser);
  }

  /**
   * Unlinks researcher profile but preserves it for tube history.
   * Cleans up orphaned Person if no other entity references it.
   * Rejects deletion if user has assigned racks/boxes.
   */
  async deleteUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    const targetUser = await this.getUserOrThrow(userId);

    await this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);
    admin.requireCanManage(targetUser);

    await this.ensureNotLastAdmin(targetUser, 'delete');

    if (this.storageRepository) {
      const config = admin.labId
        ? await this.storageRepository.getForLab(admin.labId)
        : null;
      if (config) {
        const configData = config.toData();
        let assignedResourceCount = 0;
        const assignedResources: string[] = [];

        for (const tank of configData.tanks) {
          for (const rack of tank.racks) {
            if (rack.assignedUserId === targetUser.id) {
              assignedResourceCount++;
              assignedResources.push(`Rack: ${rack.name}`);
            }
            for (const box of rack.boxes) {
              if (box.assignedUserId === targetUser.id) {
                assignedResourceCount++;
                assignedResources.push(`Box: ${box.name} in ${rack.name}`);
              }
            }
          }
        }

        if (assignedResourceCount > 0) {
          throw new ValidationError(
            `Cannot delete user with ${assignedResourceCount} assigned resource(s). Unassign resources first.`,
            {
              userId: targetUser.id,
              assignedResourceCount,
              assignedResources
            }
          );
        }
      }
    }

    const personId = targetUser.personId;

    // Preserves researcher for tube history
    if (targetUser.hasResearcherProfile()) {
      targetUser.unlinkResearcher();
      await this.userRepository.save(targetUser);
    }

    await this.userRepository.delete(userId);

    if (personId && this.personRepository && this.researcherRepository) {
      const researcherWithPerson = await this.researcherRepository.findByPersonId(personId);
      if (!researcherWithPerson) {
        await this.personRepository.delete(personId);
      }
    }
  }

  async getCurrentUser(apiKey: string): Promise<UserResponse> {
    const user = await this.getUserByApiKey(apiKey);
    return UserDto.toResponse(user);
  }

  private rejectIfDemoLab(admin: User): void {
    if (admin.isDemo) {
      throw new PermissionError('User management is restricted in the demo environment');
    }
  }

  private async getUserByApiKey(apiKey: string): Promise<User> {
    const user = await this.userRepository.findByApiKey(apiKey);
    if (!user) {
      throw new PermissionError('Invalid authentication', { apiKey: '***' });
    }
    return user;
  }

  private async getUserOrThrow(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User not found: ${id}`, { userId: id });
    }
    return user;
  }

  private async ensureNotLastAdmin(user: User, action: string): Promise<void> {
    if (user.isAdmin() && user.labId) {
      const adminCount = await this.userRepository.countByRoleInLab('lab_admin', user.labId);
      if (adminCount <= 1) {
        throw new ValidationError(`Cannot ${action} the last admin user`, { adminCount });
      }
    }
  }

  private async disableUser(
    userId: string,
    adminApiKey: string,
    action: 'deactivate' | 'suspend',
    expectedLabId?: string
  ): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    await this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    if (admin.id === userId) {
      throw new PermissionError(`Cannot ${action} yourself`, { userId: admin.id });
    }

    const user = await this.getUserOrThrow(userId);

    if (expectedLabId && user.labId !== expectedLabId) {
      throw new ValidationError('User does not belong to the specified lab');
    }

    if (action === 'deactivate') {
      user.deactivate(admin);
    } else {
      user.suspend(admin);
    }
    await this.userRepository.save(user);

    if (this.userSessionRepository) {
      await this.userSessionRepository.revokeAllSessions(user.id);
    }

    if (this.eventBus) {
      const Event = action === 'deactivate' ? UserDeactivatedEvent : UserSuspendedEvent;
      await this.eventBus.publish(new Event(
        user.id,
        user.username,
        admin.username,
        user.labId
      ));
    }
  }

  /**
   * @throws ValidationError if researcher name exists or password invalid
   */
  async registerWithProfile(request: RegisterWithProfileRequest): Promise<User> {
    if (!this.researcherRepository || !this.storageRepository) {
      throw new Error('ResearcherRepository and StorageRepository are required for this operation');
    }

    const isFirstUser = await this.userRepository.isEmpty();

    let labId: string | undefined;
    let resolvedRole: 'lab_admin' | 'user' | undefined;
    let autoApprove = false;
    let createResearcher = true;

    if (request.inviteCode && this.inviteCodeRepository && this.labRepository) {
      const inviteCode = await this.inviteCodeRepository.findByCode(request.inviteCode.trim().toUpperCase());
      if (!inviteCode || !inviteCode.isValid()) {
        throw new ValidationError('Invalid or expired invite code');
      }
      const lab = await this.labRepository.findById(inviteCode.labId);
      if (!lab || !lab.isActive) {
        throw new ValidationError('The lab associated with this invite code is no longer active');
      }
      labId = inviteCode.labId;
      resolvedRole = inviteCode.role as 'lab_admin' | 'user';
      autoApprove = true;
      createResearcher = inviteCode.createResearcher;
      inviteCode.recordUse();
      await this.inviteCodeRepository.save(inviteCode);
    } else if (!isFirstUser) {
      throw new ValidationError('An invite code is required for registration');
    }

    if (createResearcher) {
      const nameExists = await this.researcherRepository.nameExists(
        request.firstName,
        request.lastName,
        labId
      );
      if (nameExists) {
        throw new ValidationError(
          'Researcher profile already exists. Please contact an administrator to link your account.'
        );
      }
    }

    if (!request.email || request.email.trim().length === 0) {
      throw new ValidationError('Email address is required for registration', {});
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new ValidationError('Invalid email format', {});
    }

    const emailExists = await this.userRepository.emailExists(request.email);
    if (emailExists) {
      throw new ValidationError(
        'Email already in use. Try another or contact your administrator.'
      );
    }

    await this.validatePasswordPolicy(request.password);

    if (!this.passwordService) {
      throw new Error('PasswordService is required for registration');
    }
    const passwordHash = await this.passwordService.hash(request.password);

    const username = await this.generateUsername(request.firstName, request.lastName);

    const person = Person.create(
      request.firstName,
      request.lastName,
      request.email,
      request.position,
      request.department
    );

    let researcherId: string | undefined = undefined;
    let researcher: Researcher | undefined = undefined;

    if (createResearcher) {
      researcher = Researcher.create(person.id, {
        isUserApproved: isFirstUser || autoApprove,
        source: 'registration',
        labId
      });
      researcherId = researcher.id;
    }

    const role = isFirstUser
      ? UserRole.labAdmin()
      : resolvedRole === 'lab_admin' ? UserRole.labAdmin() : UserRole.user();
    const status = (isFirstUser || autoApprove) ? 'approved' : 'pending';

    const user = User.createWithPassword(
      username,
      passwordHash,
      role,
      researcherId,
      person.id,
      status,
      labId
    );

    if (isFirstUser || autoApprove) {
      user.markEmailVerified();
    }

    await this.personRepository!.save(person);

    if (researcher) {
      await this.researcherRepository!.save(researcher);
    }

    try {
      await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        throw new ValidationError(
          'Email already in use. Try another or contact your administrator.'
        );
      }
      throw error;
    }

    return user;
  }

  /**
   * Tries firstname.lastname, then firstname.lastname.2, .3, etc.
   * Falls back to nanoid suffix if 100 sequential candidates are taken.
   */
  private async generateUsername(firstName: string, lastName: string): Promise<string> {
    const sanitize = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    const first = sanitize(firstName);
    const last = sanitize(lastName);

    let candidate = `${first}.${last}`;
    if (!(await this.userRepository.usernameExists(candidate))) {
      return candidate;
    }

    let counter = 2;
    while (counter < 100) {
      candidate = `${first}.${last}.${counter}`;
      if (!(await this.userRepository.usernameExists(candidate))) {
        return candidate;
      }
      counter++;
    }

    return `${first}.${last}.${nanoid(6)}`;
  }

  /** Uses shared PasswordValidator for consistent validation across client/server. */
  private async validatePasswordPolicy(password: string): Promise<void> {
    if (!this.storageRepository) {
      throw new Error('StorageRepository is required for password validation');
    }

    const securityConfig = await this.storageRepository.getSecurityConfig();

    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }

  async reactivateUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    await this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);
    const previousStatus = user.status as 'deactivated' | 'suspended';

    user.reactivate(admin);
    await this.userRepository.save(user);

    if (this.eventBus) {
      await this.eventBus.publish(new UserReactivatedEvent(
        user.id,
        user.username,
        previousStatus,
        admin.username,
        user.labId
      ));
    }
  }

  async deactivateUser(userId: string, adminApiKey: string, expectedLabId?: string): Promise<void> {
    return this.disableUser(userId, adminApiKey, 'deactivate', expectedLabId);
  }

  async suspendUser(userId: string, adminApiKey: string, expectedLabId?: string): Promise<void> {
    return this.disableUser(userId, adminApiKey, 'suspend', expectedLabId);
  }


  /**
   * For users who registered without a researcher profile.
   * @throws ValidationError if user already has a linked researcher
   */
  async linkResearcherToUser(userId: string, researcherId: string, adminApiKey: string): Promise<void> {
    if (!this.researcherRepository) {
      throw new Error('ResearcherRepository is required for this operation');
    }

    const admin = await this.getUserByApiKey(adminApiKey);
    await this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    const researcher = await this.researcherRepository.findById(researcherId);
    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${researcherId}`, { researcherId });
    }

    if (user.hasResearcherProfile()) {
      throw new ValidationError('User already has a linked researcher profile', {
        userId,
        currentResearcherId: user.researcherId
      });
    }

    // TODO: User entity lacks a linkResearcher() method; fromData workaround
    const updatedUser = User.fromData({
      ...user.toData(),
      researcherId: researcherId
    });

    await this.userRepository.save(updatedUser);

    if (this.personRepository && this.eventBus) {
      const person = await this.personRepository.findById(researcher.personId);
      const researcherName = person ? `${person.firstName} ${person.lastName}` : researcherId;

      await this.eventBus.publish(new UserLinkedToResearcherEvent(
        userId,
        user.username,
        researcherId,
        researcherName,
        admin.id,
        user.labId
      ));
    }
  }

  /**
   * Preserves the researcher record for tube history.
   * @throws ValidationError if user has no linked researcher
   */
  async unlinkResearcherFromUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    await this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    if (!user.hasResearcherProfile()) {
      throw new ValidationError('User has no linked researcher profile', { userId });
    }

    // Get researcher info before unlinking for audit
    const oldResearcherId = user.researcherId;
    let researcherName = oldResearcherId ?? '';

    if (oldResearcherId && this.researcherRepository && this.personRepository) {
      const researcher = await this.researcherRepository.findById(oldResearcherId);
      if (researcher) {
        const person = await this.personRepository.findById(researcher.personId);
        researcherName = person ? `${person.firstName} ${person.lastName}` : oldResearcherId;
      }
    }

    user.unlinkResearcher();
    await this.userRepository.save(user);

    if (this.eventBus && oldResearcherId) {
      await this.eventBus.publish(new UserUnlinkedFromResearcherEvent(
        userId,
        user.username,
        oldResearcherId,
        researcherName,
        admin.id,
        user.labId
      ));
    }
  }

  /**
   * Get user by username (public helper for resend verification)
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  /**
   * Get user by email (public helper for resend verification)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

}
