import { User } from '@domain/entities/User';
import { UserRole } from '@domain/valueObjects/UserRole';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * Database row structure for users table
 */
export interface UserRow {
  id: string;
  username: string;
  email?: string;
  apiKey: string;
  role: 'admin' | 'user';
  passwordHash?: string;
  salt?: string;
  createdAt: string;
  researcherId?: string;
  status: 'pending' | 'approved' | 'rejected';
  emailVerified?: number;
  emailVerificationToken?: string;
  emailVerificationExpiry?: string;
  lastVerificationEmailSent?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: string;
  requirePasswordChange?: number;
  lastPasswordChange?: string;
  settings?: string;
}

/**
 * UserMapper - Conversion between Domain Entity and Database Row
 *
 * Separated from repository to keep mapping logic testable in isolation.
 * Domain entities remain persistence-agnostic (Clean Architecture dependency rule).
 */
export class UserMapper {
  
  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(user: User): UserRow {
    const role = user.role;
    const settingsJson = JSON.stringify(user.settings);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      apiKey: user.apiKey,
      role: role.isAdmin() ? 'admin' : 'user',
      passwordHash: user.passwordHash || undefined,
      salt: user.salt || undefined,
      createdAt: SqliteDateMapper.toDbDateTime(user.createdAt),
      researcherId: user.researcherId,
      status: user.status,
      emailVerified: user.emailVerified ? 1 : 0,
      emailVerificationToken: user.emailVerificationToken,
      emailVerificationExpiry: user.emailVerificationExpiry
        ? SqliteDateMapper.toDbDateTime(user.emailVerificationExpiry)
        : undefined,
      lastVerificationEmailSent: user.lastVerificationEmailSent
        ? SqliteDateMapper.toDbDateTime(user.lastVerificationEmailSent)
        : undefined,
      passwordResetToken: user.passwordResetToken,
      passwordResetExpiry: user.passwordResetExpiry
        ? SqliteDateMapper.toDbDateTime(user.passwordResetExpiry)
        : undefined,
      requirePasswordChange: user.requirePasswordChange ? 1 : 0,
      lastPasswordChange: user.lastPasswordChange
        ? SqliteDateMapper.toDbDateTime(user.lastPasswordChange)
        : undefined,
      settings: settingsJson
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: UserRow): User {
    return User.fromData({
      id: row.id,
      username: row.username,
      apiKey: row.apiKey,
      role: row.role,
      lastActivity: new Date().toISOString(),
      createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!.toISOString(),
      passwordHash: row.passwordHash,
      salt: row.salt,
      researcherId: row.researcherId,
      status: row.status,
      email: row.email,
      emailVerified: row.emailVerified,
      emailVerificationToken: row.emailVerificationToken,
      emailVerificationExpiry: row.emailVerificationExpiry,
      lastVerificationEmailSent: row.lastVerificationEmailSent,
      passwordResetToken: row.passwordResetToken,
      passwordResetExpiry: row.passwordResetExpiry,
      requirePasswordChange: row.requirePasswordChange,
      lastPasswordChange: row.lastPasswordChange,
      settings: row.settings
    });
  }

  /**
   * Convert multiple rows to entities
   */
  static fromRows(rows: UserRow[]): User[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Convert multiple entities to rows
   */
  static toRows(users: User[]): UserRow[] {
    return users.map(user => this.toRow(user));
  }
}
