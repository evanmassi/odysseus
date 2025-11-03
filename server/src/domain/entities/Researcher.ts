import { ValidationError } from '@domain/errors/ValidationError';

/**
 * Researcher Entity
 * Represents a researcher/scientist who can own tubes
 * Simple entity with minimal business logic
 */
export class Researcher {
  private constructor(
    private readonly _id: string,
    private _firstName: string,
    private _lastName: string,
    private _position: string | undefined,
    private _department: string | undefined,
    private _email: string | undefined,
    private _active: boolean,
    private readonly _createdAt: Date,
    private _personId?: string
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new researcher
   */
  static create(
    firstName: string,
    lastName: string,
    email: string,
    position?: string,
    department?: string,
    personId?: string
  ): Researcher {
    const id = Researcher.generateId();
    const now = new Date();

    return new Researcher(id, firstName, lastName, position, department, email, true, now, personId);
  }

  /**
   * Factory method to reconstitute researcher from persistence data
   */
  static fromData(data: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    position?: string;
    department?: string;
    active: boolean;
    createdAt: string;
    personId?: string;
  }): Researcher {
    return new Researcher(
      data.id,
      data.firstName,
      data.lastName,
      data.position,
      data.department,
      data.email,
      data.active,
      new Date(data.createdAt),
      data.personId
    );
  }

  /**
   * Generate unique researcher ID
   */
  private static generateId(): string {
    return 'researcher_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validate researcher state (invariants)
   */
  private validate(): void {
    this.validateFirstName();
    this.validateLastName();
    this.validateEmail();
  }

  private validateFirstName(): void {
    if (!this._firstName || this._firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (this._firstName.length > 50) {
      throw new ValidationError('First name cannot exceed 50 characters');
    }

    // Business rule: Name format validation
    const namePattern = /^[a-zA-Z\s\-'\.]+$/;
    if (!namePattern.test(this._firstName.trim())) {
      throw new ValidationError('First name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }
  }

  private validateLastName(): void {
    if (!this._lastName || this._lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (this._lastName.length > 50) {
      throw new ValidationError('Last name cannot exceed 50 characters');
    }

    // Business rule: Name format validation
    const namePattern = /^[a-zA-Z\s\-'\.]+$/;
    if (!namePattern.test(this._lastName.trim())) {
      throw new ValidationError('Last name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }
  }

  private validateEmail(): void {
    if (!this._email || this._email.trim().length === 0) {
      throw new ValidationError('Email is required');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this._email.trim())) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Business method: Update researcher name
   */
  changeName(firstName: string, lastName: string): void {
    if (firstName === this._firstName && lastName === this._lastName) {
      return; // No change needed
    }

    // Create temporary researcher to validate the new names
    const temp = new Researcher(this._id, firstName, lastName, this._position, this._department, this._email, this._active, this._createdAt, this._personId);

    // If validation passes, update the names
    this._firstName = firstName;
    this._lastName = lastName;
  }

  /**
   * Business method: Update researcher position
   */
  changePosition(position?: string): void {
    this._position = position;
  }

  /**
   * Business method: Update researcher department
   */
  changeDepartment(department?: string): void {
    this._department = department;
  }

  /**
   * Business method: Update researcher email
   */
  changeEmail(email: string): void {
    this._email = email;
    this.validateEmail(); // Validate new email
  }

  /**
   * Business method: Activate researcher
   */
  activate(): void {
    this._active = true;
  }

  /**
   * Business method: Deactivate researcher
   */
  deactivate(): void {
    this._active = false;
  }

  /**
   * Business method: Toggle active status
   */
  toggleActiveStatus(): void {
    this._active = !this._active;
  }

  /**
   * Business query: Check if researcher is active
   */
  isActive(): boolean {
    return this._active;
  }

  /**
   * Business query: Check if researcher name matches (case-insensitive)
   */
  hasName(firstName: string, lastName: string): boolean {
    return this._firstName.toLowerCase() === firstName.toLowerCase() &&
           this._lastName.toLowerCase() === lastName.toLowerCase();
  }

  /**
   * Business query: Get full name "First Last"
   */
  getFullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  /**
   * Business query: Get display name "Last, First" (formatted for lists)
   */
  getDisplayName(): string {
    const formattedName = `${this._lastName}, ${this._firstName}`;
    return this._active ? formattedName : `${formattedName} (Inactive)`;
  }

  /**
   * Business query: Get dropdown display name "First Last"
   */
  getDropdownDisplayName(): string {
    return this.getFullName();
  }

  /**
   * Convert to data object for persistence
   */
  toData(): {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    position?: string;
    department?: string;
    active: boolean;
    createdAt: string;
    personId?: string;
  } {
    return {
      id: this._id,
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email,
      position: this._position,
      department: this._department,
      active: this._active,
      createdAt: this._createdAt.toISOString(),
      personId: this._personId
    };
  }

  /**
   * Convert to API response format
   */
  toApiData(): {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    position?: string;
    department?: string;
    active: boolean;
    displayName: string;
    createdAt: string;
    personId?: string;
  } {
    return {
      id: this._id,
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email,
      position: this._position,
      department: this._department,
      active: this._active,
      displayName: this.getDisplayName(),
      createdAt: this._createdAt.toISOString(),
      personId: this._personId
    };
  }

  /**
   * Equality check (identity-based for entities)
   */
  equals(other: Researcher): boolean {
    if (!other) return false;
    return this._id === other._id;
  }

  /**
   * String representation
   */
  toString(): string {
    return `Researcher(${this.getFullName()})${this._active ? '' : ' [Inactive]'}`;
  }

  // Getters (immutable access to entity state)
  get id(): string { return this._id; }
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get position(): string | undefined { return this._position; }
  get department(): string | undefined { return this._department; }
  get email(): string | undefined { return this._email; }
  get active(): boolean { return this._active; }
  get createdAt(): Date { return new Date(this._createdAt); } // Return copy
  get personId(): string | undefined { return this._personId; }



  /**
   * Static helper methods for researcher management
   */

  /**
   * Validate researcher first name without creating instance
   */
  static validateFirstName(firstName: string): void {
    if (!firstName || firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (firstName.length > 50) {
      throw new ValidationError('First name cannot exceed 50 characters');
    }

    const namePattern = /^[a-zA-Z\s\-'\.]+$/;
    if (!namePattern.test(firstName.trim())) {
      throw new ValidationError('First name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }
  }

  /**
   * Validate researcher last name without creating instance
   */
  static validateLastName(lastName: string): void {
    if (!lastName || lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (lastName.length > 50) {
      throw new ValidationError('Last name cannot exceed 50 characters');
    }

    const namePattern = /^[a-zA-Z\s\-'\.]+$/;
    if (!namePattern.test(lastName.trim())) {
      throw new ValidationError('Last name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }
  }

  /**
   * Check if two researchers are the same (for duplicate detection)
   */
  static areNamesSimilar(firstName1: string, lastName1: string, firstName2: string, lastName2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    return normalize(firstName1) === normalize(firstName2) && normalize(lastName1) === normalize(lastName2);
  }

  /**
   * Create multiple researchers from data array (convenience method)
   */
  static createMany(researcherData: Array<{ firstName: string; lastName: string; email: string; position?: string; department?: string; personId?: string }>): Researcher[] {
    const researchers: Researcher[] = [];
    const seen = new Set<string>();

    for (const data of researcherData) {
      const normalizedKey = `${data.firstName}|${data.lastName}`.toLowerCase().trim();

      // Skip duplicates
      if (seen.has(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      researchers.push(Researcher.create(data.firstName.trim(), data.lastName.trim(), data.email.trim(), data.position, data.department, data.personId));
    }

    return researchers;
  }
}
