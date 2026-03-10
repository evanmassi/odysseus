/**
 * Person Repository Interface
 *
 * Data access contract for person identity records.
 */

import { Person } from '@domain/entities/Person';

export interface PersonRepository {
  findById(id: string): Promise<Person | null>;
  findByEmail(email: string): Promise<Person | null>;
  emailExists(email: string): Promise<boolean>;
  save(person: Person): Promise<void>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<Person[]>;

  /** Returns only found persons — no errors for missing IDs. */
  findByIds(ids: string[]): Promise<Person[]>;
}
