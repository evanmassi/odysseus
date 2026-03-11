/**
 * Password Hashing and Validation
 *
 * Bcrypt-based PasswordService that reads SecurityConfig for dynamic enforcement rules.
 */

import * as bcrypt from 'bcrypt';
import { PasswordService, PasswordValidationResult } from '@application/contracts/PasswordService';
import { StorageRepository } from '@domain/repositories/StorageRepository';

const MAX_PASSWORD_LENGTH = 128;
const SCORE_CAP = 4;
const SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>]/;

export class BcryptPasswordService implements PasswordService {
  private readonly saltRounds: number;
  private readonly forbiddenPasswords: string[];

  constructor(
    private readonly storageRepository: StorageRepository,
    saltRounds: number = 12
  ) {
    this.saltRounds = saltRounds;
    this.forbiddenPasswords = [
      'password', '123456', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', '1234567890', 'qwerty'
    ];
  }

  async hash(plainPassword: string): Promise<string> {
    if (!plainPassword) {
      throw new Error('Password cannot be empty');
    }

    const validation = await this.validateStrength(plainPassword);
    if (!validation.isValid) {
      throw new Error(`Password requirements not met: ${validation.errors.join(', ')}`);
    }

    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    if (!plainPassword || !hashedPassword) {
      return false;
    }

    try {
      return bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  }

  async validateStrength(password: string): Promise<PasswordValidationResult> {
    const errors: string[] = [];
    let score = 0;

    const securityConfig = await this.storageRepository.getSecurityConfig();

    const minLength = securityConfig.passwordMinLength;
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    } else {
      score += 1;
    }

    // Prevent bcrypt DoS with extremely long input
    if (password.length > MAX_PASSWORD_LENGTH) {
      errors.push(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`);
    }

    // Always enforced regardless of requireStrongPasswords
    const lowerPassword = password.toLowerCase();
    if (this.forbiddenPasswords.some(forbidden =>
      lowerPassword.includes(forbidden.toLowerCase())
    )) {
      errors.push('Password contains common words that are not allowed');
    } else {
      score += 1;
    }

    if (securityConfig.requireStrongPasswords) {
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      } else {
        score += 1;
      }

      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      } else {
        score += 1;
      }

      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      } else {
        score += 1;
      }

      if (securityConfig.passwordRequireSpecialChars && !SPECIAL_CHARS.test(password)) {
        errors.push('Password must contain at least one special character');
      } else if (SPECIAL_CHARS.test(password)) {
        score += 1;
      }
    } else {
      if (/[A-Z]/.test(password)) score += 1;
      if (/[a-z]/.test(password)) score += 1;
      if (/\d/.test(password)) score += 1;
      if (SPECIAL_CHARS.test(password)) score += 1;
    }

    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, SCORE_CAP)
    };
  }
}
