/**
 * Person Repository
 *
 * Data access for person identity records (name, email, department).
 */

import type { Person } from '@domain/entities/Person';
import type { PersonRepository as IPersonRepository } from '@domain/repositories/PersonRepository';
import type { PersonRow } from '@infrastructure/database/mappers/PersonMapper';
import { PersonMapper } from '@infrastructure/database/mappers/PersonMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const PERSON_COLUMNS = `
  id, first_name, last_name, email, position, department, created_at, updated_at
`.trim();

export class PersonRepository implements IPersonRepository {

  constructor(private context: PostgresContext) {}

  async findById(id: string): Promise<Person | null> {
    const row = await this.context.queryOne<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons WHERE id = $1`,
      [id]
    );
    return row ? PersonMapper.fromRow(row) : null;
  }

  async findByEmail(email: string): Promise<Person | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const row = await this.context.queryOne<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );
    return row ? PersonMapper.fromRow(row) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const row = await this.context.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM persons WHERE LOWER(email) = $1) as exists',
      [normalizedEmail]
    );
    return row?.exists ?? false;
  }

  async save(person: Person): Promise<void> {
    const row = PersonMapper.toRow(person);

    await this.context.execute(`
      INSERT INTO persons (
        id, first_name, last_name, email, position, department, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        position = EXCLUDED.position,
        department = EXCLUDED.department,
        updated_at = EXCLUDED.updated_at
    `, [
      row.id, row.first_name, row.last_name, row.email,
      row.position, row.department, row.created_at, row.updated_at
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM persons WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findAll(): Promise<Person[]> {
    const rows = await this.context.queryMany<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons ORDER BY last_name, first_name`
    );
    return PersonMapper.fromRows(rows);
  }

  async findByIds(ids: string[]): Promise<Person[]> {
    const rows = await this.context.queryByIds<PersonRow>('persons', PERSON_COLUMNS, ids);
    return PersonMapper.fromRows(rows);
  }
}
