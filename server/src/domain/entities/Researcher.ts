/**
 * Researcher Profile
 *
 * Links a Person to research activities.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export type ResearcherSource = 'registration' | 'admin';

export class Researcher {
  private constructor(
    private readonly _id: string,
    private readonly _personId: string,
    private _active: boolean,
    private readonly _createdAt: Date,
    private readonly _source: ResearcherSource,
    private readonly _labId?: string
  ) {
    this.validate();
  }

  static create(
    personId: string,
    options?: {
      source?: ResearcherSource;
      labId?: string;
    }
  ): Researcher {
    const id = generateId('researcher');
    const now = new Date();
    const source = options?.source ?? 'admin';

    return new Researcher(id, personId, true, now, source, options?.labId);
  }

  static fromData(data: {
    id: string;
    personId: string;
    active: boolean;
    createdAt: string | Date;
    source?: ResearcherSource;
    labId?: string;
  }): Researcher {
    return new Researcher(
      data.id,
      data.personId,
      data.active,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      data.source ?? 'admin',
      data.labId
    );
  }

  private validate(): void {
    if (!this._personId || this._personId.trim().length === 0) {
      throw new ValidationError('Person ID is required');
    }
  }

  activate(): void {
    this._active = true;
  }

  deactivate(): void {
    this._active = false;
  }

  toData(): {
    id: string;
    personId: string;
    active: boolean;
    createdAt: string;
    source: ResearcherSource;
    labId?: string;
  } {
    return {
      id: this._id,
      personId: this._personId,
      active: this._active,
      createdAt: this._createdAt.toISOString(),
      source: this._source,
      labId: this._labId,
    };
  }

  get id(): string {
    return this._id;
  }
  get labId(): string | undefined {
    return this._labId;
  }
  get personId(): string {
    return this._personId;
  }
  get active(): boolean {
    return this._active;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get source(): ResearcherSource {
    return this._source;
  }
}
