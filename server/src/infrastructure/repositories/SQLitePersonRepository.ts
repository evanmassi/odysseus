import { PersonRepository } from '@domain/repositories/PersonRepository';
import { Person } from '@domain/entities/Person';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { PersonMapper, PersonRow } from '@infrastructure/database/mappers/PersonMapper';

/**
 * SQLitePersonRepository - Person data access
 *
 * Implements PersonRepository interface using SQLite.
 * Person is the single source of truth for human identity.
 */
export class SQLitePersonRepository implements PersonRepository {

  constructor(private context: SQLiteContext) {}

  async findById(id: string): Promise<Person | null> {
    const row = await this.context.queryOne<PersonRow>(
      'SELECT * FROM persons WHERE id = ?',
      [id]
    );
    return row ? PersonMapper.fromRow(row) : null;
  }

  async findByEmail(email: string): Promise<Person | null> {
    // Email comparison is case-insensitive
    const normalizedEmail = email.toLowerCase().trim();
    const row = await this.context.queryOne<PersonRow>(
      'SELECT * FROM persons WHERE LOWER(email) = ?',
      [normalizedEmail]
    );
    return row ? PersonMapper.fromRow(row) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    // Email comparison is case-insensitive
    const normalizedEmail = email.toLowerCase().trim();
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM persons WHERE LOWER(email) = ?',
      [normalizedEmail]
    );
    return (result?.count || 0) > 0;
  }

  async save(person: Person): Promise<void> {
    const row = PersonMapper.toRow(person);

    await this.context.execute(`
      INSERT OR REPLACE INTO persons (
        id, firstName, lastName, email, position, department, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      row.id, row.firstName, row.lastName, row.email, row.position, row.department, row.createdAt, row.updatedAt
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM persons WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async findAll(): Promise<Person[]> {
    const rows = await this.context.queryMany<PersonRow>(
      'SELECT * FROM persons ORDER BY lastName, firstName'
    );
    return PersonMapper.fromRows(rows);
  }

  async findByIds(ids: string[]): Promise<Person[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.context.queryMany<PersonRow>(
      `SELECT * FROM persons WHERE id IN (${placeholders})`,
      ids
    );
    return PersonMapper.fromRows(rows);
  }
}
