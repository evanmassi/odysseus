import { User } from '@domain/entities/User';

/**
 * Database row structure for users table
 */
export interface UserRow {
  id: string;
  username: string;
  api_key: string;
  role: 'admin' | 'user';
  password_hash?: string;
  salt?: string;
  created_at: Date | string;
  researcher_id?: string;
  person_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  email_verified?: boolean;
  email_verification_token?: string;
  email_verification_expiry?: Date | string;
  last_verification_email_sent?: Date | string;
  password_reset_token?: string;
  password_reset_expiry?: Date | string;
  require_password_change?: boolean;
  last_password_change?: Date | string;
  settings?: string;
}

/**
 * UserMapper - Conversion between domain entity and database row
 *
 * Domain entities remain persistence-agnostic (Clean Architecture).
 */
export class UserMapper {

  /**
   * Convert domain entity to database row
   */
  static toRow(user: User): UserRow {
    const role = user.role;
    const settingsJson = JSON.stringify(user.settings);

    return {
      id: user.id,
      username: user.username,
      api_key: user.apiKey,
      role: role.isAdmin() ? 'admin' : 'user',
      password_hash: user.passwordHash || undefined,
      salt: user.salt || undefined,
      created_at: user.createdAt,
      researcher_id: user.researcherId,
      person_id: user.personId,
      status: user.status,
      email_verified: user.emailVerified,
      email_verification_token: user.emailVerificationToken,
      email_verification_expiry: user.emailVerificationExpiry || undefined,
      last_verification_email_sent: user.lastVerificationEmailSent || undefined,
      password_reset_token: user.passwordResetToken,
      password_reset_expiry: user.passwordResetExpiry || undefined,
      require_password_change: user.requirePasswordChange,
      last_password_change: user.lastPasswordChange || undefined,
      settings: settingsJson
    };
  }

  /**
   * Convert database row to domain entity
   */
  static fromRow(row: UserRow): User {
    const createdAt = row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at);

    const emailVerificationExpiry = row.email_verification_expiry
      ? (row.email_verification_expiry instanceof Date
          ? row.email_verification_expiry.toISOString()
          : row.email_verification_expiry)
      : undefined;

    const lastVerificationEmailSent = row.last_verification_email_sent
      ? (row.last_verification_email_sent instanceof Date
          ? row.last_verification_email_sent.toISOString()
          : row.last_verification_email_sent)
      : undefined;

    const passwordResetExpiry = row.password_reset_expiry
      ? (row.password_reset_expiry instanceof Date
          ? row.password_reset_expiry.toISOString()
          : row.password_reset_expiry)
      : undefined;

    const lastPasswordChange = row.last_password_change
      ? (row.last_password_change instanceof Date
          ? row.last_password_change.toISOString()
          : row.last_password_change)
      : undefined;

    return User.fromData({
      id: row.id,
      username: row.username,
      apiKey: row.api_key,
      role: row.role,
      lastActivity: new Date().toISOString(),
      createdAt: createdAt.toISOString(),
      passwordHash: row.password_hash,
      salt: row.salt,
      researcherId: row.researcher_id,
      personId: row.person_id,
      status: row.status,
      emailVerified: row.email_verified ? 1 : 0,
      emailVerificationToken: row.email_verification_token,
      emailVerificationExpiry: emailVerificationExpiry,
      lastVerificationEmailSent: lastVerificationEmailSent,
      passwordResetToken: row.password_reset_token,
      passwordResetExpiry: passwordResetExpiry,
      requirePasswordChange: row.require_password_change ? 1 : 0,
      lastPasswordChange: lastPasswordChange,
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
