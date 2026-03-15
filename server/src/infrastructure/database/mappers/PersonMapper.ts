/**
 * Person Mapper
 *
 * Converts between database rows and Person domain entities.
 */

import { Person } from '@domain/entities/Person';
import { toDate, toISOString } from '@infrastructure/database/PostgresContext';

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
      created_at: toDate(person.createdAt),
      updated_at: toDate(person.updatedAt)
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
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at)
    });
  }

  static fromRows(rows: PersonRow[]): Person[] {
    return rows.map(row => this.fromRow(row));
  }
}
