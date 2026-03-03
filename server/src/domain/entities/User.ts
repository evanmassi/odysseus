import { UserRole } from '@domain/valueObjects/UserRole';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EmailVerificationError } from '@domain/errors/EmailVerificationError';
import { type UserSettings, DEFAULT_USER_SETTINGS } from '@odysseus/shared-schemas';
import { generateId } from '@domain/utils/generateId';
import * as crypto from 'crypto';

interface UserConstructorProps {
  id: string;
  username: string;
  apiKey: string;
  role: UserRole;
  createdAt: Date;
  lastActivity: Date;
  researcherId?: string;
  personId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date | string;
  lastVerificationEmailSent?: Date | string;
  passwordResetToken?: string;
  passwordResetExpiry?: Date | string;
  requirePasswordChange?: boolean;
  lastPasswordChange?: Date | string;
  labIsDemo?: boolean;
  settings?: UserSettings;
  labId?: string;
}

/**
 * User Entity (Authentication Aggregate Root)
 * Represents a user in the system with authentication and authorization
 * Contains all business logic for user management and permissions
 */
export class User {
  private _passwordHash?: string;
  private _salt?: string;
  private _emailVerified: boolean = false;
  private _emailVerificationToken?: string;
  private _emailVerificationExpiry?: Date;
  private _lastVerificationEmailSent?: Date;
  private _passwordResetToken?: string;
  private _passwordResetExpiry?: Date;
  private _requirePasswordChange: boolean = false;
  private _lastPasswordChange?: Date;
  private _labIsDemo: boolean = false;
  private _settings: UserSettings;

  private readonly _id: string;
  private readonly _username: string;
  private readonly _apiKey: string;
  private _role: UserRole;
  private readonly _createdAt: Date;
  private _lastActivity: Date;
  private _researcherId?: string;
  private _personId?: string;
  private _status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
  private readonly _labId?: string;

  private constructor(props: UserConstructorProps) {
    this._id = props.id;
    this._username = props.username;
    this._apiKey = props.apiKey;
    this._role = props.role;
    this._createdAt = props.createdAt;
    this._lastActivity = props.lastActivity;
    this._researcherId = props.researcherId;
    this._personId = props.personId;
    this._status = props.status ?? 'pending';
    this._labId = props.labId;

    this._emailVerified = props.emailVerified ?? false;
    this._emailVerificationToken = props.emailVerificationToken;
    this._emailVerificationExpiry = props.emailVerificationExpiry
      ? (typeof props.emailVerificationExpiry === 'string' ? new Date(props.emailVerificationExpiry) : props.emailVerificationExpiry)
      : undefined;
    this._lastVerificationEmailSent = props.lastVerificationEmailSent
      ? (typeof props.lastVerificationEmailSent === 'string' ? new Date(props.lastVerificationEmailSent) : props.lastVerificationEmailSent)
      : undefined;
    this._passwordResetToken = props.passwordResetToken;
    this._passwordResetExpiry = props.passwordResetExpiry
      ? (typeof props.passwordResetExpiry === 'string' ? new Date(props.passwordResetExpiry) : props.passwordResetExpiry)
      : undefined;
    this._requirePasswordChange = props.requirePasswordChange ?? false;
    this._lastPasswordChange = props.lastPasswordChange
      ? (typeof props.lastPasswordChange === 'string' ? new Date(props.lastPasswordChange) : props.lastPasswordChange)
      : undefined;
    this._labIsDemo = props.labIsDemo ?? false;
    this._settings = props.settings ?? DEFAULT_USER_SETTINGS;
    this.validate();
  }

  /**
   * Factory method to create a new user
   */
  static create(
    username: string,
    apiKey: string,
    isFirstInLab: boolean = false,
    researcherId?: string,
    personId?: string,
    labId?: string
  ): User {
    const now = new Date();
    return new User({
      id: generateId('user'),
      username,
      apiKey,
      role: UserRole.defaultRoleForLab(isFirstInLab),
      createdAt: now,
      lastActivity: now,
      researcherId,
      personId,
      status: 'pending',
      labId,
    });
  }

  static createLabAdmin(username: string, apiKey: string, labId: string, researcherId?: string, personId?: string): User {
    const now = new Date();
    return new User({
      id: generateId('user'),
      username,
      apiKey,
      role: UserRole.labAdmin(),
      createdAt: now,
      lastActivity: now,
      researcherId,
      personId,
      status: 'pending',
      labId,
    });
  }

  static createSystemAdmin(username: string, apiKey: string, personId?: string): User {
    const now = new Date();
    return new User({
      id: generateId('user'),
      username,
      apiKey,
      role: UserRole.systemAdmin(),
      createdAt: now,
      lastActivity: now,
      personId,
      status: 'approved',
    });
  }

  /**
   * Factory method to create a new user with password authentication
   */
  static createWithPassword(
    username: string,
    password: string,
    role: UserRole,
    researcherId?: string,
    personId?: string,
    status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended' = 'pending',
    labId?: string
  ): User {
    const now = new Date();
    const user = new User({
      id: generateId('user'),
      username,
      apiKey: User.generateApiKey(),
      role,
      createdAt: now,
      lastActivity: now,
      researcherId,
      personId,
      status,
      emailVerified: false,
      requirePasswordChange: false,
      lastPasswordChange: now,
      labId,
    });

    user.setPassword(password);
    return user;
  }

  /**
   * Factory method to reconstitute user from persistence data
   */
  static fromData(data: {
    id: string;
    username: string;
    apiKey: string;
    role: 'system_admin' | 'lab_admin' | 'admin' | 'user';
    createdAt: string;
    lastActivity: string;
    passwordHash?: string;
    salt?: string;
    researcherId?: string;
    personId?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
    emailVerified?: number;
    emailVerificationToken?: string;
    emailVerificationExpiry?: string;
    lastVerificationEmailSent?: string;
    passwordResetToken?: string;
    passwordResetExpiry?: string;
    requirePasswordChange?: number;
    lastPasswordChange?: string;
    labIsDemo?: boolean;
    settings?: UserSettings | string;
    labId?: string;
  }): User {
    let parsedSettings: UserSettings | undefined;
    if (data.settings) {
      if (typeof data.settings === 'string') {
        try {
          parsedSettings = JSON.parse(data.settings);
        } catch {
          parsedSettings = DEFAULT_USER_SETTINGS;
        }
      } else {
        parsedSettings = data.settings;
      }
    } else {
      parsedSettings = DEFAULT_USER_SETTINGS;
    }

    // Normalize legacy 'admin' role to 'lab_admin'
    const normalizedRole = data.role === 'admin' ? 'lab_admin' : data.role;

    const user = new User({
      id: data.id,
      username: data.username,
      apiKey: data.apiKey,
      role: UserRole.create(normalizedRole),
      createdAt: new Date(data.createdAt),
      lastActivity: new Date(data.lastActivity),
      researcherId: data.researcherId,
      personId: data.personId,
      status: data.status || 'pending',
      emailVerified: data.emailVerified === 1,
      emailVerificationToken: data.emailVerificationToken,
      emailVerificationExpiry: data.emailVerificationExpiry,
      lastVerificationEmailSent: data.lastVerificationEmailSent,
      passwordResetToken: data.passwordResetToken,
      passwordResetExpiry: data.passwordResetExpiry,
      requirePasswordChange: data.requirePasswordChange === 1,
      lastPasswordChange: data.lastPasswordChange,
      labIsDemo: data.labIsDemo ?? false,
      settings: parsedSettings,
      labId: data.labId,
    });

    if (data.passwordHash && data.salt) {
      user._passwordHash = data.passwordHash;
      user._salt = data.salt;
    }

    return user;
  }

  /**
   * Generate secure API key
   */
  private static generateApiKey(): string {
    return 'api_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate user state (invariants)
   */
  private validate(): void {
    this.validateUsername();
    this.validateApiKey();
    this.validateTimestamps();
  }

  private validateUsername(): void {
    if (!this._username || this._username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }
    
    if (this._username.length > 100) {
      throw new ValidationError('Username cannot exceed 100 characters');
    }

    // Business rule: Username format validation
    const usernamePattern = /^[a-zA-Z0-9_\-\.@]+$/;
    if (!usernamePattern.test(this._username)) {
      throw new ValidationError('Username can only contain letters, numbers, underscores, hyphens, dots, and @ symbols');
    }
  }

  private validateApiKey(): void {
    if (!this._apiKey || this._apiKey.trim().length === 0) {
      throw new ValidationError('API key is required');
    }
    
    if (this._apiKey.length < 10) {
      throw new ValidationError('API key must be at least 10 characters long');
    }

    if (this._apiKey.length > 500) {
      throw new ValidationError('API key cannot exceed 500 characters');
    }
  }

  private validateTimestamps(): void {
    if (this._createdAt > this._lastActivity) {
      throw new ValidationError('Created date cannot be after last activity date');
    }
  }

  /**
   * Business method: Update user activity timestamp
   */
  recordActivity(): void {
    this._lastActivity = new Date();
  }

  /**
   * Business method: Set user password (with hashing and salt)
   *
   * Note: Policy validation (min length, strong password, special chars) is handled
   * by the application layer (CommandHandlers) using configurable security settings.
   * This method only performs basic validation and password hashing.
   */
  setPassword(plainPassword: string): void {
    if (!plainPassword || plainPassword.trim().length === 0) {
      throw new ValidationError('Password is required');
    }

    // Absolute minimum length for security (policy enforcement happens in application layer)
    if (plainPassword.length < 4) {
      throw new ValidationError('Password must be at least 4 characters long');
    }

    if (plainPassword.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }

    // Generate salt and hash password
    this._salt = crypto.randomBytes(16).toString('hex');
    this._passwordHash = crypto.pbkdf2Sync(plainPassword, this._salt, 10000, 64, 'sha512').toString('hex');

    this.recordActivity();
  }

  /**
   * Business method: Validate provided password against stored hash
   */
  validatePassword(plainPassword: string): boolean {
    if (!this._passwordHash || !this._salt) {
      return false;
    }
    
    if (!plainPassword) {
      return false;
    }
    
    const hash = crypto.pbkdf2Sync(plainPassword, this._salt, 10000, 64, 'sha512').toString('hex');
    return this._passwordHash === hash;
  }

  /**
   * Business query: Check if user has a password set
   */
  hasPassword(): boolean {
    return !!this._passwordHash && !!this._salt;
  }

  /**
   * Business method: Change user role (admin operation)
   */
  changeRole(newRole: 'system_admin' | 'lab_admin' | 'user', performedBy: User): void {
    if (!performedBy.isAdmin()) {
      throw new PermissionError('Only administrators can change user roles');
    }

    if (this.equals(performedBy)) {
      throw new PermissionError('Users cannot change their own role');
    }

    // Lab admins can only toggle between lab_admin and user within their lab
    if (performedBy.isLabAdmin() && !performedBy.isSystemAdmin()) {
      if (newRole === 'system_admin') {
        throw new PermissionError('Lab administrators cannot assign system admin role');
      }
      if (this._labId !== performedBy._labId) {
        throw new PermissionError('Lab administrators can only change roles within their own lab');
      }
    }

    const role = UserRole.create(newRole);
    if (!this._role.equals(role)) {
      this._role = role;
      this.recordActivity();
    }
  }

  /**
   * Business method: Check if user has permission for an action
   */
  hasPermission(action: string): boolean {
    return this._role.hasPermission(action);
  }

  /**
   * Business method: Ensure user has permission (throws if not)
   */
  requirePermission(action: string): void {
    if (!this.hasPermission(action)) {
      throw new PermissionError(`Permission denied for action: ${action}`, {
        userId: this._id,
        username: this._username,
        role: this._role.role,
        action
      });
    }
  }

  /**
   * Business method: Check if user can manage another user
   */
  canManage(other: User): boolean {
    if (!this.isAdmin()) {
      return false;
    }

    if (this.equals(other)) {
      return false;
    }

    // System admin can manage anyone
    if (this.isSystemAdmin()) {
      return true;
    }

    // Lab admin can only manage users in their own lab
    if (this._labId !== other._labId) {
      return false;
    }

    // Lab admin cannot manage system admins
    if (other.isSystemAdmin()) {
      return false;
    }

    return true;
  }

  /**
   * Business method: Ensure user can manage another user
   */
  requireCanManage(other: User): void {
    if (!this.canManage(other)) {
      throw new PermissionError('Cannot manage user', {
        managerId: this._id,
        managerRole: this._role.role,
        targetUserId: other._id
      });
    }
  }

  isSystemAdmin(): boolean {
    return this._role.isSystemAdmin();
  }

  isLabAdmin(): boolean {
    return this._role.isLabAdmin();
  }

  /** Returns true for both system_admin and lab_admin */
  isAdmin(): boolean {
    return this._role.isAdmin();
  }

  isUser(): boolean {
    return this._role.isUser();
  }

  /**
   * Business query: Check if user has higher privileges than another user
   */
  hasHigherPrivilegesThan(other: User): boolean {
    return this._role.hasHigherPrivilegesThan(other._role);
  }

  /**
   * Business method: Approve pending user (admin operation)
   */
  approve(approvedBy: User): void {
    if (!approvedBy.isAdmin()) {
      throw new PermissionError('Only administrators can approve users');
    }

    if (approvedBy.isLabAdmin() && !approvedBy.isSystemAdmin() && this._labId !== approvedBy._labId) {
      throw new PermissionError('Lab administrators can only approve users within their own lab');
    }

    if (this._status === 'approved') {
      throw new ValidationError('User is already approved');
    }

    if (this._status === 'rejected') {
      throw new ValidationError('Rejected users cannot be approved');
    }

    if (this._status === 'suspended' && !approvedBy.isSystemAdmin()) {
      throw new PermissionError('Only system administrators can unsuspend users');
    }

    this._status = 'approved';
    this.recordActivity();
  }

  reject(rejectedBy: User): void {
    if (!rejectedBy.isAdmin()) {
      throw new PermissionError('Only administrators can reject users');
    }

    if (rejectedBy.isLabAdmin() && !rejectedBy.isSystemAdmin() && this._labId !== rejectedBy._labId) {
      throw new PermissionError('Lab administrators can only reject users within their own lab');
    }

    if (this._status !== 'pending') {
      throw new ValidationError('Only pending users can be rejected');
    }

    this._status = 'rejected';
    this.recordActivity();
  }

  deactivate(deactivatedBy: User): void {
    if (!deactivatedBy.isAdmin()) {
      throw new PermissionError('Only administrators can deactivate users');
    }

    if (deactivatedBy.isLabAdmin() && !deactivatedBy.isSystemAdmin() && this._labId !== deactivatedBy._labId) {
      throw new PermissionError('Lab administrators can only deactivate users within their own lab');
    }

    if (this._status !== 'approved') {
      throw new ValidationError('Only approved users can be deactivated');
    }

    this._status = 'deactivated';
    this.recordActivity();
  }

  suspend(suspendedBy: User): void {
    if (!suspendedBy.isSystemAdmin()) {
      throw new PermissionError('Only system administrators can suspend users');
    }

    if (this._status !== 'approved' && this._status !== 'deactivated') {
      throw new ValidationError('Only approved or deactivated users can be suspended');
    }

    this._status = 'suspended';
    this.recordActivity();
  }

  /**
   * Business query: Check if user is pending approval
   */
  isPending(): boolean {
    return this._status === 'pending';
  }

  /**
   * Business query: Check if user is approved
   */
  isApproved(): boolean {
    return this._status === 'approved';
  }

  /**
   * Business query: Check if user is rejected
   */
  isRejected(): boolean {
    return this._status === 'rejected';
  }

  isDeactivated(): boolean {
    return this._status === 'deactivated';
  }

  isSuspended(): boolean {
    return this._status === 'suspended';
  }

  /**
   * Business method: Unlink researcher profile from user
   * Used when deleting users to preserve researcher records for tube history
   */
  unlinkResearcher(): void {
    this._researcherId = undefined;
    this.recordActivity();
  }

  /**
   * Business query: Check if user has linked researcher profile
   */
  hasResearcherProfile(): boolean {
    return this._researcherId != null; // != null checks for both null and undefined
  }

  /**
   * Business query: Get user's permission list
   */
  getPermissions(): string[] {
    const permissions: string[] = [];
    
    const allPermissions = [
      'create_tubes', 'edit_tubes', 'delete_tubes',
      'manage_users', 'admin_settings', 'manage_configuration',
      'view_audit_trails', 'export_data', 'import_data',
      'manage_backups', 'delete_tanks', 'manage_researchers',
      'manage_sync'
    ];

    return allPermissions.filter(permission => this.hasPermission(permission));
  }

  /**
   * Convert to data object for persistence
   */
  toData(): {
    id: string;
    username: string;
    apiKey: string;
    role: 'system_admin' | 'lab_admin' | 'user';
    createdAt: string;
    lastActivity: string;
    researcherId?: string;
    personId?: string;
    status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
    settings: UserSettings;
    labId?: string;
  } {
    return {
      id: this._id,
      username: this._username,
      apiKey: this._apiKey,
      role: this._role.role,
      createdAt: this._createdAt.toISOString(),
      lastActivity: this._lastActivity.toISOString(),
      researcherId: this._researcherId,
      personId: this._personId,
      status: this._status,
      settings: this._settings,
      labId: this._labId,
    };
  }

  toPublicData(): {
    id: string;
    username: string;
    role: 'system_admin' | 'lab_admin' | 'user';
    createdAt: string;
    lastActivity: string;
    status: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended';
    isDemo: boolean;
    researcherId?: string;
    personId?: string;
    labId?: string;
  } {
    return {
      id: this._id,
      username: this._username,
      role: this._role.role,
      createdAt: this._createdAt.toISOString(),
      lastActivity: this._lastActivity.toISOString(),
      status: this._status,
      isDemo: this._labIsDemo,
      researcherId: this._researcherId,
      personId: this._personId,
      labId: this._labId,
    };
  }

  /**
   * Equality check (identity-based for entities)
   */
  equals(other: User): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  /**
   * String representation
   */
  toString(): string {
    return `User(${this._username}) - ${this._role.toString()}`;
  }

  // Getters (immutable access to entity state)
  get id(): string { return this._id; }
  get username(): string { return this._username; }
  get apiKey(): string { return this._apiKey; }
  get role(): UserRole { return this._role; }
  get createdAt(): Date { return new Date(this._createdAt); } // Return copy
  get lastActivity(): Date { return new Date(this._lastActivity); } // Return copy
  get researcherId(): string | undefined { return this._researcherId; }
  get personId(): string | undefined { return this._personId; }
  get status(): 'pending' | 'approved' | 'rejected' | 'deactivated' | 'suspended' { return this._status; }

  // Password getters (for persistence layer)
  get passwordHash(): string | undefined { return this._passwordHash; }
  get salt(): string | undefined { return this._salt; }

  // Email verification getters (for persistence layer)
  get emailVerified(): boolean { return this._emailVerified; }
  get emailVerificationToken(): string | undefined { return this._emailVerificationToken; }
  get emailVerificationExpiry(): Date | undefined { return this._emailVerificationExpiry; }
  get lastVerificationEmailSent(): Date | undefined { return this._lastVerificationEmailSent; }

  // Password reset getters (for persistence layer)
  get passwordResetToken(): string | undefined { return this._passwordResetToken; }
  get passwordResetExpiry(): Date | undefined { return this._passwordResetExpiry; }
  get requirePasswordChange(): boolean { return this._requirePasswordChange; }
  get lastPasswordChange(): Date | undefined { return this._lastPasswordChange; }
  get isDemo(): boolean { return this._labIsDemo; }

  get labId(): string | undefined { return this._labId; }

  get roleString(): 'system_admin' | 'lab_admin' | 'user' { return this._role.role; }

  /**
   * Generate email verification token
   * Returns unhashed token (for email) while storing hashed version
   */
  generateVerificationToken(): string {
    const token = crypto.randomBytes(32).toString('hex');

    // Hash token before storage using same approach as passwords
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedToken = crypto.pbkdf2Sync(token, salt, 10000, 64, 'sha512').toString('hex');

    // Store hashed token with salt embedded (format: salt:hash)
    this._emailVerificationToken = `${salt}:${hashedToken}`;

    this._emailVerificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Track when verification email was sent (for rate limiting)
    this._lastVerificationEmailSent = new Date();

    // Return unhashed token (only time it's visible)
    return token;
  }

  /**
   * Verify email with provided token
   */
  verifyEmail(token: string): void {
    if (!this._emailVerificationToken) {
      throw EmailVerificationError.noToken();
    }

    if (!this._emailVerificationExpiry || new Date() > this._emailVerificationExpiry) {
      throw EmailVerificationError.expired();
    }

    const [salt, storedHash] = this._emailVerificationToken.split(':');
    if (!salt || !storedHash) {
      throw EmailVerificationError.invalid();
    }

    const providedHash = crypto.pbkdf2Sync(token, salt, 10000, 64, 'sha512').toString('hex');

    if (providedHash !== storedHash) {
      throw EmailVerificationError.invalid();
    }

    this._emailVerified = true;
    this._emailVerificationToken = undefined;
    this._emailVerificationExpiry = undefined;
  }

  /**
   * Mark email as verified (for admin auto-approval or manual verification)
   */
  markEmailVerified(): void {
    this._emailVerified = true;
    this._emailVerificationToken = undefined;
    this._emailVerificationExpiry = undefined;
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(): boolean {
    return this._emailVerified;
  }

  /**
   * Check if user can resend verification email (rate limiting)
   * Max 1 email per 5 minutes
   */
  canResendVerification(): boolean {
    if (!this._lastVerificationEmailSent) {
      return true;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this._lastVerificationEmailSent < fiveMinutesAgo;
  }

  /**
   * Admin resets user password (bypasses current password check)
   *
   * @param plainPassword - New password to set
   * @param requireChange - Force password change on next login
   * @throws ValidationError if password too weak
   */
  adminResetPassword(plainPassword: string, requireChange: boolean = true): void {
    // Validate password strength
    if (!plainPassword || plainPassword.trim().length === 0) {
      throw new ValidationError('Password is required');
    }

    if (plainPassword.length < 4) {
      throw new ValidationError('Password must be at least 4 characters long');
    }

    if (plainPassword.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }

    // Generate new salt and hash password
    this._salt = crypto.randomBytes(16).toString('hex');
    this._passwordHash = crypto.pbkdf2Sync(plainPassword, this._salt, 10000, 64, 'sha512').toString('hex');

    // Set flags
    this._requirePasswordChange = requireChange;
    this._lastPasswordChange = new Date();
    this._lastActivity = new Date();

    // Clear any existing reset token
    this._passwordResetToken = undefined;
    this._passwordResetExpiry = undefined;
  }

  /**
   * Generate secure password reset token (15-minute expiry)
   *
   * @returns Unhashed token to send to user (only time it's visible)
   */
  generatePasswordResetToken(): string {
    // Generate secure random token (64 characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Hash token before storage using same approach as email verification
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedToken = crypto.pbkdf2Sync(token, salt, 10000, 64, 'sha512').toString('hex');

    // Store hashed token with salt embedded (format: salt:hash)
    this._passwordResetToken = `${salt}:${hashedToken}`;

    // Set 15-minute expiry
    this._passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Return unhashed token for URL (only time it's visible)
    return token;
  }

  /**
   * Reset password using token
   *
   * @param token - Unhashed token from reset URL
   * @param newPassword - New password to set
   * @throws ValidationError if token invalid or expired
   */
  resetPasswordWithToken(token: string, newPassword: string): void {
    if (!this._passwordResetToken) {
      throw new ValidationError('No password reset token found');
    }

    // Check expiry (15 minutes)
    if (!this._passwordResetExpiry || new Date() > this._passwordResetExpiry) {
      throw new ValidationError('Password reset token expired');
    }

    // Extract salt and hash from stored token
    const [storedSalt, storedHash] = this._passwordResetToken.split(':');
    if (!storedSalt || !storedHash) {
      throw new ValidationError('Invalid password reset token format');
    }

    // Validate token matches stored hash
    const testHash = crypto.pbkdf2Sync(token, storedSalt, 10000, 64, 'sha512').toString('hex');
    if (testHash !== storedHash) {
      throw new ValidationError('Invalid password reset token');
    }

    // Validate new password strength
    if (!newPassword || newPassword.trim().length === 0) {
      throw new ValidationError('Password is required');
    }

    if (newPassword.length < 4) {
      throw new ValidationError('Password must be at least 4 characters long');
    }

    if (newPassword.length > 128) {
      throw new ValidationError('Password cannot exceed 128 characters');
    }

    // Set new password with new salt
    this._salt = crypto.randomBytes(16).toString('hex');
    this._passwordHash = crypto.pbkdf2Sync(newPassword, this._salt, 10000, 64, 'sha512').toString('hex');

    // Clear token and flags
    this._passwordResetToken = undefined;
    this._passwordResetExpiry = undefined;
    this._requirePasswordChange = false; // User chose own password
    this._lastPasswordChange = new Date();
    this._lastActivity = new Date();
  }

  /**
   * Check if user must change password on next login
   */
  isPasswordChangeRequired(): boolean {
    return this._requirePasswordChange;
  }

  /**
   * Mark password change as completed
   * Called after user successfully changes password
   */
  markPasswordChanged(): void {
    this._requirePasswordChange = false;
    this._lastPasswordChange = new Date();
  }

  /**
   * Business method: Update user settings (immutable)
   *
   * Returns new User instance with updated settings following immutability principle.
   * Settings are per-user preferences like position display format, theme, etc.
   *
   * @param newSettings - New user settings to apply
   * @returns New User instance with updated settings
   */
  updateSettings(newSettings: UserSettings): User {
    const user = new User({
      id: this._id,
      username: this._username,
      apiKey: this._apiKey,
      role: this._role,
      createdAt: this._createdAt,
      lastActivity: this._lastActivity,
      researcherId: this._researcherId,
      personId: this._personId,
      status: this._status,
      emailVerified: this._emailVerified,
      emailVerificationToken: this._emailVerificationToken,
      emailVerificationExpiry: this._emailVerificationExpiry,
      lastVerificationEmailSent: this._lastVerificationEmailSent,
      passwordResetToken: this._passwordResetToken,
      passwordResetExpiry: this._passwordResetExpiry,
      requirePasswordChange: this._requirePasswordChange,
      lastPasswordChange: this._lastPasswordChange,
      labIsDemo: this._labIsDemo,
      settings: newSettings,
      labId: this._labId,
    });

    user._passwordHash = this._passwordHash;
    user._salt = this._salt;

    return user;
  }

  /**
   * Get user settings
   */
  get settings(): UserSettings {
    return this._settings;
  }

}
