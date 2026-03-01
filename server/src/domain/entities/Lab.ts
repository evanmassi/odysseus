/**
 * Lab Entity (Tenant Aggregate Root)
 *
 * Represents a lab tenant in the multi-tenancy system.
 * All tenant-scoped data (tubes, researchers, configuration, etc.) belongs to a lab.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';
import { DEMO_LIMITS_DEFAULTS, type DemoLimits } from '@odysseus/shared-schemas';

export class Lab {
  private constructor(
    private readonly _id: string,
    private _name: string,
    private _slug: string,
    private _isActive: boolean,
    private readonly _isDemo: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _demoLimits?: DemoLimits
  ) {
    this.validate();
  }

  static create(name: string): Lab {
    const id = generateId('lab');
    const slug = Lab.generateSlug(name);
    const now = new Date();
    return new Lab(id, name, slug, true, false, now, now);
  }

  static createDemo(name: string): Lab {
    const id = generateId('lab');
    const slug = Lab.generateSlug(name);
    const now = new Date();
    return new Lab(id, name, slug, true, true, now, now, { ...DEMO_LIMITS_DEFAULTS });
  }

  static fromData(data: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isDemo: boolean;
    createdAt: string;
    updatedAt: string;
    demoLimits?: DemoLimits;
  }): Lab {
    return new Lab(
      data.id,
      data.name,
      data.slug,
      data.isActive,
      data.isDemo,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.demoLimits
    );
  }

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Lab ID is required');
    }

    if (!this._name || this._name.trim().length === 0) {
      throw new ValidationError('Lab name is required');
    }

    if (this._name.length > 200) {
      throw new ValidationError('Lab name cannot exceed 200 characters');
    }

    if (!this._slug || this._slug.trim().length === 0) {
      throw new ValidationError('Lab slug is required');
    }
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  updateDemoLimits(limits: Partial<DemoLimits>): void {
    if (!this._isDemo) {
      throw new ValidationError('Demo limits can only be set on demo labs');
    }
    this._demoLimits = {
      ...(this._demoLimits ?? { ...DEMO_LIMITS_DEFAULTS }),
      ...limits,
    };
    this._updatedAt = new Date();
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Lab name is required');
    }
    if (name.length > 200) {
      throw new ValidationError('Lab name cannot exceed 200 characters');
    }
    this._name = name;
    this._slug = Lab.generateSlug(name);
    this._updatedAt = new Date();
  }

  toData(): {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isDemo: boolean;
    createdAt: string;
    updatedAt: string;
    demoLimits?: DemoLimits;
  } {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      isActive: this._isActive,
      isDemo: this._isDemo,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      ...(this._demoLimits && { demoLimits: this._demoLimits }),
    };
  }

  toPublicData(): {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isDemo: boolean;
    demoLimits?: DemoLimits;
  } {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      isActive: this._isActive,
      isDemo: this._isDemo,
      ...(this._demoLimits && { demoLimits: this._demoLimits }),
    };
  }

  equals(other: Lab): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get slug(): string { return this._slug; }
  get isActive(): boolean { return this._isActive; }
  get isDemo(): boolean { return this._isDemo; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
  get demoLimits(): DemoLimits | undefined { return this._demoLimits; }
}
