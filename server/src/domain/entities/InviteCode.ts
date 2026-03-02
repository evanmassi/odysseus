/**
 * InviteCode Entity
 *
 * Represents a registration invite code that grants access to a specific lab.
 * Lab admins generate codes, share them externally, and new users enter them during registration.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import * as crypto from 'crypto';

export type DeactivationReason = 'used' | 'expired' | 'manual';

export class InviteCode {
  private constructor(
    private readonly _id: string,
    private readonly _labId: string,
    private readonly _code: string,
    private readonly _role: 'lab_admin' | 'user',
    private readonly _createdBy: string,
    private readonly _maxUses: number | undefined,
    private _useCount: number,
    private readonly _expiresAt: Date | undefined,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _deactivationReason: DeactivationReason | undefined
  ) {
    this.validate();
  }

  static create(
    labId: string,
    createdBy: string,
    role: 'lab_admin' | 'user' = 'user',
    maxUses?: number,
    expiresAt?: Date
  ): InviteCode {
    const id = generateId('invite');
    const code = InviteCode.generateCode();
    return new InviteCode(id, labId, code, role, createdBy, maxUses, 0, expiresAt, true, new Date(), undefined);
  }

  static fromData(data: {
    id: string;
    labId: string;
    code: string;
    role: 'lab_admin' | 'user';
    createdBy: string;
    maxUses?: number;
    useCount: number;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
    deactivationReason?: DeactivationReason;
  }): InviteCode {
    return new InviteCode(
      data.id,
      data.labId,
      data.code,
      data.role,
      data.createdBy,
      data.maxUses,
      data.useCount,
      data.expiresAt ? new Date(data.expiresAt) : undefined,
      data.isActive,
      new Date(data.createdAt),
      data.deactivationReason
    );
  }

  /** Generates a code in ODYSS-XXXX-XXXX format */
  private static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = (len: number) => {
      const bytes = crypto.randomBytes(len);
      return Array.from(bytes).map(b => chars[b % chars.length]).join('');
    };
    return `ODYSS-${segment(4)}-${segment(4)}`;
  }

  private validate(): void {
    if (!this._id) {
      throw new ValidationError('Invite code ID is required');
    }
    if (!this._labId) {
      throw new ValidationError('Lab ID is required for invite code');
    }
    if (!this._code) {
      throw new ValidationError('Invite code value is required');
    }
    if (!this._createdBy) {
      throw new ValidationError('Creator ID is required for invite code');
    }
    if (this._role !== 'lab_admin' && this._role !== 'user') {
      throw new ValidationError('Invite code role must be lab_admin or user');
    }
    if (this._maxUses !== undefined && this._maxUses < 1) {
      throw new ValidationError('Max uses must be at least 1');
    }
  }

  isValid(): boolean {
    if (!this._isActive) return false;
    if (this._expiresAt && new Date() > this._expiresAt) {
      this._isActive = false;
      this._deactivationReason = 'expired';
      return false;
    }
    if (this._maxUses !== undefined && this._useCount >= this._maxUses) return false;
    return true;
  }

  recordUse(): void {
    if (!this.isValid()) {
      throw new ValidationError('Invite code is no longer valid');
    }
    this._useCount++;
    if (this._maxUses !== undefined && this._useCount >= this._maxUses) {
      this._isActive = false;
      this._deactivationReason = 'used';
    }
  }

  deactivate(): void {
    this._isActive = false;
    this._deactivationReason ??= 'manual';
  }

  toData(): {
    id: string;
    labId: string;
    code: string;
    role: 'lab_admin' | 'user';
    createdBy: string;
    maxUses?: number;
    useCount: number;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
    deactivationReason?: DeactivationReason;
  } {
    return {
      id: this._id,
      labId: this._labId,
      code: this._code,
      role: this._role,
      createdBy: this._createdBy,
      maxUses: this._maxUses,
      useCount: this._useCount,
      expiresAt: this._expiresAt?.toISOString(),
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
      deactivationReason: this._deactivationReason,
    };
  }

  equals(other: InviteCode): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  get id(): string { return this._id; }
  get labId(): string { return this._labId; }
  get code(): string { return this._code; }
  get role(): 'lab_admin' | 'user' { return this._role; }
  get createdBy(): string { return this._createdBy; }
  get maxUses(): number | undefined { return this._maxUses; }
  get useCount(): number { return this._useCount; }
  get expiresAt(): Date | undefined { return this._expiresAt ? new Date(this._expiresAt) : undefined; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get deactivationReason(): DeactivationReason | undefined { return this._deactivationReason; }
}
