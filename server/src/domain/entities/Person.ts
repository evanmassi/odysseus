/**
 * Person Identity Profile
 *
 * Identity foundation linked to User accounts and Researcher profiles.
 */

import { ValidationError } from '@domain/errors/ValidationError';
import { generateId } from '@domain/utils/generateId';

export class Person {
  private constructor(
    private readonly _id: string,
    private _firstName: string,
    private _lastName: string,
    private _email: string | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _position?: string,
    private _department?: string
  ) {
    this.validate();
  }

  static create(
    firstName: string,
    lastName: string,
    email: string,
    position?: string,
    department?: string
  ): Person {
    const id = generateId('person');
    const now = new Date();

    return new Person(
      id,
      firstName.trim(),
      lastName.trim(),
      email.toLowerCase().trim(),
      now,
      now,
      position?.trim(),
      department?.trim()
    );
  }

  static fromData(data: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    position?: string;
    department?: string;
  }): Person {
    return new Person(
      data.id,
      data.firstName,
      data.lastName,
      data.email,
      typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt,
      typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt,
      data.position,
      data.department
    );
  }

  private validate(): void {
    this.validateName();
    this.validateEmail();
  }

  private validateName(): void {
    if (!this._firstName || this._firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (!this._lastName || this._lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (this._firstName.length > 100) {
      throw new ValidationError('First name cannot exceed 100 characters');
    }

    if (this._lastName.length > 100) {
      throw new ValidationError('Last name cannot exceed 100 characters');
    }
  }

  private validateEmail(): void {
    // Historical persons (deleted user, researcher kept for tube attribution) have no email
    if (!this._email) return;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this._email)) {
      throw new ValidationError('Invalid email format');
    }

    if (this._email.length > 255) {
      throw new ValidationError('Email cannot exceed 255 characters');
    }
  }

  updateProfile(firstName: string, lastName: string, position?: string, department?: string): void {
    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
    this._position = position?.trim();
    this._department = department?.trim();
    this._updatedAt = new Date();
    this.validate();
  }

  updateEmail(email: string): void {
    this._email = email.toLowerCase().trim();
    this._updatedAt = new Date();
    this.validateEmail();
  }

  clearEmail(): void {
    this._email = undefined;
    this._updatedAt = new Date();
  }

  toData(): {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    position?: string;
    department?: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this._id,
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email,
      position: this._position,
      department: this._department,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }

  get id(): string {
    return this._id;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get email(): string | undefined {
    return this._email;
  }

  get position(): string | undefined {
    return this._position;
  }

  get department(): string | undefined {
    return this._department;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }
}
