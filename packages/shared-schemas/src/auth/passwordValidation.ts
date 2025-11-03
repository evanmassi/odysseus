/**
 * Password Validation Utilities
 *
 * Single source of truth for password validation logic.
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

/**
 * Password validation shared between client and server
 */
export class PasswordValidator {
  // Regex patterns - single source of truth
  private static readonly UPPERCASE_REGEX = /[A-Z]/;
  private static readonly LOWERCASE_REGEX = /[a-z]/;
  private static readonly NUMBER_REGEX = /[0-9]/;
  private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/;

  /**
   * Validate password against requirements
   * Returns detailed validation result for UI display
   */
  static validate(password: string, config: PasswordRequirementsConfig): PasswordValidationResult {
    const requirements = this.getRequirements(password, config);
    const isValid = requirements.every(req => req.isMet);

    return { isValid, requirements };
  }

  /**
   * Get individual requirement checks
   * Used by UI components to show real-time feedback
   */
  static getRequirements(password: string, config: PasswordRequirementsConfig): PasswordRequirement[] {
    const requirements: PasswordRequirement[] = [];

    // Length requirement (always present)
    requirements.push({
      id: 'length',
      label: `At least ${config.passwordMinLength} characters`,
      isMet: password.length >= config.passwordMinLength
    });

    // Strong password requirements (uppercase, lowercase, number)
    if (config.requireStrongPasswords) {
      requirements.push({
        id: 'uppercase',
        label: 'Uppercase letter (A-Z)',
        isMet: this.UPPERCASE_REGEX.test(password)
      });

      requirements.push({
        id: 'lowercase',
        label: 'Lowercase letter (a-z)',
        isMet: this.LOWERCASE_REGEX.test(password)
      });

      requirements.push({
        id: 'number',
        label: 'Number (0-9)',
        isMet: this.NUMBER_REGEX.test(password)
      });
    }

    // Special characters requirement
    if (config.passwordRequireSpecialChars) {
      requirements.push({
        id: 'special',
        label: 'Special character (!@#$%^&*)',
        isMet: this.SPECIAL_CHAR_REGEX.test(password)
      });
    }

    return requirements;
  }

  /**
   * Server-side enforcement with error throwing
   * Validates password and throws descriptive errors
   */
  static enforce(password: string, config: PasswordRequirementsConfig): void {
    // Check max length first (security best practice)
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
