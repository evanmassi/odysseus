/**
 * Researcher Profile
 *
 * Links a Person to research activities. Approval workflow prevents researchers
 * from appearing in dropdowns until their linked user account is approved.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export type ResearcherApprovalStatus = 'pending' | 'approved';
export type ResearcherSource = 'registration' | 'admin';

export class Researcher {
  private constructor(
    private readonly _id: string,
    private readonly _personId: string,
    private _active: boolean,
    private readonly _createdAt: Date,
    private _approvalStatus: ResearcherApprovalStatus,
    private readonly _source: ResearcherSource,
    private readonly _labId?: string
  ) {
    this.validate();
  }

  /**
   * Creates researcher with approval status based on source and user approval state.
   * Admin-created researchers are always approved. Registration-created researchers
   * are pending until the linked user is approved.
   */
  static create(
    personId: string,
    options?: {
      isUserApproved?: boolean;
      source?: ResearcherSource;
      labId?: string;
    }
  ): Researcher {
    const id = generateId('researcher');
    const now = new Date();
    const source = options?.source ?? 'admin';
    const isUserApproved = options?.isUserApproved ?? false;

    const approvalStatus: ResearcherApprovalStatus =
      source === 'admin' ? 'approved' : (isUserApproved ? 'approved' : 'pending');

    return new Researcher(id, personId, true, now, approvalStatus, source, options?.labId);
  }

  static fromData(data: {
    id: string;
    personId: string;
    active: boolean;
    createdAt: string | Date;
    approvalStatus?: ResearcherApprovalStatus;
    source?: ResearcherSource;
    labId?: string;
  }): Researcher {
    return new Researcher(
      data.id,
      data.personId,
      data.active,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      data.approvalStatus ?? 'approved',
      data.source ?? 'admin',
      data.labId
    );
  }

  private validate(): void {
    if (!this._personId || this._personId.trim().length === 0) {
      throw new ValidationError('Person ID is required');
    }
  }

  isActive(): boolean {
    return this._active;
  }

  activate(): void {
    this._active = true;
  }

  deactivate(): void {
    this._active = false;
  }

  toggleActiveStatus(): void {
    this._active = !this._active;
  }

  toData(): {
    id: string;
    personId: string;
    active: boolean;
    createdAt: string;
    approvalStatus: ResearcherApprovalStatus;
    source: ResearcherSource;
    labId?: string;
  } {
    return {
      id: this._id,
      personId: this._personId,
      active: this._active,
      createdAt: this._createdAt.toISOString(),
      approvalStatus: this._approvalStatus,
      source: this._source,
      labId: this._labId
    };
  }

  equals(other: Researcher): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  toString(): string {
    const statusParts: string[] = [];
    if (!this._active) statusParts.push('Inactive');
    if (this._approvalStatus === 'pending') statusParts.push('Pending Approval');
    const statusStr = statusParts.length > 0 ? ` [${statusParts.join(', ')}]` : '';
    return `Researcher(${this._id})${statusStr}`;
  }

  get id(): string { return this._id; }
  get labId(): string | undefined { return this._labId; }
  get personId(): string { return this._personId; }
  get active(): boolean { return this._active; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get approvalStatus(): ResearcherApprovalStatus { return this._approvalStatus; }
  get source(): ResearcherSource { return this._source; }
}
