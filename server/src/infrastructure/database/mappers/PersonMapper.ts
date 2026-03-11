/**
 * Person Mapper
 *
 * Converts between database rows and Person domain entities.
 */

import { Person } from '@domain/entities/Person';

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

export class PersonMapper {

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

  static fromRows(rows: PersonRow[]): Person[] {
    return rows.map(row => this.fromRow(row));
  }
}
