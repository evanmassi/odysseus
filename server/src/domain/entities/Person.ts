import { ValidationError } from '@domain/errors/ValidationError';

export class Person {
  private constructor(
    private readonly _id: string,
    private _firstName: string,
    private _lastName: string,
    private _email: string,
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
    const id = Person.generateId();
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
    email: string;
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

  private static generateId(): string {
    return 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    if (!this._email || this._email.trim().length === 0) {
      throw new ValidationError('Email is required');
    }

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

  equals(other: Person): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  toString(): string {
    return `Person(${this._firstName} ${this._lastName}) - ${this._email}`;
  }

  toData(): {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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

  get email(): string {
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
