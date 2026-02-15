import { UserRole } from '@domain/valueObjects/UserRole';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { EmailVerificationError } from '@domain/errors/EmailVerificationError';
import { type UserSettings, DEFAULT_USER_SETTINGS } from '@odysseus/shared-schemas';
import { generateId } from '@domain/utils/generateId';
import * as crypto from 'crypto';

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
  private _isDemo: boolean = false;
  private _settings: UserSettings;

  private constructor(
    private readonly _id: string,
    private readonly _username: string,
    private readonly _apiKey: string,
    private _role: UserRole,
    private readonly _createdAt: Date,
    private _lastActivity: Date,
    private _researcherId?: string,
    private _personId?: string,
    private _status: 'pending' | 'approved' | 'rejected' = 'pending',
    emailVerified?: boolean,
    emailVerificationToken?: string,
    emailVerificationExpiry?: Date | string,
    lastVerificationEmailSent?: Date | string,
    passwordResetToken?: string,
    passwordResetExpiry?: Date | string,
    requirePasswordChange?: boolean,
    lastPasswordChange?: Date | string,
    isDemo?: boolean,
    settings?: UserSettings
  ) {
    this._emailVerified = emailVerified ?? false;
    this._emailVerificationToken = emailVerificationToken;
    this._emailVerificationExpiry = emailVerificationExpiry
      ? (typeof emailVerificationExpiry === 'string' ? new Date(emailVerificationExpiry) : emailVerificationExpiry)
      : undefined;
    this._lastVerificationEmailSent = lastVerificationEmailSent
      ? (typeof lastVerificationEmailSent === 'string' ? new Date(lastVerificationEmailSent) : lastVerificationEmailSent)
      : undefined;
    this._passwordResetToken = passwordResetToken;
    this._passwordResetExpiry = passwordResetExpiry
      ? (typeof passwordResetExpiry === 'string' ? new Date(passwordResetExpiry) : passwordResetExpiry)
      : undefined;
    this._requirePasswordChange = requirePasswordChange ?? false;
    this._lastPasswordChange = lastPasswordChange
      ? (typeof lastPasswordChange === 'string' ? new Date(lastPasswordChange) : lastPasswordChange)
      : undefined;
    this._isDemo = isDemo ?? false;
    this._settings = settings ?? DEFAULT_USER_SETTINGS;
    this.validate();
  }

  /**
   * Factory method to create a new user
   */
  static create(
    username: string,
    apiKey: string,
    isFirstUser: boolean = false,
    researcherId?: string,
    personId?: string
  ): User {
    // Generate unique ID
    const id = generateId('user');

    // First user becomes admin automatically
    const role = UserRole.defaultRole(isFirstUser);

    const now = new Date();

    return new User(
      id,
      username,
      apiKey,
      role,
      now,
      now,
      researcherId,
      personId
    );
  }

  /**
   * Factory method to create admin user explicitly
   */
  static createAdmin(username: string, apiKey: string, researcherId?: string, personId?: string): User {
    const id = generateId('user');
    const now = new Date();

    return new User(
      id,
      username,
      apiKey,
      UserRole.admin(),
      now,
      now,
      researcherId,
      personId
    );
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
    status: 'pending' | 'approved' | 'rejected' = 'pending'
  ): User {
    const id = generateId('user');
    const apiKey = User.generateApiKey();
    const now = new Date();

    const user = new User(
      id,
      username,
      apiKey,
      role,
      now,
      now,
      researcherId,
      personId,
      status,
      false, // emailVerified
      undefined, // emailVerificationToken
      undefined, // emailVerificationExpiry
      undefined, // lastVerificationEmailSent
      undefined, // passwordResetToken
      undefined, // passwordResetExpiry
      false, // requirePasswordChange
      now // lastPasswordChange - set to creation time
    );

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
    role: 'admin' | 'user';
    createdAt: string;
    lastActivity: string;
    passwordHash?: string;
    salt?: string;
    researcherId?: string;
    personId?: string;
    status?: 'pending' | 'approved' | 'rejected';
    emailVerified?: number;
    emailVerificationToken?: string;
    emailVerificationExpiry?: string;
    lastVerificationEmailSent?: string;
    passwordResetToken?: string;
    passwordResetExpiry?: string;
    requirePasswordChange?: number;
    lastPasswordChange?: string;
    isDemo?: boolean | number;
    settings?: UserSettings | string;
  }): User {
    // Parse settings from JSON string if needed
    let parsedSettings: UserSettings | undefined;
    if (data.settings) {
      if (typeof data.settings === 'string') {
        try {
          parsedSettings = JSON.parse(data.settings);
        } catch {
          // Malformed settings JSON - fall back to defaults
          parsedSettings = DEFAULT_USER_SETTINGS;
        }
      } else {
        parsedSettings = data.settings;
      }
    } else {
      parsedSettings = DEFAULT_USER_SETTINGS;
    }

    const user = new User(
      data.id,
      data.username,
      data.apiKey,
      UserRole.create(data.role),
      new Date(data.createdAt),
      new Date(data.lastActivity),
      data.researcherId,
      data.personId,
      data.status || 'pending',
      data.emailVerified === 1,
      data.emailVerificationToken,
      data.emailVerificationExpiry,
      data.lastVerificationEmailSent,
      data.passwordResetToken,
      data.passwordResetExpiry,
      data.requirePasswordChange === 1,
      data.lastPasswordChange,
      data.isDemo === true || data.isDemo === 1,
      parsedSettings
    );

    // Restore password data if present
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
  changeRole(newRole: 'admin' | 'user', performedBy: User): void {
    // Business rule: Only admins can change roles
    if (!performedBy.isAdmin()) {
      throw new PermissionError('Only administrators can change user roles');
    }

    // Business rule: Can't change your own role to prevent lockout
    if (this.equals(performedBy)) {
      throw new PermissionError('Users cannot change their own role');
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
    // Only admins can manage users
    if (!this.isAdmin()) {
      return false;
    }

    // Can't manage yourself (prevents lockout)
    if (this.equals(other)) {
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

  /**
   * Business query: Check if user is admin
   */
  isAdmin(): boolean {
    return this._role.isAdmin();
  }

  /**
   * Business query: Check if user is regular user
   */
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

    if (this._status !== 'pending') {
      throw new ValidationError(`Cannot approve user with status ${this._status}`);
    }

    this._status = 'approved';
    this.recordActivity();
  }

  /**
   * Business method: Reject pending user (admin operation)
   */
  reject(rejectedBy: User): void {
    if (!rejectedBy.isAdmin()) {
      throw new PermissionError('Only administrators can reject users');
    }

    if (this._status !== 'pending') {
      throw new ValidationError(`Cannot reject user with status ${this._status}`);
    }

    this._status = 'rejected';
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

  /**
   * Business method: Set user's demo status (admin operation)
   *
   * @throws ValidationError if attempting to mark an admin as demo
   */
  setDemoStatus(isDemo: boolean): void {
    // Business rule: Admin users cannot be marked as demo to prevent lockout
    if (isDemo && this.isAdmin()) {
      throw new ValidationError('Admin users cannot be marked as demo');
    }

    this._isDemo = isDemo;
    this.recordActivity();
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
    role: 'admin' | 'user';
    createdAt: string;
    lastActivity: string;
    researcherId?: string;
    personId?: string;
    status: 'pending' | 'approved' | 'rejected';
    isDemo: boolean;
    settings: UserSettings;
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
      isDemo: this._isDemo,
      settings: this._settings
    };
  }

  /**
   * Convert to safe data object for API responses (no sensitive data)
   */
  toPublicData(): {
    id: string;
    username: string;
    role: 'admin' | 'user';
    createdAt: string;
    lastActivity: string;
    status: 'pending' | 'approved' | 'rejected';
    isDemo: boolean;
    researcherId?: string;
    personId?: string;
  } {
    return {
      id: this._id,
      username: this._username,
      role: this._role.role,
      createdAt: this._createdAt.toISOString(),
      lastActivity: this._lastActivity.toISOString(),
      status: this._status,
      isDemo: this._isDemo,
      researcherId: this._researcherId,
      personId: this._personId
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
  get status(): 'pending' | 'approved' | 'rejected' { return this._status; }

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
  get isDemo(): boolean { return this._isDemo; }

  // Convenience getters
  get roleString(): 'admin' | 'user' { return this._role.role; }

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
    const user = new User(
      this._id,
      this._username,
      this._apiKey,
      this._role,
      this._createdAt,
      this._lastActivity,
      this._researcherId,
      this._personId,
      this._status,
      this._emailVerified,
      this._emailVerificationToken,
      this._emailVerificationExpiry,
      this._lastVerificationEmailSent,
      this._passwordResetToken,
      this._passwordResetExpiry,
      this._requirePasswordChange,
      this._lastPasswordChange,
      this._isDemo,
      newSettings
    );

    // Restore password data
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
