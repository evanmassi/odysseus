import { UserRepository, UserRepositoryStats, UserSearchCriteria, UserActivitySummary } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { UserMapper, UserRow } from '@infrastructure/database/mappers/UserMapper';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';
import * as crypto from 'crypto';

/**
 * SQLiteUserRepository - User authentication data access
 *
 * Implements UserRepository interface using SQLite.
 * Handles all user persistence operations.
 */
export class SQLiteUserRepository implements UserRepository {
  
  constructor(private context: SQLiteContext) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      'SELECT * FROM users WHERE apiKey = ?',
      [apiKey]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Email comparison is case-insensitive per RFC 5321
    const normalizedEmail = email.toLowerCase().trim();
    const row = await this.context.queryOne<UserRow>(
      'SELECT u.* FROM users u INNER JOIN persons p ON u.personId = p.id WHERE LOWER(p.email) = ?',
      [normalizedEmail]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByResearcherId(researcherId: string): Promise<User | null> {
    const row = await this.context.queryOne<UserRow>(
      'SELECT * FROM users WHERE researcherId = ?',
      [researcherId]
    );
    return row ? UserMapper.fromRow(row) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    // Tokens are hashed, so we must check all users with pending verification
    // Filter by non-expired tokens to reduce candidates
    const now = new Date().toISOString();
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE emailVerificationToken IS NOT NULL AND emailVerificationExpiry > ?',
      [now]
    );

    // Check each candidate using domain logic
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
    // Tokens are hashed, so we must check all users with pending password reset
    // Filter by non-expired tokens to reduce candidates
    const now = new Date().toISOString();
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE passwordResetToken IS NOT NULL AND passwordResetExpiry > ?',
      [now]
    );

    // Check each candidate using domain logic
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
      'SELECT * FROM users ORDER BY createdAt'
    );
    return UserMapper.fromRows(rows);
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);

    await this.context.execute(`
      INSERT OR REPLACE INTO users (
        id, username, apiKey, role, passwordHash, salt, createdAt, researcherId, personId, status,
        emailVerified, emailVerificationToken, emailVerificationExpiry, lastVerificationEmailSent,
        passwordResetToken, passwordResetExpiry, requirePasswordChange, lastPasswordChange, settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      row.id, row.username, row.apiKey, row.role, row.passwordHash, row.salt, row.createdAt, row.researcherId, row.personId, row.status,
      row.emailVerified, row.emailVerificationToken, row.emailVerificationExpiry, row.lastVerificationEmailSent,
      row.passwordResetToken, row.passwordResetExpiry, row.requirePasswordChange, row.lastPasswordChange, row.settings
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // AUTHENTICATION OPERATIONS

  async apiKeyExists(apiKey: string): Promise<boolean> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE apiKey = ?',
      [apiKey]
    );
    return (result?.count || 0) > 0;
  }

  async usernameExists(username: string): Promise<boolean> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      [username]
    );
    return (result?.count || 0) > 0;
  }

  async emailExists(email: string): Promise<boolean> {
    // Email comparison is case-insensitive per RFC 5321
    const normalizedEmail = email.toLowerCase().trim();
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users u INNER JOIN persons p ON u.personId = p.id WHERE LOWER(p.email) = ?',
      [normalizedEmail]
    );
    return (result?.count || 0) > 0;
  }

  // OAuth 2.0 Note: updateLastActivity() removed
  // User activity now tracked implicitly through token refresh patterns

  // OAuth 2.0 Note: findWithRecentActivity() removed
  // Use token-based authentication instead of database activity tracking

  // ROLE-BASED OPERATIONS

  async findAdmins(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE role = ? ORDER BY createdAt',
      ['admin']
    );
    return UserMapper.fromRows(rows);
  }

  async findRegularUsers(): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE role = ? ORDER BY createdAt',
      ['user']
    );
    return UserMapper.fromRows(rows);
  }

  async findByRole(role: 'admin' | 'user'): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE role = ? ORDER BY createdAt',
      [role]
    );
    return UserMapper.fromRows(rows);
  }

  async isAdmin(apiKey: string): Promise<boolean> {
    const result = await this.context.queryOne<{ role: string }>(
      'SELECT role FROM users WHERE apiKey = ?',
      [apiKey]
    );
    return result?.role === 'admin';
  }

  async countByRole(role: 'admin' | 'user'): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      [role]
    );
    return result?.count || 0;
  }

  async isEmpty(): Promise<boolean> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );
    return (result?.count || 0) === 0;
  }

  async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<User[]> {
    // Admin approval bypasses email verification requirement
    // Pending users appear in approval queue regardless of email verification status
    const query = 'SELECT * FROM users WHERE status = ? ORDER BY createdAt DESC';

    const rows = await this.context.queryMany<UserRow>(query, [status]);
    return UserMapper.fromRows(rows);
  }

  // USER MANAGEMENT OPERATIONS

  async updateRole(userId: string, newRole: 'admin' | 'user'): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [newRole, userId]
    );
    return result.changes > 0;
  }

  async findByCreationDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt',
      [SqliteDateMapper.toDbDateTime(startDate), SqliteDateMapper.toDbDateTime(endDate)]
    );
    return UserMapper.fromRows(rows);
  }

  async findByActivityDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE lastActivity >= ? AND lastActivity <= ? ORDER BY lastActivity DESC',
      [SqliteDateMapper.toDbDateTime(startDate), SqliteDateMapper.toDbDateTime(endDate)]
    );
    return UserMapper.fromRows(rows);
  }



  // SECURITY OPERATIONS

  async recordFailedLogin(apiKey: string): Promise<void> {
    // For future implementation - would track failed login attempts
    // Could extend schema to include failedLoginAttempts and lastFailedLogin fields
  }

  async resetFailedLogins(apiKey: string): Promise<void> {
    // For future implementation - would reset failed login counter
    // Could extend schema to include failedLoginAttempts field
  }

  async lockUser(apiKey: string, lockDurationMinutes: number): Promise<void> {
    // For future implementation - would lock user account
    // Could extend schema to include isLocked and lockedUntil fields
  }

  async isLocked(apiKey: string): Promise<boolean> {
    // For future implementation - would check if user is locked
    // Could extend schema to include isLocked and lockedUntil fields
    return false;
  }

  async unlockUser(apiKey: string): Promise<void> {
    // For future implementation - would unlock user account
    // Could extend schema to include isLocked field
  }

  async findLocked(): Promise<User[]> {
    // For future implementation - would find locked users
    // Could extend schema to include isLocked field
    return [];
  }

  // BUSINESS QUERIES

  async count(): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );
    return result?.count || 0;
  }

  async countActive(maxInactiveMinutes: number): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxInactiveMinutes);
    
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE lastActivity >= ?',
      [SqliteDateMapper.toDbDateTime(cutoffTime)]
    );
    return result?.count || 0;
  }

  async findInactive(maxInactiveMinutes: number): Promise<User[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxInactiveMinutes);
    
    const rows = await this.context.queryMany<UserRow>(
      'SELECT * FROM users WHERE lastActivity < ? ORDER BY lastActivity ASC',
      [SqliteDateMapper.toDbDateTime(cutoffTime)]
    );
    return UserMapper.fromRows(rows);
  }

  async search(criteria: UserSearchCriteria): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    // Basic criteria
    if (criteria.username) {
      query += ' AND username LIKE ?';
      params.push(`%${criteria.username}%`);
    }

    if (criteria.role) {
      query += ' AND role = ?';
      params.push(criteria.role);
    }

    // Date criteria
    if (criteria.createdAfter) {
      query += ' AND createdAt >= ?';
      params.push(SqliteDateMapper.toDbDateTime(criteria.createdAfter));
    }

    if (criteria.createdBefore) {
      query += ' AND createdAt <= ?';
      params.push(SqliteDateMapper.toDbDateTime(criteria.createdBefore));
    }

    if (criteria.lastActivityAfter) {
      query += ' AND lastActivity >= ?';
      params.push(SqliteDateMapper.toDbDateTime(criteria.lastActivityAfter));
    }

    if (criteria.lastActivityBefore) {
      query += ' AND lastActivity <= ?';
      params.push(SqliteDateMapper.toDbDateTime(criteria.lastActivityBefore));
    }

    // Status criteria
    if (criteria.isActive !== undefined) {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 60); // Assume 60 minutes for active
      
      if (criteria.isActive) {
        query += ' AND lastActivity >= ?';
        params.push(SqliteDateMapper.toDbDateTime(cutoffTime));
      } else {
        query += ' AND lastActivity < ?';
        params.push(SqliteDateMapper.toDbDateTime(cutoffTime));
      }
    }

    // Sorting
    if (criteria.sortBy) {
      const sortColumn = criteria.sortBy;
      const sortOrder = criteria.sortOrder || 'asc';
      query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    } else {
      query += ' ORDER BY createdAt ASC';
    }

    // Pagination
    if (criteria.limit) {
      query += ' LIMIT ?';
      params.push(criteria.limit);
      
      if (criteria.offset) {
        query += ' OFFSET ?';
        params.push(criteria.offset);
      }
    }

    const rows = await this.context.queryMany<UserRow>(query, params);
    return UserMapper.fromRows(rows);
  }

  // AUDIT AND REPORTING

  async getUserActivitySummary(userId: string): Promise<UserActivitySummary> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastActivity = Math.floor((now.getTime() - user.lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    return {
      userId: user.id,
      username: user.username,
      role: user.role.isAdmin() ? 'admin' : 'user',
      createdAt: user.createdAt,
      lastActivity: user.lastActivity,
      totalSessions: 0, // Could be implemented with session tracking
      failedLoginAttempts: 0, // Could be implemented with failed login tracking
      isCurrentlyLocked: false, // Could be implemented with account locking
      daysSinceCreation,
      daysSinceLastActivity
    };
  }

  // MAINTENANCE OPERATIONS

  async isHealthy(): Promise<boolean> {
    return this.context.isHealthy();
  }

  async getStats(): Promise<UserRepositoryStats> {
    // Get total counts
    const totalUsers = await this.count();
    const adminCount = await this.countByRole('admin');
    const regularUserCount = await this.countByRole('user');

    // Get activity stats for different time periods
    const active24Hours = await this.countActive(24 * 60);
    const activeWeek = await this.countActive(7 * 24 * 60);
    const activeMonth = await this.countActive(30 * 24 * 60);
    
    const inactiveUsers = totalUsers - activeMonth;
    const lockedUsers = 0; // Would be implemented with account locking

    // Get oldest and newest users
    const oldestUserRow = await this.context.queryOne<{ id: string; username: string; createdAt: string }>(
      'SELECT id, username, createdAt FROM users ORDER BY createdAt ASC LIMIT 1'
    );
    const newestUserRow = await this.context.queryOne<{ id: string; username: string; createdAt: string }>(
      'SELECT id, username, createdAt FROM users ORDER BY createdAt DESC LIMIT 1'
    );

    // Get most active user (by recent activity)
    const mostActiveUserRow = await this.context.queryOne<{ id: string; username: string; lastActivity: string }>(
      'SELECT id, username, lastActivity FROM users ORDER BY lastActivity DESC LIMIT 1'
    );

    return {
      totalUsers,
      adminCount,
      regularUserCount,
      activeUsers: {
        last24Hours: active24Hours,
        lastWeek: activeWeek,
        lastMonth: activeMonth
      },
      inactiveUsers,
      lockedUsers,
      averageSessionsPerUser: 0, // Could calculate this from session data if needed
      oldestUser: oldestUserRow ? {
        id: oldestUserRow.id,
        username: oldestUserRow.username,
        createdAt: SqliteDateMapper.fromDbDateTime(oldestUserRow.createdAt)!
      } : undefined,
      mostRecentUser: newestUserRow ? {
        id: newestUserRow.id,
        username: newestUserRow.username,
        createdAt: SqliteDateMapper.fromDbDateTime(newestUserRow.createdAt)!
      } : undefined,
      mostActiveUser: mostActiveUserRow ? {
        id: mostActiveUserRow.id,
        username: mostActiveUserRow.username,
        lastActivity: SqliteDateMapper.fromDbDateTime(mostActiveUserRow.lastActivity)!
      } : undefined
    };
  }

  async cleanupExpiredSessions(): Promise<number> {
    // For future implementation - would clean up expired session data
    // Could implement session tracking with a separate sessions table
    return 0;
  }
}
