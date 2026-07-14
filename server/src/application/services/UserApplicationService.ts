/**
 * User Management Service
 *
 * Orchestrates user CRUD, authentication, registration, and approval workflows.
 */

import { nanoid } from 'nanoid';

import { findByIdForRequester } from '@application/authorization/findByIdForRequester';
import type { EventBus } from '@application/contracts/EventBus';
import type { PasswordService } from '@application/contracts/PasswordService';
import { rejectDemoManagementOperation } from '@application/guards/DemoGuards';
import { validatePasswordPolicy } from '@application/guards/PasswordGuards';
import { Person } from '@domain/entities/Person';
import { Researcher } from '@domain/entities/Researcher';
import { User } from '@domain/entities/User';
import { ConflictError } from '@domain/errors/ConflictError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EmailAlreadyExistsError } from '@domain/errors/UserErrors';
import { ValidationError } from '@domain/errors/ValidationError';
import { BulkResourcesUnassignedEvent } from '@domain/events/StorageEvents';
import {
  UserDeletedEvent,
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
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import { UserRole } from '@domain/value-objects/UserRole';
import { logger } from '@infrastructure/logging/logger';

import type { RegisterWithProfileRequest, UserDisplayInfo } from '@odysseus/shared-schemas';



export type EnrichedPublicUser = ReturnType<User['toPublicData']> & {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  department?: string;
  researcherName?: string;
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
    private passwordService?: PasswordService,
    private tubeRepository?: TubeRepository
  ) {}

  /**
   * Returns lab users enriched with Person names.
   * Name resolution priority: direct personId link, then linked researcher's person.
   */
  async getEnrichedLabUsers(labId: string): Promise<EnrichedPublicUser[]> {
    const users = await this.userRepository.findByLabId(labId);
    const publicDataList = users.map(u => u.toPublicData());

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
      this.researcherRepository.findByIds(researcherIds, labId)
    ]);

    const researcherPersonIds = researchers
      .map(r => r.personId)
      .filter((id): id is string => id != null);
    const researcherPersons = await this.personRepository.findByIds(researcherPersonIds);

    const directPersonMap = new Map(directPersons.map(p => [p.id, p]));
    const researcherMap = new Map(researchers.map(r => [r.id, r]));
    const researcherPersonMap = new Map(researcherPersons.map(p => [p.id, p]));

    return publicDataList.map(publicData => {
      let enriched: EnrichedPublicUser = publicData;

      if (publicData.personId) {
        const person = directPersonMap.get(publicData.personId);
        if (person) {
          enriched = {
            ...enriched,
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            position: person.position,
            department: person.department,
          };
        }
      }

      if (publicData.researcherId) {
        const researcher = researcherMap.get(publicData.researcherId);
        if (researcher) {
          const person = researcherPersonMap.get(researcher.personId);
          if (person) {
            enriched = {
              ...enriched,
              researcherName: `${person.lastName}, ${person.firstName}`,
              firstName: enriched.firstName ?? person.firstName,
              lastName: enriched.lastName ?? person.lastName,
              email: enriched.email ?? person.email,
            };
          }
        }
      }

      return enriched;
    });
  }

  /**
   * Resolves slim display info (name via linked person) for the given user ids.
   * Scoped to `labId` when provided so callers cannot resolve other labs' users;
   * omit for cross-lab (system-admin) access.
   */
  async lookupUsers(userIds: string[], labId?: string): Promise<UserDisplayInfo[]> {
    const users = await this.userRepository.findByIds(userIds, labId);
    return this.toDisplayUsers(users);
  }

  /** Approved users in the lab, for user-selection dropdowns. */
  async listActiveUsers(labId: string): Promise<UserDisplayInfo[]> {
    const users = await this.userRepository.findByStatusInLab('approved', labId);
    return this.toDisplayUsers(users);
  }

  private async toDisplayUsers(users: User[]): Promise<UserDisplayInfo[]> {
    const personIds = users
      .map(u => u.toPublicData().personId)
      .filter((id): id is string => id != null);

    const persons = this.personRepository ? await this.personRepository.findByIds(personIds) : [];
    const personMap = new Map(persons.map(p => [p.id, p]));

    return users.map(user => {
      const publicData = user.toPublicData();
      const person = publicData.personId ? personMap.get(publicData.personId) : undefined;
      return {
        id: publicData.id,
        username: publicData.username,
        firstName: person?.firstName,
        lastName: person?.lastName,
        hasResearcher: user.hasResearcherProfile(),
      };
    });
  }

  /**
   * Auto-clears storage assignments, deletes user, and cleans up linked records.
   * Researchers with tubes are preserved for history (email cleared); otherwise deleted.
   */
  async deleteUser(userId: string, admin: User): Promise<void> {
    const targetUser = await this.getUserOrThrow(userId, admin);

    await this.requireUserManagementAllowed(admin);
    admin.requireCanManage(targetUser);

    await this.ensureNotLastAdmin(targetUser);

    const username = targetUser.username;
    const personId = targetUser.personId;
    const researcherId = targetUser.researcherId;

    const { racks: racksAffected, boxes: boxesAffected } = targetUser.labId
      ? await this.clearStorageAssignments(userId, username, targetUser.labId, admin.id, 'deleted')
      : { racks: 0, boxes: 0 };

    const tubesUnlocked = targetUser.labId
      ? await this.unlockTubesForUser(userId, targetUser.labId)
      : 0;

    if (this.inviteCodeRepository) {
      await this.inviteCodeRepository.deleteByCreator(userId);
    }

    if (targetUser.hasResearcherProfile()) {
      targetUser.unlinkResearcher();
      await this.userRepository.save(targetUser);
    }

    await this.userRepository.delete(userId, targetUser.labId ?? '');

    // Clean up linked researcher and person records
    if (researcherId && this.researcherRepository && this.personRepository) {
      const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcherId);

      if (tubeCount === 0) {
        await this.researcherRepository.delete(researcherId, targetUser.labId ?? '');
        if (personId) {
          await this.personRepository.delete(personId);
        }
      } else {
        // Researcher has tubes — deactivate and preserve for history, release the email
        const researcher = await findByIdForRequester(this.researcherRepository, researcherId, {
          labId: admin.labId,
          isSystemAdmin: admin.isSystemAdmin(),
        });
        if (researcher) {
          researcher.deactivate();
          await this.researcherRepository.save(researcher);
        }
        if (personId) {
          const person = await this.personRepository.findById(personId);
          if (person) {
            person.clearEmail();
            await this.personRepository.save(person);
          }
        }
      }
    } else if (personId && this.personRepository) {
      // User-only account (no researcher) — person is orphaned, delete it
      await this.personRepository.delete(personId);
    }

    if (this.eventBus) {
      await this.eventBus.publish(new UserDeletedEvent(userId, username, admin.id, targetUser.labId));

      if (racksAffected > 0 || boxesAffected > 0) {
        await this.eventBus.publish(new BulkResourcesUnassignedEvent(
          admin.id, userId, username, racksAffected, boxesAffected, targetUser.labId!
        ));
      }
    }

    if (tubesUnlocked > 0) {
      logger.info(`Auto-unlocked ${tubesUnlocked} tube(s) during deletion of user ${username}`, {
        userId, tubesUnlocked,
      });
    }
  }

  private async requireUserManagementAllowed(admin: User): Promise<void> {
    await this.accessControlService.requireCanManageUsers(admin);
    rejectDemoManagementOperation(admin, 'User management');
  }

  private async getUserOrThrow(id: string, admin: User): Promise<User> {
    const user = await findByIdForRequester(this.userRepository, id, {
      labId: admin.labId,
      isSystemAdmin: admin.isSystemAdmin(),
    });
    if (!user) {
      throw new NotFoundError(`User not found: ${id}`, { userId: id });
    }
    return user;
  }

  private async ensureNotLastAdmin(user: User): Promise<void> {
    if (user.isAdmin() && user.labId) {
      const adminCount = await this.userRepository.countByRoleInLab('lab_admin', user.labId);
      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last admin user', { adminCount });
      }
    }
  }

  private async disableUser(
    userId: string,
    admin: User,
    action: 'deactivate' | 'suspend',
    expectedLabId?: string
  ): Promise<void> {
    await this.requireUserManagementAllowed(admin);

    if (admin.id === userId) {
      throw new PermissionError(`Cannot ${action} yourself`, { userId: admin.id });
    }

    const user = await this.getUserOrThrow(userId, admin);

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
      createResearcher = inviteCode.createResearcher;
      inviteCode.recordUse();
      await this.inviteCodeRepository.save(inviteCode);
    } else if (!isFirstUser) {
      throw new ValidationError('An invite code is required for registration');
    }

    // Check for researcher name conflicts and returning-user relink
    let relinkedResearcher: Researcher | undefined;
    let relinkedPerson: Person | undefined;

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

      // Returning user — reactivate their deactivated researcher profile
      if (labId) {
        const deactivated = await this.researcherRepository.findDeactivatedByName(
          request.firstName, request.lastName, labId
        );
        if (deactivated && this.personRepository) {
          const existingPerson = await this.personRepository.findById(deactivated.personId);
          if (existingPerson) {
            existingPerson.updateEmail(request.email);
            existingPerson.updateProfile(
              request.firstName, request.lastName, request.position, request.department
            );
            deactivated.activate();
            relinkedResearcher = deactivated;
            relinkedPerson = existingPerson;
          }
        }
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

    await validatePasswordPolicy(this.storageRepository, request.password);

    if (!this.passwordService) {
      throw new Error('PasswordService is required for registration');
    }
    const passwordHash = await this.passwordService.hash(request.password);

    const username = await this.generateUsername(request.firstName, request.lastName);

    const person = relinkedPerson ?? Person.create(
      request.firstName,
      request.lastName,
      request.email,
      request.position,
      request.department
    );

    let researcherId: string | undefined;
    let researcher: Researcher | undefined;

    if (relinkedResearcher) {
      researcherId = relinkedResearcher.id;
      researcher = relinkedResearcher;
    } else if (createResearcher) {
      researcher = Researcher.create(person.id, {
        source: 'registration',
        labId
      });
      researcherId = researcher.id;
    }

    const role = isFirstUser
      ? UserRole.labAdmin()
      : resolvedRole === 'lab_admin' ? UserRole.labAdmin() : UserRole.user();

    const user = User.createWithPassword(
      username,
      passwordHash,
      role,
      researcherId,
      person.id,
      'approved',
      labId
    );

    user.markEmailVerified();

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

  async reactivateUser(userId: string, admin: User): Promise<void> {
    await this.requireUserManagementAllowed(admin);

    const user = await this.getUserOrThrow(userId, admin);
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

  async deactivateUser(userId: string, admin: User, expectedLabId?: string): Promise<void> {
    return this.disableUser(userId, admin, 'deactivate', expectedLabId);
  }

  async suspendUser(userId: string, admin: User, expectedLabId?: string): Promise<void> {
    return this.disableUser(userId, admin, 'suspend', expectedLabId);
  }


  /**
   * For users who registered without a researcher profile.
   * @throws ValidationError if user already has a linked researcher
   */
  async linkResearcherToUser(userId: string, researcherId: string, admin: User): Promise<void> {
    if (!this.researcherRepository) {
      throw new Error('ResearcherRepository is required for this operation');
    }

    await this.requireUserManagementAllowed(admin);

    const user = await this.getUserOrThrow(userId, admin);
    admin.requireCanManage(user);

    const researcher = await findByIdForRequester(this.researcherRepository, researcherId, {
      labId: admin.labId,
      isSystemAdmin: admin.isSystemAdmin(),
    });
    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${researcherId}`, { researcherId });
    }

    if (user.hasResearcherProfile()) {
      throw new ValidationError('User already has a linked researcher profile', {
        userId,
        currentResearcherId: user.researcherId
      });
    }

    user.linkResearcher(researcherId);
    await this.userRepository.save(user);

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
  async unlinkResearcherFromUser(userId: string, admin: User): Promise<void> {
    await this.requireUserManagementAllowed(admin);

    const user = await this.getUserOrThrow(userId, admin);
    admin.requireCanManage(user);

    if (!user.hasResearcherProfile()) {
      throw new ValidationError('User has no linked researcher profile', { userId });
    }

    // Get researcher info before unlinking for audit
    const oldResearcherId = user.researcherId;
    let researcherName = oldResearcherId ?? '';

    if (oldResearcherId && this.researcherRepository && this.personRepository) {
      const researcher = await findByIdForRequester(this.researcherRepository, oldResearcherId, {
        labId: admin.labId,
        isSystemAdmin: admin.isSystemAdmin(),
      });
      if (researcher) {
        const person = await this.personRepository.findById(researcher.personId);
        researcherName = person ? `${person.firstName} ${person.lastName}` : oldResearcherId;
      }
    }

    user.unlinkResearcher();
    await this.userRepository.save(user);

    const { racks: racksAffected, boxes: boxesAffected } = user.labId
      ? await this.clearStorageAssignments(userId, user.username, user.labId, admin.id, 'unlinked')
      : { racks: 0, boxes: 0 };

    const tubesUnlocked = user.labId
      ? await this.unlockTubesForUser(userId, user.labId)
      : 0;

    if (this.eventBus && oldResearcherId) {
      await this.eventBus.publish(new UserUnlinkedFromResearcherEvent(
        userId,
        user.username,
        oldResearcherId,
        researcherName,
        admin.id,
        user.labId
      ));

      if (racksAffected > 0 || boxesAffected > 0) {
        await this.eventBus.publish(new BulkResourcesUnassignedEvent(
          admin.id, userId, user.username, racksAffected, boxesAffected, user.labId!
        ));
      }
    }

    if (tubesUnlocked > 0) {
      logger.info(`Auto-unlocked ${tubesUnlocked} tube(s) during unlink of user ${user.username}`, {
        userId, tubesUnlocked,
      });
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  private async clearStorageAssignments(
    userId: string,
    username: string,
    labId: string,
    adminId: string,
    reason: string
  ): Promise<{ racks: number; boxes: number }> {
    if (!this.storageRepository) return { racks: 0, boxes: 0 };

    const MAX_CASCADE_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_CASCADE_RETRIES; attempt++) {
      const configuration = await this.storageRepository.getForLab(labId);
      if (!configuration) return { racks: 0, boxes: 0 };

      const counts = configuration.countAssignmentsForUser(userId);
      const expectedVersion = configuration.version;
      const hadAssignments = configuration.clearAllAssignmentsForUser(userId);

      if (!hadAssignments) return { racks: 0, boxes: 0 };

      try {
        await this.storageRepository.saveWithOptimisticLock(
          labId,
          configuration,
          expectedVersion,
          `Cleared assignments for ${reason} user '${username}'`,
          adminId
        );

        logger.info(`Cleared resource assignments for ${reason} user ${username}`, {
          userId, racksAffected: counts.racks, boxesAffected: counts.boxes, attempt,
        });
        return counts;
      } catch (error) {
        if (error instanceof ConflictError && attempt < MAX_CASCADE_RETRIES) {
          logger.warn(`Cascade retry ${attempt}/${MAX_CASCADE_RETRIES} for ${reason}`, {
            userId, expectedVersion,
          });
          continue;
        }
        throw error;
      }
    }

    throw new ValidationError(
      'Failed to clear resource assignments after multiple attempts. Please try again.',
      { userId }
    );
  }

  private async unlockTubesForUser(userId: string, labId: string): Promise<number> {
    if (!this.tubeRepository) return 0;

    const lockedTubes = await this.tubeRepository.findLockedByUser(userId, labId);
    if (lockedTubes.length === 0) return 0;

    let unlocked = 0;
    for (const tube of lockedTubes) {
      const unlockedTube = tube.unlock();
      try {
        await this.tubeRepository.saveWithOptimisticLock(unlockedTube, tube.version);
        unlocked++;
      } catch (error) {
        if (error instanceof ConflictError) {
          logger.warn('Skipped unlocking tube due to version conflict during cascade', {
            tubeId: tube.id, userId,
          });
          continue;
        }
        throw error;
      }
    }

    if (unlocked > 0) {
      logger.info(`Unlocked ${unlocked} tube(s) for user ${userId}`, { userId, labId, unlocked });
    }
    return unlocked;
  }

}
