/**
 * User Mapper
 *
 * Converts between database rows and User domain entities.
 */


import { User } from '@domain/entities/User';
import { toDate, toISOString } from '@infrastructure/database/PostgresContext';

import type { UserStatus } from '@odysseus/shared-schemas';

export interface UserRow {
  id: string;
  username: string;
  api_key: string;
  role: 'system_admin' | 'lab_admin' | 'user';
  password_hash?: string;
  salt?: string;
  created_at: Date | string;
  researcher_id?: string;
  person_id?: string;
  status: UserStatus;
  email_verified?: boolean;
  email_verification_token?: string;
  email_verification_expiry?: Date | string;
  last_verification_email_sent?: Date | string;
  password_reset_token?: string;
  password_reset_expiry?: Date | string;
  require_password_change?: boolean;
  last_password_change?: Date | string;
  settings?: string;
  last_activity?: Date | string;
  lab_id?: string;
  lab_is_demo?: boolean;
  researcher_active?: boolean;
}

export class UserMapper {

  static toRow(user: User): UserRow {
    const settingsJson = JSON.stringify(user.settings);

    return {
      id: user.id,
      username: user.username,
      api_key: user.apiKey,
      role: user.roleString as 'system_admin' | 'lab_admin' | 'user',
      password_hash: user.passwordHash ?? undefined,
      salt: user.salt ?? undefined,
      created_at: user.createdAt,
      researcher_id: user.researcherId,
      person_id: user.personId,
      status: user.status,
      email_verified: user.emailVerified,
      email_verification_token: user.emailVerificationToken,
      email_verification_expiry: user.emailVerificationExpiry ?? undefined,
      last_verification_email_sent: user.lastVerificationEmailSent ?? undefined,
      password_reset_token: user.passwordResetToken,
      password_reset_expiry: user.passwordResetExpiry ?? undefined,
      require_password_change: user.requirePasswordChange,
      last_password_change: user.lastPasswordChange ?? undefined,
      settings: settingsJson,
      lab_id: user.labId
    };
  }

  static fromRow(row: UserRow): User {
    const createdAt = toDate(row.created_at);

    const emailVerificationExpiry = row.email_verification_expiry
      ? toISOString(row.email_verification_expiry)
      : undefined;

    const lastVerificationEmailSent = row.last_verification_email_sent
      ? toISOString(row.last_verification_email_sent)
      : undefined;

    const passwordResetExpiry = row.password_reset_expiry
      ? toISOString(row.password_reset_expiry)
      : undefined;

    const lastPasswordChange = row.last_password_change
      ? toISOString(row.last_password_change)
      : undefined;

    return User.fromData({
      id: row.id,
      username: row.username,
      apiKey: row.api_key,
      role: row.role,
      lastActivity: row.last_activity
        ? toISOString(row.last_activity)
        : createdAt.toISOString(),
      createdAt: createdAt.toISOString(),
      passwordHash: row.password_hash,
      salt: row.salt,
      researcherId: row.researcher_id ?? undefined,
      personId: row.person_id ?? undefined,
      status: row.status,
      emailVerified: row.email_verified ? 1 : 0,
      emailVerificationToken: row.email_verification_token,
      emailVerificationExpiry: emailVerificationExpiry,
      lastVerificationEmailSent: lastVerificationEmailSent,
      passwordResetToken: row.password_reset_token,
      passwordResetExpiry: passwordResetExpiry,
      requirePasswordChange: row.require_password_change ? 1 : 0,
      lastPasswordChange: lastPasswordChange,
      labIsDemo: row.lab_is_demo ?? false,
      researcherActive: row.researcher_active ?? undefined,
      settings: row.settings,
      labId: row.lab_id ?? undefined
    });
  }

  static fromRows(rows: UserRow[]): User[] {
    return rows.map(row => this.fromRow(row));
  }
}
