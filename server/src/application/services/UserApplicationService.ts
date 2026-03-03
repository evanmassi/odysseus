import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { User } from '@domain/entities/User';
import { Researcher } from '@domain/entities/Researcher';
import { Person } from '@domain/entities/Person';
import { UserRole } from '@domain/valueObjects/UserRole';
import { AccessControlService } from '@domain/services/AccessControlService';
import { CreateUserRequest, UserResponse, AuthResponse, UpdateUserRoleRequest, RegisterRequest, PasswordLoginRequest, UserDto } from '@application/dto/UserDto';
import { RegisterWithResearcherRequest, PasswordValidator } from '@odysseus/shared-schemas';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EmailAlreadyExistsError } from '@domain/errors/UserErrors';
import { nanoid } from 'nanoid';
import type { EventBus } from '@application/contracts/EventBus';
import {
  UserLinkedToResearcherEvent,
  UserUnlinkedFromResearcherEvent,
  UserLoggedOutEvent,
  UserApprovedEvent,
  UserRejectedEvent,
  UserDeactivatedEvent,
  UserSuspendedEvent,
  UserReactivatedEvent
} from '@domain/events/UserEvents';

/**
 * UserApplicationService - User and authentication use case orchestration
 *
 * Coordinates user management, authentication, and authorization.
 * No business logic - pure orchestration.
 */
export class UserApplicationService {
  constructor(
    private userRepository: UserRepository,
    private accessControlService: AccessControlService,
    private personRepository?: PersonRepository,
    private researcherRepository?: ResearcherRepository,
    private configurationRepository?: ConfigurationRepository,
    private eventBus?: EventBus,
    private inviteCodeRepository?: InviteCodeRepository,
    private labRepository?: LabRepository,
    private userSessionRepository?: UserSessionRepository
  ) {}

  /**
   * Create new user
   */
  async createUser(request: CreateUserRequest, adminApiKey?: string): Promise<UserResponse> {
    // Check if this is the first user (auto-admin)
    const isFirstUser = await this.userRepository.isEmpty();
    let targetRole: 'system_admin' | 'lab_admin' | 'user' = 'user';

    if (isFirstUser) {
      targetRole = 'lab_admin';
    } else {
      // Subsequent users need admin authorization
      if (!adminApiKey) {
        throw new PermissionError('Admin authorization required to create users');
      }

      const admin = await this.userRepository.findByApiKey(adminApiKey);
      if (!admin) {
        throw new PermissionError('Invalid admin credentials');
      }

      this.accessControlService.requireCanManageUsers(admin);
      targetRole = request.role || 'user';
    }

    // Validate unique username
    if (await this.userRepository.usernameExists(request.username)) {
      throw new ValidationError('Username already exists');
    }

    // Validate unique API key
    if (await this.userRepository.apiKeyExists(request.apiKey)) {
      throw new ValidationError('API key already exists');
    }

    // Create user entity
    const user = User.create(request.username, request.apiKey, isFirstUser);

    // Save to repository
    await this.userRepository.save(user);

    return UserDto.toResponse(user);
  }

  /**
   * Register new user with password and approval workflow
   *
   * First user: Auto-approved as admin
   * Subsequent users: Status set to pending (requires admin approval)
   */
  async registerWithPassword(request: RegisterRequest): Promise<AuthResponse> {
    const isFirstUser = await this.userRepository.isEmpty();
    const targetRole = isFirstUser ? 'admin' : (request.role || 'user');
    const status = isFirstUser ? 'approved' : 'pending';

    // Validate unique username
    const existingUser = await this.userRepository.findByUsername(request.username);
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // Create user with password and approval status
    const user = User.createWithPassword(
      request.username,
      request.password,
      UserRole.create(targetRole),
      undefined, // No researcher link
      status     // First user = approved, subsequent = pending
    );

    await this.userRepository.save(user);

    return UserDto.toAuthResponse(user);
  }

  /**
   * Login with username OR email and password
   *
   * Validates credentials and checks approval status before issuing tokens.
   * Only approved users can login.
   * Accepts either username or email as the identifier.
   */
  async login(request: PasswordLoginRequest): Promise<AuthResponse> {
    // Normalize input (trim whitespace)
    const input = request.username.trim();

    // Determine if input is email or username
    const isEmail = input.includes('@');

    // Find user by email or username
    const user = isEmail
      ? await this.userRepository.findByEmail(input)
      : await this.userRepository.findByUsername(input);

    if (!user || !user.validatePassword(request.password)) {
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

    // Update activity
    user.recordActivity();
    await this.userRepository.save(user);

    return UserDto.toAuthResponse(user);
  }

  /**
   * Check if this is first-time setup
   */
  async isFirstTimeSetup(): Promise<{ isEmpty: boolean; needsSystemAdmin: boolean }> {
    const isEmpty = await this.userRepository.isEmpty();
    const systemAdminCount = await this.userRepository.countByRole('system_admin');
    return { isEmpty, needsSystemAdmin: systemAdminCount === 0 };
  }

  /**
   * Get all users (excludes pending users - use getPendingUsers() for those)
   */
  async getAllUsers(adminApiKey: string): Promise<UserResponse[]> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);

    const users = admin.isSystemAdmin()
      ? await this.userRepository.findAll()
      : admin.labId
        ? await this.userRepository.findByLabId(admin.labId)
        : await this.userRepository.findAll();

    const approvedOrRejectedUsers = users.filter(user => user.status !== 'pending');
    return approvedOrRejectedUsers.map(user => UserDto.toResponse(user));
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string, requesterApiKey: string): Promise<UserResponse> {
    const requester = await this.getUserByApiKey(requesterApiKey);
    const user = await this.getUserOrThrow(id);

    // Users can view themselves, admins can view anyone
    if (!requester.isAdmin() && requester.id !== user.id) {
      throw new PermissionError('Cannot view other users', { requesterId: requester.id, targetId: id });
    }

    return UserDto.toResponse(user);
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, request: UpdateUserRoleRequest, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    const targetUser = await this.getUserOrThrow(userId);

    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    // Prevent admin from changing their own role (lockout protection)
    if (admin.id === targetUser.id) {
      throw new PermissionError('Cannot change your own role', { userId: admin.id });
    }

    if (targetUser.isAdmin() && request.role === 'user' && targetUser.labId) {
      const adminCount = await this.userRepository.countByRoleInLab('lab_admin', targetUser.labId);
      if (adminCount <= 1) {
        throw new ValidationError('Cannot remove the last admin user', { adminCount });
      }
    }

    targetUser.changeRole(request.role, admin);

    await this.userRepository.save(targetUser);
  }

  /**
   * Delete user
   *
   * Unlinks researcher profile but preserves it for tube history.
   * Cleans up orphaned Person if no other entity references it.
   *
   * Resource Assignment Behavior:
   * - Users with assigned resources (racks/boxes) CANNOT be deleted
   * - Admin must unassign all resources before deletion
   * - This prevents orphaned resource assignments
   */
  async deleteUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    const targetUser = await this.getUserOrThrow(userId);

    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    // Prevent admin from deleting themselves
    if (admin.id === targetUser.id) {
      throw new PermissionError('Cannot delete yourself', { userId: admin.id });
    }

    if (targetUser.isAdmin() && targetUser.labId) {
      const adminCount = await this.userRepository.countByRoleInLab('lab_admin', targetUser.labId);
      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last admin user', { adminCount });
      }
    }

    if (admin.isLabAdmin() && !admin.isSystemAdmin() && admin.labId !== targetUser.labId) {
      throw new PermissionError('Cannot manage users outside your lab', {
        adminLabId: admin.labId,
        targetLabId: targetUser.labId
      });
    }

    if (this.configurationRepository) {
      const config = admin.labId
        ? await this.configurationRepository.getForLab(admin.labId)
        : await this.configurationRepository.getCurrent();
      if (config) {
        const configData = config.toData();
        let assignedResourceCount = 0;
        const assignedResources: string[] = [];

        // Check all racks and boxes for assignments to this user
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

    // Capture personId before unlinking for cleanup
    const personId = targetUser.personId;

    // Unlink researcher profile (preserves researcher for tube history)
    if (targetUser.hasResearcherProfile()) {
      targetUser.unlinkResearcher();
      await this.userRepository.save(targetUser);
    }

    // Delete the user account (login access revoked)
    await this.userRepository.delete(userId);

    // Clean up orphaned Person if no Researcher references it
    if (personId && this.personRepository && this.researcherRepository) {
      const researcherWithPerson = await this.researcherRepository.findByPersonId(personId);
      if (!researcherWithPerson) {
        await this.personRepository.delete(personId);
      }
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(apiKey: string): Promise<UserResponse> {
    const user = await this.getUserByApiKey(apiKey);
    return UserDto.toResponse(user);
  }

  // OAuth 2.0 Note: updateActivity() method removed
  // User activity now tracked implicitly through token refresh patterns
  // No need for explicit database activity updates

  /**
   * Helper: Get authenticated user
   */
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

  /**
   * Register user with researcher profile and approval workflow
   *
   * Creates both User and Researcher entities atomically.
   * Auto-generates username from researcher name (firstname.lastname).
   * Links them via User.researcherId foreign key.
   *
   * First user: Auto-approved as admin (first-time setup)
   * Subsequent users: Status set to pending (requires admin approval)
   *
   * @param request - Registration data (password, researcher info - no username)
   * @returns Created user with linked researcher
   * @throws ValidationError if researcher name exists or password invalid
   */
  async registerWithResearcher(request: RegisterWithResearcherRequest & { inviteCode?: string }, createResearcher: boolean = true): Promise<User> {
    if (!this.researcherRepository || !this.configurationRepository) {
      throw new Error('ResearcherRepository and ConfigurationRepository are required for this operation');
    }

    const isFirstUser = await this.userRepository.isEmpty();

    // Resolve lab context from invite code (required for non-first-user registration)
    let labId: string | undefined;
    let resolvedRole: 'lab_admin' | 'user' | undefined;
    let autoApprove = false;

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
      autoApprove = resolvedRole === 'lab_admin';
      inviteCode.recordUse();
      await this.inviteCodeRepository.save(inviteCode);
    } else if (!isFirstUser) {
      throw new ValidationError('An invite code is required for registration');
    }

    if (createResearcher) {
      const nameExists = await this.researcherRepository.nameExists(
        request.firstName,
        request.lastName
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
      request.password,
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
   * Generate unique username from researcher name
   *
   * Algorithm:
   * 1. Try firstname.lastname (e.g., "sarah.johnson")
   * 2. If taken, try firstname.lastname.2, firstname.lastname.3, etc.
   *
   * Always includes full first and last name for admin clarity.
   *
   * @param firstName - Researcher first name
   * @param lastName - Researcher last name
   * @returns Unique username (guaranteed to not exist in database)
   */
  private async generateUsername(firstName: string, lastName: string): Promise<string> {
    // Sanitize names: lowercase, remove special characters, trim
    const sanitize = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    const first = sanitize(firstName);
    const last = sanitize(lastName);

    // Try firstname.lastname
    let candidate = `${first}.${last}`;
    if (!(await this.userRepository.usernameExists(candidate))) {
      return candidate;
    }

    // Try firstname.lastname.number with incrementing counter
    let counter = 2;
    while (counter < 100) {
      candidate = `${first}.${last}.${counter}`;
      if (!(await this.userRepository.usernameExists(candidate))) {
        return candidate;
      }
      counter++;
    }

    // Fallback: use nanoid for guaranteed uniqueness (should never reach here)
    return `${first}.${last}.${nanoid(6)}`;
  }

  /**
   * Validate password against configured security policy
   * Uses shared PasswordValidator for consistent validation across client/server
   */
  private async validatePasswordPolicy(password: string): Promise<void> {
    if (!this.configurationRepository) {
      throw new Error('ConfigurationRepository is required for password validation');
    }

    const securityConfig = await this.configurationRepository.getSecurityConfig();

    try {
      PasswordValidator.enforce(password, securityConfig);
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }

  /**
   * Approve pending user (admin only)
   *
   * Changes user status from 'pending' to 'approved', allowing login.
   * Only admins can approve users.
   *
   * @param userId - ID of user to approve
   * @param adminApiKey - Admin's API key for authorization
   * @throws PermissionError if requester is not admin
   * @throws NotFoundError if user not found
   * @throws ValidationError if user is not in pending status
   */
  async approveUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    const previousStatus = user.status;

    user.approve(admin);
    await this.userRepository.save(user);

    if (this.eventBus) {
      if (previousStatus === 'deactivated' || previousStatus === 'suspended') {
        await this.eventBus.publish(new UserReactivatedEvent(
          user.id,
          user.username,
          previousStatus,
          admin.username,
          user.labId
        ));
      } else {
        await this.eventBus.publish(new UserApprovedEvent(
          user.id,
          user.username,
          admin.username,
          user.labId
        ));
      }
    }
  }

  /**
   * Reject pending user (admin only)
   *
   * Changes user status from 'pending' to 'rejected', blocking login.
   * Rejected users cannot login but remain in database for audit trail.
   *
   * @param userId - ID of user to reject
   * @param adminApiKey - Admin's API key for authorization
   * @throws PermissionError if requester is not admin
   * @throws NotFoundError if user not found
   * @throws ValidationError if user is not in pending status
   */
  async rejectUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    const username = user.username;

    // Reject user (domain method enforces business rules)
    user.reject(admin);
    await this.userRepository.save(user);

    // Publish event to trigger cleanup of linked researcher/person
    if (this.eventBus) {
      await this.eventBus.publish(new UserRejectedEvent(
        userId,
        username,
        admin.username,
        user.labId
      ));
    }
  }

  async deactivateUser(userId: string, adminApiKey: string, expectedLabId?: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    if (expectedLabId && user.labId !== expectedLabId) {
      throw new ValidationError('User does not belong to the specified lab');
    }

    user.deactivate(admin);
    await this.userRepository.save(user);

    if (this.userSessionRepository) {
      await this.userSessionRepository.revokeAllSessions(user.id);
    }

    if (this.eventBus) {
      await this.eventBus.publish(new UserDeactivatedEvent(
        user.id,
        user.username,
        admin.username,
        user.labId
      ));
    }
  }

  async suspendUser(userId: string, adminApiKey: string, expectedLabId?: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    if (expectedLabId && user.labId !== expectedLabId) {
      throw new ValidationError('User does not belong to the specified lab');
    }

    user.suspend(admin);
    await this.userRepository.save(user);

    if (this.userSessionRepository) {
      await this.userSessionRepository.revokeAllSessions(user.id);
    }

    if (this.eventBus) {
      await this.eventBus.publish(new UserSuspendedEvent(
        user.id,
        user.username,
        admin.username,
        user.labId
      ));
    }
  }

  /**
   * Get all pending users (admin only)
   *
   * Returns list of users awaiting admin approval.
   * Used by admin panel "Pending Approvals" tab.
   *
   * @param adminApiKey - Admin's API key for authorization
   * @returns Array of pending users
   * @throws PermissionError if requester is not admin
   */
  async getPendingUsers(adminApiKey: string): Promise<UserResponse[]> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);

    const pendingUsers = admin.isSystemAdmin()
      ? await this.userRepository.findByStatus('pending')
      : admin.labId
        ? await this.userRepository.findByStatusInLab('pending', admin.labId)
        : await this.userRepository.findByStatus('pending');

    return pendingUsers.map(user => UserDto.toResponse(user));
  }

  /**
   * Link existing researcher profile to user account (admin only)
   *
   * Allows admins to manually associate a researcher profile with a user account.
   * Useful for users who registered without creating a researcher profile,
   * or for linking to existing researcher records.
   *
   * @param userId - User ID to link researcher to
   * @param researcherId - Researcher ID to link
   * @param adminApiKey - Admin's API key for authorization
   * @throws NotFoundError if user or researcher not found
   * @throws PermissionError if requester is not admin
   * @throws ValidationError if user already has a linked researcher
   */
  async linkResearcherToUser(userId: string, researcherId: string, adminApiKey: string): Promise<void> {
    if (!this.researcherRepository) {
      throw new Error('ResearcherRepository is required for this operation');
    }

    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);
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

    // Link researcher to user using User entity's internal state
    // We need to use the fromData pattern to update researcherId
    const updatedUser = User.fromData({
      ...user.toData(),
      researcherId: researcherId
    });

    await this.userRepository.save(updatedUser);

    // Get researcher name for audit
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
   * Unlink researcher profile from user account (admin only)
   *
   * Removes the researcher link from a user account while preserving
   * the researcher record for tube history.
   *
   * @param userId - User ID to unlink researcher from
   * @param adminApiKey - Admin's API key for authorization
   * @throws NotFoundError if user not found
   * @throws PermissionError if requester is not admin
   * @throws ValidationError if user has no linked researcher
   */
  async unlinkResearcherFromUser(userId: string, adminApiKey: string): Promise<void> {
    const admin = await this.getUserByApiKey(adminApiKey);
    this.accessControlService.requireCanManageUsers(admin);
    this.rejectIfDemoLab(admin);

    const user = await this.getUserOrThrow(userId);

    if (!user.hasResearcherProfile()) {
      throw new ValidationError('User has no linked researcher profile', { userId });
    }

    // Get researcher info before unlinking for audit
    const oldResearcherId = user.researcherId;
    let researcherName = oldResearcherId || '';

    if (oldResearcherId && this.researcherRepository && this.personRepository) {
      const researcher = await this.researcherRepository.findById(oldResearcherId);
      if (researcher) {
        const person = await this.personRepository.findById(researcher.personId);
        researcherName = person ? `${person.firstName} ${person.lastName}` : oldResearcherId;
      }
    }

    user.unlinkResearcher();
    await this.userRepository.save(user);

    // Publish event
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
