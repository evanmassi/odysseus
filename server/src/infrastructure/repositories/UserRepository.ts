import { UserRepository as IUserRepository } from '@domain/repositories/UserRepository';
import type { UserRepositoryStats, UserSearchCriteria } from '@domain/types/repository';
import { User } from '@domain/entities/User';
import { EmailAlreadyExistsError } from '@domain/errors/UserErrors';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { isEmailConstraintError } from '@infrastructure/database/DatabaseErrors';
import { UserMapper, UserRow } from '@infrastructure/database/mappers/UserMapper';
import * as crypto from 'crypto';

/**
 * Explicit column list for users table queries
 */
const USER_COLUMNS = `
  id, username, api_key, role, password_hash, salt, created_at, researcher_id, person_id, status,
  email_verified, email_verification_token, email_verification_expiry, last_verification_email_sent,
  password_reset_token, password_reset_expiry, require_password_change, last_password_change, is_demo, settings
`.trim();

/**
 * UserRepository - User authentication data access
 *
 * Handles all user persistence operations.
 */
export class UserRepository implements IUserRepository {

  constructor(private context: PostgresContext) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE api_key = $1`,
      [apiKey]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE username = $1`,
      [username]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const row = await this.context.queryOne<UserRow>(
      `SELECT u.id, u.username, u.api_key, u.role, u.password_hash, u.salt, u.created_at, u.researcher_id, u.person_id, u.status,
              u.email_verified, u.email_verification_token, u.email_verification_expiry, u.last_verification_email_sent,
              u.password_reset_token, u.password_reset_expiry, u.require_password_change, u.last_password_change, u.is_demo, u.settings
       FROM users u INNER JOIN persons p ON u.person_id = p.id WHERE LOWER(p.email) = $1`,
      [normalizedEmail]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByResearcherId(researcherId: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE researcher_id = $1`,
      [researcherId]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByPersonId(personId: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE person_id = $1`,
      [personId]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const now = new Date();
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE email_verification_token IS NOT NULL AND email_verification_expiry > $1`,
      [now]
    );

    for (const row of rows) {
      const user = UserMapper.fromRow(row);
      try {
        const [salt, storedHash] = user.emailVerificationToken!.split(':');
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

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const now = new Date();
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE password_reset_token IS NOT NULL AND password_reset_expiry > $1`,
      [now]
    );

    for (const row of rows) {
      const user = UserMapper.fromRow(row);
      try {
        const [salt, storedHash] = user.passwordResetToken!.split(':');
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

  async findAll(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users ORDER BY created_at`
    );
    return UserMapper.fromRows(rows);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    const rows = await this.context.queryByIds<UserRow>('users', USER_COLUMNS, ids);
    return UserMapper.fromRows(rows);
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);

    try {
      await this.context.execute(`
        INSERT INTO users (
          id, username, api_key, role, password_hash, salt, created_at, researcher_id, person_id, status,
          email_verified, email_verification_token, email_verification_expiry, last_verification_email_sent,
          password_reset_token, password_reset_expiry, require_password_change, last_password_change, is_demo, settings
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
          is_demo = EXCLUDED.is_demo,
          settings = EXCLUDED.settings
      `, [
        row.id, row.username, row.api_key, row.role, row.password_hash, row.salt, row.created_at,
        row.researcher_id, row.person_id, row.status, row.email_verified, row.email_verification_token,
        row.email_verification_expiry, row.last_verification_email_sent, row.password_reset_token,
        row.password_reset_expiry, row.require_password_change, row.last_password_change, row.is_demo, row.settings
      ]);
    } catch (error) {
      // Translate database-specific errors to domain errors
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
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE api_key = $1',
      [apiKey]
    );
    return parseInt(result?.count || '0', 10) > 0;
  }

  async usernameExists(username: string): Promise<boolean> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE username = $1',
      [username]
    );
    return parseInt(result?.count || '0', 10) > 0;
  }

  async emailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users u INNER JOIN persons p ON u.person_id = p.id WHERE LOWER(p.email) = $1',
      [normalizedEmail]
    );
    return parseInt(result?.count || '0', 10) > 0;
  }

  // ROLE-BASED OPERATIONS

  async findAdmins(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE role = 'admin' ORDER BY created_at`
    );
    return UserMapper.fromRows(rows);
  }

  async findRegularUsers(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE role = 'user' ORDER BY created_at`
    );
    return UserMapper.fromRows(rows);
  }

  async findByRole(role: 'admin' | 'user'): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE role = $1 ORDER BY created_at`,
      [role]
    );
    return UserMapper.fromRows(rows);
  }

  async isAdmin(apiKey: string): Promise<boolean> {
    const result = await this.context.queryOne<{ role: string }>(
      'SELECT role FROM users WHERE api_key = $1',
      [apiKey]
    );
    return result?.role === 'admin';
  }

  async countByRole(role: 'admin' | 'user'): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      [role]
    );
    return parseInt(result?.count || '0', 10);
  }

  async isEmpty(): Promise<boolean> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users'
    );
    return parseInt(result?.count || '0', 10) === 0;
  }

  async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    );
    return UserMapper.fromRows(rows);
  }

  // DEMO MODE OPERATIONS

  async findDemoUsers(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE is_demo = true ORDER BY created_at DESC`
    );
    return UserMapper.fromRows(rows);
  }

  async findDemoUserIds(): Promise<string[]> {
    const rows = await this.context.queryMany<{ id: string }>(
      'SELECT id FROM users WHERE is_demo = true'
    );
    return rows.map(row => row.id);
  }

  async findNonDemoUsers(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE is_demo = false ORDER BY created_at DESC`
    );
    return UserMapper.fromRows(rows);
  }

  async countDemoUsers(): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE is_demo = true'
    );
    return parseInt(result?.count || '0', 10);
  }

  // USER MANAGEMENT OPERATIONS

  async updateRole(userId: string, newRole: 'admin' | 'user'): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE users SET role = $1 WHERE id = $2',
      [newRole, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findByCreationDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`,
      [startDate, endDate]
    );
    return UserMapper.fromRows(rows);
  }

  // SECURITY OPERATIONS (stubs for future implementation)

  async recordFailedLogin(_apiKey: string): Promise<void> {
    // For future implementation
  }

  async resetFailedLogins(_apiKey: string): Promise<void> {
    // For future implementation
  }

  async lockUser(_apiKey: string, _lockDurationMinutes: number): Promise<void> {
    // For future implementation
  }

  async isLocked(_apiKey: string): Promise<boolean> {
    return false;
  }

  async unlockUser(_apiKey: string): Promise<void> {
    // For future implementation
  }

  async findLocked(): Promise<User[]> {
    return [];
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
      whereClauses.push(`username ILIKE $${paramIndex++}`);
      params.push(`%${criteria.username}%`);
    }

    if (criteria.role) {
      whereClauses.push(`role = $${paramIndex++}`);
      params.push(criteria.role);
    }

    if (criteria.createdAfter) {
      whereClauses.push(`created_at >= $${paramIndex++}`);
      params.push(criteria.createdAfter);
    }

    if (criteria.createdBefore) {
      whereClauses.push(`created_at <= $${paramIndex++}`);
      params.push(criteria.createdBefore);
    }

    let query = `SELECT ${USER_COLUMNS} FROM users WHERE ${whereClauses.join(' AND ')}`;

    if (criteria.sortBy) {
      const sortColumn = this.mapSortColumn(criteria.sortBy);
      const sortOrder = criteria.sortOrder || 'asc';
      query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at ASC';
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

  // REPORTING

  async getStats(): Promise<UserRepositoryStats> {
    const totalUsers = await this.count();
    const adminCount = await this.countByRole('admin');
    const regularUserCount = await this.countByRole('user');

    // Activity stats - using total count as fallback since activity is session-based
    const activeCount = totalUsers;

    const oldestUserRow = await this.context.queryOne<{ id: string; username: string; created_at: Date | string }>(
      'SELECT id, username, created_at FROM users ORDER BY created_at ASC LIMIT 1'
    );
    const newestUserRow = await this.context.queryOne<{ id: string; username: string; created_at: Date | string }>(
      'SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 1'
    );

    return {
      totalUsers,
      adminCount,
      regularUserCount,
      activeUsers: {
        last24Hours: activeCount,
        lastWeek: activeCount,
        lastMonth: activeCount
      },
      inactiveUsers: 0,
      lockedUsers: 0,
      averageSessionsPerUser: 0,
      oldestUser: oldestUserRow ? {
        id: oldestUserRow.id,
        username: oldestUserRow.username,
        createdAt: oldestUserRow.created_at instanceof Date
          ? oldestUserRow.created_at
          : new Date(oldestUserRow.created_at)
      } : undefined,
      mostRecentUser: newestUserRow ? {
        id: newestUserRow.id,
        username: newestUserRow.username,
        createdAt: newestUserRow.created_at instanceof Date
          ? newestUserRow.created_at
          : new Date(newestUserRow.created_at)
      } : undefined,
      mostActiveUser: undefined
    };
  }

  // MAINTENANCE OPERATIONS

  async isHealthy(): Promise<boolean> {
    return this.context.isHealthy();
  }

  async cleanupExpiredSessions(): Promise<number> {
    // Sessions managed by SessionRepository
    return 0;
  }
}
