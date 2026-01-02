import { Person } from '@domain/entities/Person';

/**
 * Database row structure for persons table (PostgreSQL snake_case)
 */
export interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  department?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * PersonMapper - Conversion between Domain Entity and Database Row
 *
 * Handles translation between:
 * - Domain entities (camelCase)
 * - PostgreSQL rows (snake_case)
 */
export class PersonMapper {

  /**
   * Convert Domain Entity to Database Row (for INSERT/UPDATE)
   */
  static toRow(person: Person): PersonRow {
    return {
      id: person.id,
      first_name: person.firstName,
      last_name: person.lastName,
      email: person.email,
      position: person.position,
      department: person.department,
      created_at: person.createdAt instanceof Date ? person.createdAt : new Date(person.createdAt),
      updated_at: person.updatedAt instanceof Date ? person.updatedAt : new Date(person.updatedAt)
    };
  }

  /**
   * Convert Database Row to Domain Entity (from SELECT)
   */
  static fromRow(row: PersonRow): Person {
    return Person.fromData({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      position: row.position,
      department: row.department,
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
      updatedAt: row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString()
    });
  }

  /**
   * Convert multiple rows to entities
   */
  static fromRows(rows: PersonRow[]): Person[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Convert multiple entities to rows
   */
  static toRows(persons: Person[]): PersonRow[] {
    return persons.map(person => this.toRow(person));
  }
}
