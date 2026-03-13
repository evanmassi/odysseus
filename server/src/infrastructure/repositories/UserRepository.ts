/**
 * User Repository
 *
 * PostgreSQL implementation of user data access with hashed token matching.
 */

import * as crypto from 'crypto';

import type { User } from '@domain/entities/User';
import { EmailAlreadyExistsError } from '@domain/errors/UserErrors';
import type { UserRepository as IUserRepository } from '@domain/repositories/UserRepository';
import type { UserSearchCriteria } from '@domain/types/repository';
import { isEmailConstraintError } from '@infrastructure/database/DatabaseErrors';
import type { UserRow } from '@infrastructure/database/mappers/UserMapper';
import { UserMapper } from '@infrastructure/database/mappers/UserMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';


const USER_COLUMNS = `
  u.id, u.username, u.api_key, u.role, u.password_hash, u.salt, u.created_at, u.researcher_id, u.person_id, u.status,
  u.email_verified, u.email_verification_token, u.email_verification_expiry, u.last_verification_email_sent,
  u.password_reset_token, u.password_reset_expiry, u.require_password_change, u.last_password_change, u.settings, u.lab_id,
  l.is_demo AS lab_is_demo
`.trim();

const USER_FROM = `users u LEFT JOIN labs l ON u.lab_id = l.id`;

export class UserRepository implements IUserRepository {

  constructor(private context: PostgresContext) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.id = $1`,
      [id]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.api_key = $1`,
      [apiKey]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.username = $1`,
      [username]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM ${USER_FROM} INNER JOIN persons p ON u.person_id = p.id WHERE LOWER(p.email) = $1`,
      [normalizedEmail]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByResearcherId(researcherId: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.researcher_id = $1`,
      [researcherId]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByPersonId(personId: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.person_id = $1`,
      [personId]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.findByHashedToken(token, 'email_verification_token', 'email_verification_expiry', 'emailVerificationToken');
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.findByHashedToken(token, 'password_reset_token', 'password_reset_expiry', 'passwordResetToken');
  }

  async findAll(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} ORDER BY u.created_at`
    );
    return UserMapper.fromRows(rows);
  }

  async findAllWithLastActivity(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS},
        (SELECT MAX(last_used_at) FROM user_sessions WHERE user_id = u.id AND is_active = true) as last_activity
      FROM ${USER_FROM} ORDER BY u.created_at`
    );
    return UserMapper.fromRows(rows);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.id IN (${placeholders})`,
      ids
    );
    return UserMapper.fromRows(rows);
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);

    try {
      await this.context.execute(`
        INSERT INTO users (
          id, username, api_key, role, password_hash, salt, created_at, researcher_id, person_id, status,
          email_verified, email_verification_token, email_verification_expiry, last_verification_email_sent,
          password_reset_token, password_reset_expiry, require_password_change, last_password_change, settings, lab_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          api_key = EXCLUDED.api_key,
          role = EXCLUDED.role,
          password_hash = EXCLUDED.password_hash,
          salt = EXCLUDED.salt,
          created_at = EXCLUDED.created_at,
          researcher_id = EXCLUDED.researcher_id,
          person_id = EXCLUDED.person_id,
          status = EXCLUDED.status,
          email_verified = EXCLUDED.email_verified,
          email_verification_token = EXCLUDED.email_verification_token,
          email_verification_expiry = EXCLUDED.email_verification_expiry,
          last_verification_email_sent = EXCLUDED.last_verification_email_sent,
          password_reset_token = EXCLUDED.password_reset_token,
          password_reset_expiry = EXCLUDED.password_reset_expiry,
          require_password_change = EXCLUDED.require_password_change,
          last_password_change = EXCLUDED.last_password_change,
          settings = EXCLUDED.settings,
          lab_id = EXCLUDED.lab_id
      `, [
        row.id, row.username, row.api_key, row.role, row.password_hash, row.salt, row.created_at,
        row.researcher_id, row.person_id, row.status, row.email_verified, row.email_verification_token,
        row.email_verification_expiry, row.last_verification_email_sent, row.password_reset_token,
        row.password_reset_expiry, row.require_password_change, row.last_password_change, row.settings,
        row.lab_id
      ]);
    } catch (error) {
      if (isEmailConstraintError(error)) {
        throw new EmailAlreadyExistsError();
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // AUTHENTICATION OPERATIONS

  async apiKeyExists(apiKey: string): Promise<boolean> {
    const result = await this.context.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE api_key = $1) as exists',
      [apiKey]
    );
    return result?.exists ?? false;
  }

  async usernameExists(username: string): Promise<boolean> {
    const result = await this.context.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as exists',
      [username]
    );
    return result?.exists ?? false;
  }

  async emailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await this.context.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users u INNER JOIN persons p ON u.person_id = p.id WHERE LOWER(p.email) = $1) as exists',
      [normalizedEmail]
    );
    return result?.exists ?? false;
  }

  // ROLE-BASED OPERATIONS

  async isAdmin(apiKey: string): Promise<boolean> {
    const result = await this.context.queryOne<{ role: string }>(
      'SELECT role FROM users WHERE api_key = $1',
      [apiKey]
    );
    return result?.role === 'system_admin' || result?.role === 'lab_admin';
  }

  async countByRole(role: 'system_admin' | 'lab_admin' | 'user'): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      [role]
    );
    return parseInt(result?.count || '0', 10);
  }

  async isEmpty(): Promise<boolean> {
    const result = await this.context.queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users) as exists'
    );
    return !(result?.exists ?? false);
  }

  async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.status = $1 ORDER BY u.created_at DESC`,
      [status]
    );
    return UserMapper.fromRows(rows);
  }

  // USER MANAGEMENT OPERATIONS

  async updateRole(userId: string, newRole: 'system_admin' | 'lab_admin' | 'user'): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE users SET role = $1 WHERE id = $2',
      [newRole, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // BUSINESS QUERIES

  async count(): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users'
    );
    return parseInt(result?.count || '0', 10);
  }

  async search(criteria: UserSearchCriteria): Promise<User[]> {
    const whereClauses: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (criteria.username) {
      whereClauses.push(`u.username ILIKE $${paramIndex++}`);
      params.push(`%${criteria.username}%`);
    }

    if (criteria.role) {
      whereClauses.push(`u.role = $${paramIndex++}`);
      params.push(criteria.role);
    }

    if (criteria.createdAfter) {
      whereClauses.push(`u.created_at >= $${paramIndex++}`);
      params.push(criteria.createdAfter);
    }

    if (criteria.createdBefore) {
      whereClauses.push(`u.created_at <= $${paramIndex++}`);
      params.push(criteria.createdBefore);
    }

    let query = `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE ${whereClauses.join(' AND ')}`;

    if (criteria.sortBy) {
      const sortColumn = this.mapSortColumn(criteria.sortBy);
      const sortOrder = criteria.sortOrder || 'asc';
      query += ` ORDER BY u.${sortColumn} ${sortOrder.toUpperCase()}`;
    } else {
      query += ' ORDER BY u.created_at ASC';
    }

    if (criteria.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(criteria.limit);

      if (criteria.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(criteria.offset);
      }
    }

    const rows = await this.context.queryMany<UserRow>(query, params);
    return UserMapper.fromRows(rows);
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      'createdAt': 'created_at',
      'username': 'username',
      'role': 'role',
      'status': 'status'
    };
    return columnMap[sortBy] || 'created_at';
  }

  // LAB-SCOPED OPERATIONS

  async findByLabId(labId: string): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS},
        (SELECT MAX(last_used_at) FROM user_sessions WHERE user_id = u.id AND is_active = true) as last_activity
      FROM ${USER_FROM} WHERE u.lab_id = $1 ORDER BY u.created_at`,
      [labId]
    );
    return UserMapper.fromRows(rows);
  }

  async findByStatusInLab(status: 'pending' | 'approved' | 'rejected', labId: string): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.status = $1 AND u.lab_id = $2 ORDER BY u.created_at DESC`,
      [status, labId]
    );
    return UserMapper.fromRows(rows);
  }

  async countByRoleInLab(role: 'system_admin' | 'lab_admin' | 'user', labId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE role = $1 AND lab_id = $2',
      [role, labId]
    );
    return parseInt(result?.count || '0', 10);
  }

  // MAINTENANCE OPERATIONS

  async isHealthy(): Promise<boolean> {
    return this.context.isHealthy();
  }

  // PRIVATE HELPERS

  /** Loads all non-expired rows for a hashed token column and compares via PBKDF2. */
  private async findByHashedToken(
    token: string,
    tokenColumn: string,
    expiryColumn: string,
    userField: 'emailVerificationToken' | 'passwordResetToken'
  ): Promise<User | null> {
    const now = new Date();
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE u.${tokenColumn} IS NOT NULL AND u.${expiryColumn} > $1`,
      [now]
    );

    for (const row of rows) {
      const user = UserMapper.fromRow(row);
      try {
        const [salt, storedHash] = user[userField]!.split(':');
        const providedHash = crypto.pbkdf2Sync(token, salt, 10000, 64, 'sha512').toString('hex');

        if (providedHash === storedHash) {
          return user;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

}
