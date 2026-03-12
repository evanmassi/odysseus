/**
 * Password Hashing and Verification
 *
 * Bcrypt-based PasswordService with transparent PBKDF2 legacy support.
 */

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordService } from '@application/contracts/PasswordService';

const DEFAULT_SALT_ROUNDS = 12;
const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEY_LENGTH = 64;
const PBKDF2_DIGEST = 'sha512';

export class BcryptPasswordService implements PasswordService {
  private readonly saltRounds: number;

  constructor(saltRounds: number = DEFAULT_SALT_ROUNDS) {
    this.saltRounds = saltRounds;
  }

  async hash(plainPassword: string): Promise<string> {
    if (!plainPassword) {
      throw new Error('Password cannot be empty');
    }
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async verify(plainPassword: string, storedHash: string, salt?: string): Promise<boolean> {
    if (!plainPassword || !storedHash) {
      return false;
    }

    try {
      if (salt) {
        const derived = crypto.pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString('hex');
        return derived === storedHash;
      }
      return bcrypt.compare(plainPassword, storedHash);
    } catch {
      return false;
    }
  }

  needsUpgrade(storedHash: string, salt?: string): boolean {
    return !!salt;
  }
}
