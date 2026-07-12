/**
 * JWT Refresh Token
 *
 * Long-lived token for OAuth 2.0 dual-token authentication with rotation support.
 */

import * as crypto from 'crypto';

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { hashToken } from '@domain/utils/tokenHash';

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
    private readonly _ipAddress?: string,
    // The raw token is only available on freshly-created tokens (returned to the client once).
    // Persisted/loaded tokens carry only the hash in `_token`.
    private readonly _rawToken?: string
  ) {
    this.validate();
  }

  static create(
    userId: string,
    expirationDays: number = 7,
    userAgent?: string,
    ipAddress?: string
  ): RefreshToken {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const id = generateId('refresh');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));

    return new RefreshToken(
      id,
      userId,
      hashToken(rawToken),
      expiresAt,
      now,
      null,
      false,
      userAgent,
      ipAddress,
      rawToken
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

  recordUsage(): void {
    if (!this.isValid()) {
      throw new ValidationError('Cannot record usage on invalid refresh token');
    }
    
    this._lastUsedAt = new Date();
  }

  revoke(): void {
    this._isRevoked = true;
  }

  // Getters

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  /** The stored hash. Use `rawToken` for the value handed to the client at creation. */
  get token(): string { return this._token; }
  /** The plaintext token — only present on a freshly created token, for the one-time client response. */
  get rawToken(): string | undefined { return this._rawToken; }
  get expiresAt(): Date { return new Date(this._expiresAt); }
  get createdAt(): Date { return new Date(this._createdAt); }
  get lastUsedAt(): Date | null { return this._lastUsedAt ? new Date(this._lastUsedAt) : null; }
  get isRevoked(): boolean { return this._isRevoked; }
  get userAgent(): string | undefined { return this._userAgent; }
  get ipAddress(): string | undefined { return this._ipAddress; }

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
}
