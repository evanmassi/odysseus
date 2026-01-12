import { PersonRepository as IPersonRepository } from '@domain/repositories/PersonRepository';
import { Person } from '@domain/entities/Person';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { PersonMapper, PersonRow } from '@infrastructure/database/mappers/PersonMapper';

/**
 * Explicit column list for persons table queries
 */
const PERSON_COLUMNS = `
  id, first_name, last_name, email, position, department, created_at, updated_at
`.trim();

/**
 * PersonRepository - Person data access
 *
 * Person stores human identity (name, email, department).
 */
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
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM persons WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    return parseInt(result?.count || '0', 10) > 0;
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
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.context.queryMany<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons WHERE id IN (${placeholders})`,
      ids
    );
    return PersonMapper.fromRows(rows);
  }
}
