/**
 * Bcrypt Password Service
 *
 * Secure password hashing using bcrypt algorithm.
 * Configurable salt rounds for hash strength.
 * Password validation dynamically reads SecurityConfig for enforcement.
 */

import * as bcrypt from 'bcrypt';
import { PasswordService, PasswordValidationResult } from '@application/contracts/PasswordService';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';

export class BcryptPasswordService implements PasswordService {
  private readonly saltRounds: number;
  private readonly forbiddenPasswords: string[];

  constructor(
    private readonly configurationRepository: ConfigurationRepository,
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

    // Read current security configuration
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    // Check minimum length (from SecurityConfig)
    const minLength = securityConfig.passwordMinLength;
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    } else {
      score += 1;
    }

    // Check maximum length (prevent DoS)
    if (password.length > 128) {
      errors.push('Password cannot exceed 128 characters');
    }

    // Check for forbidden passwords (always enforced)
    const lowerPassword = password.toLowerCase();
    if (this.forbiddenPasswords.some(forbidden =>
      lowerPassword.includes(forbidden.toLowerCase())
    )) {
      errors.push('Password contains common words that are not allowed');
    } else {
      score += 1;
    }

    // If requireStrongPasswords is enabled, enforce additional requirements
    if (securityConfig.requireStrongPasswords) {
      // Require uppercase
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      } else {
        score += 1;
      }

      // Require lowercase
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      } else {
        score += 1;
      }

      // Require numbers
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      } else {
        score += 1;
      }

      // Require special characters (if configured)
      if (securityConfig.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
      } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
      }
    } else {
      // Optional scoring when strong passwords not required
      if (/[A-Z]/.test(password)) score += 1;
      if (/[a-z]/.test(password)) score += 1;
      if (/\d/.test(password)) score += 1;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    }

    // Additional scoring for password complexity
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, 4) // Cap at 4
    };
  }
}
