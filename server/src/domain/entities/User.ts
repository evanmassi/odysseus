/**
 * User Account and Authentication
 *
 * Aggregate root for user identity, credentials, roles, and approval workflow.
 */

import * as crypto from 'crypto';

import { type UserSettings, type UserStatus, DEFAULT_USER_SETTINGS } from '@odysseus/shared-schemas';

import { EmailVerificationError } from '@domain/errors/EmailVerificationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { UserRole } from '@domain/value-objects/UserRole';




interface UserConstructorProps {
  id: string;
  username: string;
  apiKey: string;
  role: UserRole;
  createdAt: Date;
  lastActivity: Date;
  researcherId?: string;
  personId?: string;
  status?: UserStatus;
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
  private _status: UserStatus;
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

  static createWithPassword(
    username: string,
    passwordHash: string,
    role: UserRole,
    researcherId?: string,
    personId?: string,
    status: UserStatus = 'pending',
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

    user._passwordHash = passwordHash;
    return user;
  }

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
    status?: UserStatus;
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
      status: data.status ?? 'pending',
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

    if (data.passwordHash) {
      user._passwordHash = data.passwordHash;
      user._salt = data.salt;
    }

    return user;
  }

  private static generateApiKey(): string {
    return 'api_' + crypto.randomBytes(32).toString('hex');
  }

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

    const usernamePattern = /^[a-zA-Z0-9_\-.@]+$/;
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

  recordActivity(): void {
    this._lastActivity = new Date();
  }

  /** Stores a pre-computed hash from PasswordService. Clears legacy salt. */
  setPasswordHash(hash: string): void {
    this._passwordHash = hash;
    this._salt = undefined;
    this.recordActivity();
  }

  hasPassword(): boolean {
    return !!this._passwordHash;
  }

  changeRole(newRole: 'system_admin' | 'lab_admin' | 'user', performedBy: User): void {
    performedBy.requireCanManage(this);

    if (performedBy.isLabAdmin() && !performedBy.isSystemAdmin() && newRole === 'system_admin') {
      throw new PermissionError('Lab administrators cannot assign system admin role');
    }

    const role = UserRole.create(newRole);
    if (!this._role.equals(role)) {
      this._role = role;
      this.recordActivity();
    }
  }

  hasPermission(action: string): boolean {
    return this._role.hasPermission(action);
  }

  /** @throws PermissionError if user lacks the given permission */
  requirePermission(action: string): void {
    if (!this.hasPermission(action)) {
      throw new PermissionError(`Permission denied for action: ${action}`, {
        userId: this._id,
        username: this._username,
        role: this._role.value,
        action
      });
    }
  }

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

  /** @throws PermissionError if this user cannot manage the target user */
  requireCanManage(other: User): void {
    if (!this.canManage(other)) {
      throw new PermissionError('Cannot manage user', {
        managerId: this._id,
        managerRole: this._role.value,
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

  hasHigherPrivilegesThan(other: User): boolean {
    return this._role.hasHigherPrivilegesThan(other._role);
  }

  approve(approvedBy: User): void {
    approvedBy.requireCanManage(this);

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
    rejectedBy.requireCanManage(this);

    if (this._status !== 'pending') {
      throw new ValidationError('Only pending users can be rejected');
    }

    this._status = 'rejected';
    this.recordActivity();
  }

  deactivate(deactivatedBy: User): void {
    deactivatedBy.requireCanManage(this);

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

  isPending(): boolean {
    return this._status === 'pending';
  }

  isApproved(): boolean {
    return this._status === 'approved';
  }

  isRejected(): boolean {
    return this._status === 'rejected';
  }

  isDeactivated(): boolean {
    return this._status === 'deactivated';
  }

  isSuspended(): boolean {
    return this._status === 'suspended';
  }

  /** Preserves researcher records for tube history when deleting a user */
  unlinkResearcher(): void {
    this._researcherId = undefined;
    this.recordActivity();
  }

  hasResearcherProfile(): boolean {
    return this._researcherId != null;
  }

  getPermissions(): string[] {
    const allPermissions = [
      'create_tubes', 'edit_tubes', 'delete_tubes',
      'manage_users', 'admin_settings', 'manage_configuration',
      'view_audit_trails', 'export_data', 'import_data',
      'manage_backups', 'delete_tanks', 'manage_researchers',
      'manage_sync'
    ];

    return allPermissions.filter(permission => this.hasPermission(permission));
  }

  toData(): {
    id: string;
    username: string;
    apiKey: string;
    role: 'system_admin' | 'lab_admin' | 'user';
    createdAt: string;
    lastActivity: string;
    researcherId?: string;
    personId?: string;
    status: UserStatus;
    settings: UserSettings;
    labId?: string;
  } {
    return {
      id: this._id,
      username: this._username,
      apiKey: this._apiKey,
      role: this._role.value,
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
    status: UserStatus;
    isDemo: boolean;
    researcherId?: string;
    personId?: string;
    labId?: string;
  } {
    return {
      id: this._id,
      username: this._username,
      role: this._role.value,
      createdAt: this._createdAt.toISOString(),
      lastActivity: this._lastActivity.toISOString(),
      status: this._status,
      isDemo: this._labIsDemo,
      researcherId: this._researcherId,
      personId: this._personId,
      labId: this._labId,
    };
  }

  equals(other: User): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  toString(): string {
    return `User(${this._username}) - ${this._role.toString()}`;
  }

  // GETTERS

  get id(): string { return this._id; }
  get username(): string { return this._username; }
  get apiKey(): string { return this._apiKey; }
  get role(): UserRole { return this._role; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get lastActivity(): Date { return new Date(this._lastActivity); }
  get researcherId(): string | undefined { return this._researcherId; }
  get personId(): string | undefined { return this._personId; }
  get status(): UserStatus { return this._status; }

  // PASSWORD

  get passwordHash(): string | undefined { return this._passwordHash; }
  get salt(): string | undefined { return this._salt; }

  // EMAIL VERIFICATION

  get emailVerified(): boolean { return this._emailVerified; }
  get emailVerificationToken(): string | undefined { return this._emailVerificationToken; }
  get emailVerificationExpiry(): Date | undefined { return this._emailVerificationExpiry ? new Date(this._emailVerificationExpiry) : undefined; }
  get lastVerificationEmailSent(): Date | undefined { return this._lastVerificationEmailSent ? new Date(this._lastVerificationEmailSent) : undefined; }

  // PASSWORD RESET

  get passwordResetToken(): string | undefined { return this._passwordResetToken; }
  get passwordResetExpiry(): Date | undefined { return this._passwordResetExpiry ? new Date(this._passwordResetExpiry) : undefined; }
  get requirePasswordChange(): boolean { return this._requirePasswordChange; }
  get lastPasswordChange(): Date | undefined { return this._lastPasswordChange ? new Date(this._lastPasswordChange) : undefined; }
  get isDemo(): boolean { return this._labIsDemo; }

  get labId(): string | undefined { return this._labId; }

  get roleString(): 'system_admin' | 'lab_admin' | 'user' { return this._role.value; }

  /** @returns Unhashed token for the email — only time it's visible */
  generateVerificationToken(): string {
    const token = crypto.randomBytes(32).toString('hex');

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedToken = crypto.pbkdf2Sync(token, salt, 10000, 64, 'sha512').toString('hex');

    // Store as salt:hash so verification can re-derive the hash
    this._emailVerificationToken = `${salt}:${hashedToken}`;
    this._emailVerificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    this._lastVerificationEmailSent = new Date();

    return token;
  }

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

  markEmailVerified(): void {
    this._emailVerified = true;
    this._emailVerificationToken = undefined;
    this._emailVerificationExpiry = undefined;
  }

  isEmailVerified(): boolean {
    return this._emailVerified;
  }

  /** Rate-limited: max 1 verification email per 5 minutes */
  canResendVerification(): boolean {
    if (!this._lastVerificationEmailSent) {
      return true;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this._lastVerificationEmailSent < fiveMinutesAgo;
  }

  adminResetPassword(passwordHash: string, requireChange: boolean = true): void {
    this._passwordHash = passwordHash;
    this._salt = undefined;

    this._requirePasswordChange = requireChange;
    this._lastPasswordChange = new Date();
    this._lastActivity = new Date();

    this._passwordResetToken = undefined;
    this._passwordResetExpiry = undefined;
  }

  /** 15-minute expiry. @returns Unhashed token for the reset URL — only time it's visible */
  generatePasswordResetToken(): string {
    const token = crypto.randomBytes(32).toString('hex');

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedToken = crypto.pbkdf2Sync(token, salt, 10000, 64, 'sha512').toString('hex');

    this._passwordResetToken = `${salt}:${hashedToken}`;
    this._passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);

    return token;
  }

  /** @throws ValidationError if token invalid or expired */
  resetPasswordWithToken(token: string, passwordHash: string): void {
    if (!this._passwordResetToken) {
      throw new ValidationError('No password reset token found');
    }

    if (!this._passwordResetExpiry || new Date() > this._passwordResetExpiry) {
      throw new ValidationError('Password reset token expired');
    }

    const [storedSalt, storedHash] = this._passwordResetToken.split(':');
    if (!storedSalt || !storedHash) {
      throw new ValidationError('Invalid password reset token format');
    }

    const testHash = crypto.pbkdf2Sync(token, storedSalt, 10000, 64, 'sha512').toString('hex');
    if (testHash !== storedHash) {
      throw new ValidationError('Invalid password reset token');
    }

    this._passwordHash = passwordHash;
    this._salt = undefined;

    this._passwordResetToken = undefined;
    this._passwordResetExpiry = undefined;
    this._requirePasswordChange = false;
    this._lastPasswordChange = new Date();
    this._lastActivity = new Date();
  }

  isPasswordChangeRequired(): boolean {
    return this._requirePasswordChange;
  }

  markPasswordChanged(): void {
    this._requirePasswordChange = false;
    this._lastPasswordChange = new Date();
  }

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

  get settings(): UserSettings {
    return this._settings;
  }

}
