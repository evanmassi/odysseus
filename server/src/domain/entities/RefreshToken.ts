/**
 * JWT Refresh Token
 *
 * Long-lived token for OAuth 2.0 dual-token authentication with rotation support.
 */

import * as crypto from 'crypto';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

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

  static create(
    userId: string,
    expirationDays: number = 7,
    userAgent?: string,
    ipAddress?: string
  ): RefreshToken {
    const token = crypto.randomBytes(32).toString('hex');
    const id = generateId('refresh');
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
      data.lastUsedAt ?? null,
      data.isRevoked ?? false,
      data.userAgent,
      data.ipAddress
    );
  }

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

  isValid(): boolean {
    return !this._isRevoked && !this.isExpired();
  }

  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /** 5-minute window helps detect token replay attacks */
  isRecentlyUsed(): boolean {
    if (!this._lastUsedAt) return false;
    
    const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
    return this._lastUsedAt > fiveMinutesAgo;
  }

  recordUsage(): void {
    if (!this.isValid()) {
      throw new ValidationError('Cannot record usage on invalid refresh token');
    }
    
    this._lastUsedAt = new Date();
  }

  revoke(): void {
    this._isRevoked = true;
  }

  isNearingExpiry(): boolean {
    const oneDayFromNow = new Date(Date.now() + (24 * 60 * 60 * 1000));
    return this._expiresAt <= oneDayFromNow;
  }

  // Getters

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get token(): string { return this._token; }
  get expiresAt(): Date { return new Date(this._expiresAt); }
  get createdAt(): Date { return new Date(this._createdAt); }
  get lastUsedAt(): Date | null { return this._lastUsedAt ? new Date(this._lastUsedAt) : null; }
  get isRevoked(): boolean { return this._isRevoked; }
  get userAgent(): string | undefined { return this._userAgent; }
  get ipAddress(): string | undefined { return this._ipAddress; }

  get timeUntilExpiry(): number {
    return Math.max(0, this._expiresAt.getTime() - Date.now());
  }

  get daysUntilExpiry(): number {
    return Math.floor(this.timeUntilExpiry / (24 * 60 * 60 * 1000));
  }

  // SERIALIZATION

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

  /** Omits the token value for safe client exposure */
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

  toString(): string {
    return `RefreshToken(id=${this._id}, userId=${this._userId}, valid=${this.isValid()}, expires=${this._expiresAt.toISOString()})`;
  }

  equals(other: RefreshToken): boolean {
    return this._id === other._id && this._token === other._token;
  }
}
