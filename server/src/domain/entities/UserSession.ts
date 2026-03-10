import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

/**
 * User Session Tracking
 *
 * Tracks active sessions per user to enforce maxConcurrentSessions security policy.
 */
export class UserSession {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _refreshToken: string,
    private readonly _createdAt: Date,
    private _lastUsedAt: Date,
    private readonly _expiresAt: Date,
    private _isActive: boolean = true,
    private readonly _deviceInfo?: string,
    private readonly _ipAddress?: string,
    private readonly _userAgent?: string
  ) {
    this.validate();
  }

  static create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string
  ): UserSession {
    const id = generateId('session');
    const now = new Date();

    return new UserSession(
      id,
      userId,
      refreshToken,
      now,
      now,
      expiresAt,
      true,
      deviceInfo,
      ipAddress,
      userAgent
    );
  }

  static fromData(data: {
    id: string;
    userId: string;
    refreshToken: string;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    isActive: boolean;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  }): UserSession {
    return new UserSession(
      data.id,
      data.userId,
      data.refreshToken,
      data.createdAt,
      data.lastUsedAt,
      data.expiresAt,
      data.isActive,
      data.deviceInfo,
      data.ipAddress,
      data.userAgent
    );
  }

  private validate(): void {
    this.validateId();
    this.validateUserId();
    this.validateRefreshToken();
    this.validateTimestamps();
  }

  private validateId(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Session ID cannot be empty');
    }
  }

  private validateUserId(): void {
    if (!this._userId || this._userId.trim().length === 0) {
      throw new ValidationError('Session must belong to a user');
    }
  }

  private validateRefreshToken(): void {
    if (!this._refreshToken || this._refreshToken.length === 0) {
      throw new ValidationError('Session must have a refresh token');
    }
  }

  private validateTimestamps(): void {
    if (this._expiresAt <= this._createdAt) {
      throw new ValidationError('Session expiry must be after creation time');
    }

    if (this._lastUsedAt < this._createdAt) {
      throw new ValidationError('Session last used cannot be before creation time');
    }
  }

  // BUSINESS LOGIC

  isValid(): boolean {
    return this._isActive && !this.isExpired();
  }

  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  recordActivity(): void {
    this._lastUsedAt = new Date();
  }

  revoke(): void {
    this._isActive = false;
  }

  getAgeInMinutes(): number {
    const now = new Date();
    return Math.floor((now.getTime() - this._createdAt.getTime()) / (1000 * 60));
  }

  getInactiveMinutes(): number {
    const now = new Date();
    return Math.floor((now.getTime() - this._lastUsedAt.getTime()) / (1000 * 60));
  }

  getMinutesUntilExpiration(): number {
    const now = new Date();
    return Math.floor((this._expiresAt.getTime() - now.getTime()) / (1000 * 60));
  }

  // GETTERS

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get refreshToken(): string {
    return this._refreshToken;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get lastUsedAt(): Date {
    return new Date(this._lastUsedAt);
  }

  get expiresAt(): Date {
    return new Date(this._expiresAt);
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get deviceInfo(): string | undefined {
    return this._deviceInfo;
  }

  get ipAddress(): string | undefined {
    return this._ipAddress;
  }

  get userAgent(): string | undefined {
    return this._userAgent;
  }

  toJSON(): {
    id: string;
    userId: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
    isActive: boolean;
    isExpired: boolean;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  } {
    return {
      id: this._id,
      userId: this._userId,
      createdAt: this._createdAt.toISOString(),
      lastUsedAt: this._lastUsedAt.toISOString(),
      expiresAt: this._expiresAt.toISOString(),
      isActive: this._isActive,
      isExpired: this.isExpired(),
      deviceInfo: this._deviceInfo,
      ipAddress: this._ipAddress,
      userAgent: this._userAgent
    };
  }
}
