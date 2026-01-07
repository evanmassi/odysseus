import { ValidationError } from '@domain/errors/ValidationError';
import * as crypto from 'crypto';

/**
 * RefreshToken Entity (OAuth 2.0 Security Domain)
 * Represents a long-lived refresh token for OAuth 2.0 authentication
 * Contains all business logic for token lifecycle and security validation
 */
export class RefreshToken {
  
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _token: string,
    private readonly _expiresAt: Date,
    private readonly _createdAt: Date,
    private _lastUsedAt: Date | null = null,
    private _isRevoked: boolean = false,
    private readonly _userAgent?: string,
    private readonly _ipAddress?: string
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new refresh token
   */
  static create(
    userId: string,
    expirationDays: number = 7,
    userAgent?: string,
    ipAddress?: string
  ): RefreshToken {
    // Generate unique secure token (256-bit)
    const token = crypto.randomBytes(32).toString('hex');
    const id = RefreshToken.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    
    return new RefreshToken(
      id,
      userId,
      token,
      expiresAt,
      now,
      null,
      false,
      userAgent,
      ipAddress
    );
  }

  /**
   * Factory method to reconstitute refresh token from persistence data
   */
  static fromData(data: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt?: Date | null;
    isRevoked?: boolean;
    userAgent?: string;
    ipAddress?: string;
  }): RefreshToken {
    return new RefreshToken(
      data.id,
      data.userId,
      data.token,
      data.expiresAt,
      data.createdAt,
      data.lastUsedAt || null,
      data.isRevoked || false,
      data.userAgent,
      data.ipAddress
    );
  }

  /**
   * Generate unique refresh token ID
   */
  private static generateId(): string {
    return 'refresh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Validate refresh token invariants
   */
  private validate(): void {
    this.validateId();
    this.validateUserId();
    this.validateToken();
    this.validateTimestamps();
  }

  private validateId(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('RefreshToken ID cannot be empty');
    }
  }

  private validateUserId(): void {
    if (!this._userId || this._userId.trim().length === 0) {
      throw new ValidationError('RefreshToken must belong to a user');
    }
  }

  private validateToken(): void {
    if (!this._token || this._token.length < 32) {
      throw new ValidationError('RefreshToken must be a secure token (minimum 32 characters)');
    }
  }

  private validateTimestamps(): void {
    if (this._expiresAt <= this._createdAt) {
      throw new ValidationError('RefreshToken expiry must be after creation time');
    }

    if (this._lastUsedAt && this._lastUsedAt < this._createdAt) {
      throw new ValidationError('RefreshToken last used cannot be before creation time');
    }
  }

  /**
   * Check if refresh token is currently valid
   */
  isValid(): boolean {
    return !this._isRevoked && !this.isExpired();
  }

  /**
   * Check if refresh token has expired
   */
  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /**
   * Check if refresh token was recently used (within 5 minutes)
   * Helps detect potential token replay attacks
   */
  isRecentlyUsed(): boolean {
    if (!this._lastUsedAt) return false;
    
    const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
    return this._lastUsedAt > fiveMinutesAgo;
  }

  /**
   * Record token usage (call when used for refresh)
   */
  recordUsage(): void {
    if (!this.isValid()) {
      throw new ValidationError('Cannot record usage on invalid refresh token');
    }
    
    this._lastUsedAt = new Date();
  }

  /**
   * Revoke the refresh token (security action)
   */
  revoke(): void {
    this._isRevoked = true;
  }

  /**
   * Check if token is close to expiration (within 1 day)
   * Can be used to prompt token rotation
   */
  isNearingExpiry(): boolean {
    const oneDayFromNow = new Date(Date.now() + (24 * 60 * 60 * 1000));
    return this._expiresAt <= oneDayFromNow;
  }

  // GETTERS (Public Interface)

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get token(): string { return this._token; }
  get expiresAt(): Date { return this._expiresAt; }
  get createdAt(): Date { return this._createdAt; }
  get lastUsedAt(): Date | null { return this._lastUsedAt; }
  get isRevoked(): boolean { return this._isRevoked; }
  get userAgent(): string | undefined { return this._userAgent; }
  get ipAddress(): string | undefined { return this._ipAddress; }

  /**
   * Get remaining time until expiry in milliseconds
   */
  get timeUntilExpiry(): number {
    return Math.max(0, this._expiresAt.getTime() - Date.now());
  }

  /**
   * Get remaining days until expiry
   */
  get daysUntilExpiry(): number {
    return Math.floor(this.timeUntilExpiry / (24 * 60 * 60 * 1000));
  }

  // SERIALIZATION

  /**
   * Convert to data transfer object (for persistence)
   */
  toData(): {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt: Date | null;
    isRevoked: boolean;
    userAgent?: string;
    ipAddress?: string;
  } {
    return {
      id: this._id,
      userId: this._userId,
      token: this._token,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
      lastUsedAt: this._lastUsedAt,
      isRevoked: this._isRevoked,
      userAgent: this._userAgent,
      ipAddress: this._ipAddress
    };
  }

  /**
   * Convert to secure data (no sensitive token)
   */
  toSecureData(): {
    id: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt: Date | null;
    isRevoked: boolean;
    isValid: boolean;
    daysUntilExpiry: number;
  } {
    return {
      id: this._id,
      userId: this._userId,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
      lastUsedAt: this._lastUsedAt,
      isRevoked: this._isRevoked,
      isValid: this.isValid(),
      daysUntilExpiry: this.daysUntilExpiry
    };
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `RefreshToken(id=${this._id}, userId=${this._userId}, valid=${this.isValid()}, expires=${this._expiresAt.toISOString()})`;
  }

  /**
   * Compare refresh tokens for equality
   */
  equals(other: RefreshToken): boolean {
    return this._id === other._id && this._token === other._token;
  }
}
