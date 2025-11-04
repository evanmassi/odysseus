import { Person } from '@domain/entities/Person';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * Database row structure for persons table
 */
export interface PersonRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * PersonMapper - Conversion between Domain Entity and Database Row
 */
export class PersonMapper {

  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(person: Person): PersonRow {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      position: person.position,
      department: person.department,
      createdAt: SqliteDateMapper.toDbDateTime(person.createdAt),
      updatedAt: SqliteDateMapper.toDbDateTime(person.updatedAt)
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: PersonRow): Person {
    return Person.fromData({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      position: row.position,
      department: row.department,
      createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!.toISOString(),
      updatedAt: SqliteDateMapper.fromDbDateTime(row.updatedAt)!.toISOString()
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
