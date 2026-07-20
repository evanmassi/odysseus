/**
 * Password Validation Utilities
 *
 * Used by both client (real-time UI feedback) and server (enforcement).
 */

export interface PasswordRequirementsConfig {
  passwordMinLength: number;
  requireStrongPasswords: boolean;
  passwordRequireSpecialChars: boolean;
}

export interface PasswordRequirement {
  id: string;
  label: string;
  isMet: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: PasswordRequirement[];
}

export class PasswordValidator {
  private static readonly UPPERCASE_REGEX = /[A-Z]/;
  private static readonly LOWERCASE_REGEX = /[a-z]/;
  private static readonly NUMBER_REGEX = /[0-9]/;
  private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/;

  static validate(password: string, config: PasswordRequirementsConfig): PasswordValidationResult {
    const requirements = this.getRequirements(password, config);
    const isValid = requirements.every(req => req.isMet);

    return { isValid, requirements };
  }

  static getRequirements(
    password: string,
    config: PasswordRequirementsConfig
  ): PasswordRequirement[] {
    const requirements: PasswordRequirement[] = [];

    // Length requirement (always present)
    requirements.push({
      id: 'length',
      label: `At least ${config.passwordMinLength} characters`,
      isMet: password.length >= config.passwordMinLength,
    });

    if (config.requireStrongPasswords) {
      requirements.push({
        id: 'uppercase',
        label: 'Uppercase letter (A-Z)',
        isMet: this.UPPERCASE_REGEX.test(password),
      });

      requirements.push({
        id: 'lowercase',
        label: 'Lowercase letter (a-z)',
        isMet: this.LOWERCASE_REGEX.test(password),
      });

      requirements.push({
        id: 'number',
        label: 'Number (0-9)',
        isMet: this.NUMBER_REGEX.test(password),
      });
    }

    if (config.passwordRequireSpecialChars) {
      requirements.push({
        id: 'special',
        label: 'Special character (!@#$%^&*)',
        isMet: this.SPECIAL_CHAR_REGEX.test(password),
      });
    }

    return requirements;
  }

  /** Server-side enforcement — throws on invalid password. */
  static enforce(password: string, config: PasswordRequirementsConfig): void {
    // Check max length first to prevent DoS via hashing
    if (password.length > 128) {
      throw new Error('Password cannot exceed 128 characters');
    }

    const result = this.validate(password, config);

    if (!result.isValid) {
      const failedRequirements = result.requirements
        .filter(req => !req.isMet)
        .map(req => req.label);

      throw new Error(`Password does not meet requirements: ${failedRequirements.join(', ')}`);
    }
  }
}
